import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.attendance_session import AttendanceSession
    from app.models.user import User
    from app.models.attendance_session import AttendanceSessionPublic
    from app.models.user import UserPublic


class AttendanceStatus(str, Enum):
    """Statut de présence."""
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


# Shared properties
class AttendanceRecordBase(SQLModel):
    """
    Enregistrement de la présence d'un étudiant à une séance.
    """
    status: AttendanceStatus = Field(default=AttendanceStatus.ABSENT)
    arrival_time: datetime | None = None
    notes: str | None = Field(default=None, max_length=500)
    excuse_document: str | None = Field(default=None, max_length=500)  # Path/URL du justificatif
    is_excused: bool = Field(default=False)
    
    # Foreign keys
    attendance_session_id: uuid.UUID = Field(
        foreign_key="attendance_session.id", 
        index=True
    )
    student_id: uuid.UUID = Field(foreign_key="user.id", index=True)


class AttendanceRecordCreate(AttendanceRecordBase):
    pass


class AttendanceRecordUpdate(SQLModel):
    status: AttendanceStatus | None = None
    arrival_time: datetime | None = None
    notes: str | None = None
    excuse_document: str | None = None
    is_excused: bool | None = None
    attendance_session_id: uuid.UUID | None = None
    student_id: uuid.UUID | None = None


class AttendanceRecord(AttendanceRecordBase, table=True):
    __tablename__ = "attendance_record"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    attendance_session: "AttendanceSession" = Relationship(
        back_populates="attendance_records"
    )
    student: "User" = Relationship()

    # ── Convenience properties (flattened course/session info) ──────────────
    # Traverse attendance_session → schedule → course_session → course, safely
    # returning None if any link is missing. Exposed in the WithDetails model so
    # the admin/teacher list shows the real course (not "Unknown").
    @property
    def course_name(self) -> str | None:
        try:
            return (
                self.attendance_session.schedule.course_session
                .course_program_level.course.name
            )
        except AttributeError:
            return None

    @property
    def course_code(self) -> str | None:
        try:
            return (
                self.attendance_session.schedule.course_session
                .course_program_level.course.code
            )
        except AttributeError:
            return None

    @property
    def session_name(self) -> str | None:
        try:
            return self.attendance_session.schedule.course_session.session.name
        except AttributeError:
            return None


class AttendanceRecordPublic(AttendanceRecordBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AttendanceRecordPublicWithDetails(AttendanceRecordPublic):
    attendance_session: "AttendanceSessionPublic"
    student: "UserPublic"
    course_name: str | None = None
    course_code: str | None = None
    session_name: str | None = None




class AttendanceRecordsPublic(SQLModel):
    data: list[AttendanceRecordPublicWithDetails]
    count: int


# Statistics models
class AttendanceStatistics(SQLModel):
    """Statistiques de présence pour un étudiant ou un cours."""
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int
    attendance_rate: float  # Pourcentage de présence

