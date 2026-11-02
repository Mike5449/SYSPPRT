import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.department import Department, DepartmentPublic
    from app.models.program import Program


# Shared properties
class FacultyBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, index=True)
    code: str = Field(min_length=2, max_length=20, index=True)
    description: str | None = Field(default=None, max_length=1000)
    dean_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    office_location: str | None = Field(default=None, max_length=255)
    established_year: int | None = Field(default=None, ge=1900, le=2100)
    is_active: bool = Field(default=True)
    
    # Foreign key
    department_id: uuid.UUID = Field(foreign_key="department.id", index=True)


# Properties to receive on creation
class FacultyCreate(FacultyBase):
    pass


# Properties to receive on update
class FacultyUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    description: str | None = Field(default=None, max_length=1000)
    dean_name: str | None = None
    email: str | None = None
    phone: str | None = None
    office_location: str | None = None
    established_year: int | None = Field(default=None, ge=1900, le=2100)
    is_active: bool | None = None
    department_id: uuid.UUID | None = None


# Database model
class Faculty(FacultyBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    department: "Department" = Relationship(back_populates="faculties")
    programs: list["Program"] = Relationship(
        back_populates="faculty",
        cascade_delete=True
    )


# Properties to return via API
class FacultyPublic(FacultyBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class FacultyPublicWithDepartment(SQLModel):
    id: uuid.UUID
    name: str
    code: str
    description: str | None
    dean_name: str | None
    email: str | None
    phone: str | None
    office_location: str | None
    established_year: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    department: "DepartmentPublic"  # type: ignore


class FacultyPublicWithPrograms(FacultyPublic):
    programs: list["Program"] = []  # type: ignore


class FacultiesPublic(SQLModel):
    data: list[FacultyPublicWithDepartment]
    count: int