import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.faculty import Faculty, FacultyPublic


# Shared properties
class DepartmentBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, index=True)
    code: str = Field(min_length=2, max_length=20, index=True)
    description: str | None = Field(default=None, max_length=1000)
    head_of_department: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    office_location: str | None = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)


# Properties to receive on creation
class DepartmentCreate(DepartmentBase):
    pass


# Properties to receive on update
class DepartmentUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    description: str | None = Field(default=None, max_length=1000)
    head_of_department: str | None = None
    email: str | None = None
    phone: str | None = None
    office_location: str | None = None
    is_active: bool | None = None


# Database model
class Department(DepartmentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    faculties: list["Faculty"] = Relationship(
        back_populates="department",
        cascade_delete=True
    )


# Properties to return via API
class DepartmentPublic(DepartmentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DepartmentPublicWithFaculties(DepartmentPublic):
    faculties: list["FacultyPublic"] = []


class DepartmentsPublic(SQLModel):
    data: list[DepartmentPublic]
    count: int