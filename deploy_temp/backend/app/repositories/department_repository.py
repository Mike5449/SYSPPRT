import uuid
from typing import Optional

from sqlmodel import Session, select

from app.models.department import Department
from app.repositories.base_repository import BaseRepository


class DepartmentRepository(BaseRepository[Department]):
    """Repository pour la gestion des départements."""

    def __init__(self, session: Session):
        super().__init__(Department, session)

    def get_by_code(self, code: str) -> Optional[Department]:
        """Récupère un département par son code."""
        statement = select(Department).where(Department.code == code)
        return self.session.exec(statement).first()

    def code_exists(
        self, code: str, exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si un code de département existe déjà."""
        statement = select(Department).where(Department.code == code)
        
        if exclude_id:
            statement = statement.where(Department.id != exclude_id)
        
        return self.session.exec(statement).first() is not None