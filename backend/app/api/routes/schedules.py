import uuid
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.schedule import (
    Schedule,
    ScheduleCreate,
    SchedulePublic,
    SchedulesPublic,
    ScheduleUpdate,
)
from app.services.schedule_service import ScheduleService

router = APIRouter()


@router.get("/", response_model=SchedulesPublic)
def read_schedules(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve schedules.
    """
    schedule_service = ScheduleService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(Schedule)
    count = session.exec(count_statement).one()
    
    # Get schedules
    schedules = schedule_service.get_all(skip=skip, limit=limit)
    
    return SchedulesPublic(data=schedules, count=count)


@router.get("/search", response_model=SchedulesPublic)
def search_schedules(
    session: SessionDep,
    current_user: CurrentUser,
    program_level_id: Optional[uuid.UUID] = Query(None),
    academic_year_id: Optional[uuid.UUID] = Query(None),
    session_number: Optional[int] = Query(None),
    year_level: Optional[int] = Query(None),
    teacher_id: Optional[uuid.UUID] = Query(None),
    day_of_week: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Search schedules with filters.
    """
    schedule_service = ScheduleService(session)

    schedules = schedule_service.get_schedules_by_filters(
        program_level_id=program_level_id,
        academic_year_id=academic_year_id,
        session_number=session_number,
        year_level=year_level,
        teacher_id=teacher_id,
        day_of_week=day_of_week,
        skip=skip,
        limit=limit
    )
    
    return SchedulesPublic(data=schedules, count=len(schedules))


@router.get("/course-session/{course_session_id}", response_model=SchedulesPublic)
def read_schedules_by_course_session(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve schedules by course session.
    """
    schedule_service = ScheduleService(session)
    schedules = schedule_service.get_by_course_session(
        course_session_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(Schedule).where(
        Schedule.course_session_id == course_session_id
    )
    count = session.exec(count_statement).one()
    
    return SchedulesPublic(data=schedules, count=count)


@router.get("/course-session/{course_session_id}/day/{day_of_week}", response_model=SchedulesPublic)
def read_schedules_by_day(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    day_of_week: int,
) -> Any:
    """
    Retrieve schedules by day of week.
    day_of_week: 0=Monday, 6=Sunday
    """
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(
            status_code=400, 
            detail="day_of_week must be between 0 (Monday) and 6 (Sunday)"
        )
    
    schedule_service = ScheduleService(session)
    schedules = schedule_service.get_by_day_of_week(course_session_id, day_of_week)
    
    return SchedulesPublic(data=schedules, count=len(schedules))


@router.get("/{schedule_id}", response_model=SchedulePublic)
def read_schedule(
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
) -> Any:
    """
    Get schedule by ID.
    """
    schedule_service = ScheduleService(session)
    schedule = schedule_service.get_by_id(schedule_id)
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return schedule


@router.post("/", response_model=SchedulePublic)
def create_schedule(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    schedule_in: ScheduleCreate,
) -> Any:
    """
    Create new schedule.
    Only superusers can create schedules.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    schedule_service = ScheduleService(session)
    
    try:
        schedule = schedule_service.create_schedule(schedule_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return schedule


@router.put("/{schedule_id}", response_model=SchedulePublic)
def update_schedule(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
    schedule_in: ScheduleUpdate,
) -> Any:
    """
    Update a schedule.
    Only superusers can update schedules.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    schedule_service = ScheduleService(session)
    
    try:
        schedule = schedule_service.update_schedule(schedule_id, schedule_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return schedule


@router.delete("/{schedule_id}")
def delete_schedule(
    session: SessionDep,
    current_user: CurrentUser,
    schedule_id: uuid.UUID,
) -> Any:
    """
    Delete a schedule.
    Only superusers can delete schedules.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    schedule_service = ScheduleService(session)
    schedule = schedule_service.get_by_id(schedule_id)
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    success = schedule_service.delete(schedule_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete schedule")
    
    return {"message": "Schedule deleted successfully"}