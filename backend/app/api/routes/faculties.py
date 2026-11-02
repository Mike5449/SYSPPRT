import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.faculty import (
    Faculty,
    FacultyCreate,
    FacultyPublic,
    FacultiesPublic,
    FacultyUpdate,
)
from app.services.faculty_service import FacultyService

router = APIRouter()


@router.get("/", response_model=FacultiesPublic)
def read_faculties(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve faculties.
    """
    faculty_service = FacultyService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(Faculty)
    count = session.exec(count_statement).one()
    
    # Get faculties
    faculties = faculty_service.get_all(skip=skip, limit=limit)
    
    return FacultiesPublic(data=faculties, count=count)


@router.get("/active", response_model=FacultiesPublic)
def read_active_faculties(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active faculties only.
    """
    faculty_service = FacultyService(session)
    faculties = faculty_service.get_active_faculties(skip=skip, limit=limit)
    
    # Count active
    count_statement = select(func.count()).select_from(Faculty).where(
        Faculty.is_active == True
    )
    count = session.exec(count_statement).one()
    
    return FacultiesPublic(data=faculties, count=count)


@router.get("/department/{department_id}", response_model=FacultiesPublic)
def read_faculties_by_department(
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
) -> Any:
    """
    Retrieve faculties by department.
    """
    faculty_service = FacultyService(session)
    
    if active_only:
        faculties = faculty_service.get_active_by_department(
            department_id, skip=skip, limit=limit
        )
    else:
        faculties = faculty_service.get_by_department(
            department_id, skip=skip, limit=limit
        )
    
    # Count
    count_statement = select(func.count()).select_from(Faculty).where(
        Faculty.department_id == department_id
    )
    if active_only:
        count_statement = count_statement.where(Faculty.is_active == True)
    
    count = session.exec(count_statement).one()
    
    return FacultiesPublic(data=faculties, count=count)


@router.get("/{faculty_id}", response_model=FacultyPublic)
def read_faculty(
    session: SessionDep,
    current_user: CurrentUser,
    faculty_id: uuid.UUID,
) -> Any:
    """
    Get faculty by ID.
    """
    faculty_service = FacultyService(session)
    faculty = faculty_service.get_by_id(faculty_id)
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    return faculty


@router.post("/", response_model=FacultyPublic)
def create_faculty(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    faculty_in: FacultyCreate,
) -> Any:
    """
    Create new faculty.
    Only superusers can create faculties.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    faculty_service = FacultyService(session)
    
    try:
        faculty = faculty_service.create_faculty(faculty_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return faculty


@router.put("/{faculty_id}", response_model=FacultyPublic)
def update_faculty(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    faculty_id: uuid.UUID,
    faculty_in: FacultyUpdate,
) -> Any:
    """
    Update a faculty.
    Only superusers can update faculties.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    faculty_service = FacultyService(session)
    
    try:
        faculty = faculty_service.update_faculty(faculty_id, faculty_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    return faculty


@router.delete("/{faculty_id}")
def delete_faculty(
    session: SessionDep,
    current_user: CurrentUser,
    faculty_id: uuid.UUID,
) -> Any:
    """
    Delete a faculty.
    Only superusers can delete faculties.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    faculty_service = FacultyService(session)
    faculty = faculty_service.get_by_id(faculty_id)
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    success = faculty_service.delete(faculty_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete faculty")
    
    return {"message": "Faculty deleted successfully"}


@router.post("/{faculty_id}/deactivate", response_model=FacultyPublic)
def deactivate_faculty(
    session: SessionDep,
    current_user: CurrentUser,
    faculty_id: uuid.UUID,
) -> Any:
    """
    Deactivate a faculty.
    Only superusers can deactivate faculties.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    faculty_service = FacultyService(session)
    faculty = faculty_service.deactivate_faculty(faculty_id)
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    return faculty


@router.post("/{faculty_id}/activate", response_model=FacultyPublic)
def activate_faculty(
    session: SessionDep,
    current_user: CurrentUser,
    faculty_id: uuid.UUID,
) -> Any:
    """
    Activate a faculty.
    Only superusers can activate faculties.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    faculty_service = FacultyService(session)
    faculty = faculty_service.activate_faculty(faculty_id)
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    return faculty