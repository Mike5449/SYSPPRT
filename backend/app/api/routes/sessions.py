import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.session import (
    Session,
    SessionCreate,
    SessionPublic,
    SessionsPublic,
    SessionUpdate,
    SessionPublicWithAcademicYear,
    SessionsPublicWithAcademicYear,
)
from app.services.session_service import SessionService

router = APIRouter()


@router.get("/", response_model=SessionsPublic)
def read_sessions(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    code: str = None,
    academic_year_id: uuid.UUID = None,
    is_active: bool = None,
) -> Any:
    """
    Retrieve sessions.
    """
    session_service = SessionService(session)
    
    # Build count query with filters
    count_statement = select(func.count()).select_from(Session)
    if code:
        count_statement = count_statement.where(Session.code.ilike(f"%{code}%"))
    if academic_year_id:
        count_statement = count_statement.where(Session.academic_year_id == academic_year_id)
    if is_active is not None:
        count_statement = count_statement.where(Session.is_active == is_active)
        
    count = session.exec(count_statement).one()
    
    # Get sessions with filters
    sessions = session_service.get_all(
        skip=skip, 
        limit=limit, 
        code=code, 
        academic_year_id=academic_year_id, 
        is_active=is_active
    )
    
    return SessionsPublic(data=sessions, count=count)


@router.get("/with-academic-year", response_model=SessionsPublicWithAcademicYear)
def read_sessions_with_academic_year(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    code: str = None,
    academic_year_id: uuid.UUID = None,
    is_active: bool = None,
) -> Any:
    """
    Retrieve sessions with their academic year details.
    """
    session_service = SessionService(session)
    
    # Build count query with filters
    count_statement = select(func.count()).select_from(Session)
    if code:
        count_statement = count_statement.where(Session.code.ilike(f"%{code}%"))
    if academic_year_id:
        count_statement = count_statement.where(Session.academic_year_id == academic_year_id)
    if is_active is not None:
        count_statement = count_statement.where(Session.is_active == is_active)
        
    count = session.exec(count_statement).one()
    
    # Get sessions with filters and academic year loaded
    sessions = session_service.get_all_with_academic_year(
        skip=skip, 
        limit=limit, 
        code=code, 
        academic_year_id=academic_year_id, 
        is_active=is_active
    )
    
    return SessionsPublicWithAcademicYear(data=sessions, count=count)


@router.get("/academic-year/{academic_year_id}", response_model=SessionsPublic)
def read_sessions_by_academic_year(
    session: SessionDep,
    current_user: CurrentUser,
    academic_year_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve sessions by academic year.
    """
    session_service = SessionService(session)
    sessions = session_service.get_by_academic_year(
        academic_year_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(Session).where(
        Session.academic_year_id == academic_year_id
    )
    count = session.exec(count_statement).one()
    
    return SessionsPublic(data=sessions, count=count)


@router.get("/{session_id}", response_model=SessionPublic)
def read_session(
    session: SessionDep,
    current_user: CurrentUser,
    session_id: uuid.UUID,
) -> Any:
    """
    Get session by ID.
    """
    session_service = SessionService(session)
    session_obj = session_service.get_by_id(session_id)
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session_obj


@router.get("/{session_id}/with-academic-year", response_model=SessionPublicWithAcademicYear)
def read_session_with_academic_year(
    session: SessionDep,
    current_user: CurrentUser,
    session_id: uuid.UUID,
) -> Any:
    """
    Get session by ID with academic year details.
    """
    session_service = SessionService(session)
    session_obj = session_service.repository.get_by_id_with_academic_year(session_id)
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session_obj


@router.post("/", response_model=SessionPublic)
def create_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    session_in: SessionCreate,
) -> Any:
    """
    Create new session.
    Only superusers can create sessions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    session_service = SessionService(session)
    
    try:
        session_obj = session_service.create_session(session_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return session_obj


@router.put("/{session_id}", response_model=SessionPublic)
def update_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    session_id: uuid.UUID,
    session_in: SessionUpdate,
) -> Any:
    """
    Update a session.
    Only superusers can update sessions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    session_service = SessionService(session)
    
    try:
        session_obj = session_service.update_session(session_id, session_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session_obj


@router.delete("/{session_id}")
def delete_session(
    session: SessionDep,
    current_user: CurrentUser,
    session_id: uuid.UUID,
) -> Any:
    """
    Delete a session.
    Only superusers can delete sessions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    session_service = SessionService(session)
    session_obj = session_service.get_by_id(session_id)
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    
    success = session_service.delete(session_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete session")
    
    return {"message": "Session deleted successfully"}