import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.university import University, UniversityCreate, UniversityUpdate
from app.repositories.university_repository import UniversityRepository
from app.services.base_service import BaseService


class UniversityService(BaseService[University, UniversityRepository]):
    """Service pour la gestion des universités."""

    def __init__(self, session: Session):
        repository = UniversityRepository(session)
        super().__init__(repository)

    def create_university(self, university_create: UniversityCreate) -> University:
        """Crée une nouvelle université avec validations."""
        # Vérifier si le code existe déjà
        if self.repository.code_exists(university_create.code):
            raise ValueError(f"University code '{university_create.code}' already exists")

        # Vérifier si le nom existe déjà
        if self.repository.name_exists(university_create.name):
            raise ValueError(f"University name '{university_create.name}' already exists")

        # Créer l'université
        db_university = University.model_validate(university_create)
        return self.repository.create(db_university)

    def update_university(
        self, university_id: uuid.UUID, university_update: UniversityUpdate
    ) -> Optional[University]:
        """Met à jour une université avec validations."""
        db_university = self.repository.get_by_id(university_id)
        if not db_university:
            return None

        update_data = university_update.model_dump(exclude_unset=True)

        # Vérifier le code si modifié
        if "code" in update_data:
            if self.repository.code_exists(update_data["code"], exclude_id=university_id):
                raise ValueError(f"University code '{update_data['code']}' already exists")

        # Vérifier le nom si modifié
        if "name" in update_data:
            if self.repository.name_exists(update_data["name"], exclude_id=university_id):
                raise ValueError(f"University name '{update_data['name']}' already exists")

        # Mettre à jour updated_at
        update_data["updated_at"] = datetime.utcnow()

        return self.repository.update(university_id, update_data)

    def get_by_code(self, code: str) -> Optional[University]:
        """Récupère une université par son code."""
        return self.repository.get_by_code(code)

    def get_active_universities(self, skip: int = 0, limit: int = 100):
        """Récupère les universités actives."""
        return self.repository.get_active_universities(skip, limit)

    def deactivate_university(self, university_id: uuid.UUID) -> Optional[University]:
        """Désactive une université."""
        return self.repository.update(university_id, {"is_active": False, "updated_at": datetime.utcnow()})

    def activate_university(self, university_id: uuid.UUID) -> Optional[University]:
        """Active une université."""
        return self.repository.update(university_id, {"is_active": True, "updated_at": datetime.utcnow()})