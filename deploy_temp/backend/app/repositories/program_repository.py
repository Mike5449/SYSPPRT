import uuid
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.models.program import Program
from app.models.faculty import Faculty
from app.repositories.base_repository import BaseRepository


class ProgramRepository(BaseRepository[Program]):
    """Repository pour la gestion des programmes."""

    def __init__(self, session: Session):
        super().__init__(Program, session)

    def get_all(self, skip: int = 0, limit: int = 100):
        """Récupère tous les programmes avec la relation faculty et department."""
        statement = (
            select(Program)
            .options(
                selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_id(self, id: uuid.UUID) -> Optional[Program]:
        """Récupère un programme par son ID avec la relation faculty et department."""
        statement = (
            select(Program)
            .options(
                selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(Program.id == id)
        )
        return self.session.exec(statement).first()

    def get_by_code_and_faculty(
        self, code: str, faculty_id: uuid.UUID
    ) -> Optional[Program]:
        """Récupère un programme par son code et sa faculté avec la relation faculty et department."""
        statement = (
            select(Program)
            .options(
                selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(
                Program.code == code,
                Program.faculty_id == faculty_id
            )
        )
        return self.session.exec(statement).first()

    def get_by_faculty(
        self, faculty_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Program]:
        """Récupère tous les programmes d'une faculté avec la relation faculty et department."""
        statement = (
            select(Program)
            .options(
                selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(Program.faculty_id == faculty_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())


    def get_active_programs(
        self, skip: int = 0, limit: int = 100
    ) -> list[Program]:
        """Récupère les programmes actifs avec la relation faculty et department."""
        statement = (
            select(Program)
            .options(
                selectinload(Program.faculty).selectinload(Faculty.department)
            )
            .where(Program.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def code_exists_in_faculty(
        self, code: str, faculty_id: uuid.UUID, exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si un code de programme existe déjà dans une faculté."""
        statement = select(Program).where(
            Program.code == code,
            Program.faculty_id == faculty_id
        )
        
        if exclude_id:
            statement = statement.where(Program.id != exclude_id)
        
        return self.session.exec(statement).first() is not None