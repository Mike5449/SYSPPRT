import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.university import University
    from app.models.session import Session, SessionPublic


# Shared properties
class AcademicYearBase(SQLModel):
    """
    Année académique d'une université (ex: 2024-2025).
    Chaque année contient 2 sessions (Intrat et Final).
    """
    name: str = Field(min_length=1, max_length=100, index=True)  # "2024-2025"
    code: str = Field(min_length=2, max_length=20, index=True)   # "2024-25"
    start_date: date  # Date de début (ex: 2024-09-01)
    end_date: date    # Date de fin (ex: 2025-06-30)
    is_current: bool = Field(default=False)  # Année en cours
    is_active: bool = Field(default=True)
    description: str | None = Field(default=None, max_length=1000)


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool | None = None
    is_active: bool | None = None
    description: str | None = None

class AcademicYear(AcademicYearBase, table=True):
    __tablename__ = "academic_year"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    sessions: list["Session"] = Relationship(
        back_populates="academic_year",
        cascade_delete=True
    )


class AcademicYearPublic(AcademicYearBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AcademicYearPublicWithSessions(AcademicYearPublic):
    sessions: list["SessionPublic"] = []


class AcademicYearsPublic(SQLModel):
    data: list[AcademicYearPublic]
    count: int

# Ensure registration for circular relationships
from app.models.session import Session