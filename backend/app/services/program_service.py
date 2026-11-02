import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.program import Program, ProgramCreate, ProgramUpdate
from app.repositories.program_repository import ProgramRepository
from app.services.base_service import BaseService


class ProgramService(BaseService[Program, ProgramRepository]):
    """Service pour la gestion des programmes."""

    def __init__(self, session: Session):
        repository = ProgramRepository(session)
        super().__init__(repository)

    def create_program(self, program_create: ProgramCreate) -> Program:
        """Crée un nouveau programme avec validations."""
        # Vérifier si le code existe déjà dans cette faculté
        if self.repository.code_exists_in_faculty(
            program_create.code, 
            program_create.faculty_id
        ):
            raise ValueError(
                f"Program code '{program_create.code}' already exists in this faculty"
            )

        # Créer le programme
        program = Program.model_validate(program_create)
        return self.repository.create(program)

    def update_program(
        self, program_id: uuid.UUID, program_update: ProgramUpdate
    ) -> Optional[Program]:
        """Met à jour un programme avec validations."""
        program = self.repository.get_by_id(program_id)
        if not program:
            return None

        # Vérifier le code si changé
        if program_update.code and program_update.code != program.code:
            faculty_id = program_update.faculty_id or program.faculty_id
            if self.repository.code_exists_in_faculty(
                program_update.code, 
                faculty_id,
                exclude_id=program_id
            ):
                raise ValueError(
                    f"Program code '{program_update.code}' already exists in this faculty"
                )

        # Mettre à jour
        program_update.updated_at = datetime.utcnow()
        return self.repository.update(program_id, program_update)

    def get_by_faculty(
        self, faculty_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Program]:
        """Récupère les programmes d'une faculté."""
        return self.repository.get_by_faculty(faculty_id, skip, limit)


    def get_active_programs(
        self, skip: int = 0, limit: int = 100
    ) -> list[Program]:
        """Récupère les programmes actifs."""
        return self.repository.get_active_programs(skip, limit)

    def deactivate_program(self, program_id: uuid.UUID) -> Optional[Program]:
        """Désactive un programme."""
        update = ProgramUpdate(is_active=False, updated_at=datetime.utcnow())
        return self.repository.update(program_id, update)

    def activate_program(self, program_id: uuid.UUID) -> Optional[Program]:
        """Active un programme."""
        update = ProgramUpdate(is_active=True, updated_at=datetime.utcnow())
        return self.repository.update(program_id, update)