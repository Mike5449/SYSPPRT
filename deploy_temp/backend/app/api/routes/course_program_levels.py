import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.course_program_level import (
    CourseProgramLevel,
    CourseProgramLevelCreate,
    CourseProgramLevelPublic,
    CourseProgramLevelPublicWithDetails,
    CoursesProgramLevelsPublic,
    CourseProgramLevelUpdate,
)
from app.services.course_program_level_service import CourseProgramLevelService

router = APIRouter()


@router.get("/", response_model=CoursesProgramLevelsPublic)
def read_course_program_levels(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all course-program level relations.
    """
    service = CourseProgramLevelService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(CourseProgramLevel)
    count = session.exec(count_statement).one()
    
    # Get relations with details
    relations = service.get_all(skip=skip, limit=limit)
    
    return CoursesProgramLevelsPublic(data=relations, count=count)


@router.post("/", response_model=CourseProgramLevelPublicWithDetails)
def create_course_program_level(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    cpl_in: CourseProgramLevelCreate,
) -> Any:
    """
    Create new course-program level relation.
    """
    service = CourseProgramLevelService(session)
    
    try:
        cpl = service.create_course_program_level(cpl_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return cpl


@router.get("/active", response_model=CoursesProgramLevelsPublic)
def read_active_course_program_levels(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active course-program level relations.
    """
    service = CourseProgramLevelService(session)
    relations = service.get_active(skip=skip, limit=limit)
    
    return CoursesProgramLevelsPublic(data=relations, count=len(relations))


@router.get("/course/{course_id}", response_model=CoursesProgramLevelsPublic)
def read_course_program_levels_by_course(
    session: SessionDep,
    current_user: CurrentUser,
    course_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all program levels for a specific course.
    """
    service = CourseProgramLevelService(session)
    relations = service.get_by_course(course_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(CourseProgramLevel).where(
        CourseProgramLevel.course_id == course_id
    )
    count = session.exec(count_statement).one()
    
    return CoursesProgramLevelsPublic(data=relations, count=count)


@router.get("/program-level/{program_level_id}", response_model=CoursesProgramLevelsPublic)
def read_course_program_levels_by_program_level(
    session: SessionDep,
    current_user: CurrentUser,
    program_level_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all courses for a specific program level.
    """
    service = CourseProgramLevelService(session)
    relations = service.get_by_program_level(program_level_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(CourseProgramLevel).where(
        CourseProgramLevel.program_level_id == program_level_id
    )
    count = session.exec(count_statement).one()
    
    return CoursesProgramLevelsPublic(data=relations, count=count)


@router.get("/year-level/{year_level}", response_model=CoursesProgramLevelsPublic)
def read_course_program_levels_by_year_level(
    session: SessionDep,
    current_user: CurrentUser,
    year_level: int,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all relations for a specific year level.
    """
    service = CourseProgramLevelService(session)
    relations = service.get_by_year_level(year_level, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(CourseProgramLevel).where(
        CourseProgramLevel.year_level == year_level
    )
    count = session.exec(count_statement).one()
    
    return CoursesProgramLevelsPublic(data=relations, count=count)


@router.get("/{cpl_id}", response_model=CourseProgramLevelPublicWithDetails)
def read_course_program_level(
    cpl_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Get course-program level relation by ID.
    """
    service = CourseProgramLevelService(session)
    cpl = service.get_by_id(cpl_id)
    if not cpl:
        raise HTTPException(status_code=404, detail="Course-Program Level relation not found")
    return cpl


@router.put("/{cpl_id}", response_model=CourseProgramLevelPublicWithDetails)
def update_course_program_level(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    cpl_id: uuid.UUID,
    cpl_in: CourseProgramLevelUpdate,
) -> Any:
    """
    Update a course-program level relation.
    """
    service = CourseProgramLevelService(session)
    
    try:
        cpl = service.update_course_program_level(cpl_id, cpl_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not cpl:
        raise HTTPException(status_code=404, detail="Course-Program Level relation not found")
    
    return cpl


@router.delete("/{cpl_id}")
def delete_course_program_level(
    cpl_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Delete a course-program level relation.
    """
    service = CourseProgramLevelService(session)
    cpl = service.get_by_id(cpl_id)
    if not cpl:
        raise HTTPException(status_code=404, detail="Course-Program Level relation not found")
    
    service.delete(cpl_id)
    return {"ok": True}
