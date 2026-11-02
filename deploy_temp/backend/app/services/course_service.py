import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.course import Course
from app.models.course import CourseWithSessionInfo, CourseCreate, CourseUpdate
from app.repositories.course_repository import CourseRepository
from app.services.base_service import BaseService


class CourseService(BaseService[Course, CourseRepository]):
    """Service pour la gestion des cours."""

    def __init__(self, session: Session):
        repository = CourseRepository(session)
        super().__init__(repository)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        name: Optional[str] = None,
        code: Optional[str] = None,
        is_mandatory: Optional[bool] = None,
        is_active: Optional[bool] = None,
    ) -> list[Course]:
        """Récupère tous les cours avec filtrage."""
        return self.repository.get_all(
            skip=skip,
            limit=limit,
            name=name,
            code=code,
            is_mandatory=is_mandatory,
            is_active=is_active,
        )

    def count_courses(
        self,
        name: Optional[str] = None,
        code: Optional[str] = None,
        is_mandatory: Optional[bool] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        """Compte les cours avec filtrage."""
        return self.repository.count_courses(
            name=name,
            code=code,
            is_mandatory=is_mandatory,
            is_active=is_active,
        )

    def create_course(self, course_create: CourseCreate) -> Course:
        """Crée un nouveau cours avec validations."""
        # Vérifier si le code existe déjà
        if self.repository.code_exists(course_create.code):
            raise ValueError(f"Course code '{course_create.code}' already exists")

        # Créer le cours
        course = Course.model_validate(course_create)
        return self.repository.create(course)

    def update_course(
        self, course_id: uuid.UUID, course_update: CourseUpdate
    ) -> Optional[Course]:
        """Met à jour un cours avec validations."""
        course = self.repository.get_by_id(course_id)
        if not course:
            return None

        # Vérifier le code si changé
        if course_update.code and course_update.code != course.code:
            if self.repository.code_exists(course_update.code, exclude_id=course_id):
                raise ValueError(f"Course code '{course_update.code}' already exists")

        # Mettre à jour
        course_update.updated_at = datetime.utcnow()
        return self.repository.update(course_id, course_update)

    def get_by_program(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours d'un programme."""
        return self.repository.get_by_program(program_id, skip, limit)

    def get_by_program_and_year(
        self, program_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours d'un programme pour une année."""
        return self.repository.get_by_program_and_year(
            program_id, year_level, skip, limit
        )

    def get_mandatory_courses(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours obligatoires."""
        return self.repository.get_mandatory_courses(program_id, skip, limit)

    def get_optional_courses(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours optionnels."""
        return self.repository.get_optional_courses(program_id, skip, limit)

    def get_active_courses(
        self, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours actifs."""
        return self.repository.get_active_courses(skip, limit)

    def get_courses_by_filters(
        self,
        program_level_id: uuid.UUID,
        academic_year_id: uuid.UUID,
        session_number: Optional[int] = None,
        year_level: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[Course]:
        """Récupère les cours selon plusieurs critères."""
        return self.repository.get_courses_by_filters(
            program_level_id, academic_year_id, session_number, year_level, skip, limit
        )

    def get_courses_by_filters_enriched(
        self,
        program_level_id: uuid.UUID,
        academic_year_id: uuid.UUID,
        session_number: Optional[int] = None,
        year_level: Optional[int] = None,
        teacher_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[CourseWithSessionInfo]:
        """Récupère les cours selon plusieurs critères avec informations enrichies."""
        return self.repository.get_courses_by_filters_enriched(
            program_level_id, academic_year_id, session_number, year_level, teacher_id, skip, limit
        )