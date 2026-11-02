from sqlmodel import SQLModel, Field


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    roles: list[str] = []
    permissions: list[str] = []


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)


class OTPRequest(SQLModel):
    email: str
    password: str


class OTPVerify(SQLModel):
    email: str
    otp_code: str