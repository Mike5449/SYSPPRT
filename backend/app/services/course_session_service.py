import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.course_session import CourseSession, CourseSessionCreate, CourseSessionUpdate
from app.repositories.course_session_repository import CourseSessionRepository
from app.services.base_service import BaseService


class CourseSessionService(BaseService[CourseSession, CourseSessionRepository]):
    """Service pour la gestion des cours-sessions."""

    def __init__(self, session: Session):
        repository = CourseSessionRepository(session)
        super().__init__(repository)

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
        return self.repository.get_all(
            skip=skip,
            limit=limit,
            course_query=course_query,
            program_id=program_id,
            program_level_id=program_level_id,
            teacher_id=teacher_id,
            session_id=session_id,
            is_active=is_active,
            year_level=year_level,
            academic_year_id=academic_year_id,
        )

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
        return self.repository.count_course_sessions(
            course_query=course_query,
            program_id=program_id,
            program_level_id=program_level_id,
            teacher_id=teacher_id,
            session_id=session_id,
            is_active=is_active,
            year_level=year_level,
            academic_year_id=academic_year_id,
        )

    def create_course_session(
        self, course_session_create: CourseSessionCreate
    ) -> CourseSession:
        """Crée une nouvelle liaison cours-session avec validations."""
        # Vérifier si la liaison existe déjà (unicité: cpl + session + année)
        if self.repository.exists(
            course_session_create.course_program_level_id,
            course_session_create.session_id,
            year_level=course_session_create.year_level,
        ):
            raise ValueError(
                "This course-program level is already assigned to this session "
                f"for year {course_session_create.year_level}"
            )

        # Créer la liaison
        course_session = CourseSession.model_validate(course_session_create)
        return self.repository.create(course_session)

    def update_course_session(
        self, course_session_id: uuid.UUID, course_session_update: CourseSessionUpdate
    ) -> Optional[CourseSession]:
        """Met à jour une liaison cours-session."""
        course_session = self.repository.get_by_id(course_session_id)
        if not course_session:
            return None

        # Mettre à jour
        course_session_update.updated_at = datetime.utcnow()
        return self.repository.update(course_session_id, course_session_update)

    def get_by_session(
        self, session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[CourseSession]:
        """Récupère les cours d'une session."""
        return self.repository.get_by_session(session_id, skip, limit)

    def get_by_course_program_level(
        self, course_program_level_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[CourseSession]:
        """Récupère les sessions d'un course-program level."""
        return self.repository.get_by_course_program_level(course_program_level_id, skip, limit)

    def get_active_course_sessions(
        self, skip: int = 0, limit: int = 100
    ) -> list[CourseSession]:
        """Récupère les cours-sessions actifs."""
        return self.repository.get_active_course_sessions(skip, limit)

    def increment_enrolled_students(
        self, course_session_id: uuid.UUID
    ) -> Optional[CourseSession]:
        """Incrémente le nombre d'étudiants inscrits."""
        course_session = self.repository.get_by_id(course_session_id)
        if not course_session:
            return None

        # Vérifier la capacité max
        if (course_session.max_students and 
            course_session.enrolled_students >= course_session.max_students):
            raise ValueError("Maximum student capacity reached")

        update = CourseSessionUpdate(
            enrolled_students=course_session.enrolled_students + 1,
            updated_at=datetime.utcnow()
        )
        return self.repository.update(course_session_id, update)

    def decrement_enrolled_students(
        self, course_session_id: uuid.UUID
    ) -> Optional[CourseSession]:
        """Décrémente le nombre d'étudiants inscrits."""
        course_session = self.repository.get_by_id(course_session_id)
        if not course_session:
            return None

        if course_session.enrolled_students <= 0:
            raise ValueError("No students to unenroll")

        update = CourseSessionUpdate(
            enrolled_students=course_session.enrolled_students - 1,
            updated_at=datetime.utcnow()
        )
        return self.repository.update(course_session_id, update)