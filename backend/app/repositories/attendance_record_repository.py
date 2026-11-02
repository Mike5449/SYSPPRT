import uuid
from typing import Optional

from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload

from app.models.attendance_record import AttendanceRecord, AttendanceStatus
from app.repositories.base_repository import BaseRepository


class AttendanceRecordRepository(BaseRepository[AttendanceRecord]):
    """Repository pour la gestion des enregistrements de présence."""

    def __init__(self, session: Session):
        super().__init__(AttendanceRecord, session)

    def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        student_query: Optional[str] = None,
        status: Optional[str] = None,
        teacher_id: Optional[uuid.UUID] = None,
        course_id: Optional[uuid.UUID] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        year_level: Optional[int] = None,
        program_level_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
    ) -> list[AttendanceRecord]:
        """Récupère tous les enregistrements avec filtres."""
        from app.models.student import Student
        from app.models.user import User
        from app.models.attendance_session import AttendanceSession
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel

        statement = select(AttendanceRecord).offset(skip).limit(limit)

        if student_query:
            student_query = f"%{student_query}%"
            statement = (
                statement.join(Student, isouter=True)
                .join(User, isouter=True)
                .where(
                    (User.first_name.ilike(student_query))
                    | (User.last_name.ilike(student_query))
                    | (User.user_number.ilike(student_query))
                )
            )

        if teacher_id or course_id or academic_year_id or year_level or program_level_id or session_id:
            statement = (
                statement
                .join(AttendanceSession, AttendanceRecord.attendance_session_id == AttendanceSession.id, isouter=True)
                .join(Schedule, AttendanceSession.schedule_id == Schedule.id, isouter=True)
                .join(CourseSession, Schedule.course_session_id == CourseSession.id, isouter=True)
            )

            if teacher_id:
                statement = statement.where(CourseSession.teacher_id == teacher_id)
            if session_id:
                statement = statement.where(CourseSession.session_id == session_id)

            if course_id or academic_year_id or year_level or program_level_id:
                statement = statement.join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id, isouter=True)
                if course_id:
                    statement = statement.where(CourseProgramLevel.course_id == course_id)
                if academic_year_id:
                    statement = statement.where(CourseProgramLevel.academic_year_id == academic_year_id)
                if year_level:
                    statement = statement.where(CourseProgramLevel.year_level == year_level)
                if program_level_id:
                    statement = statement.where(CourseProgramLevel.program_level_id == program_level_id)

        if status:
            statement = statement.where(AttendanceRecord.status == status)

        return list(self.session.exec(statement).all())

    def count_filtered(
        self,
        student_query: Optional[str] = None,
        status: Optional[str] = None,
        teacher_id: Optional[uuid.UUID] = None,
        course_id: Optional[uuid.UUID] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        year_level: Optional[int] = None,
        program_level_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
    ) -> int:
        """Compte les enregistrements avec filtres."""
        from app.models.student import Student
        from app.models.user import User
        from app.models.attendance_session import AttendanceSession
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel

        statement = select(func.count()).select_from(AttendanceRecord)

        if student_query:
            student_query = f"%{student_query}%"
            statement = (
                statement.join(Student, isouter=True)
                .join(User, isouter=True)
                .where(
                    (User.first_name.ilike(student_query))
                    | (User.last_name.ilike(student_query))
                    | (User.user_number.ilike(student_query))
                )
            )

        if teacher_id or course_id or academic_year_id or year_level or program_level_id or session_id:
            statement = (
                statement
                .join(AttendanceSession, isouter=True)
                .join(Schedule, isouter=True)
                .join(CourseSession, isouter=True)
            )

            if teacher_id:
                statement = statement.where(CourseSession.teacher_id == teacher_id)
            if session_id:
                statement = statement.where(CourseSession.session_id == session_id)

            if course_id or academic_year_id or year_level or program_level_id:
                statement = statement.join(CourseProgramLevel, isouter=True)
                if course_id:
                    statement = statement.where(CourseProgramLevel.course_id == course_id)
                if academic_year_id:
                    statement = statement.where(CourseProgramLevel.academic_year_id == academic_year_id)
                if year_level:
                    statement = statement.where(CourseProgramLevel.year_level == year_level)
                if program_level_id:
                    statement = statement.where(CourseProgramLevel.program_level_id == program_level_id)

        if status:
            statement = statement.where(AttendanceRecord.status == status)

        return self.session.exec(statement).one()

    def get_by_id_with_details(self, record_id: uuid.UUID) -> Optional[AttendanceRecord]:
        """Récupère un enregistrement avec les relations student et attendance_session."""
        statement = (
            select(AttendanceRecord)
            .where(AttendanceRecord.id == record_id)
            .options(
                selectinload(AttendanceRecord.student),
                selectinload(AttendanceRecord.attendance_session)
            )
        )
        return self.session.exec(statement).first()

    def get_by_attendance_session(
        self, attendance_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceRecord]:
        """Récupère tous les enregistrements d'une séance."""
        statement = (
            select(AttendanceRecord)
            .where(AttendanceRecord.attendance_session_id == attendance_session_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_student(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceRecord]:
        """Récupère tous les enregistrements d'un étudiant."""
        statement = (
            select(AttendanceRecord)
            .where(AttendanceRecord.student_id == student_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_student_and_session(
        self, student_id: uuid.UUID, attendance_session_id: uuid.UUID
    ) -> Optional[AttendanceRecord]:
        """Récupère l'enregistrement d'un étudiant pour une séance."""
        statement = select(AttendanceRecord).where(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.attendance_session_id == attendance_session_id
        )
        return self.session.exec(statement).first()

    def get_by_status(
        self, attendance_session_id: uuid.UUID, status: AttendanceStatus,
        skip: int = 0, limit: int = 100
    ) -> list[AttendanceRecord]:
        """Récupère les enregistrements par statut."""
        statement = (
            select(AttendanceRecord)
            .where(
                AttendanceRecord.attendance_session_id == attendance_session_id,
                AttendanceRecord.status == status
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count_by_status(
        self, attendance_session_id: uuid.UUID, status: AttendanceStatus
    ) -> int:
        """Compte les enregistrements par statut."""
        statement = select(func.count()).select_from(AttendanceRecord).where(
            AttendanceRecord.attendance_session_id == attendance_session_id,
            AttendanceRecord.status == status
        )
        return self.session.exec(statement).one()

    def exists_for_student_and_session(
        self, student_id: uuid.UUID, attendance_session_id: uuid.UUID,
        exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si un enregistrement existe pour cet étudiant et cette séance."""
        statement = select(AttendanceRecord).where(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.attendance_session_id == attendance_session_id
        )
        
        if exclude_id:
            statement = statement.where(AttendanceRecord.id != exclude_id)
        
        return self.session.exec(statement).first() is not None

    def get_student_attendance_rate(
        self, student_id: uuid.UUID, schedule_id: uuid.UUID
    ) -> dict:
        """Calcule le taux de présence d'un étudiant pour un horaire."""
        from app.models.attendance_session import AttendanceSession
        
        # Récupérer tous les enregistrements de l'étudiant pour cet horaire
        statement = (
            select(AttendanceRecord)
            .join(AttendanceSession)
            .where(
                AttendanceRecord.student_id == student_id,
                AttendanceSession.schedule_id == schedule_id,
                AttendanceSession.attendance_taken == True
            )
        )
        records = list(self.session.exec(statement).all())
        
        total = len(records)
        if total == 0:
            return {
                "total_sessions": 0,
                "present_count": 0,
                "absent_count": 0,
                "late_count": 0,
                "excused_count": 0,
                "attendance_rate": 0.0
            }
        
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
        late = sum(1 for r in records if r.status == AttendanceStatus.LATE)
        excused = sum(1 for r in records if r.status == AttendanceStatus.EXCUSED)
        
        # Calculer le taux de présence (présent + retard)
        attendance_rate = ((present + late) / total) * 100 if total > 0 else 0.0
        
        return {
            "total_sessions": total,
            "present_count": present,
            "absent_count": absent,
            "late_count": late,
            "excused_count": excused,
            "attendance_rate": round(attendance_rate, 2)
        }