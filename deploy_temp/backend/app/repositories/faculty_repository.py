import uuid
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.models.faculty import Faculty
from app.repositories.base_repository import BaseRepository


class FacultyRepository(BaseRepository[Faculty]):
    """Repository pour la gestion des facultés."""

    def __init__(self, session: Session):
        super().__init__(Faculty, session)

    def get_all(self, skip: int = 0, limit: int = 100):
        """Récupère toutes les facultés avec la relation department."""
        statement = (
            select(Faculty)
            .options(selectinload(Faculty.department))
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_id(self, id: uuid.UUID) -> Optional[Faculty]:
        """Récupère une faculté par son ID avec la relation department."""
        statement = (
            select(Faculty)
            .options(selectinload(Faculty.department))
            .where(Faculty.id == id)
        )
        return self.session.exec(statement).first()

    def get_by_code_and_department(
        self, code: str, department_id: uuid.UUID
    ) -> Optional[Faculty]:
        """Récupère une faculté par son code et son département avec la relation department."""
        statement = (
            select(Faculty)
            .options(selectinload(Faculty.department))
            .where(
                Faculty.code == code,
                Faculty.department_id == department_id
            )
        )
        return self.session.exec(statement).first()

    def get_by_department(
        self, department_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Faculty]:
        """Récupère toutes les facultés d'un département avec la relation department."""
        statement = (
            select(Faculty)
            .options(selectinload(Faculty.department))
            .where(Faculty.department_id == department_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_active_by_department(
        self, department_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Faculty]:
        """Récupère les facultés actives d'un département avec la relation department."""
        statement = (
            select(Faculty)
            .options(selectinload(Faculty.department))
            .where(
                Faculty.department_id == department_id,
                Faculty.is_active == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def code_exists_in_department(
        self, code: str, department_id: uuid.UUID, exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si un code de faculté existe déjà dans un département."""
        statement = select(Faculty).where(
            Faculty.code == code,
            Faculty.department_id == department_id
        )
        
        if exclude_id:
            statement = statement.where(Faculty.id != exclude_id)
        
        return self.session.exec(statement).first() is not None

    def get_active_faculties(
        self, skip: int = 0, limit: int = 100
    ) -> list[Faculty]:
        """Récupère toutes les facultés actives."""
        statement = (
            select(Faculty)
            .where(Faculty.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())