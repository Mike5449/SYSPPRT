import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.student import Student, StudentPublic
    from app.models.course_session import CourseSession, CourseSessionPublic


class EnrollmentStatus(str):
    """Statut de l'inscription."""
    ENROLLED = "enrolled"
    DROPPED = "dropped"
    COMPLETED = "completed"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"


# Shared properties
class EnrollmentBase(SQLModel):
    """
    Inscription d'un étudiant à un cours-session.
    """
    enrollment_date: datetime = Field(default_factory=datetime.utcnow)
    drop_date: datetime | None = None
    status: str = Field(default=EnrollmentStatus.ENROLLED, max_length=20)
    is_active: bool = Field(default=True)
    notes: str | None = Field(default=None, max_length=1000)
    
    # Foreign keys
    student_id: uuid.UUID = Field(foreign_key="student.id", index=True)
    course_session_id: uuid.UUID = Field(foreign_key="course_session.id", index=True)


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentUpdate(SQLModel):
    enrollment_date: datetime | None = None
    drop_date: datetime | None = None
    status: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class Enrollment(EnrollmentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    student: "Student" = Relationship(back_populates="enrollments")
    course_session: "CourseSession" = Relationship(back_populates="enrollments")


class EnrollmentPublic(EnrollmentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class EnrollmentPublicWithDetails(EnrollmentPublic):
    student: "StudentPublicWithDetails"
    course_session: "CourseSessionPublicWithDetails"


class EnrollmentsPublic(SQLModel):
    data: list[EnrollmentPublicWithDetails]
    count: int