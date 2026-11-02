import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

# Base properties
class UserRoleBase(SQLModel):
    assigned_at: datetime = Field(default_factory=datetime.utcnow)

# Table model
class UserRole(UserRoleBase, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True)

# Properties for creation
class UserRoleCreate(SQLModel):
    user_id: uuid.UUID
    role_id: uuid.UUID

# Properties for update (si besoin)
class UserRoleUpdate(SQLModel):
    assigned_at: Optional[datetime] = None

# Properties to return via API
class UserRolePublic(UserRoleBase):
    user_id: uuid.UUID
    role_id: uuid.UUID

# Optionnel : liste paginée
class UserRolesPublic(SQLModel):
    data: list[UserRolePublic]
    count: int