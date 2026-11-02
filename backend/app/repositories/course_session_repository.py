import uuid
from typing import Optional

from sqlmodel import Session, select, func, or_

from app.models.course import Course
from app.models.course_session import CourseSession
from app.models.course_program_level import CourseProgramLevel
from app.models.program_level import ProgramLevel
from app.models.session import Session as AcademicSession
from app.repositories.base_repository import BaseRepository


class CourseSessionRepository(BaseRepository[CourseSession]):
    """Repository pour la gestion des cours-sessions."""

    def __init__(self, session: Session):
        super().__init__(CourseSession, session)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        course_query: Optional[str] = None,
        program_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        year_level: Optional[int] = None,
        academic_year_id: Optional[uuid.UUID] = None,
    ) -> list[CourseSession]:
        """Récupère tous les cours-sessions avec filtrage."""
        statement = select(CourseSession)
        
        # Joindre CourseProgramLevel si nécessaire pour les filtres
        if program_id or course_query or program_level_id:
            statement = statement.join(CourseProgramLevel)
            
        if program_id:
            statement = statement.join(ProgramLevel).where(ProgramLevel.program_id == program_id)
            
        if course_query:
            statement = statement.join(Course).where(
                or_(
                    Course.name.ilike(f"%{course_query}%"),
                    Course.code.ilike(f"%{course_query}%")
                )
            )
            
        if program_level_id:
            statement = statement.where(CourseProgramLevel.program_level_id == program_level_id)
            
        if teacher_id:
            statement = statement.where(CourseSession.teacher_id == teacher_id)
        if session_id:
            statement = statement.where(CourseSession.session_id == session_id)
        if is_active is not None:
            statement = statement.where(CourseSession.is_active == is_active)
        if year_level is not None:
            statement = statement.where(CourseSession.year_level == year_level)
        if academic_year_id:
            statement = statement.join(
                AcademicSession, CourseSession.session_id == AcademicSession.id
            ).where(AcademicSession.academic_year_id == academic_year_id)

        statement = statement.offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def count_course_sessions(
        self,
        course_query: Optional[str] = None,
        program_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        year_level: Optional[int] = None,
        academic_year_id: Optional[uuid.UUID] = None,
    ) -> int:
        """Compte les cours-sessions avec filtrage."""
        statement = select(func.count()).select_from(CourseSession)
        
        # Joindre CourseProgramLevel si nécessaire pour les filtres
        if program_id or course_query or program_level_id:
            statement = statement.join(CourseProgramLevel)
            
        if program_id:
            statement = statement.join(ProgramLevel).where(ProgramLevel.program_id == program_id)
            
        if course_query:
            statement = statement.join(Course).where(
                or_(
                    Course.name.ilike(f"%{course_query}%"),
                    Course.code.ilike(f"%{course_query}%")
                )
            )
            
        if program_level_id:
            statement = statement.where(CourseProgramLevel.program_level_id == program_level_id)
            
        if teacher_id:
            statement = statement.where(CourseSession.teacher_id == teacher_id)
        if session_id:
            statement = statement.where(CourseSession.session_id == session_id)
        if is_active is not None:
            statement = statement.where(CourseSession.is_active == is_active)
        if year_level is not None:
            statement = statement.where(CourseSession.year_level == year_level)
        if academic_year_id:
            statement = statement.join(
                AcademicSession, CourseSession.session_id == AcademicSession.id
            ).where(AcademicSession.academic_year_id == academic_year_id)

        return self.session.exec(statement).one()

    def get_by_session(
        self, session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[CourseSession]:
        """Récupère tous les cours d'une session."""
        statement = (
            select(CourseSession)
            .where(CourseSession.session_id == session_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_course_program_level(
        self, course_program_level_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[CourseSession]:
        """Récupère toutes les sessions d'un course-program level."""
        statement = (
            select(CourseSession)
            .where(CourseSession.course_program_level_id == course_program_level_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_course_program_level_and_session(
        self, course_program_level_id: uuid.UUID, session_id: uuid.UUID
    ) -> Optional[CourseSession]:
        """Récupère une liaison course-program-level-session spécifique."""
        statement = select(CourseSession).where(
            CourseSession.course_program_level_id == course_program_level_id,
            CourseSession.session_id == session_id
        )
        return self.session.exec(statement).first()

    def get_active_course_sessions(
        self, skip: int = 0, limit: int = 100
    ) -> list[CourseSession]:
        """Récupère les cours-sessions actifs."""
        statement = (
            select(CourseSession)
            .where(CourseSession.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def exists(
        self,
        course_program_level_id: uuid.UUID,
        session_id: uuid.UUID,
        year_level: Optional[int] = None,
    ) -> bool:
        """Vérifie si une liaison course-program-level-session existe.

        L'unicité porte sur (course_program_level, session, année) : un même
        course_program_level peut être offert dans une même session pour des
        années différentes.
        """
        statement = select(CourseSession).where(
            CourseSession.course_program_level_id == course_program_level_id,
            CourseSession.session_id == session_id,
        )
        if year_level is not None:
            statement = statement.where(CourseSession.year_level == year_level)
        return self.session.exec(statement).first() is not None