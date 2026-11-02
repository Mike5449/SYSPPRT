import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.academic_year import AcademicYear, AcademicYearPublic
    from app.models.course_session import CourseSession


# Shared properties
class SessionBase(SQLModel):
    """
    Session académique dans une année (Session 1 ou Session 2).
    - Session 1: Première partie de l'année (Sept-Jan)
    - Session 2: Deuxième partie de l'année (Fév-Juin)
    """
    name: str = Field(min_length=1, max_length=100, index=True)  # "Session 1 2024-2025"
    code: str = Field(min_length=1, max_length=20, index=True)   # "S1-2024"
    session_number: int = Field(ge=1, le=2)  # 1 ou 2
    start_date: date  # Date de début
    end_date: date    # Date de fin
    is_active: bool = Field(default=True)
    description: str | None = Field(default=None, max_length=1000)
    
    # Foreign key
    academic_year_id: uuid.UUID = Field(foreign_key="academic_year.id", index=True)


class SessionCreate(SessionBase):
    pass


class SessionUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=1, max_length=20)
    session_number: int | None = Field(default=None, ge=1, le=2)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None
    description: str | None = None
    academic_year_id: uuid.UUID | None = None


class Session(SessionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    academic_year: "AcademicYear" = Relationship(back_populates="sessions")
    course_sessions: list["CourseSession"] = Relationship(
        back_populates="session",
        cascade_delete=True
    )


class SessionPublic(SessionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SessionsPublic(SQLModel):
    data: list[SessionPublic]
    count: int


class SessionPublicWithAcademicYear(SessionPublic):
    academic_year: "AcademicYearPublic | None" = None


class SessionsPublicWithAcademicYear(SQLModel):
    data: list[SessionPublicWithAcademicYear]
    count: int

# Ensure registration for circular relationships
from app.models.academic_year import AcademicYear, AcademicYearPublic

SessionPublicWithAcademicYear.model_rebuild()
SessionsPublicWithAcademicYear.model_rebuild()

