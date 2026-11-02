import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

class UniversityBase(SQLModel):
    """
    Université principale.
    Contient des départements et des années académiques.
    """
    name: str = Field(min_length=1, max_length=255, index=True)
    code: str = Field(min_length=2, max_length=20, unique=True, index=True)
    country: str = Field(max_length=100)
    city: str = Field(max_length=100)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool = Field(default=True)


class UniversityCreate(UniversityBase):
    pass


class UniversityUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    country: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class University(UniversityBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    

class UniversityPublic(UniversityBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UniversitiesPublic(SQLModel):
    data: list[UniversityPublic]
    count: int