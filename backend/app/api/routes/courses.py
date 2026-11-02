import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.course import (
    Course,
    CourseCreate,
    CoursePublic,
    CoursesPublic,
    CourseUpdate,
    CourseWithSessionInfo,
    CoursesWithSessionInfoPublic,
)
from app.services.course_service import CourseService

router = APIRouter()


@router.get("/", response_model=CoursesPublic)
def read_courses(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    code: str | None = None,
    is_mandatory: bool | None = None,
    is_active: bool | None = None,
) -> Any:
    """
    Retrieve courses.
    """
    course_service = CourseService(session)
    
    # Count total with filters
    count = course_service.count_courses(
        name=name, code=code, is_mandatory=is_mandatory, is_active=is_active
    )
    
    # Get courses with filters
    courses = course_service.get_all(
        skip=skip, 
        limit=limit,
        name=name,
        code=code,
        is_mandatory=is_mandatory,
        is_active=is_active
    )
    
    return CoursesPublic(data=courses, count=count)


@router.get("/search", response_model=CoursesWithSessionInfoPublic)
def search_courses(
    session: SessionDep,
    current_user: CurrentUser,
    program_level_id: uuid.UUID,
    academic_year_id: uuid.UUID | None = None,
    session_number: int | None = None,
    year_level: int | None = None,
    teacher_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Search courses by program level with enriched information.
    Returns courses with teacher, session, academic year, and program details.
    Optional: filter by academic year, session number, year level, and teacher.
    """
    course_service = CourseService(session)
    courses = course_service.get_courses_by_filters_enriched(
        program_level_id, academic_year_id, session_number, year_level, teacher_id, skip, limit
    )
    
    # Simple count for now (optimization: implement count method in repository)
    count = len(courses)
    
    return CoursesWithSessionInfoPublic(data=courses, count=count)


@router.get("/program/{program_id}", response_model=CoursesPublic)
def read_courses_by_program(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve courses by program.
    """
    course_service = CourseService(session)
    courses = course_service.get_by_program(program_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Course).where(
        Course.program_id == program_id
    )
    count = session.exec(count_statement).one()
    
    return CoursesPublic(data=courses, count=count)


@router.get("/program/{program_id}/year/{year_level}", response_model=CoursesPublic)
def read_courses_by_program_and_year(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
    year_level: int,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve courses by program and year level.
    """
    course_service = CourseService(session)
    courses = course_service.get_by_program_and_year(
        program_id, year_level, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(Course).where(
        Course.program_id == program_id,
        Course.year_level == year_level
    )
    count = session.exec(count_statement).one()
    
    return CoursesPublic(data=courses, count=count)


@router.get("/program/{program_id}/mandatory", response_model=CoursesPublic)
def read_mandatory_courses(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve mandatory courses for a program.
    """
    course_service = CourseService(session)
    courses = course_service.get_mandatory_courses(program_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Course).where(
        Course.program_id == program_id,
        Course.is_mandatory == True
    )
    count = session.exec(count_statement).one()
    
    return CoursesPublic(data=courses, count=count)


@router.get("/program/{program_id}/optional", response_model=CoursesPublic)
def read_optional_courses(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve optional courses for a program.
    """
    course_service = CourseService(session)
    courses = course_service.get_optional_courses(program_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Course).where(
        Course.program_id == program_id,
        Course.is_mandatory == False
    )
    count = session.exec(count_statement).one()
    
    return CoursesPublic(data=courses, count=count)


@router.get("/{course_id}", response_model=CoursePublic)
def read_course(
    session: SessionDep,
    current_user: CurrentUser,
    course_id: uuid.UUID,
) -> Any:
    """
    Get course by ID.
    """
    course_service = CourseService(session)
    course = course_service.get_by_id(course_id)
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return course


@router.post("/", response_model=CoursePublic)
def create_course(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    course_in: CourseCreate,
) -> Any:
    """
    Create new course.
    Only superusers can create courses.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    course_service = CourseService(session)
    
    try:
        course = course_service.create_course(course_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return course


@router.put("/{course_id}", response_model=CoursePublic)
def update_course(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    course_id: uuid.UUID,
    course_in: CourseUpdate,
) -> Any:
    """
    Update a course.
    Only superusers can update courses.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    course_service = CourseService(session)
    
    try:
        course = course_service.update_course(course_id, course_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return course


@router.delete("/{course_id}")
def delete_course(
    session: SessionDep,
    current_user: CurrentUser,
    course_id: uuid.UUID,
) -> Any:
    """
    Delete a course.
    Only superusers can delete courses.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    course_service = CourseService(session)
    course = course_service.get_by_id(course_id)
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    success = course_service.delete(course_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete course")
    
    return {"message": "Course deleted successfully"}