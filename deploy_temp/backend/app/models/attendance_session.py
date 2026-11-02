import uuid
from datetime import datetime, date, time
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.schedule import Schedule, SchedulePublic, SchedulePublicWithDetails
    from app.models.attendance_record import AttendanceRecord


# Shared properties
class AttendanceSessionBase(SQLModel):
    """
    Séance unique pour un cours spécifique.
    Permet de tracker la présence pour une date donnée.
    """
    session_date: date
    start_time: time
    end_time: time
    actual_room: str | None = Field(default=None, max_length=100)
    actual_building: str | None = Field(default=None, max_length=100)
    topic: str | None = Field(default=None, max_length=500)  # Sujet du cours
    description: str | None = Field(default=None, max_length=2000)
    is_cancelled: bool = Field(default=False)
    cancellation_reason: str | None = Field(default=None, max_length=500)
    attendance_taken: bool = Field(default=False)
    attendance_taken_at: datetime | None = None
    total_students: int = Field(default=0, ge=0)
    present_students: int = Field(default=0, ge=0)
    absent_students: int = Field(default=0, ge=0)
    late_students: int = Field(default=0, ge=0)
    
    # Foreign key
    schedule_id: uuid.UUID = Field(foreign_key="schedule.id", index=True)
    # QR code handling (single‑use token)
    qr_code_token: str | None = Field(default=None, max_length=255, index=True)
    qr_code_generated_at: datetime | None = None
    qr_code_expires_at: datetime | None = None
    qr_code_refresh_interval: int = Field(default=60)  # seconds, configurable interval



class AttendanceSessionCreate(AttendanceSessionBase):
    pass


class AttendanceSessionUpdate(SQLModel):
    session_date: date | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    actual_room: str | None = None
    actual_building: str | None = None
    topic: str | None = None
    description: str | None = None
    is_cancelled: bool | None = None
    cancellation_reason: str | None = None
    attendance_taken: bool | None = None
    attendance_taken_at: datetime | None = None
    total_students: int | None = Field(default=None, ge=0)
    present_students: int | None = Field(default=None, ge=0)
    absent_students: int | None = Field(default=None, ge=0)
    late_students: int | None = Field(default=None, ge=0)
    schedule_id: uuid.UUID | None = None


class AttendanceSession(AttendanceSessionBase, table=True):
    __tablename__ = "attendance_session"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    schedule: "Schedule" = Relationship(back_populates="attendance_sessions")
    attendance_records: list["AttendanceRecord"] = Relationship(
        back_populates="attendance_session",
        cascade_delete=True
    )


class AttendanceSessionPublic(AttendanceSessionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AttendanceSessionPublicWithDetails(AttendanceSessionPublic):
    schedule: "SchedulePublicWithDetails"


class AttendanceQRResponse(SQLModel):
    token: str
    expires_at: datetime


class AttendanceSessionsPublic(SQLModel):
    data: list[AttendanceSessionPublicWithDetails]
    count: int