import uuid
from datetime import datetime, date
from typing import Optional

from sqlmodel import Session

from app.models.assessment import Assessment, AssessmentCreate, AssessmentUpdate
from app.repositories.assessment_repository import AssessmentRepository
from app.services.base_service import BaseService


class AssessmentService(BaseService[Assessment, AssessmentRepository]):
    """Service pour la gestion des évaluations."""

    def __init__(self, session: Session):
        repository = AssessmentRepository(session)
        super().__init__(repository)

    # Seul le type "exam" est limité à 2 par session
    EXAM_TYPES = {"exam"}

    def create_assessment(
        self, assessment_create: AssessmentCreate
    ) -> Assessment:
        """Crée une nouvelle évaluation avec validations."""
        # Vérifier la limite de 2 évaluations de type examen par session
        if (
            assessment_create.assessment_type
            and assessment_create.assessment_type.lower().strip() in self.EXAM_TYPES
        ):
            exam_count = self.repository.count_exam_type_assessments(
                assessment_create.course_session_id
            )
            if exam_count >= 2:
                raise ValueError(
                    "Maximum 2 évaluations de type examen (exam, test, midterm, final) "
                    "sont autorisées par session de cours. "
                    "Cette session a déjà atteint la limite."
                )

        # Vérifier que le poids total ne dépasse pas 1.0 (100%)
        current_weight = self.repository.calculate_total_weight(
            assessment_create.course_session_id
        )

        if current_weight + assessment_create.weight > 1.0:
            raise ValueError(
                f"Total weight would exceed 100%. Current: {current_weight*100}%, "
                f"Adding: {assessment_create.weight*100}%"
            )

        # Créer l'évaluation
        assessment = Assessment.model_validate(assessment_create)
        return self.repository.create(assessment)

    def update_assessment(
        self, assessment_id: uuid.UUID, assessment_update: AssessmentUpdate
    ) -> Optional[Assessment]:
        """Met à jour une évaluation avec validations."""
        assessment = self.repository.get_by_id(assessment_id)
        if not assessment:
            return None

        # Vérifier la limite de 2 évaluations de type examen si le type change vers un type examen
        new_type = assessment_update.assessment_type
        if new_type and new_type.lower().strip() in self.EXAM_TYPES:
            # On exclut l'évaluation actuelle du comptage (elle est déjà dans la DB)
            exam_count = self.repository.count_exam_type_assessments(
                assessment.course_session_id, exclude_id=assessment_id
            )
            if exam_count >= 2:
                raise ValueError(
                    "Maximum 2 évaluations de type examen (exam, test, midterm, final) "
                    "sont autorisées par session de cours. "
                    "Cette session a déjà atteint la limite."
                )

        # Vérifier le poids si modifié
        if assessment_update.weight is not None:
            current_weight = self.repository.calculate_total_weight(
                assessment.course_session_id
            )
            # Soustraire le poids actuel et ajouter le nouveau
            new_total = current_weight - assessment.weight + assessment_update.weight

            if new_total > 1.0:
                raise ValueError(
                    f"Total weight would exceed 100%. New total: {new_total*100}%"
                )

        # Mettre à jour
        assessment_update.updated_at = datetime.utcnow()
        return self.repository.update(assessment_id, assessment_update)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        name: Optional[str] = None,
        assessment_type: Optional[str] = None,
        due_date: Optional[date] = None,
        course_session_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
        course_name: Optional[str] = None,
        year_level: Optional[int] = None,
        session_number: Optional[int] = None,
        student_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
    ) -> list[Assessment]:
        """Récupère toutes les évaluations avec filtrage."""
        return self.repository.get_all(
            skip=skip,
            limit=limit,
            name=name,
            assessment_type=assessment_type,
            due_date=due_date,
            course_session_id=course_session_id,
            teacher_id=teacher_id,
            course_name=course_name,
            year_level=year_level,
            session_number=session_number,
            student_id=student_id,
            program_level_id=program_level_id,
            session_id=session_id,
        )

    def count_assessments(
        self,
        name: Optional[str] = None,
        assessment_type: Optional[str] = None,
        due_date: Optional[date] = None,
        course_session_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
        course_name: Optional[str] = None,
        year_level: Optional[int] = None,
        session_number: Optional[int] = None,
        student_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
    ) -> int:
        """Compte les évaluations avec filtrage."""
        return self.repository.count_assessments(
            name=name,
            assessment_type=assessment_type,
            due_date=due_date,
            course_session_id=course_session_id,
            teacher_id=teacher_id,
            course_name=course_name,
            year_level=year_level,
            session_number=session_number,
            student_id=student_id,
            program_level_id=program_level_id,
            session_id=session_id,
        )

    def get_by_course_session(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations d'un cours-session."""
        return self.repository.get_by_course_session(course_session_id, skip, limit)

    def get_by_type(
        self, course_session_id: uuid.UUID, assessment_type: str,
        skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations par type."""
        return self.repository.get_by_type(
            course_session_id, assessment_type, skip, limit
        )

    def get_published_assessments(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations publiées."""
        return self.repository.get_published_assessments(course_session_id, skip, limit)

    def get_mandatory_assessments(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations obligatoires."""
        return self.repository.get_mandatory_assessments(course_session_id, skip, limit)

    def get_total_weight(self, course_session_id: uuid.UUID) -> float:
        """Récupère le poids total des évaluations."""
        return self.repository.calculate_total_weight(course_session_id)