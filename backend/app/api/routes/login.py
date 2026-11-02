from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, SessionDep, get_current_user
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.common import Message, NewPassword, Token, OTPRequest, OTPVerify
from app.models.user import UserPublic
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.otp_service import OTPService
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    generate_otp_email,
    send_email,
    verify_password_reset_token,
)

router = APIRouter()


@router.post("/login/access-token")
def login_access_token(
    session: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    auth_service = AuthService(session)
    token = auth_service.login(email=form_data.username, password=form_data.password)
    
    if not token:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    return token


@router.post("/login/otp-request")
def request_otp(
    session: SessionDep, body: OTPRequest
) -> Message:
    """
    Validate credentials and send OTP.
    """
    user_service = UserService(session)
    user = user_service.authenticate(email=body.email, password=body.password)
    
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    otp_service = OTPService(session)
    otp_code = otp_service.generate_otp(user.id)
    
    # Send email to the specific address requested by user
    # target_email = "jeanlouismike89@gmail.com"
    # But for a real app, it should be user.email. The user asked for jeanlouismike89@gmail.com.
    target_email = "jeanlouismike89@gmail.com"
    email_data = generate_otp_email(
        email_to=target_email, email=user.email, otp_code=otp_code
    )
    send_email(
        email_to=target_email,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    
    return Message(message="OTP sent successfully")


@router.post("/login/otp-verify")
def verify_otp(
    session: SessionDep, body: OTPVerify
) -> Token:
    """
    Verify OTP and return access token.
    """
    user_service = UserService(session)
    user = user_service.get_by_email(email=body.email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    otp_service = OTPService(session)
    if not otp_service.verify_otp(user.id, body.otp_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Generate token (copied logic from login_access_token or we could refactor AuthService)
    auth_service = AuthService(session)
    
    # Récupérer les rôles et permissions
    roles = [role.name for role in user.roles]
    permissions = set()
    for role in user.roles:
        for perm in role.permissions:
            permissions.add(perm.name)
    
    extra_claims = {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "roles": roles,
        "permissions": list(permissions)
    }
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires, extra_claims=extra_claims
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery/{email}")
def recover_password(email: str, session: SessionDep) -> Message:
    """
    Password Recovery
    """
    user_service = UserService(session)
    user = user_service.get_by_email(email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )
    send_email(
        email_to=user.email,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Password recovery email sent")


@router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    user_service = UserService(session)
    user = user_service.get_by_email(email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    hashed_password = get_password_hash(password=body.new_password)
    user.hashed_password = hashed_password
    session.add(user)
    session.commit()
    return Message(message="Password updated successfully")


@router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_user)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, session: SessionDep) -> Any:
    """
    HTML Content for Password Recovery
    """
    user_service = UserService(session)
    user = user_service.get_by_email(email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )
