import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.academic_year import (
    AcademicYear,
    AcademicYearCreate,
    AcademicYearPublic,
    AcademicYearsPublic,
    AcademicYearUpdate,
)
from app.services.academic_year_service import AcademicYearService

router = APIRouter()


@router.get("/", response_model=AcademicYearsPublic)
def read_academic_years(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    name: str = None,
    code: str = None,
    is_current: bool = None,
) -> Any:
    """
    Retrieve academic years.
    """
    academic_year_service = AcademicYearService(session)
    
    # Build count query with filters
    count_statement = select(func.count()).select_from(AcademicYear)
    if name:
        count_statement = count_statement.where(AcademicYear.name.ilike(f"%{name}%"))
    if code:
        count_statement = count_statement.where(AcademicYear.code.ilike(f"%{code}%"))
    if is_current is not None:
        count_statement = count_statement.where(AcademicYear.is_current == is_current)
        
    count = session.exec(count_statement).one()
    
    # Get academic years with filters
    academic_years = academic_year_service.get_all(
        skip=skip, limit=limit, name=name, code=code, is_current=is_current
    )
    
    return AcademicYearsPublic(data=academic_years, count=count)


@router.get("/current", response_model=AcademicYearPublic)
def read_current_academic_year(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Get current academic year.
    """
    academic_year_service = AcademicYearService(session)
    academic_year = academic_year_service.get_current()
    
    if not academic_year:
        raise HTTPException(
            status_code=404, 
            detail="No current academic year found"
        )
    
    return academic_year


@router.get("/{academic_year_id}", response_model=AcademicYearPublic)
def read_academic_year(
    session: SessionDep,
    current_user: CurrentUser,
    academic_year_id: uuid.UUID,
) -> Any:
    """
    Get academic year by ID.
    """
    academic_year_service = AcademicYearService(session)
    academic_year = academic_year_service.get_by_id(academic_year_id)
    
    if not academic_year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    
    return academic_year


@router.post("/", response_model=AcademicYearPublic)
def create_academic_year(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    academic_year_in: AcademicYearCreate,
) -> Any:
    """
    Create new academic year.
    Only superusers can create academic years.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    academic_year_service = AcademicYearService(session)
    
    try:
        academic_year = academic_year_service.create_academic_year(academic_year_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return academic_year


@router.put("/{academic_year_id}", response_model=AcademicYearPublic)
def update_academic_year(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    academic_year_id: uuid.UUID,
    academic_year_in: AcademicYearUpdate,
) -> Any:
    """
    Update an academic year.
    Only superusers can update academic years.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    academic_year_service = AcademicYearService(session)
    
    try:
        academic_year = academic_year_service.update_academic_year(
            academic_year_id, academic_year_in
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not academic_year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    
    return academic_year


@router.post("/{academic_year_id}/set-current", response_model=AcademicYearPublic)
def set_current_academic_year(
    session: SessionDep,
    current_user: CurrentUser,
    academic_year_id: uuid.UUID,
) -> Any:
    """
    Set an academic year as current.
    Only superusers can set current academic year.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    academic_year_service = AcademicYearService(session)
    academic_year = academic_year_service.set_as_current(academic_year_id)
    
    if not academic_year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    
    return academic_year


@router.delete("/{academic_year_id}")
def delete_academic_year(
    session: SessionDep,
    current_user: CurrentUser,
    academic_year_id: uuid.UUID,
) -> Any:
    """
    Delete an academic year.
    Only superusers can delete academic years.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    academic_year_service = AcademicYearService(session)
    academic_year = academic_year_service.get_by_id(academic_year_id)
    
    if not academic_year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    
    success = academic_year_service.delete(academic_year_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete academic year")
    
    return {"message": "Academic year deleted successfully"}