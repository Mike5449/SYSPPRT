import uuid
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User

class UserOTPBase(SQLModel):
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    code: str = Field(max_length=10)
    expires_at: datetime
    is_used: bool = Field(default=False)

class UserOTP(UserOTPBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship()
