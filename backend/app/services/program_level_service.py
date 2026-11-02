import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.program_level import ProgramLevel, ProgramLevelCreate, ProgramLevelUpdate
from app.repositories.program_level_repository import ProgramLevelRepository
from app.services.base_service import BaseService


class ProgramLevelService(BaseService[ProgramLevel, ProgramLevelRepository]):
    """Service pour la gestion des niveaux de programme."""

    def __init__(self, session: Session):
        repository = ProgramLevelRepository(session)
        super().__init__(repository)

    def create_level(self, level_create: ProgramLevelCreate) -> ProgramLevel:
        """Crée un nouveau niveau avec validations."""
        # Vérifier si le code existe déjà
        if self.repository.code_exists(level_create.code):
            raise ValueError(f"Program level code '{level_create.code}' already exists")

        # Créer le niveau
        db_level = ProgramLevel.model_validate(level_create)
        return self.repository.create(db_level)

    def update_level(
        self, level_id: uuid.UUID, level_update: ProgramLevelUpdate
    ) -> Optional[ProgramLevel]:
        """Met à jour un niveau avec validations."""
        db_level = self.repository.get_by_id(level_id)
        if not db_level:
            return None

        update_data = level_update.model_dump(exclude_unset=True)

        # Vérifier le code si modifié
        if "code" in update_data:
            if self.repository.code_exists(update_data["code"], exclude_id=level_id):
                raise ValueError(f"Program level code '{update_data['code']}' already exists")

        # Mettre à jour updated_at
        update_data["updated_at"] = datetime.utcnow()

        return self.repository.update(level_id, update_data)

    def get_by_code(self, code: str) -> Optional[ProgramLevel]:
        """Récupère un niveau par son code."""
        return self.repository.get_by_code(code)

    def get_active_levels(self, skip: int = 0, limit: int = 100):
        """Récupère les niveaux actifs."""
        return self.repository.get_active_levels(skip, limit)