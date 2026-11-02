import uuid
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.models.course_program_level import CourseProgramLevel
from app.models.course import Course
from app.models.program_level import ProgramLevel
from app.models.program import Program
from app.models.faculty import Faculty
from app.repositories.base_repository import BaseRepository


class CourseProgramLevelRepository(BaseRepository[CourseProgramLevel]):
    """Repository pour la gestion des relations Course-ProgramLevel."""

    def __init__(self, session: Session):
        super().__init__(CourseProgramLevel, session)

    def get_all(self, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations avec les objets course et program_level."""
        statement = (
            select(CourseProgramLevel)
            .options(
                selectinload(CourseProgramLevel.course),
                selectinload(CourseProgramLevel.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_id(self, id: uuid.UUID) -> Optional[CourseProgramLevel]:
        """Récupère une relation par son ID avec toutes les relations."""
        statement = (
            select(CourseProgramLevel)
            .options(
                selectinload(CourseProgramLevel.course),
                selectinload(CourseProgramLevel.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .where(CourseProgramLevel.id == id)
        )
        return self.session.exec(statement).first()

    def get_by_course(self, course_id: uuid.UUID, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations pour un cours."""
        statement = (
            select(CourseProgramLevel)
            .options(
                selectinload(CourseProgramLevel.course),
                selectinload(CourseProgramLevel.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .where(CourseProgramLevel.course_id == course_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_program_level(self, program_level_id: uuid.UUID, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations pour un niveau de programme."""
        statement = (
            select(CourseProgramLevel)
            .options(
                selectinload(CourseProgramLevel.course),
                selectinload(CourseProgramLevel.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .where(CourseProgramLevel.program_level_id == program_level_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_year_level(self, year_level: int, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations pour une année donnée."""
        statement = (
            select(CourseProgramLevel)
            .options(
                selectinload(CourseProgramLevel.course),
                selectinload(CourseProgramLevel.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .where(CourseProgramLevel.year_level == year_level)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_active(self, skip: int = 0, limit: int = 100):
        """Récupère toutes les relations actives."""
        statement = (
            select(CourseProgramLevel)
            .options(
                selectinload(CourseProgramLevel.course),
                selectinload(CourseProgramLevel.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .where(CourseProgramLevel.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def exists(
        self,
        course_id: uuid.UUID,
        program_level_id: uuid.UUID,
        year_level: Optional[int] = None,
        exclude_id: Optional[uuid.UUID] = None,
    ) -> bool:
        """Vérifie si une relation existe déjà.

        Une même paire (cours, program_level) peut exister pour des années
        différentes ; l'unicité porte donc sur (course, program_level, year).
        """
        statement = select(CourseProgramLevel).where(
            CourseProgramLevel.course_id == course_id,
            CourseProgramLevel.program_level_id == program_level_id
        )
        if year_level is not None:
            statement = statement.where(
                CourseProgramLevel.year_level == year_level
            )
        if exclude_id:
            statement = statement.where(CourseProgramLevel.id != exclude_id)

        result = self.session.exec(statement).first()
        return result is not None
