import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.enrollment import Enrollment, EnrollmentCreate, EnrollmentUpdate
from app.repositories.enrollment_repository import EnrollmentRepository
from app.services.base_service import BaseService


class EnrollmentService(BaseService[Enrollment, EnrollmentRepository]):
    """Service pour la gestion des inscriptions."""

    def __init__(self, session: Session):
        repository = EnrollmentRepository(session)
        super().__init__(repository)

    def create_enrollment(
        self, enrollment_create: EnrollmentCreate
    ) -> Enrollment:
        """Crée une nouvelle inscription avec validations."""
        # Vérifier si l'étudiant est déjà inscrit
        if self.repository.exists_enrollment(
            enrollment_create.student_id,
            enrollment_create.course_session_id
        ):
            raise ValueError(
                "Student is already enrolled in this course session"
            )

        # Créer l'inscription
        enrollment = Enrollment.model_validate(enrollment_create)
        return self.repository.create(enrollment)

    def update_enrollment(
        self, enrollment_id: uuid.UUID, enrollment_update: EnrollmentUpdate
    ) -> Optional[Enrollment]:
        """Met à jour une inscription."""
        enrollment = self.repository.get_by_id(enrollment_id)
        if not enrollment:
            return None

        enrollment_update.updated_at = datetime.utcnow()
        return self.repository.update(enrollment_id, enrollment_update)

    def get_by_student(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Enrollment]:
        """Récupère les inscriptions d'un étudiant."""
        return self.repository.get_by_student(student_id, skip, limit)

    def get_by_course_session(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Enrollment]:
        """Récupère les inscriptions d'un cours-session."""
        return self.repository.get_by_course_session(course_session_id, skip, limit)

    def get_active_enrollments(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Enrollment]:
        """Récupère les inscriptions actives d'un étudiant."""
        return self.repository.get_active_enrollments(student_id, skip, limit)

    def drop_enrollment(
        self, enrollment_id: uuid.UUID
    ) -> Optional[Enrollment]:
        """Abandonne une inscription."""
        update = EnrollmentUpdate(
            is_active=False,
            drop_date=datetime.utcnow(),
            status="dropped",
            updated_at=datetime.utcnow()
        )
        return self.repository.update(enrollment_id, update)