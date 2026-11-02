import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.faculty import Faculty, FacultyPublicWithDepartment
    from app.models.program_level import ProgramLevel
    from app.models.student import Student


# Shared properties
class ProgramBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, index=True)
    code: str = Field(min_length=2, max_length=20, index=True)
    description: str | None = Field(default=None, max_length=2000)
    # duration_years: int = Field(ge=1, le=10)
    credits_required: int | None = Field(default=None, ge=0)
    tuition_fee: float | None = Field(default=None, ge=0)
    language: str = Field(default="French", max_length=50)
    admission_requirements: str | None = Field(default=None, max_length=2000)
    career_prospects: str | None = Field(default=None, max_length=2000)
    is_active: bool = Field(default=True)
    
    # Foreign keys
    faculty_id: uuid.UUID = Field(foreign_key="faculty.id", index=True)


# Properties to receive on creation
class ProgramCreate(ProgramBase):
    pass


# Properties to receive on update
class ProgramUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    description: str | None = None
    # duration_years: int | None = Field(default=None, ge=1, le=10)
    credits_required: int | None = Field(default=None, ge=0)
    tuition_fee: float | None = Field(default=None, ge=0)
    language: str | None = Field(default=None, max_length=50)
    admission_requirements: str | None = None
    career_prospects: str | None = None
    is_active: bool | None = None
    faculty_id: uuid.UUID | None = None


# Database model
class Program(ProgramBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    faculty: "Faculty" = Relationship(back_populates="programs")
    levels: list["ProgramLevel"] = Relationship(back_populates="program", cascade_delete=True)
    # students: list["Student"] = Relationship(back_populates="program", cascade_delete=True)

# Properties to return via API
class ProgramPublic(ProgramBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProgramPublicWithDetails(SQLModel):
    id: uuid.UUID
    name: str
    code: str
    description: str | None
    credits_required: int | None
    tuition_fee: float | None
    language: str
    admission_requirements: str | None
    career_prospects: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    faculty: "FacultyPublicWithDepartment"  # type: ignore


class ProgramsPublic(SQLModel):
    data: list[ProgramPublicWithDetails]
    count: int