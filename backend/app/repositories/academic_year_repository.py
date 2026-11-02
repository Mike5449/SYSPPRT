import uuid
from typing import Optional

from sqlmodel import Session, select

from app.models.academic_year import AcademicYear
from app.repositories.base_repository import BaseRepository


class AcademicYearRepository(BaseRepository[AcademicYear]):
    """Repository pour la gestion des années académiques."""

    def __init__(self, session: Session):
        super().__init__(AcademicYear, session)

    def get_by_code(self, code: str) -> Optional[AcademicYear]:
        """Récupère une année académique par son code."""
        statement = select(AcademicYear).where(AcademicYear.code == code)
        return self.session.exec(statement).first()

    def get_current(self) -> Optional[AcademicYear]:
        """Récupère l'année académique en cours."""
        statement = select(AcademicYear).where(AcademicYear.is_current == True)
        return self.session.exec(statement).first()

    def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        name: Optional[str] = None,
        code: Optional[str] = None,
        is_current: Optional[bool] = None,
    ) -> list[AcademicYear]:
        """Récupère toutes les années académiques avec filtrage."""
        statement = select(AcademicYear)
        
        if name:
            statement = statement.where(AcademicYear.name.ilike(f"%{name}%"))
        if code:
            statement = statement.where(AcademicYear.code.ilike(f"%{code}%"))
        if is_current is not None:
            statement = statement.where(AcademicYear.is_current == is_current)
            
        statement = statement.offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def code_exists(
        self, code: str, exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si un code d'année académique existe déjà."""
        statement = select(AcademicYear).where(AcademicYear.code == code)
        
        if exclude_id:
            statement = statement.where(AcademicYear.id != exclude_id)
        
        return self.session.exec(statement).first() is not None