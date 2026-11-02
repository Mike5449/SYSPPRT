import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.department import (
    Department,
    DepartmentCreate,
    DepartmentPublic,
    DepartmentsPublic,
    DepartmentUpdate,
)
from app.services.department_service import DepartmentService

router = APIRouter()


@router.get("/", response_model=DepartmentsPublic)
def read_departments(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve departments.
    """
    department_service = DepartmentService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(Department)
    count = session.exec(count_statement).one()
    
    # Get departments
    departments = department_service.get_all(skip=skip, limit=limit)
    
    return DepartmentsPublic(data=departments, count=count)


@router.get("/{department_id}", response_model=DepartmentPublic)
def read_department(
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID,
) -> Any:
    """
    Get department by ID.
    """
    department_service = DepartmentService(session)
    department = department_service.get_by_id(department_id)
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return department


@router.post("/", response_model=DepartmentPublic)
def create_department(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    department_in: DepartmentCreate,
) -> Any:
    """
    Create new department.
    Only superusers can create departments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    department_service = DepartmentService(session)
    
    try:
        department = department_service.create_department(department_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return department


@router.put("/{department_id}", response_model=DepartmentPublic)
def update_department(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID,
    department_in: DepartmentUpdate,
) -> Any:
    """
    Update a department.
    Only superusers can update departments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    department_service = DepartmentService(session)
    
    try:
        department = department_service.update_department(department_id, department_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return department


@router.delete("/{department_id}")
def delete_department(
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID,
) -> Any:
    """
    Delete a department.
    Only superusers can delete departments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    department_service = DepartmentService(session)
    department = department_service.get_by_id(department_id)
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    success = department_service.delete(department_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete department")
    
    return {"message": "Department deleted successfully"}


@router.post("/{department_id}/deactivate", response_model=DepartmentPublic)
def deactivate_department(
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID,
) -> Any:
    """
    Deactivate a department.
    Only superusers can deactivate departments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    department_service = DepartmentService(session)
    department = department_service.deactivate_department(department_id)
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return department


@router.post("/{department_id}/activate", response_model=DepartmentPublic)
def activate_department(
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID,
) -> Any:
    """
    Activate a department.
    Only superusers can activate departments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    department_service = DepartmentService(session)
    department = department_service.activate_department(department_id)
    
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return department