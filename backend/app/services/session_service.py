import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session as DBSession

from app.models.session import Session, SessionCreate, SessionUpdate
from app.repositories.session_repository import SessionRepository
from app.services.base_service import BaseService


class SessionService(BaseService[Session, SessionRepository]):
    """Service pour la gestion des sessions académiques."""

    def __init__(self, session: DBSession):
        repository = SessionRepository(session)
        super().__init__(repository)

    def create_session(self, session_create: SessionCreate) -> Session:
        """Crée une nouvelle session avec validations."""
        # Vérifier si une session avec ce numéro existe déjà
        existing = self.repository.get_by_session_number(
            session_create.academic_year_id,
            session_create.session_number
        )
        
        if existing:
            raise ValueError(
                f"Session {session_create.session_number} already exists for this academic year"
            )

        # Si is_active est True, désactiver toutes les sessions actives des autres années académiques
        if session_create.is_active:
            active_sessions = self.repository.get_active_sessions(skip=0, limit=1000)
            for active_session in active_sessions:
                # Désactiver seulement si c'est une session d'une autre année académique
                if active_session.is_active and active_session.academic_year_id != session_create.academic_year_id:
                    update = SessionUpdate(is_active=False, updated_at=datetime.utcnow())
                    self.repository.update(active_session.id, update.model_dump(exclude_unset=True))

        # Créer la session
        session = Session.model_validate(session_create)
        return self.repository.create(session)

    def update_session(
        self, session_id: uuid.UUID, session_update: SessionUpdate
    ) -> Optional[Session]:
        """Met à jour une session avec validations."""
        session = self.repository.get_by_id(session_id)
        if not session:
            return None

        # Vérifier le numéro de session si changé
        if session_update.session_number and session_update.session_number != session.session_number:
            academic_year_id = session_update.academic_year_id or session.academic_year_id
            existing = self.repository.get_by_session_number(
                academic_year_id,
                session_update.session_number
            )
            
            if existing and existing.id != session_id:
                raise ValueError(
                    f"Session {session_update.session_number} already exists for this academic year"
                )

        # Mettre à jour
        session_update.updated_at = datetime.utcnow()
        return self.repository.update(session_id, session_update)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        code: Optional[str] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
    ) -> list[Session]:
        """Récupère toutes les sessions avec filtrage."""
        return self.repository.get_all(
            skip=skip,
            limit=limit,
            code=code,
            academic_year_id=academic_year_id,
            is_active=is_active,
        )

    def get_all_with_academic_year(
        self,
        skip: int = 0,
        limit: int = 100,
        code: Optional[str] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
    ) -> list[Session]:
        """Récupère les sessions avec leur année académique et filtrage."""
        return self.repository.get_all_with_academic_year(
            skip=skip,
            limit=limit,
            code=code,
            academic_year_id=academic_year_id,
            is_active=is_active,
        )

    def get_by_academic_year(
        self, academic_year_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Session]:
        """Récupère les sessions d'une année académique."""
        return self.repository.get_by_academic_year(academic_year_id, skip, limit)

    def get_active_sessions(
        self, skip: int = 0, limit: int = 100
    ) -> list[Session]:
        """Récupère les sessions actives."""
        return self.repository.get_active_sessions(skip, limit)