import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.course_program_level import CourseProgramLevel, CourseProgramLevelPublic
    from app.models.session import Session, SessionPublic
    from app.models.schedule import Schedule, SchedulePublic
    from app.models.enrollment import Enrollment
    from app.models.assessment import Assessment
    from app.models.teacher import Teacher


# Shared properties
class CourseSessionBase(SQLModel):
    """
    Liaison entre un cours/niveau de programme et une session.
    Permet de savoir quand un cours est enseigné pour un niveau spécifique.
    Exemple: "Réseaux Informatiques - Année 1" (CourseProgramLevel) → "Session 1 2024-2025" (Session)
    """
    classroom: str | None = Field(default=None, max_length=100)
    max_students: int | None = Field(default=None)
    year_level: int = Field(default=1, ge=1, le=15)  # Niveau de cette session (1ère, 2e, 3e année, etc.)
    is_active: bool = Field(default=True)
    
    # Grading percentages
    intra_percentage: float | None = Field(default=None, ge=0.0, le=100.0)  # Pourcentage pour l'examen intra
    final_percentage: float | None = Field(default=None, ge=0.0, le=100.0)  # Pourcentage pour l'examen final
    participation_percentage: float | None = Field(default=None, ge=0.0, le=100.0)  # Pourcentage pour participations (quiz, test, labo, projet)
    
    # Foreign keys
    course_program_level_id: uuid.UUID = Field(foreign_key="course_program_level.id", index=True)
    session_id: uuid.UUID = Field(foreign_key="session.id", index=True)
    teacher_id: uuid.UUID = Field(foreign_key="teacher.id", index=True)


class CourseSessionCreate(CourseSessionBase):
    pass


class CourseSessionUpdate(SQLModel):
    classroom: str | None = None
    max_students: int | None = Field(default=None)
    year_level: int | None = Field(default=None, ge=1, le=10)
    is_active: bool | None = None
    intra_percentage: float | None = Field(default=None, ge=0.0, le=100.0)
    final_percentage: float | None = Field(default=None, ge=0.0, le=100.0)
    participation_percentage: float | None = Field(default=None, ge=0.0, le=100.0)
    course_program_level_id: uuid.UUID | None = None
    session_id: uuid.UUID | None = None
    teacher_id: uuid.UUID | None = None


class CourseSession(CourseSessionBase, table=True):
    __tablename__ = "course_session"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    course_program_level: "CourseProgramLevel" = Relationship(back_populates="course_sessions")
    session: "Session" = Relationship(back_populates="course_sessions")
    teacher: "Teacher" = Relationship(back_populates="course_sessions")
    
    schedules: list["Schedule"] = Relationship(
        back_populates="course_session",
        cascade_delete=True
    )
    enrollments: list["Enrollment"] = Relationship(
        back_populates="course_session",
        cascade_delete=True
    )
    assessments: list["Assessment"] = Relationship(
        back_populates="course_session",
        cascade_delete=True
    )


class CourseSessionPublic(CourseSessionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CourseSessionPublicWithDetails(CourseSessionPublic):
    course_program_level: "CourseProgramLevelPublicWithDetails"
    session: "SessionPublic"
    teacher: "TeacherPublicWithUser"


class CourseSessionPublicWithSchedules(CourseSessionPublic):
    schedules: list["SchedulePublic"] = []


class CourseSessionsPublic(SQLModel):
    data: list[CourseSessionPublicWithDetails]
    count: int