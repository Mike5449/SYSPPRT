import uuid
from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.course_session import CourseSession, CourseSessionPublic
    from app.models.attendance_session import AttendanceSession


# Shared properties
class ScheduleBase(SQLModel):
    """
    Horaire récurrent pour un cours.
    Exemple: "Lundi 8h-10h, Mercredi 14h-16h" pour un cours donné
    """
    day_of_week: int = Field(ge=0, le=6)  # 0=Lundi, 6=Dimanche
    start_time: time
    end_time: time
    room: str | None = Field(default=None, max_length=100)
    building: str | None = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    notes: str | None = Field(default=None, max_length=500)
    
    # Foreign key
    course_session_id: uuid.UUID = Field(foreign_key="course_session.id", index=True)


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(SQLModel):
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = None
    building: str | None = None
    is_active: bool | None = None
    notes: str | None = None
    course_session_id: uuid.UUID | None = None


class Schedule(ScheduleBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    course_session: "CourseSession" = Relationship(back_populates="schedules")
    attendance_sessions: list["AttendanceSession"] = Relationship(
        back_populates="schedule",
        cascade_delete=True
    )


class SchedulePublic(ScheduleBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SchedulePublicWithDetails(SchedulePublic):
    course_session: "CourseSessionPublicWithDetails"


class SchedulesPublic(SQLModel):
    data: list[SchedulePublicWithDetails]
    count: int