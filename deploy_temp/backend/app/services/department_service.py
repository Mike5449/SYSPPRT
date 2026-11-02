import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.department import Department, DepartmentCreate, DepartmentUpdate
from app.repositories.department_repository import DepartmentRepository
from app.services.base_service import BaseService


class DepartmentService(BaseService[Department, DepartmentRepository]):
    """Service pour la gestion des départements."""

    def __init__(self, session: Session):
        repository = DepartmentRepository(session)
        super().__init__(repository)

    def create_department(self, department_create: DepartmentCreate) -> Department:
        """Crée un nouveau département avec validations."""
        # Vérifier si le code existe déjà
        if self.repository.code_exists(department_create.code):
            raise ValueError(
                f"Department code '{department_create.code}' already exists"
            )

        # Créer le département
        department = Department.model_validate(department_create)
        return self.repository.create(department)

    def update_department(
        self, department_id: uuid.UUID, department_update: DepartmentUpdate
    ) -> Optional[Department]:
        """Met à jour un département avec validations."""
        department = self.repository.get_by_id(department_id)
        if not department:
            return None

        # Vérifier le code si changé
        if department_update.code and department_update.code != department.code:
            if self.repository.code_exists(
                department_update.code,
                exclude_id=department_id
            ):
                raise ValueError(
                    f"Department code '{department_update.code}' already exists"
                )

        # Mettre à jour
        department_update.updated_at = datetime.utcnow()
        return self.repository.update(department_id, department_update)

    def deactivate_department(self, department_id: uuid.UUID) -> Optional[Department]:
        """Désactive un département."""
        update = DepartmentUpdate(is_active=False, updated_at=datetime.utcnow())
        return self.repository.update(department_id, update)

    def activate_department(self, department_id: uuid.UUID) -> Optional[Department]:
        """Active un département."""
        update = DepartmentUpdate(is_active=True, updated_at=datetime.utcnow())
        return self.repository.update(department_id, update)