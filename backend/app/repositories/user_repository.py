import uuid
from typing import Optional, List
from sqlmodel import Session, select, func
from app.models.user import User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository pour la gestion des utilisateurs."""

    def __init__(self, session: Session):
        super().__init__(User, session)

    def get_by_email(self, email: str) -> Optional[User]:
        """Récupère un utilisateur par son email."""
        statement = select(User).where(User.email == email)
        return self.session.exec(statement).first()

    def get_active_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Récupère les utilisateurs actifs."""
        statement = (
            select(User)
            .where(User.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_superusers(self) -> List[User]:
        """Récupère tous les super-utilisateurs."""
        statement = select(User).where(User.is_superuser == True)
        return self.session.exec(statement).all()

    def email_exists(self, email: str, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Vérifie si un email existe déjà (avec possibilité d'exclure un ID)."""
        statement = select(User).where(User.email == email)
        if exclude_id:
            statement = statement.where(User.id != exclude_id)
        return self.session.exec(statement).first() is not None

    def count_active_users(self) -> int:
        """Compte le nombre d'utilisateurs actifs."""
        statement = select(func.count()).select_from(User).where(User.is_active == True)
        return self.session.exec(statement).one()

    def get_users_paginated(
        self, skip: int = 0, limit: int = 100
    ) -> tuple[List[User], int]:
        """Récupère les utilisateurs paginés avec le count total."""
        # Count total
        count_statement = select(func.count()).select_from(User)
        total = self.session.exec(count_statement).one()
        
        # Get paginated data
        statement = select(User).offset(skip).limit(limit)
        users = self.session.exec(statement).all()
        
        return users, total