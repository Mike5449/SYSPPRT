import uuid
from typing import TYPE_CHECKING, Optional, Any
from datetime import date, datetime

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User, UserPublic
    from app.models.course_session import CourseSession


class TeacherStatus:
    """Statuts du professeur."""
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    RETIRED = "retired"
    SUSPENDED = "suspended"


class TeacherBase(SQLModel):
    """Base class for Teacher."""
    hire_date: date
    status: str = Field(default=TeacherStatus.ACTIVE, max_length=20)
    specialization: Optional[str] = Field(default=None, max_length=200)
    office_location: Optional[str] = Field(default=None, max_length=100)
    phone_extension: Optional[str] = Field(default=None, max_length=20)
    research_interests: Optional[str] = Field(default=None, max_length=1000)
    academic_rank: Optional[str] = Field(default=None, max_length=50)  # Professor, Associate, Assistant
    max_course_load: int = Field(default=4)  # Nombre max de cours par semestre


class Teacher(TeacherBase, table=True):
    """Teacher model."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Foreign Keys
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, index=True, ondelete="CASCADE")
    
    # Relationships
    user: "User" = Relationship(back_populates="teacher")
    course_sessions: list["CourseSession"] = Relationship(back_populates="teacher")


class TeacherCreate(TeacherBase):
    """Schema for creating teacher."""
    user_id: uuid.UUID


from pydantic import field_validator, AnyHttpUrl # Type check AnyHttpUrl is not used but good for future

class TeacherWithUserCreate(SQLModel):
    # User info
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None
    user_number: str | None = None
    # Teacher info
    hire_date: date
    specialization: str | None = None
    academic_rank: str | None = None

    @field_validator("specialization", "academic_rank", mode="before")
    @classmethod
    def empty_string_to_none(cls, v: Any) -> Any:
        if v == "":
            return None
        return v


class TeacherUpdate(SQLModel):
    """Schema for updating teacher."""
    status: Optional[str] = None
    specialization: Optional[str] = None
    office_location: Optional[str] = None
    phone_extension: Optional[str] = None
    research_interests: Optional[str] = None
    academic_rank: Optional[str] = None
    max_course_load: Optional[int] = None


class TeacherPublic(TeacherBase):
    """Public teacher schema."""
    id: uuid.UUID
    created_at: datetime
    user: "UserPublic"


class TeacherPublicWithUser(TeacherPublic):
    """Teacher with user details."""
    user: "UserPublic"
    
class TeacherPublicWithDetails(TeacherPublic):
    # Ajoute les champs supplémentaires ici
    pass

class TeachersPublic(SQLModel):
    """Multiple teachers response."""
    data: list[TeacherPublicWithUser]
    count: int