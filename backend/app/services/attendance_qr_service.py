import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.attendance_session import AttendanceSession, AttendanceSessionStatus
from app.models.attendance_record import AttendanceRecord, AttendanceStatus
from app.models.course_session import CourseSession
from app.models.course_program_level import CourseProgramLevel
from app.models.schedule import Schedule
from app.models.student import Student
from app.repositories.attendance_session_repository import AttendanceSessionRepository
from app.repositories.attendance_record_repository import AttendanceRecordRepository
from app.repositories.student_repository import StudentRepository
from app.services.student_service import StudentService
from sqlmodel import Session, select


def _utcnow() -> datetime:
    """Naive UTC timestamp.

    The DB datetime columns are timezone-less. Writing a tz-aware value into
    them makes Postgres convert to the server's local zone and drop the tz,
    which shifts the stored time. Using naive-UTC on both write and compare
    keeps everything on the same clock with no conversion.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AttendanceQRService:
    """Service handling QR code generation, validation and attendance recording.

    The workflow is:
    1. A professor calls ``generate_qr_token`` for a given ``session_id``.
       This creates a random token, stores it on the ``AttendanceSession`` and
       sets an expiration time (default 60 seconds). The token is returned so the
       frontend can render it as a QR image.
    2. A student scans the QR code. The frontend sends the ``token`` and the
       ``student_id`` to ``validate_and_record_attendance``.
       The service looks up the session by token, checks expiration, ensures the
       student has not already recorded attendance for that session, creates an
       ``AttendanceRecord`` with status ``present`` and rotates the token.
    """

    def __init__(self, db_session: Session):
        self.db_session = db_session
        self.session_repo = AttendanceSessionRepository(self.db_session)
        self.record_repo = AttendanceRecordRepository(self.db_session)
        self.student_repo = StudentRepository(self.db_session)

    def generate_qr_token(self, session_id: str, refresh_interval: int = 60) -> dict:
        """Generate a new QR token for the given attendance session.

        Returns a dict containing the token and its expiry datetime. The token
        should be rendered as a QR image on the frontend.
        """
        session: Optional[AttendanceSession] = self.session_repo.get_by_id(uuid.UUID(session_id))
        if not session:
            raise ValueError("Attendance session not found")
        if session.status == AttendanceSessionStatus.COMPLETED.value:
            raise ValueError("This session is already completed")
        if session.status == AttendanceSessionStatus.CANCELLED.value:
            raise ValueError("This session is cancelled")

        token = secrets.token_urlsafe(32)
        now = _utcnow()
        # The session starts on the first QR generation.
        if session.started_at is None:
            session.started_at = now
            session.status = AttendanceSessionStatus.IN_PROGRESS.value
        session.qr_code_token = token
        session.qr_code_generated_at = now
        session.qr_code_expires_at = now + timedelta(seconds=refresh_interval)
        session.qr_code_refresh_interval = refresh_interval
        self.db_session.add(session)
        self.db_session.commit()
        self.db_session.refresh(session)
        return {
            "token": token,
            "expires_at": session.qr_code_expires_at,
        }

    def _rotate_token(self, session: AttendanceSession) -> None:
        """Internal helper to generate a fresh token after a successful scan."""
        token = secrets.token_urlsafe(32)
        now = _utcnow()
        session.qr_code_token = token
        session.qr_code_generated_at = now
        session.qr_code_expires_at = now + timedelta(seconds=session.qr_code_refresh_interval)
        self.db_session.add(session)
        self.db_session.commit()
        self.db_session.refresh(session)

    def validate_and_record_attendance(
        self, token: str, student_id: str, arrival_time: Optional[datetime] = None
    ) -> AttendanceRecord:
        """Validate a QR token and create an AttendanceRecord.

        * ``token`` – the QR token scanned by the student.
        * ``student_id`` – UUID of the student (extracted from the auth token).
        * ``arrival_time`` – optional timestamp; defaults to ``datetime.now(timezone.utc)``.
        """
        session = self.session_repo.get_by_qr_token(token)
        if not session:
            raise ValueError("Invalid or expired QR code")
        # Expiration check — compare on the same naive-UTC clock. Normalise any
        # tz-aware value (e.g. from older rows) to naive UTC first.
        expires_at = session.qr_code_expires_at
        if expires_at is not None:
            if expires_at.tzinfo is not None:
                expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
            if expires_at < _utcnow():
                raise ValueError("QR code has expired")
        # Ensure the student exists
        student = self.student_repo.get_by_id(uuid.UUID(student_id))
        if not student:
            raise ValueError("Student not found")
        # Prevent double‑scan for the same session
        existing = self.record_repo.get_by_student_and_session(
            student.user_id, session.id
        )
        if existing:
            raise ValueError("Attendance already recorded for this session")
        # Present vs late: late if the scan happens more than
        # ``late_threshold_minutes`` after the session started (first QR).
        arrival = arrival_time or _utcnow()
        status = AttendanceStatus.PRESENT
        started = session.started_at
        if started is not None:
            if started.tzinfo is not None:
                started = started.astimezone(timezone.utc).replace(tzinfo=None)
            late_after = started + timedelta(
                minutes=session.late_threshold_minutes or 0
            )
            if arrival > late_after:
                status = AttendanceStatus.LATE
        # Create the attendance record
        record = AttendanceRecord(
            attendance_session_id=session.id,
            student_id=student.user_id,
            status=status,
            arrival_time=arrival,
        )
        record = self.record_repo.create(record)
        # Rotate the token so it cannot be reused
        self._rotate_token(session)
        return record

    def prepare_session_for_schedule(
        self, schedule_id: str, late_threshold_minutes: Optional[int] = None
    ) -> AttendanceSession:
        """Get or create today's attendance session for a schedule slot.

        Used by the timetable "generate QR" button: instead of manually
        creating a session, we resolve (or create) the session for this
        schedule on the current day. Once that session has been completed, a
        new one cannot be started for the same schedule the same day.
        """
        sched_uuid = uuid.UUID(schedule_id)
        schedule = self.db_session.get(Schedule, sched_uuid)
        if not schedule:
            raise ValueError("Schedule not found")

        today = _utcnow().date()
        existing = self.db_session.exec(
            select(AttendanceSession).where(
                AttendanceSession.schedule_id == sched_uuid,
                AttendanceSession.session_date == today,
            )
        ).first()

        if existing is not None:
            if existing.status == AttendanceSessionStatus.COMPLETED.value:
                raise ValueError(
                    "Attendance for this course is already completed today"
                )
            # allow updating the late threshold as long as it hasn't started
            if late_threshold_minutes is not None and existing.started_at is None:
                existing.late_threshold_minutes = late_threshold_minutes
                self.db_session.add(existing)
                self.db_session.commit()
                self.db_session.refresh(existing)
            return existing

        session = AttendanceSession(
            schedule_id=sched_uuid,
            session_date=today,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            late_threshold_minutes=(
                late_threshold_minutes if late_threshold_minutes is not None else 15
            ),
            status=AttendanceSessionStatus.CREATED.value,
        )
        self.db_session.add(session)
        self.db_session.commit()
        self.db_session.refresh(session)
        return session

    def reopen_session(self, session_id: str) -> AttendanceSession:
        """Reopen a completed session so attendance can be taken again.

        Removes the ABSENT records (so those students may scan again), resets
        the start clock and status, and keeps present/late records. A fresh QR
        generation restarts the late countdown. Admin-only (checked at route).
        """
        session = self.session_repo.get_by_id(uuid.UUID(session_id))
        if not session:
            raise ValueError("Attendance session not found")

        absents = self.db_session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.attendance_session_id == session.id,
                AttendanceRecord.status == AttendanceStatus.ABSENT,
            )
        ).all()
        for r in absents:
            self.db_session.delete(r)
        self.db_session.commit()

        # recompute counters from the remaining (present/late) records
        records = list(
            self.db_session.exec(
                select(AttendanceRecord).where(
                    AttendanceRecord.attendance_session_id == session.id
                )
            ).all()
        )
        session.total_students = len(records)
        session.present_students = sum(
            1 for r in records if r.status == AttendanceStatus.PRESENT
        )
        session.late_students = sum(
            1 for r in records if r.status == AttendanceStatus.LATE
        )
        session.absent_students = 0
        session.status = AttendanceSessionStatus.CREATED.value
        session.started_at = None
        session.ended_at = None
        session.attendance_taken = False
        session.attendance_taken_at = None
        session.qr_code_token = None
        self.db_session.add(session)
        self.db_session.commit()
        self.db_session.refresh(session)
        return session

    def end_session(self, session_id: str) -> AttendanceSession:
        """End a session.

        Marks every enrolled student who did not scan as ABSENT, finalises the
        present/late/absent counters, sets the session to ``completed`` and
        clears the active QR token so no further scans are accepted.
        """
        session = self.session_repo.get_by_id(uuid.UUID(session_id))
        if not session:
            raise ValueError("Attendance session not found")
        if session.status == AttendanceSessionStatus.COMPLETED.value:
            raise ValueError("This session is already completed")

        now = _utcnow()

        # Students who should attend this session = those of the course's
        # program level and year (the app models membership by program_level +
        # year rather than explicit enrollments).
        target_user_ids: list = []
        schedule = session.schedule
        cs = (
            self.db_session.get(CourseSession, schedule.course_session_id)
            if schedule
            else None
        )
        if cs is not None:
            cpl = self.db_session.get(
                CourseProgramLevel, cs.course_program_level_id
            )
            if cpl is not None:
                target_user_ids = list(
                    self.db_session.exec(
                        select(Student.user_id).where(
                            Student.program_level_id == cpl.program_level_id,
                            Student.current_year_level == cs.year_level,
                        )
                    ).all()
                )

        # user ids that already have a record for this session
        existing_user_ids = set(
            self.db_session.exec(
                select(AttendanceRecord.student_id).where(
                    AttendanceRecord.attendance_session_id == session.id
                )
            ).all()
        )

        # everyone who should attend but didn't scan → ABSENT
        for user_id in target_user_ids:
            if user_id in existing_user_ids:
                continue
            self.db_session.add(
                AttendanceRecord(
                    attendance_session_id=session.id,
                    student_id=user_id,
                    status=AttendanceStatus.ABSENT,
                )
            )
            existing_user_ids.add(user_id)

        self.db_session.commit()

        # recompute counters from the actual records
        records = list(
            self.db_session.exec(
                select(AttendanceRecord).where(
                    AttendanceRecord.attendance_session_id == session.id
                )
            ).all()
        )
        session.total_students = len(records)
        session.present_students = sum(
            1 for r in records if r.status == AttendanceStatus.PRESENT
        )
        session.late_students = sum(
            1 for r in records if r.status == AttendanceStatus.LATE
        )
        session.absent_students = sum(
            1 for r in records if r.status == AttendanceStatus.ABSENT
        )
        session.status = AttendanceSessionStatus.COMPLETED.value
        session.ended_at = now
        session.attendance_taken = True
        session.attendance_taken_at = now
        session.qr_code_token = None  # no more scans
        self.db_session.add(session)
        self.db_session.commit()
        self.db_session.refresh(session)
        return session
