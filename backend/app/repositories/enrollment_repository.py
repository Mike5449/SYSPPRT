import uuid
from typing import Optional

from sqlmodel import Session, select

from app.models.enrollment import Enrollment, EnrollmentStatus
from app.repositories.base_repository import BaseRepository


class EnrollmentRepository(BaseRepository[Enrollment]):
    """Repository pour la gestion des inscriptions."""

    def __init__(self, session: Session):
        super().__init__(Enrollment, session)

    def get_by_student(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Enrollment]:
        """Récupère toutes les inscriptions d'un étudiant."""
        statement = (
            select(Enrollment)
            .where(Enrollment.student_id == student_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_course_session(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Enrollment]:
        """Récupère toutes les inscriptions d'un cours-session."""
        statement = (
            select(Enrollment)
            .where(Enrollment.course_session_id == course_session_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_student_and_course_session(
        self, student_id: uuid.UUID, course_session_id: uuid.UUID
    ) -> Optional[Enrollment]:
        """Récupère l'inscription d'un étudiant à un cours-session."""
        statement = select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_session_id == course_session_id
        )
        return self.session.exec(statement).first()

    def get_active_enrollments(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Enrollment]:
        """Récupère les inscriptions actives d'un étudiant."""
        statement = (
            select(Enrollment)
            .where(
                Enrollment.student_id == student_id,
                Enrollment.is_active == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def exists_enrollment(
        self, student_id: uuid.UUID, course_session_id: uuid.UUID,
        exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si une inscription existe."""
        statement = select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.course_session_id == course_session_id
        )
        
        if exclude_id:
            statement = statement.where(Enrollment.id != exclude_id)
        
        return self.session.exec(statement).first() is not None

    def count_enrollments_for_course_session(
        self, course_session_id: uuid.UUID
    ) -> int:
        """Compte le nombre d'inscriptions pour un cours-session."""
        from sqlmodel import func
        statement = select(func.count()).select_from(Enrollment).where(
            Enrollment.course_session_id == course_session_id,
            Enrollment.is_active == True
        )
        return self.session.exec(statement).one()