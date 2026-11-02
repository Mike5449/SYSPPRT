import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.permission import Permission
    from app.models.user_role import UserRole


from app.models.user_role import UserRole


# Table de liaison pour many-to-many entre Role et Permission
class RolePermissionBase(SQLModel):
    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True)
    permission_id: uuid.UUID = Field(foreign_key="permission.id", primary_key=True)


class RolePermission(RolePermissionBase, table=True):
    __tablename__ = "role_permission"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Shared properties
class RoleBase(SQLModel):
    """
    Rôle utilisateur (ex: Admin, Teacher, Student, etc.)
    """
    name: str = Field(min_length=1, max_length=100, index=True)
    code: str = Field(min_length=2, max_length=20, index=True, unique=True)
    description: str | None = Field(default=None, max_length=1000)
    is_active: bool = Field(default=True)


class RoleCreate(RoleBase):
    pass


class RoleUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=2, max_length=20)
    description: str | None = None
    is_active: bool | None = None


class Role(RoleBase, table=True):
    __tablename__ = "role"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    users: list["User"] = Relationship(
        back_populates="roles",
        link_model=UserRole
    )
    
    permissions: list["Permission"] = Relationship(
        back_populates="roles",
        link_model=RolePermission
    )


class RolePublic(RoleBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class RolePublicWithPermissions(RolePublic):
    permissions: list["Permission"] = []


class RolesPublic(SQLModel):
    data: list[RolePublic]
    count: int
