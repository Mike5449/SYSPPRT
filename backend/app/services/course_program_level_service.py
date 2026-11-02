import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.course_program_level import CourseProgramLevel, CourseProgramLevelCreate, CourseProgramLevelUpdate
from app.repositories.course_program_level_repository import CourseProgramLevelRepository
from app.services.base_service import BaseService


class CourseProgramLevelService(BaseService[CourseProgramLevel, CourseProgramLevelRepository]):
    """Service pour la gestion des relations Course-ProgramLevel."""

    def __init__(self, session: Session):
        self.session = session
        repository = CourseProgramLevelRepository(session)
        super().__init__(repository)

    def create_course_program_level(self, cpl_create: CourseProgramLevelCreate) -> CourseProgramLevel:
        """Crée une nouvelle relation avec validations."""
        # Vérifier si la relation existe déjà (unicité sur cours + niveau + année)
        if self.repository.exists(
            cpl_create.course_id,
            cpl_create.program_level_id,
            year_level=cpl_create.year_level,
        ):
            raise ValueError(
                f"Relation between course {cpl_create.course_id} and program level "
                f"{cpl_create.program_level_id} (year {cpl_create.year_level}) already exists"
            )

        # Créer la relation
        cpl = CourseProgramLevel.model_validate(cpl_create)
        return self.repository.create(cpl)

    def update_course_program_level(
        self, cpl_id: uuid.UUID, cpl_update: CourseProgramLevelUpdate
    ) -> Optional[CourseProgramLevel]:
        """Met à jour une relation avec validations."""
        cpl = self.repository.get_by_id(cpl_id)
        if not cpl:
            return None

        # Vérifier la relation si modifiée (cours / niveau / année)
        if cpl_update.course_id or cpl_update.program_level_id or cpl_update.year_level:
            course_id = cpl_update.course_id if cpl_update.course_id else cpl.course_id
            program_level_id = cpl_update.program_level_id if cpl_update.program_level_id else cpl.program_level_id
            year_level = cpl_update.year_level if cpl_update.year_level is not None else cpl.year_level

            if self.repository.exists(
                course_id, program_level_id, year_level=year_level, exclude_id=cpl_id
            ):
                raise ValueError(
                    f"Relation between course {course_id} and program level "
                    f"{program_level_id} (year {year_level}) already exists"
                )

        # Mettre à jour
        cpl_update.updated_at = datetime.utcnow()
        return self.repository.update(cpl_id, cpl_update)

    def get_by_course(self, course_id: uuid.UUID, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations pour un cours."""
        return self.repository.get_by_course(course_id, skip, limit)

    def get_by_program_level(self, program_level_id: uuid.UUID, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations pour un niveau de programme."""
        return self.repository.get_by_program_level(program_level_id, skip, limit)

    def get_by_year_level(self, year_level: int, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations pour une année donnée."""
        return self.repository.get_by_year_level(year_level, skip, limit)

    def get_active(self, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations actives."""
        return self.repository.get_active(skip, limit)
