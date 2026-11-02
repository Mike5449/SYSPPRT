import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.academic_year import AcademicYear, AcademicYearCreate, AcademicYearUpdate
from app.repositories.academic_year_repository import AcademicYearRepository
from app.services.base_service import BaseService


class AcademicYearService(BaseService[AcademicYear, AcademicYearRepository]):
    """Service pour la gestion des années académiques."""

    def __init__(self, session: Session):
        repository = AcademicYearRepository(session)
        super().__init__(repository)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        name: Optional[str] = None,
        code: Optional[str] = None,
        is_current: Optional[bool] = None,
    ) -> list[AcademicYear]:
        """Récupère toutes les années académiques."""
        return self.repository.get_all(
            skip=skip, limit=limit, name=name, code=code, is_current=is_current
        )

    def create_academic_year(self, academic_year_create: AcademicYearCreate) -> AcademicYear:
        """Crée une nouvelle année académique avec validations."""
        # Vérifier si le code existe déjà
        if self.repository.code_exists(academic_year_create.code):
            raise ValueError(
                f"Academic year code '{academic_year_create.code}' already exists"
            )

        # Si is_current est True, désactiver toutes les autres années en cours
        if academic_year_create.is_current:
            current_years = self.repository.get_all(skip=0, limit=1000)
            for year in current_years:
                if year.is_current:
                    update = AcademicYearUpdate(is_current=False, updated_at=datetime.utcnow())
                    self.repository.update(year.id, update.model_dump(exclude_unset=True))

        # Si is_active est True, désactiver toutes les autres années actives
        if academic_year_create.is_active:
            active_years = self.repository.get_all(skip=0, limit=1000)
            for year in active_years:
                if year.is_active:
                    update = AcademicYearUpdate(is_active=False, updated_at=datetime.utcnow())
                    self.repository.update(year.id, update.model_dump(exclude_unset=True))

        # Créer l'année académique
        academic_year = AcademicYear.model_validate(academic_year_create)
        return self.repository.create(academic_year)

    def update_academic_year(
        self, academic_year_id: uuid.UUID, academic_year_update: AcademicYearUpdate
    ) -> Optional[AcademicYear]:
        """Met à jour une année académique avec validations."""
        academic_year = self.repository.get_by_id(academic_year_id)
        if not academic_year:
            return None

        # Vérifier le code si changé
        if academic_year_update.code and academic_year_update.code != academic_year.code:
            if self.repository.code_exists(
                academic_year_update.code,
                exclude_id=academic_year_id
            ):
                raise ValueError(
                    f"Academic year code '{academic_year_update.code}' already exists"
                )

        # Mettre à jour
        academic_year_update.updated_at = datetime.utcnow()
        return self.repository.update(academic_year_id, academic_year_update)

    def get_current(self) -> Optional[AcademicYear]:
        """Récupère l'année académique en cours."""
        return self.repository.get_current()

    def set_as_current(self, academic_year_id: uuid.UUID) -> Optional[AcademicYear]:
        """Définit une année académique comme année en cours."""
        academic_year = self.repository.get_by_id(academic_year_id)
        if not academic_year:
            return None

        # Désactiver toutes les années en cours
        current_years = self.repository.get_all(skip=0, limit=1000)
        for year in current_years:
            if year.is_current:
                update = AcademicYearUpdate(is_current=False, updated_at=datetime.utcnow())
                self.repository.update(year.id, update)

        # Activer la nouvelle année en cours
        update = AcademicYearUpdate(is_current=True, updated_at=datetime.utcnow())
        return self.repository.update(academic_year_id, update)