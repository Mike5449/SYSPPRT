import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.course_session import (
    CourseSession,
    CourseSessionCreate,
    CourseSessionPublic,
    CourseSessionsPublic,
    CourseSessionUpdate,
)
from app.services.course_session_service import CourseSessionService

router = APIRouter()


@router.get("/", response_model=CourseSessionsPublic)
def read_course_sessions(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    course_query: str | None = None,
    program_id: uuid.UUID | None = None,
    program_level_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
    session_id: uuid.UUID | None = None,
    is_active: bool | None = None,
    year_level: int | None = None,
    academic_year_id: uuid.UUID | None = None,
) -> Any:
    """
    Retrieve course sessions.
    """
    course_session_service = CourseSessionService(session)

    # Count total with filters
    count = course_session_service.count_course_sessions(
        course_query=course_query,
        program_id=program_id,
        program_level_id=program_level_id,
        teacher_id=teacher_id,
        session_id=session_id,
        is_active=is_active,
        year_level=year_level,
        academic_year_id=academic_year_id
    )

    # Get course sessions with filters
    course_sessions = course_session_service.get_all(
        skip=skip,
        limit=limit,
        course_query=course_query,
        program_id=program_id,
        program_level_id=program_level_id,
        teacher_id=teacher_id,
        session_id=session_id,
        is_active=is_active,
        year_level=year_level,
        academic_year_id=academic_year_id
    )
    
    return CourseSessionsPublic(data=course_sessions, count=count)


@router.get("/session/{session_id}", response_model=CourseSessionsPublic)
def read_course_sessions_by_session(
    session: SessionDep,
    current_user: CurrentUser,
    session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve course sessions by session.
    """
    course_session_service = CourseSessionService(session)
    course_sessions = course_session_service.get_by_session(
        session_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(CourseSession).where(
        CourseSession.session_id == session_id
    )
    count = session.exec(count_statement).one()
    
    return CourseSessionsPublic(data=course_sessions, count=count)


@router.get("/course-program-level/{course_program_level_id}", response_model=CourseSessionsPublic)
def read_course_sessions_by_course_program_level(
    session: SessionDep,
    current_user: CurrentUser,
    course_program_level_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve course sessions by course program level.
    """
    course_session_service = CourseSessionService(session)
    course_sessions = course_session_service.get_by_course_program_level(
        course_program_level_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(CourseSession).where(
        CourseSession.course_program_level_id == course_program_level_id
    )
    count = session.exec(count_statement).one()
    
    return CourseSessionsPublic(data=course_sessions, count=count)


@router.get("/{course_session_id}", response_model=CourseSessionPublic)
def read_course_session(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
) -> Any:
    """
    Get course session by ID.
    """
    course_session_service = CourseSessionService(session)
    course_session = course_session_service.get_by_id(course_session_id)
    
    if not course_session:
        raise HTTPException(status_code=404, detail="Course session not found")
    
    return course_session


@router.post("/", response_model=CourseSessionPublic)
def create_course_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    course_session_in: CourseSessionCreate,
) -> Any:
    """
    Create new course session.
    Only superusers can create course sessions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    course_session_service = CourseSessionService(session)
    
    try:
        course_session = course_session_service.create_course_session(course_session_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return course_session


@router.put("/{course_session_id}", response_model=CourseSessionPublic)
def update_course_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    course_session_in: CourseSessionUpdate,
) -> Any:
    """
    Update a course session.
    Only superusers can update course sessions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    course_session_service = CourseSessionService(session)
    course_session = course_session_service.update_course_session(
        course_session_id, course_session_in
    )
    
    if not course_session:
        raise HTTPException(status_code=404, detail="Course session not found")
    
    return course_session


@router.post("/{course_session_id}/enroll", response_model=CourseSessionPublic)
def enroll_student(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
) -> Any:
    """
    Enroll a student in a course session.
    """
    course_session_service = CourseSessionService(session)
    
    try:
        course_session = course_session_service.increment_enrolled_students(
            course_session_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not course_session:
        raise HTTPException(status_code=404, detail="Course session not found")
    
    return course_session


@router.post("/{course_session_id}/unenroll", response_model=CourseSessionPublic)
def unenroll_student(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
) -> Any:
    """
    Unenroll a student from a course session.
    """
    course_session_service = CourseSessionService(session)
    
    try:
        course_session = course_session_service.decrement_enrolled_students(
            course_session_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not course_session:
        raise HTTPException(status_code=404, detail="Course session not found")
    
    return course_session


@router.delete("/{course_session_id}")
def delete_course_session(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
) -> Any:
    """
    Delete a course session.
    Only superusers can delete course sessions.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    course_session_service = CourseSessionService(session)
    course_session = course_session_service.get_by_id(course_session_id)
    
    if not course_session:
        raise HTTPException(status_code=404, detail="Course session not found")
    
    success = course_session_service.delete(course_session_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete course session")
    
    return {"message": "Course session deleted successfully"}