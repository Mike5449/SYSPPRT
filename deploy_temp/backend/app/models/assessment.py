import uuid
from datetime import datetime, date
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.course_session import CourseSession, CourseSessionPublic
    from app.models.grade import Grade


class AssessmentType(str):
    """Type d'évaluation."""
    EXAM = "exam"
    QUIZ = "quiz"
    DEVOIR = "devoir"
    PROJECT = "project"
    PRESENTATION = "presentation"
    LAB = "lab"
    HOMEWORK = "homework"
    TEST = "test"
    PARTICIPATION = "participation"


# Shared properties
class AssessmentBase(SQLModel):
    """
    Évaluation/Examen pour un cours.
    """
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    assessment_type: str = Field(max_length=50)
    max_score: float = Field(default=100.0, gt=0)
    weight: float = Field(default=0.0, ge=0.0, le=1.0)  # Poids dans la note finale (0-1)
    due_date: date | None = None
    assessment_date: date | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    is_mandatory: bool = Field(default=True)
    passing_score: float | None = Field(default=None, ge=0.0)
    instructions: str | None = Field(default=None, max_length=5000)
    is_published: bool = Field(default=True)
    
    # Foreign key
    course_session_id: uuid.UUID = Field(foreign_key="course_session.id", index=True)


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    assessment_type: str | None = None
    max_score: float | None = Field(default=None, gt=0)
    weight: float | None = Field(default=None, ge=0.0, le=1.0)
    due_date: date | None = None
    assessment_date: date | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    is_mandatory: bool | None = None
    passing_score: float | None = Field(default=None, ge=0.0)
    instructions: str | None = None
    is_published: bool | None = None


class Assessment(AssessmentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    course_session: "CourseSession" = Relationship(back_populates="assessments")
    grades: list["Grade"] = Relationship(
        back_populates="assessment",
        cascade_delete=True
    )


class AssessmentPublic(AssessmentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AssessmentPublicWithDetails(AssessmentPublic):
    course_session: "CourseSessionPublicWithDetails"


class AssessmentsPublic(SQLModel):
    data: list[AssessmentPublicWithDetails]
    count: int