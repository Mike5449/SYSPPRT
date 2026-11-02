import uuid
from typing import Optional

from sqlmodel import Session as DBSession, select
from sqlalchemy.orm import selectinload

from app.models.session import Session
from app.repositories.base_repository import BaseRepository


class SessionRepository(BaseRepository[Session]):
    """Repository pour la gestion des sessions académiques."""

    def __init__(self, session: DBSession):
        super().__init__(Session, session)

    def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        code: Optional[str] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
    ) -> list[Session]:
        """Récupère toutes les sessions avec filtrage."""
        statement = select(Session)
        
        if code:
            statement = statement.where(Session.code.ilike(f"%{code}%"))
        if academic_year_id:
            statement = statement.where(Session.academic_year_id == academic_year_id)
        if is_active is not None:
            statement = statement.where(Session.is_active == is_active)
            
        statement = statement.offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def get_by_academic_year(
        self, academic_year_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Session]:
        """Récupère toutes les sessions d'une année académique."""
        statement = (
            select(Session)
            .where(Session.academic_year_id == academic_year_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_session_number(
        self, academic_year_id: uuid.UUID, session_number: int
    ) -> Optional[Session]:
        """Récupère une session par son numéro dans une année académique."""
        statement = select(Session).where(
            Session.academic_year_id == academic_year_id,
            Session.session_number == session_number
        )
        return self.session.exec(statement).first()

    def get_active_sessions(
        self, skip: int = 0, limit: int = 100
    ) -> list[Session]:
        """Récupère les sessions actives."""
        statement = (
            select(Session)
            .where(Session.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_all_with_academic_year(
        self, 
        skip: int = 0, 
        limit: int = 100,
        code: Optional[str] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
    ) -> list[Session]:
        """Récupère toutes les sessions avec leur année académique et filtrage."""
        statement = select(Session)
        
        if code:
            statement = statement.where(Session.code.ilike(f"%{code}%"))
        if academic_year_id:
            statement = statement.where(Session.academic_year_id == academic_year_id)
        if is_active is not None:
            statement = statement.where(Session.is_active == is_active)
            
        statement = statement.options(selectinload(Session.academic_year)).offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def get_by_id_with_academic_year(self, id: uuid.UUID) -> Optional[Session]:
        """Récupère une session par ID avec son année académique."""
        statement = (
            select(Session)
            .where(Session.id == id)
            .options(selectinload(Session.academic_year))
        )
        return self.session.exec(statement).first()

    def get_by_academic_year_with_details(
        self, academic_year_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Session]:
        """Récupère toutes les sessions d'une année académique avec les détails."""
        statement = (
            select(Session)
            .where(Session.academic_year_id == academic_year_id)
            .options(selectinload(Session.academic_year))
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_active_sessions_with_academic_year(
        self, skip: int = 0, limit: int = 100
    ) -> list[Session]:
        """Récupère les sessions actives avec leur année académique."""
        statement = (
            select(Session)
            .where(Session.is_active == True)
            .options(selectinload(Session.academic_year))
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())
