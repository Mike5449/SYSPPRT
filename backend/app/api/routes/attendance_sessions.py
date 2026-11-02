import uuid
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.attendance_session import (
    AttendanceSession,
    AttendanceSessionCreate,
    AttendanceSessionPublic,
    AttendanceSessionsPublic,
    AttendanceSessionUpdate,
)
from app.services.attendance_session_service import AttendanceSessionService

router = APIRouter()


@router.get("/", response_model=AttendanceSessionsPublic)
def read_attendance_sessions(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    course_query: Optional[str] = None,
    session_date: Optional[date] = None,
    status: Optional[str] = None,
) -> Any:
    """
    Retrieve attendance sessions.
    """
    attendance_session_service = AttendanceSessionService(session)
    
    # Get total with filters
    count = attendance_session_service.count(
        course_query=course_query,
        session_date=session_date,
        status=status
    )
    
    # Get sessions with filters
    attendance_sessions = attendance_session_service.get_all(
        skip=skip, 
        limit=limit,
        course_query=course_query,
        session_date=session_date,
        status=status
    )
    
    return AttendanceSessionsPublic(data=attendance_sessions, count=count)


@router.get("/schedule/{schedule_id}", response_model=AttendanceSessionsPublic)
def read_attendance_sessions_by_schedule(
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve attendance sessions by schedule.
    """
    attendance_session_service = AttendanceSessionService(session)
    attendance_sessions = attendance_session_service.get_by_schedule(
        schedule_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(AttendanceSession).where(
        AttendanceSession.schedule_id == schedule_id
    )
    count = session.exec(count_statement).one()
    
    return AttendanceSessionsPublic(data=attendance_sessions, count=count)


@router.get("/schedule/{schedule_id}/upcoming", response_model=AttendanceSessionsPublic)
def read_upcoming_attendance_sessions(
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve upcoming attendance sessions.
    """
    attendance_session_service = AttendanceSessionService(session)
    attendance_sessions = attendance_session_service.get_upcoming_sessions(
        schedule_id, skip=skip, limit=limit
    )
    
    return AttendanceSessionsPublic(data=attendance_sessions, count=len(attendance_sessions))


@router.get("/schedule/{schedule_id}/past", response_model=AttendanceSessionsPublic)
def read_past_attendance_sessions(
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve past attendance sessions.
    """
    attendance_session_service = AttendanceSessionService(session)
    attendance_sessions = attendance_session_service.get_past_sessions(
        schedule_id, skip=skip, limit=limit
    )
    
    return AttendanceSessionsPublic(data=attendance_sessions, count=len(attendance_sessions))


@router.get("/schedule/{schedule_id}/date/{session_date}", response_model=AttendanceSessionPublic)
def read_attendance_session_by_date(
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
    session_date: date,
) -> Any:
    """
    Get attendance session by date.
    """
    attendance_session_service = AttendanceSessionService(session)
    attendance_session = attendance_session_service.get_by_date(schedule_id, session_date)
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    return attendance_session


@router.get("/schedule/{schedule_id}/date-range", response_model=AttendanceSessionsPublic)
def read_attendance_sessions_by_date_range(
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve attendance sessions by date range.
    """
    attendance_session_service = AttendanceSessionService(session)
    attendance_sessions = attendance_session_service.get_by_date_range(
        schedule_id, start_date, end_date, skip=skip, limit=limit
    )
    
    return AttendanceSessionsPublic(data=attendance_sessions, count=len(attendance_sessions))


@router.get("/{attendance_session_id}", response_model=AttendanceSessionPublic)
def read_attendance_session(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID,
) -> Any:
    """
    Get attendance session by ID.
    """
    attendance_session_service = AttendanceSessionService(session)
    attendance_session = attendance_session_service.get_by_id(attendance_session_id)
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    return attendance_session


@router.post("/", response_model=AttendanceSessionPublic)
def create_attendance_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_in: AttendanceSessionCreate,
) -> Any:
    """
    Only superusers and teachers can create attendance sessions.
    """
    is_teacher = any(role.code == "TEACHER" for role in current_user.roles)
    if not current_user.is_superuser and not is_teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_session_service = AttendanceSessionService(session)
    
    try:
        attendance_session = attendance_session_service.create_attendance_session(
            attendance_session_in
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return attendance_session


@router.put("/{attendance_session_id}", response_model=AttendanceSessionPublic)
def update_attendance_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID,
    attendance_session_in: AttendanceSessionUpdate,
) -> Any:
    """
    Update an attendance session.
    Only superusers and teachers can update attendance sessions.
    """
    is_teacher = any(role.code == "TEACHER" for role in current_user.roles)
    if not current_user.is_superuser and not is_teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_session_service = AttendanceSessionService(session)
    
    try:
        attendance_session = attendance_session_service.update_attendance_session(
            attendance_session_id, attendance_session_in
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    return attendance_session


@router.post("/{attendance_session_id}/cancel", response_model=AttendanceSessionPublic)
def cancel_attendance_session(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID,
    cancellation_reason: str = Query(..., min_length=1),
) -> Any:
    """
    Cancel an attendance session.
    Only superusers and teachers can cancel sessions.
    """
    is_teacher = any(role.code == "TEACHER" for role in current_user.roles)
    if not current_user.is_superuser and not is_teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_session_service = AttendanceSessionService(session)
    attendance_session = attendance_session_service.cancel_session(
        attendance_session_id, cancellation_reason
    )
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    return attendance_session


@router.post("/{attendance_session_id}/mark-taken", response_model=AttendanceSessionPublic)
def mark_attendance_taken(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID,
) -> Any:
    """
    Mark attendance as taken for this session.
    """
    is_teacher = any(role.code == "TEACHER" for role in current_user.roles)
    if not current_user.is_superuser and not is_teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_session_service = AttendanceSessionService(session)
    attendance_session = attendance_session_service.mark_attendance_taken(
        attendance_session_id
    )
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    return attendance_session


@router.delete("/{attendance_session_id}")
def delete_attendance_session(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID,
) -> Any:
    """
    Delete an attendance session.
    Only superusers can delete attendance sessions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_session_service = AttendanceSessionService(session)
    attendance_session = attendance_session_service.get_by_id(attendance_session_id)
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    success = attendance_session_service.delete(attendance_session_id)
    
    if not success:
        raise HTTPException(
            status_code=400, 
            detail="Could not delete attendance session"
        )
    
    return {"message": "Attendance session deleted successfully"}