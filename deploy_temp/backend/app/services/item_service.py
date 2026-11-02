import uuid
from typing import List, Optional
from sqlmodel import Session
from app.models.item import Item, ItemCreate, ItemUpdate
from app.repositories.item_repository import ItemRepository
from app.services.base_service import BaseService


class ItemService(BaseService[Item, ItemRepository]):
    """Service pour la gestion des items."""

    def __init__(self, session: Session):
        repository = ItemRepository(session)
        super().__init__(repository)

    def create_item(self, item_create: ItemCreate, owner_id: uuid.UUID) -> Item:
        """Crée un nouvel item pour un utilisateur."""
        db_item = Item.model_validate(item_create, update={"owner_id": owner_id})
        return self.repository.create(db_item)

    def get_user_items(
        self, owner_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> List[Item]:
        """Récupère les items d'un utilisateur."""
        return self.repository.get_by_owner(owner_id, skip, limit)

    def get_user_items_paginated(
        self, owner_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> tuple[List[Item], int]:
        """Récupère les items d'un utilisateur avec pagination."""
        return self.repository.get_by_owner_paginated(owner_id, skip, limit)

    def update_item(
        self, item_id: uuid.UUID, item_update: ItemUpdate, owner_id: uuid.UUID
    ) -> Optional[Item]:
        """Met à jour un item (vérifie que l'utilisateur est le propriétaire)."""
        item = self.repository.get_by_id_and_owner(item_id, owner_id)
        if not item:
            return None
        
        update_data = item_update.model_dump(exclude_unset=True)
        return self.repository.update(item_id, update_data)

    def delete_item(self, item_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        """Supprime un item (vérifie que l'utilisateur est le propriétaire)."""
        item = self.repository.get_by_id_and_owner(item_id, owner_id)
        if not item:
            return False
        
        return self.repository.delete(item_id)

    def search_items(
        self, title: str, skip: int = 0, limit: int = 100
    ) -> List[Item]:
        """Recherche des items par titre."""
        return self.repository.search_by_title(title, skip, limit)

    def count_user_items(self, owner_id: uuid.UUID) -> int:
        """Compte les items d'un utilisateur."""
        return self.repository.count_by_owner(owner_id)