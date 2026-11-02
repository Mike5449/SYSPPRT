import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.schedule import Schedule, ScheduleCreate, ScheduleUpdate
from app.repositories.schedule_repository import ScheduleRepository
from app.services.base_service import BaseService


class ScheduleService(BaseService[Schedule, ScheduleRepository]):
    """Service pour la gestion des horaires."""

    def __init__(self, session: Session):
        repository = ScheduleRepository(session)
        super().__init__(repository)

    def create_schedule(self, schedule_create: ScheduleCreate) -> Schedule:
        """Crée un nouveau horaire avec validations."""
        # Vérifier si un horaire existe déjà pour ce créneau
        if self.repository.exists_for_time_slot(
            schedule_create.course_session_id,
            schedule_create.day_of_week,
            str(schedule_create.start_time),
            str(schedule_create.end_time)
        ):
            raise ValueError(
                "A schedule already exists for this time slot"
            )

        # Vérifier que l'heure de fin est après l'heure de début
        if schedule_create.end_time <= schedule_create.start_time:
            raise ValueError("End time must be after start time")

        # Créer l'horaire
        schedule = Schedule.model_validate(schedule_create)
        return self.repository.create(schedule)

    def update_schedule(
        self, schedule_id: uuid.UUID, schedule_update: ScheduleUpdate
    ) -> Optional[Schedule]:
        """Met à jour un horaire avec validations."""
        schedule = self.repository.get_by_id(schedule_id)
        if not schedule:
            return None

        # Vérifier les heures si modifiées
        start_time = schedule_update.start_time or schedule.start_time
        end_time = schedule_update.end_time or schedule.end_time
        
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        # Mettre à jour
        schedule_update.updated_at = datetime.utcnow()
        return self.repository.update(schedule_id, schedule_update)

    def get_by_course_session(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Schedule]:
        """Récupère les horaires d'un cours-session."""
        return self.repository.get_by_course_session(course_session_id, skip, limit)

    def get_by_day_of_week(
        self, course_session_id: uuid.UUID, day_of_week: int
    ) -> list[Schedule]:
        """Récupère les horaires pour un jour spécifique."""
        return self.repository.get_by_day_of_week(course_session_id, day_of_week)

    def get_active_schedules(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Schedule]:
        """Récupère les horaires actifs."""
        return self.repository.get_active_schedules(course_session_id, skip, limit)

    def get_schedules_by_filters(
        self,
        program_level_id: Optional[uuid.UUID] = None,
        academic_year_id: Optional[uuid.UUID] = None,
        session_number: Optional[int] = None,
        year_level: Optional[int] = None,
        teacher_id: Optional[uuid.UUID] = None,
        day_of_week: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[Schedule]:
        """Récupère les horaires filtrés par différents critères."""
        return self.repository.get_schedules_by_filters(
            program_level_id=program_level_id,
            academic_year_id=academic_year_id,
            session_number=session_number,
            year_level=year_level,
            teacher_id=teacher_id,
            day_of_week=day_of_week,
            skip=skip,
            limit=limit
        )