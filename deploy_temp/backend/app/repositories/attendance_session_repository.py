import uuid
from datetime import date
from typing import Optional

from sqlmodel import Session, select

from app.models.attendance_session import AttendanceSession
from app.repositories.base_repository import BaseRepository
from sqlalchemy.orm import selectinload


class AttendanceSessionRepository(BaseRepository[AttendanceSession]):
    """Repository pour la gestion des séances de présence."""

    def __init__(self, session: Session):
        super().__init__(AttendanceSession, session)

    def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        course_query: Optional[str] = None,
        session_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> list[AttendanceSession]:
        """Récupère toutes les entités avec eager loading et filtres."""
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        from app.models.course import Course

        statement = (
            select(AttendanceSession)
            .join(AttendanceSession.schedule)
            .join(Schedule.course_session)
            .join(CourseSession.course_program_level)
            .join(CourseProgramLevel.course)
        )

        if course_query:
            statement = statement.where(Course.name.ilike(f"%{course_query}%"))
        
        if session_date:
            statement = statement.where(AttendanceSession.session_date == session_date)
            
        if status:
            if status.upper() == "CANCELLED":
                statement = statement.where(AttendanceSession.is_cancelled == True)
            elif status.upper() == "ACTIVE":
                statement = statement.where(AttendanceSession.is_cancelled == False)
            elif status.upper() == "TAKEN":
                statement = statement.where(AttendanceSession.attendance_taken == True)
            elif status.upper() == "PENDING":
                statement = statement.where(AttendanceSession.attendance_taken == False)

        statement = (
            statement.options(
                selectinload(AttendanceSession.schedule)
                .selectinload(Schedule.course_session)
                .selectinload(CourseSession.course_program_level)
                .selectinload(CourseProgramLevel.course)
            )
            .order_by(AttendanceSession.session_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count_attendance_sessions(
        self,
        course_query: Optional[str] = None,
        session_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> int:
        """Compte les séances avec filtres."""
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        from app.models.course import Course
        from sqlmodel import func

        statement = (
            select(func.count(AttendanceSession.id))
            .join(AttendanceSession.schedule)
            .join(Schedule.course_session)
            .join(CourseSession.course_program_level)
            .join(CourseProgramLevel.course)
        )

        if course_query:
            statement = statement.where(Course.name.ilike(f"%{course_query}%"))
        
        if session_date:
            statement = statement.where(AttendanceSession.session_date == session_date)
            
        if status:
            if status.upper() == "CANCELLED":
                statement = statement.where(AttendanceSession.is_cancelled == True)
            elif status.upper() == "ACTIVE":
                statement = statement.where(AttendanceSession.is_cancelled == False)
            elif status.upper() == "TAKEN":
                statement = statement.where(AttendanceSession.attendance_taken == True)
            elif status.upper() == "PENDING":
                statement = statement.where(AttendanceSession.attendance_taken == False)

        return self.session.exec(statement).one()

    def get_by_schedule(
        self, schedule_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère toutes les séances d'un horaire."""
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel

        statement = (
            select(AttendanceSession)
            .where(AttendanceSession.schedule_id == schedule_id)
            .options(
                selectinload(AttendanceSession.schedule)
                .selectinload(Schedule.course_session)
                .selectinload(CourseSession.course_program_level)
                .selectinload(CourseProgramLevel.course)
            )
            .order_by(AttendanceSession.session_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_date(
        self, schedule_id: uuid.UUID, session_date: date
    ) -> Optional[AttendanceSession]:
        """Récupère une séance pour une date spécifique."""
        statement = select(AttendanceSession).where(
            AttendanceSession.schedule_id == schedule_id,
            AttendanceSession.session_date == session_date
        )
        return self.session.exec(statement).first()

    def get_by_date_range(
        self, schedule_id: uuid.UUID, start_date: date, end_date: date,
        skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère les séances dans une période."""
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel

        statement = (
            select(AttendanceSession)
            .where(
                AttendanceSession.schedule_id == schedule_id,
                AttendanceSession.session_date >= start_date,
                AttendanceSession.session_date <= end_date
            )
            .options(
                selectinload(AttendanceSession.schedule)
                .selectinload(Schedule.course_session)
                .selectinload(CourseSession.course_program_level)
                .selectinload(CourseProgramLevel.course)
            )
            .order_by(AttendanceSession.session_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_upcoming_sessions(
        self, schedule_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère les séances à venir."""
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel

        today = date.today()
        statement = (
            select(AttendanceSession)
            .where(
                AttendanceSession.schedule_id == schedule_id,
                AttendanceSession.session_date >= today,
                AttendanceSession.is_cancelled == False
            )
            .options(
                selectinload(AttendanceSession.schedule)
                .selectinload(Schedule.course_session)
                .selectinload(CourseSession.course_program_level)
                .selectinload(CourseProgramLevel.course)
            )
            .order_by(AttendanceSession.session_date)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_past_sessions(
        self, schedule_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère les séances passées."""
        from app.models.schedule import Schedule
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel

        today = date.today()
        statement = (
            select(AttendanceSession)
            .where(
                AttendanceSession.schedule_id == schedule_id,
                AttendanceSession.session_date < today
            )
            .options(
                selectinload(AttendanceSession.schedule)
                .selectinload(Schedule.course_session)
                .selectinload(CourseSession.course_program_level)
                .selectinload(CourseProgramLevel.course)
            )
            .order_by(AttendanceSession.session_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_qr_token(self, token: str) -> Optional[AttendanceSession]:
        """Retrieve a session using its QR token (single‑use)."""
        statement = select(AttendanceSession).where(AttendanceSession.qr_code_token == token)
        return self.session.exec(statement).first()

    def exists_for_date(
        self, schedule_id: uuid.UUID, session_date: date,
        exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si une séance existe déjà pour cette date."""
        statement = select(AttendanceSession).where(
            AttendanceSession.schedule_id == schedule_id,
            AttendanceSession.session_date == session_date
        )
        
        if exclude_id:
            statement = statement.where(AttendanceSession.id != exclude_id)
        
        return self.session.exec(statement).first() is not None