import uuid
from typing import TYPE_CHECKING, Optional
from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.item import Item
    from .role import Role
    from app.models.user_role import UserRole
    from app.models.student import Student
    from app.models.teacher import Teacher

# from .role import UserRole  # Importez la classe
# from app.models.role import Role, UserRole, RolePublic

# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    first_name: str | None = Field(default=None, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)
    user_number: str | None = Field(default=None, max_length=50, unique=True, index=True)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    first_name: str | None = Field(default=None, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    first_name: str | None = Field(default=None, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    user_number: str | None = Field(default=None, max_length=50)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


from app.models.user_role import UserRole


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relationships
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    
    # RBAC: Un utilisateur peut avoir plusieurs rôles
    roles: list["Role"] = Relationship(
        back_populates="users",
        link_model=UserRole
    )
    
    # Relations métier
    student: Optional["Student"] = Relationship(back_populates="user")
    teacher: Optional["Teacher"] = Relationship(back_populates="user")


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime


from .role import RolePublic


class UserPublicWithRoles(UserPublic):
    roles: list[RolePublic]


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int