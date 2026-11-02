import uuid
from datetime import date, datetime
from typing import Optional

from sqlmodel import Session

from app.models.attendance_session import (
    AttendanceSession,
    AttendanceSessionCreate,
    AttendanceSessionUpdate,
)
from app.repositories.attendance_session_repository import AttendanceSessionRepository
from app.services.base_service import BaseService


class AttendanceSessionService(BaseService[AttendanceSession, AttendanceSessionRepository]):
    """Service pour la gestion des séances de présence."""

    def __init__(self, session: Session):
        repository = AttendanceSessionRepository(session)
        super().__init__(repository)

    def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        course_query: Optional[str] = None,
        session_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> list[AttendanceSession]:
        """Récupère les séances avec filtres."""
        return self.repository.get_all(
            skip=skip, 
            limit=limit,
            course_query=course_query,
            session_date=session_date,
            status=status
        )

    def count(
        self,
        course_query: Optional[str] = None,
        session_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> int:
        """Compte les séances avec filtres."""
        return self.repository.count_attendance_sessions(
            course_query=course_query,
            session_date=session_date,
            status=status
        )

    def create_attendance_session(
        self, attendance_session_create: AttendanceSessionCreate
    ) -> AttendanceSession:
        """Crée une nouvelle séance avec validations."""
        # Vérifier si une séance existe déjà pour cette date
        if self.repository.exists_for_date(
            attendance_session_create.schedule_id,
            attendance_session_create.session_date
        ):
            raise ValueError(
                "An attendance session already exists for this date"
            )

        # Vérifier que l'heure de fin est après l'heure de début
        if attendance_session_create.end_time <= attendance_session_create.start_time:
            raise ValueError("End time must be after start time")

        # Créer la séance
        attendance_session = AttendanceSession.model_validate(attendance_session_create)
        return self.repository.create(attendance_session)

    def update_attendance_session(
        self, attendance_session_id: uuid.UUID, 
        attendance_session_update: AttendanceSessionUpdate
    ) -> Optional[AttendanceSession]:
        """Met à jour une séance avec validations."""
        attendance_session = self.repository.get_by_id(attendance_session_id)
        if not attendance_session:
            return None

        # Vérifier les heures si modifiées
        start_time = attendance_session_update.start_time or attendance_session.start_time
        end_time = attendance_session_update.end_time or attendance_session.end_time
        
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        # Mettre à jour
        attendance_session_update.updated_at = datetime.utcnow()
        return self.repository.update(attendance_session_id, attendance_session_update)

    def get_by_schedule(
        self, schedule_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère les séances d'un horaire."""
        return self.repository.get_by_schedule(schedule_id, skip, limit)

    def get_by_date(
        self, schedule_id: uuid.UUID, session_date: date
    ) -> Optional[AttendanceSession]:
        """Récupère une séance pour une date spécifique."""
        return self.repository.get_by_date(schedule_id, session_date)

    def get_by_date_range(
        self, schedule_id: uuid.UUID, start_date: date, end_date: date,
        skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère les séances dans une période."""
        return self.repository.get_by_date_range(
            schedule_id, start_date, end_date, skip, limit
        )

    def get_upcoming_sessions(
        self, schedule_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère les séances à venir."""
        return self.repository.get_upcoming_sessions(schedule_id, skip, limit)

    def get_past_sessions(
        self, schedule_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[AttendanceSession]:
        """Récupère les séances passées."""
        return self.repository.get_past_sessions(schedule_id, skip, limit)

    def cancel_session(
        self, attendance_session_id: uuid.UUID, cancellation_reason: str
    ) -> Optional[AttendanceSession]:
        """Annule une séance."""
        update = AttendanceSessionUpdate(
            is_cancelled=True,
            cancellation_reason=cancellation_reason,
            updated_at=datetime.utcnow()
        )
        return self.repository.update(attendance_session_id, update)

    def mark_attendance_taken(
        self, attendance_session_id: uuid.UUID
    ) -> Optional[AttendanceSession]:
        """Marque la présence comme prise."""
        update = AttendanceSessionUpdate(
            attendance_taken=True,
            attendance_taken_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        return self.repository.update(attendance_session_id, update)