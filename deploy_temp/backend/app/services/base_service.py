import uuid
from typing import Generic, TypeVar, Optional, List
from app.repositories.base_repository import BaseRepository

ModelType = TypeVar("ModelType")
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)


class BaseService(Generic[ModelType, RepositoryType]):
    """
    Classe de base pour tous les services.
    Gère la logique métier.
    """

    def __init__(self, repository: RepositoryType):
        self.repository = repository

    def get_by_id(self, id: uuid.UUID) -> Optional[ModelType]:
        """Récupère une entité par ID (UUID)."""
        return self.repository.get_by_id(id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Récupère toutes les entités."""
        return self.repository.get_all(skip=skip, limit=limit)

    def create(self, obj: ModelType) -> ModelType:
        """Crée une nouvelle entité (avec validation métier si besoin)."""
        # Ajouter la logique métier ici avant la création
        return self.repository.create(obj)

    def update(self, id: uuid.UUID, obj_data: dict) -> Optional[ModelType]:
        """Met à jour une entité (avec validation métier si besoin)."""
        # Ajouter la logique métier ici avant la mise à jour
        return self.repository.update(id, obj_data)

    def delete(self, id: uuid.UUID) -> bool:
        """Supprime une entité (avec validation métier si besoin)."""
        # Ajouter la logique métier ici avant la suppression
        return self.repository.delete(id)

    def exists(self, id: uuid.UUID) -> bool:
        """Vérifie si une entité existe."""
        return self.repository.exists(id)