import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.faculty import Faculty, FacultyCreate, FacultyUpdate
from app.repositories.faculty_repository import FacultyRepository
from app.services.base_service import BaseService


class FacultyService(BaseService[Faculty, FacultyRepository]):
    """Service pour la gestion des facultés."""

    def __init__(self, session: Session):
        repository = FacultyRepository(session)
        super().__init__(repository)

    def create_faculty(self, faculty_create: FacultyCreate) -> Faculty:
        """Crée une nouvelle faculté avec validations."""
        # Vérifier si le code existe déjà dans ce département
        if self.repository.code_exists_in_department(
            faculty_create.code, 
            faculty_create.department_id
        ):
            raise ValueError(
                f"Faculty code '{faculty_create.code}' already exists in this department"
            )

        # Créer la faculté
        faculty = Faculty.model_validate(faculty_create)
        return self.repository.create(faculty)

    def update_faculty(
        self, faculty_id: uuid.UUID, faculty_update: FacultyUpdate
    ) -> Optional[Faculty]:
        """Met à jour une faculté avec validations."""
        faculty = self.repository.get_by_id(faculty_id)
        if not faculty:
            return None

        # Vérifier le code si changé
        if faculty_update.code and faculty_update.code != faculty.code:
            department_id = faculty_update.department_id or faculty.department_id
            if self.repository.code_exists_in_department(
                faculty_update.code, 
                department_id,
                exclude_id=faculty_id
            ):
                raise ValueError(
                    f"Faculty code '{faculty_update.code}' already exists in this department"
                )

        # Mettre à jour
        faculty_update.updated_at = datetime.utcnow()
        return self.repository.update(faculty_id, faculty_update)

    def get_by_department(
        self, department_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Faculty]:
        """Récupère les facultés d'un département."""
        return self.repository.get_by_department(department_id, skip, limit)

    def get_active_by_department(
        self, department_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Faculty]:
        """Récupère les facultés actives d'un département."""
        return self.repository.get_active_by_department(department_id, skip, limit)

    def get_active_faculties(
        self, skip: int = 0, limit: int = 100
    ) -> list[Faculty]:
        """Récupère toutes les facultés actives."""
        return self.repository.get_active_faculties(skip, limit)

    def deactivate_faculty(self, faculty_id: uuid.UUID) -> Optional[Faculty]:
        """Désactive une faculté."""
        update = FacultyUpdate(is_active=False, updated_at=datetime.utcnow())
        return self.repository.update(faculty_id, update)

    def activate_faculty(self, faculty_id: uuid.UUID) -> Optional[Faculty]:
        """Active une faculté."""
        update = FacultyUpdate(is_active=True, updated_at=datetime.utcnow())
        return self.repository.update(faculty_id, update)