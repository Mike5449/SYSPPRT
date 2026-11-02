import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.common import Message
from app.models.user import (
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UserPublicWithRoles,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.services.user_service import UserService
from app.utils import generate_new_account_email, send_email

router = APIRouter()


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """
    user_service = UserService(session)
    users, count = user_service.get_users_paginated(skip=skip, limit=limit)
    
    return UsersPublic(data=users, count=count)


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user_service = UserService(session)
    
    try:
        user = user_service.create_user(user_create=user_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """
    user_service = UserService(session)
    
    try:
        user = user_service.update_user_me(
            user_id=current_user.id, user_update=user_in
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    user_service = UserService(session)
    
    try:
        user_service.update_password(user_id=current_user.id, password_update=body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublicWithRoles)
def read_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    # Load roles specifically for this endpoint
    from sqlalchemy.orm import selectinload
    statement = select(User).where(User.id == current_user.id).options(selectinload(User.roles))
    user = session.exec(statement).first()
    return user


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    
    user_service = UserService(session)
    user_service.delete(current_user.id)
    return Message(message="User deleted successfully")


@router.post("/signup", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.
    """
    if not settings.USERS_OPEN_REGISTRATION:
        raise HTTPException(
            status_code=403,
            detail="Open user registration is forbidden on this server",
        )
    
    user_service = UserService(session)
    user_create = UserCreate.model_validate(user_in)
    
    try:
        user = user_service.create_user(user_create=user_create)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return user


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user_service = UserService(session)
    user = user_service.get_by_id(user_id)
    
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """
    user_service = UserService(session)
    
    try:
        db_user = user_service.update_user(user_id=user_id, user_update=user_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Delete a user.
    """
    user_service = UserService(session)
    user = user_service.get_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    
    user_service.delete(user_id)
    return Message(message="User deleted successfully")
