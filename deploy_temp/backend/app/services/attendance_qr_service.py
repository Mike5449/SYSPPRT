import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from app.models.attendance_session import AttendanceSession
from app.models.attendance_record import AttendanceRecord, AttendanceStatus
from app.repositories.attendance_session_repository import AttendanceSessionRepository
from app.repositories.attendance_record_repository import AttendanceRecordRepository
from app.repositories.student_repository import StudentRepository
from app.services.student_service import StudentService
from sqlmodel import Session

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

        token = secrets.token_urlsafe(32)
        now = datetime.utcnow()
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
        now = datetime.utcnow()
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
        * ``arrival_time`` – optional timestamp; defaults to ``datetime.utcnow()``.
        """
        session = self.session_repo.get_by_qr_token(token)
        if not session:
            raise ValueError("Invalid or expired QR code")
        # Expiration check
        if session.qr_code_expires_at and session.qr_code_expires_at < datetime.utcnow():
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
        # Create the attendance record
        record = AttendanceRecord(
            attendance_session_id=session.id,
            student_id=student.user_id,
            status=AttendanceStatus.PRESENT,
            arrival_time=arrival_time or datetime.utcnow(),
        )
        record = self.record_repo.create(record)
        # Rotate the token so it cannot be reused
        self._rotate_token(session)
        return record
