import uuid
from datetime import datetime, date
from typing import TYPE_CHECKING, Any

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User, UserPublic
    from app.models.program_level import ProgramLevel, ProgramLevelPublicWithDetails
    from app.models.enrollment import Enrollment
    from app.models.grade import Grade


class StudentStatus(str):
    """Statut de l'étudiant."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    GRADUATED = "graduated"
    DROPPED = "dropped"


# Shared properties
class StudentBase(SQLModel):
    """
    Informations spécifiques aux étudiants.
    Extends User model with student-specific data.
    """
    admission_date: date
    expected_graduation_date: date | None = None
    actual_graduation_date: date | None = None
    status: str = Field(default=StudentStatus.ACTIVE, max_length=20)
    gpa: float | None = Field(default=None, ge=0.0, le=4.0)  # Grade Point Average
    total_credits_earned: int = Field(default=0, ge=0)
    current_year_level: int = Field(default=1, ge=1)
    is_scholarship: bool = Field(default=False)
    scholarship_type: str | None = Field(default=None, max_length=100)
    emergency_contact_name: str | None = Field(default=None, max_length=255)
    emergency_contact_phone: str | None = Field(default=None, max_length=50)
    emergency_contact_relationship: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=2000)
    
    # Foreign keys
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True, unique=True)
    program_level_id: uuid.UUID = Field(foreign_key="program_level.id", index=True)


class StudentCreate(StudentBase):
    pass


from pydantic import field_validator, EmailStr

class StudentWithUserCreate(SQLModel):
    # User info
    email: EmailStr
    password: str
    first_name: str | None = None
    last_name: str | None = None
    user_number: str | None = None
    # Student info
    admission_date: date
    expected_graduation_date: date | None = None
    program_level_id: uuid.UUID
    current_year_level: int = 1
    status: str = StudentStatus.ACTIVE
    is_scholarship: bool = False
    scholarship_type: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relationship: str | None = None
    notes: str | None = None

    @field_validator("expected_graduation_date", mode="before")
    @classmethod
    def empty_string_to_none(cls, v: Any) -> Any:
        if v == "":
            return None
        return v


class StudentUpdate(SQLModel):
    admission_date: date | None = None
    expected_graduation_date: date | None = None
    actual_graduation_date: date | None = None
    status: str | None = None
    gpa: float | None = Field(default=None, ge=0.0, le=4.0)
    total_credits_earned: int | None = Field(default=None, ge=0)
    current_year_level: int | None = Field(default=None, ge=1)
    is_scholarship: bool | None = None
    scholarship_type: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relationship: str | None = None
    notes: str | None = None
    program_level_id: uuid.UUID | None = None


class Student(StudentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship()
    program_level: "ProgramLevel" = Relationship(back_populates="students")
    enrollments: list["Enrollment"] = Relationship(
        back_populates="student",
        cascade_delete=True
    )
    grades: list["Grade"] = Relationship(
        back_populates="student",
        cascade_delete=True
    )


class StudentPublic(StudentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    user: "UserPublic"


class StudentPublicWithUser(StudentPublic):
    user: "UserPublic"


class StudentPublicWithDetails(SQLModel):
    id: uuid.UUID
    admission_date: date
    expected_graduation_date: date | None
    actual_graduation_date: date | None
    status: str
    gpa: float | None
    total_credits_earned: int
    current_year_level: int
    is_scholarship: bool
    scholarship_type: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    emergency_contact_relationship: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    user: "UserPublic"  # type: ignore
    program_level: "ProgramLevelPublicWithDetails"  # type: ignore


class StudentsPublic(SQLModel):
    data: list[StudentPublic]
    count: int


class StudentsPublicWithDetails(SQLModel):
    data: list[StudentPublicWithDetails]
    count: int