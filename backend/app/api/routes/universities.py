import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.university import (
    University,
    UniversityCreate,
    UniversityPublic,
    UniversitiesPublic,
    UniversityUpdate,
)
from app.services.university_service import UniversityService

router = APIRouter()


@router.get("/", response_model=UniversitiesPublic)
def read_universities(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve universities.
    """
    university_service = UniversityService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(University)
    count = session.exec(count_statement).one()
    
    # Get universities
    universities = university_service.get_all(skip=skip, limit=limit)
    
    return UniversitiesPublic(data=universities, count=count)


@router.get("/active", response_model=UniversitiesPublic)
def read_active_universities(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active universities only.
    """
    university_service = UniversityService(session)
    universities = university_service.get_active_universities(skip=skip, limit=limit)
    
    # Count active
    count_statement = select(func.count()).select_from(University).where(University.is_active == True)
    count = session.exec(count_statement).one()
    
    return UniversitiesPublic(data=universities, count=count)


@router.get("/{university_id}", response_model=UniversityPublic)
def read_university(
    session: SessionDep,
    current_user: CurrentUser,
    university_id: uuid.UUID,
) -> Any:
    """
    Get university by ID.
    """
    university_service = UniversityService(session)
    university = university_service.get_by_id(university_id)
    
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    return university


@router.get("/code/{code}", response_model=UniversityPublic)
def read_university_by_code(
    session: SessionDep,
    current_user: CurrentUser,
    code: str,
) -> Any:
    """
    Get university by code.
    """
    university_service = UniversityService(session)
    university = university_service.get_by_code(code)
    
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    return university


@router.post("/", response_model=UniversityPublic)
def create_university(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    university_in: UniversityCreate,
) -> Any:
    """
    Create new university.
    Only superusers can create universities.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    university_service = UniversityService(session)
    
    try:
        university = university_service.create_university(university_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return university


@router.put("/{university_id}", response_model=UniversityPublic)
def update_university(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    university_id: uuid.UUID,
    university_in: UniversityUpdate,
) -> Any:
    """
    Update a university.
    Only superusers can update universities.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    university_service = UniversityService(session)
    
    try:
        university = university_service.update_university(university_id, university_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    return university


@router.delete("/{university_id}")
def delete_university(
    session: SessionDep,
    current_user: CurrentUser,
    university_id: uuid.UUID,
) -> Any:
    """
    Delete a university.
    Only superusers can delete universities.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    university_service = UniversityService(session)
    university = university_service.get_by_id(university_id)
    
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    success = university_service.delete(university_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete university")
    
    return {"message": "University deleted successfully"}


@router.post("/{university_id}/deactivate", response_model=UniversityPublic)
def deactivate_university(
    session: SessionDep,
    current_user: CurrentUser,
    university_id: uuid.UUID,
) -> Any:
    """
    Deactivate a university.
    Only superusers can deactivate universities.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    university_service = UniversityService(session)
    university = university_service.deactivate_university(university_id)
    
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    return university


@router.post("/{university_id}/activate", response_model=UniversityPublic)
def activate_university(
    session: SessionDep,
    current_user: CurrentUser,
    university_id: uuid.UUID,
) -> Any:
    """
    Activate a university.
    Only superusers can activate universities.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    university_service = UniversityService(session)
    university = university_service.activate_university(university_id)
    
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    return university