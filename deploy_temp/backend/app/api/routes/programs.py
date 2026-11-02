import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.program import (
    Program,
    ProgramCreate,
    ProgramPublic,
    ProgramPublicWithDetails,
    ProgramsPublic,
    ProgramUpdate,
)
from app.services.program_service import ProgramService

router = APIRouter()


@router.get("/", response_model=ProgramsPublic)
def read_programs(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve programs.
    """
    program_service = ProgramService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(Program)
    count = session.exec(count_statement).one()
    
    # Get programs
    programs = program_service.get_all(skip=skip, limit=limit)
    
    return ProgramsPublic(data=programs, count=count)


@router.get("/active", response_model=ProgramsPublic)
def read_active_programs(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active programs only.
    """
    program_service = ProgramService(session)
    programs = program_service.get_active_programs(skip=skip, limit=limit)
    
    # Count active
    count_statement = select(func.count()).select_from(Program).where(
        Program.is_active == True
    )
    count = session.exec(count_statement).one()
    
    return ProgramsPublic(data=programs, count=count)


@router.get("/faculty/{faculty_id}", response_model=ProgramsPublic)
def read_programs_by_faculty(
    session: SessionDep,
    current_user: CurrentUser,
    faculty_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve programs by faculty.
    """
    program_service = ProgramService(session)
    programs = program_service.get_by_faculty(faculty_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Program).where(
        Program.faculty_id == faculty_id
    )
    count = session.exec(count_statement).one()
    
    return ProgramsPublic(data=programs, count=count)




@router.get("/{program_id}", response_model=ProgramPublicWithDetails)
def read_program(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
) -> Any:
    """
    Get program by ID with faculty details.
    """
    program_service = ProgramService(session)
    program = program_service.get_by_id(program_id)
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    return program


@router.post("/", response_model=ProgramPublic)
def create_program(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    program_in: ProgramCreate,
) -> Any:
    """
    Create new program.
    Only superusers can create programs.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_service = ProgramService(session)
    
    try:
        program = program_service.create_program(program_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return program


@router.put("/{program_id}", response_model=ProgramPublic)
def update_program(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
    program_in: ProgramUpdate,
) -> Any:
    """
    Update a program.
    Only superusers can update programs.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_service = ProgramService(session)
    
    try:
        program = program_service.update_program(program_id, program_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    return program


@router.delete("/{program_id}")
def delete_program(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
) -> Any:
    """
    Delete a program.
    Only superusers can delete programs.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_service = ProgramService(session)
    program = program_service.get_by_id(program_id)
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    success = program_service.delete(program_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete program")
    
    return {"message": "Program deleted successfully"}


@router.post("/{program_id}/deactivate", response_model=ProgramPublic)
def deactivate_program(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
) -> Any:
    """
    Deactivate a program.
    Only superusers can deactivate programs.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_service = ProgramService(session)
    program = program_service.deactivate_program(program_id)
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    return program


@router.post("/{program_id}/activate", response_model=ProgramPublic)
def activate_program(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
) -> Any:
    """
    Activate a program.
    Only superusers can activate programs.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_service = ProgramService(session)
    program = program_service.activate_program(program_id)
    
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    return program