import uuid
from datetime import time
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.models.schedule import Schedule
from app.models.course_session import CourseSession
from app.models.course_program_level import CourseProgramLevel
from app.models.session import Session as SessionModel
from app.models.teacher import Teacher
from app.repositories.base_repository import BaseRepository


class ScheduleRepository(BaseRepository[Schedule]):
    """Repository pour la gestion des horaires."""

    def __init__(self, session: Session):
        super().__init__(Schedule, session)

    def get_by_course_session(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Schedule]:
        """Récupère tous les horaires d'un cours-session."""
        statement = (
            select(Schedule)
            .where(Schedule.course_session_id == course_session_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_day_of_week(
        self, course_session_id: uuid.UUID, day_of_week: int
    ) -> list[Schedule]:
        """Récupère les horaires pour un jour spécifique."""
        statement = select(Schedule).where(
            Schedule.course_session_id == course_session_id,
            Schedule.day_of_week == day_of_week
        )
        return list(self.session.exec(statement).all())

    def get_active_schedules(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Schedule]:
        """Récupère les horaires actifs d'un cours-session."""
        statement = (
            select(Schedule)
            .where(
                Schedule.course_session_id == course_session_id,
                Schedule.is_active == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def exists_for_time_slot(
        self, course_session_id: uuid.UUID, day_of_week: int, 
        start_time: str | time, end_time: str | time, exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si un horaire existe déjà pour ce créneau."""
        # Convert strings to time objects if needed
        if isinstance(start_time, str):
            start_time = time.fromisoformat(start_time)
        if isinstance(end_time, str):
            end_time = time.fromisoformat(end_time)
        
        statement = select(Schedule).where(
            Schedule.course_session_id == course_session_id,
            Schedule.day_of_week == day_of_week,
            Schedule.start_time == start_time,
            Schedule.end_time == end_time
        )
        
        if exclude_id:
            statement = statement.where(Schedule.id != exclude_id)
        
        return self.session.exec(statement).first() is not None

    def get_schedules_by_filters(
        self,
        program_level_id: Optional[uuid.UUID] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        session_number: Optional[int] = None,
        year_level: Optional[int] = None,
        teacher_id: Optional[uuid.UUID] = None,
        day_of_week: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[Schedule]:
        """Récupère les horaires filtrés par différents critères."""
        statement = (
            select(Schedule)
            .join(CourseSession, Schedule.course_session_id == CourseSession.id)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .join(SessionModel, CourseSession.session_id == SessionModel.id)
            .where(Schedule.is_active == True)
            .options(selectinload(Schedule.course_session))
        )

        if program_level_id:
            statement = statement.where(CourseProgramLevel.program_level_id == program_level_id)
        
        if academic_year_id:
            statement = statement.where(SessionModel.academic_year_id == academic_year_id)
        
        if session_number is not None:
            statement = statement.where(SessionModel.session_number == session_number)
        
        if year_level is not None:
            statement = statement.where(CourseSession.year_level == year_level)
        
        if teacher_id:
            statement = statement.where(CourseSession.teacher_id == teacher_id)

        if day_of_week is not None:
            statement = statement.where(Schedule.day_of_week == day_of_week)

        statement = statement.offset(skip).limit(limit)
        
        return list(self.session.exec(statement).all())