import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.program import Program, ProgramPublicWithDetails
    from app.models.course_program_level import CourseProgramLevel
    from app.models.student import Student


# Shared properties
class ProgramLevelBase(SQLModel):
    name: str = Field(min_length=1, max_length=100, index=True)
    code: str = Field(min_length=1, max_length=20, index=True)
    description: str | None = Field(default=None, max_length=500)
    typical_duration: int | None = Field(default=None, ge=1, le=10)
    duration_type: str = Field(default="year", max_length=20)  # "year" ou "month"
    is_active: bool = Field(default=True)
    program_id: uuid.UUID = Field(foreign_key="program.id", index=True)


# Properties to receive on creation
class ProgramLevelCreate(ProgramLevelBase):
    pass


# Properties to receive on update
class ProgramLevelUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=1, max_length=20)
    description: str | None = Field(default=None, max_length=500)
    typical_duration: int | None = Field(default=None, ge=1, le=10)
    duration_type: str | None = Field(default=None, max_length=20)
    is_active: bool | None = None
    program_id: uuid.UUID | None = None


# Database model
class ProgramLevel(ProgramLevelBase, table=True):
    __tablename__ = "program_level"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    program: "Program" = Relationship(back_populates="levels")
    courses: list["CourseProgramLevel"] = Relationship(
        back_populates="program_level",
        cascade_delete=True
    )
    students: list["Student"] = Relationship(
        back_populates="program_level",
        cascade_delete=True
    )


# Properties to return via API
class ProgramLevelPublic(ProgramLevelBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProgramLevelPublicWithDetails(SQLModel):
    id: uuid.UUID
    name: str
    code: str
    description: str | None
    typical_duration: int | None
    duration_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    program: "ProgramPublicWithDetails"  # type: ignore


class ProgramLevelsPublic(SQLModel):
    data: list[ProgramLevelPublicWithDetails]
    count: int