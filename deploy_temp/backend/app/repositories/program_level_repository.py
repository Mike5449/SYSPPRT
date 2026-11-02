import uuid
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.models.program_level import ProgramLevel
from app.models.program import Program
from app.models.faculty import Faculty
from app.repositories.base_repository import BaseRepository


class ProgramLevelRepository(BaseRepository[ProgramLevel]):
    """Repository pour la gestion des niveaux de programme."""

    def __init__(self, session: Session):
        super().__init__(ProgramLevel, session)

    def get_all(self, skip: int = 0, limit: int = 100):
        """Récupère tous les niveaux avec program, faculty et department."""
        statement = (
            select(ProgramLevel)
            .options(
                selectinload(ProgramLevel.program).selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_id(self, id: uuid.UUID) -> Optional[ProgramLevel]:
        """Récupère un niveau par son ID avec program, faculty et department."""
        statement = (
            select(ProgramLevel)
            .options(
                selectinload(ProgramLevel.program).selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(ProgramLevel.id == id)
        )
        return self.session.exec(statement).first()

    def get_by_code(self, code: str) -> Optional[ProgramLevel]:
        """Récupère un niveau par son code avec program, faculty et department."""
        statement = (
            select(ProgramLevel)
            .options(
                selectinload(ProgramLevel.program).selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(ProgramLevel.code == code)
        )
        return self.session.exec(statement).first()

    def get_by_name(self, name: str) -> Optional[ProgramLevel]:
        """Récupère un niveau par son nom avec program, faculty et department."""
        statement = (
            select(ProgramLevel)
            .options(
                selectinload(ProgramLevel.program).selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(ProgramLevel.name == name)
        )
        return self.session.exec(statement).first()

    def get_active_levels(self, skip: int = 0, limit: int = 100):
        """Récupère les niveaux actifs avec program, faculty et department."""
        statement = (
            select(ProgramLevel)
            .options(
                selectinload(ProgramLevel.program).selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(ProgramLevel.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def code_exists(self, code: str, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Vérifie si un code existe déjà."""
        statement = select(ProgramLevel).where(ProgramLevel.code == code)
        if exclude_id:
            statement = statement.where(ProgramLevel.id != exclude_id)
        return self.session.exec(statement).first() is not None

    def name_exists(self, name: str, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Vérifie si un nom existe déjà."""
        statement = select(ProgramLevel).where(ProgramLevel.name == name)
        if exclude_id:
            statement = statement.where(ProgramLevel.id != exclude_id)
        return self.session.exec(statement).first() is not None