import uuid
from typing import TYPE_CHECKING, Optional
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.role import Role, RolePermission


class PermissionBase(SQLModel):
    """Base class for Permission."""
    name: str = Field(max_length=100, unique=True, index=True)
    code: str = Field(max_length=50, unique=True, index=True)
    description: Optional[str] = Field(default=None, max_length=500)
    resource: str = Field(max_length=50)  # students, courses, grades, teachers, etc.
    action: str = Field(max_length=50)    # create, read, update, delete, manage
    is_active: bool = Field(default=True)


from app.models.role import RolePermission


class Permission(PermissionBase, table=True):
    """Permission model."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relationships
    roles: list["Role"] = Relationship(
        back_populates="permissions",
        link_model=RolePermission
    )


class PermissionCreate(PermissionBase):
    """Schema for creating permission."""
    pass


class PermissionUpdate(SQLModel):
    """Schema for updating permission."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PermissionPublic(PermissionBase):
    """Public permission schema."""
    id: uuid.UUID
    created_at: datetime


class PermissionsPublic(SQLModel):
    """Multiple permissions response."""
    data: list[PermissionPublic]
    count: int