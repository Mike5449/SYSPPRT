import uuid
from typing import Optional

from sqlmodel import Session, select

from app.models.university import University
from app.repositories.base_repository import BaseRepository


class UniversityRepository(BaseRepository[University]):
    """Repository pour la gestion des universités."""

    def __init__(self, session: Session):
        super().__init__(University, session)

    def get_by_code(self, code: str) -> Optional[University]:
        """Récupère une université par son code."""
        statement = select(University).where(University.code == code)
        return self.session.exec(statement).first()

    def get_by_name(self, name: str) -> Optional[University]:
        """Récupère une université par son nom."""
        statement = select(University).where(University.name == name)
        return self.session.exec(statement).first()

    def get_active_universities(self, skip: int = 0, limit: int = 100):
        """Récupère les universités actives."""
        statement = (
            select(University)
            .where(University.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def code_exists(self, code: str, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Vérifie si un code d'université existe déjà."""
        statement = select(University).where(University.code == code)
        if exclude_id:
            statement = statement.where(University.id != exclude_id)
        return self.session.exec(statement).first() is not None

    def name_exists(self, name: str, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Vérifie si un nom d'université existe déjà."""
        statement = select(University).where(University.name == name)
        if exclude_id:
            statement = statement.where(University.id != exclude_id)
        return self.session.exec(statement).first() is not None