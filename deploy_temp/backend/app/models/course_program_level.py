import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.course import Course, CoursePublic
    from app.models.program_level import ProgramLevel, ProgramLevelPublic, ProgramLevelPublicWithDetails
    from app.models.course_session import CourseSession


# Shared properties
class CourseProgramLevelBase(SQLModel):
    """
    Table de liaison entre Course et ProgramLevel.
    Permet un cours d'être disponible pour plusieurs niveaux de programme.
    """
    year_level: int = Field(ge=1, le=10)  # Année du programme: 1, 2, 3, 4...
    is_active: bool = Field(default=True)
    
    # Foreign keys
    course_id: uuid.UUID = Field(foreign_key="course.id", index=True)
    program_level_id: uuid.UUID = Field(foreign_key="program_level.id", index=True)


# Properties to receive on creation
class CourseProgramLevelCreate(CourseProgramLevelBase):
    pass


# Properties to receive on update
class CourseProgramLevelUpdate(SQLModel):
    year_level: int | None = Field(default=None, ge=1, le=10)
    is_active: bool | None = None
    course_id: uuid.UUID | None = None
    program_level_id: uuid.UUID | None = None


# Database model
class CourseProgramLevel(CourseProgramLevelBase, table=True):
    __tablename__ = "course_program_level"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    course: "Course" = Relationship(back_populates="course_program_levels")
    program_level: "ProgramLevel" = Relationship(back_populates="courses")
    course_sessions: list["CourseSession"] = Relationship(
        back_populates="course_program_level",
        cascade_delete=True
    )


# Properties to return via API
class CourseProgramLevelPublic(CourseProgramLevelBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CourseProgramLevelPublicWithDetails(CourseProgramLevelPublic):
    course: "CoursePublic"
    program_level: "ProgramLevelPublicWithDetails"


class CoursesProgramLevelsPublic(SQLModel):
    data: list[CourseProgramLevelPublicWithDetails]
    count: int