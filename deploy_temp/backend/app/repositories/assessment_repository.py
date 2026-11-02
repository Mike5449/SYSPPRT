import uuid
from typing import Optional

from datetime import date
from sqlmodel import Session, select, func

from app.models.assessment import Assessment, AssessmentType
from app.models.course_session import CourseSession
from app.repositories.base_repository import BaseRepository


class AssessmentRepository(BaseRepository[Assessment]):
    """Repository pour la gestion des évaluations."""

    def __init__(self, session: Session):
        super().__init__(Assessment, session)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        name: Optional[str] = None,
        assessment_type: Optional[str] = None,
        due_date: Optional[date] = None,
        course_session_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
    ) -> list[Assessment]:
        """Récupère toutes les évaluations avec filtrage."""
        statement = select(Assessment)
        
        if teacher_id:
            statement = statement.join(CourseSession).where(CourseSession.teacher_id == teacher_id)
        
        if name:
            statement = statement.where(Assessment.name.ilike(f"%{name}%"))
        if assessment_type:
            statement = statement.where(Assessment.assessment_type == assessment_type)
        if due_date:
            statement = statement.where(Assessment.due_date == due_date)
        if course_session_id:
            statement = statement.where(Assessment.course_session_id == course_session_id)
            
        statement = statement.offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def count_assessments(
        self,
        name: Optional[str] = None,
        assessment_type: Optional[str] = None,
        due_date: Optional[date] = None,
        course_session_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
    ) -> int:
        """Compte les évaluations avec filtrage."""
        statement = select(func.count()).select_from(Assessment)
        
        if teacher_id:
            statement = statement.join(CourseSession).where(CourseSession.teacher_id == teacher_id)
            
        if name:
            statement = statement.where(Assessment.name.ilike(f"%{name}%"))
        if assessment_type:
            statement = statement.where(Assessment.assessment_type == assessment_type)
        if due_date:
            statement = statement.where(Assessment.due_date == due_date)
        if course_session_id:
            statement = statement.where(Assessment.course_session_id == course_session_id)
            
        return self.session.exec(statement).one()

    def get_by_course_session(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère toutes les évaluations d'un cours-session."""
        statement = (
            select(Assessment)
            .where(Assessment.course_session_id == course_session_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_type(
        self, course_session_id: uuid.UUID, assessment_type: str,
        skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations par type."""
        statement = (
            select(Assessment)
            .where(
                Assessment.course_session_id == course_session_id,
                Assessment.assessment_type == assessment_type
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_published_assessments(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations publiées."""
        statement = (
            select(Assessment)
            .where(
                Assessment.course_session_id == course_session_id,
                Assessment.is_published == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_mandatory_assessments(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations obligatoires."""
        statement = (
            select(Assessment)
            .where(
                Assessment.course_session_id == course_session_id,
                Assessment.is_mandatory == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def calculate_total_weight(self, course_session_id: uuid.UUID) -> float:
        """Calcule le poids total des évaluations."""
        from sqlmodel import func
        statement = select(func.sum(Assessment.weight)).where(
            Assessment.course_session_id == course_session_id
        )
        result = self.session.exec(statement).one()
        return result if result else 0.0