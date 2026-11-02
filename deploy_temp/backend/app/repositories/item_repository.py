import uuid
from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.item import Item
from app.repositories.base_repository import BaseRepository


class ItemRepository(BaseRepository[Item]):
    """Repository pour la gestion des items."""

    def __init__(self, session: Session):
        super().__init__(Item, session)

    def get_by_owner(
        self, owner_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> List[Item]:
        """Récupère les items d'un propriétaire spécifique."""
        statement = (
            select(Item)
            .where(Item.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_owner_paginated(
        self, owner_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> tuple[List[Item], int]:
        """Récupère les items d'un propriétaire avec le count total."""
        # Count total
        count_statement = (
            select(func.count())
            .select_from(Item)
            .where(Item.owner_id == owner_id)
        )
        total = self.session.exec(count_statement).one()
        
        # Get paginated data
        statement = (
            select(Item)
            .where(Item.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        items = self.session.exec(statement).all()
        
        return items, total

    def search_by_title(
        self, title: str, skip: int = 0, limit: int = 100
    ) -> List[Item]:
        """Recherche des items par titre."""
        statement = (
            select(Item)
            .where(Item.title.contains(title))
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def count_by_owner(self, owner_id: uuid.UUID) -> int:
        """Compte les items d'un propriétaire."""
        statement = (
            select(func.count())
            .select_from(Item)
            .where(Item.owner_id == owner_id)
        )
        return self.session.exec(statement).one()

    def get_by_id_and_owner(
        self, item_id: uuid.UUID, owner_id: uuid.UUID
    ) -> Optional[Item]:
        """Récupère un item par ID et propriétaire (pour vérifier les droits)."""
        statement = select(Item).where(
            Item.id == item_id, Item.owner_id == owner_id
        )
        return self.session.exec(statement).first()

    def delete_by_owner(self, owner_id: uuid.UUID) -> int:
        """Supprime tous les items d'un propriétaire (retourne le nombre supprimé)."""
        items = self.get_by_owner(owner_id, skip=0, limit=10000)
        count = len(items)
        for item in items:
            self.session.delete(item)
        self.session.commit()
        return count