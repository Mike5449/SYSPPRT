import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.course_session import CourseSession
    from app.models.course_program_level import CourseProgramLevel


# Shared properties
class CourseBase(SQLModel):
    """
    Cours générique disponible pour plusieurs niveaux de programme.
    Exemple: "Réseaux Informatiques" peut être utilisé en Année 1 et Année 2.
    """
    name: str = Field(min_length=1, max_length=255, index=True)
    code: str = Field(min_length=2, max_length=20, index=True, unique=True)  # "INF-101"
    description: str | None = Field(default=None, max_length=2000)
    credits: int = Field(ge=1, le=10)  # Nombre de crédits
    hours_per_week: int | None = Field(default=None, ge=1)
    is_mandatory: bool = Field(default=True)  # Obligatoire ou optionnel
    prerequisites: str | None = Field(default=None, max_length=500)
    syllabus: str | None = Field(default=None, max_length=5000)
    is_active: bool = Field(default=True)


class CourseCreate(CourseBase):
    pass


class CourseUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    description: str | None = None
    credits: int | None = Field(default=None, ge=1, le=10)
    hours_per_week: int | None = Field(default=None, ge=1)
    is_mandatory: bool | None = None
    prerequisites: str | None = None
    syllabus: str | None = None
    is_active: bool | None = None


class Course(CourseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    course_program_levels: list["CourseProgramLevel"] = Relationship(
        back_populates="course",
        cascade_delete=True
    )
    # course_sessions: list["CourseSession"] = Relationship(
    #     back_populates="course",
    #     cascade_delete=True
    # )


class CoursePublic(CourseBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CourseWithSessionInfo(CourseBase):
    """Course enriched with session and teacher information."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    # Session info
    session_name: str | None = None
    session_year: int | None = None
    session_semester: str | None = None
    session_number: int | None = None
    # Teacher info
    teacher_name: str | None = None
    teacher_email: str | None = None
    teacher_id: uuid.UUID | None = None
    # Program info
    program_name: str | None = None
    program_level_name: str | None = None
    year_level: int | None = None
    academic_year_name: str | None = None
    # Grade percentages
    intra_percentage: float | None = None
    final_percentage: float | None = None
    participation_percentage: float | None = None


class CoursesPublic(SQLModel):
    data: list[CoursePublic]
    count: int


class CoursesWithSessionInfoPublic(SQLModel):
    data: list[CourseWithSessionInfo]
    count: int