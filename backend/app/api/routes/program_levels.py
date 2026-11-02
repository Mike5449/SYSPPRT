import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.program_level import (
    ProgramLevel,
    ProgramLevelCreate,
    ProgramLevelPublic,
    ProgramLevelPublicWithDetails,
    ProgramLevelsPublic,
    ProgramLevelUpdate,
)
from app.services.program_level_service import ProgramLevelService

router = APIRouter()


@router.get("/", response_model=ProgramLevelsPublic)
def read_program_levels(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve program levels.
    """
    program_level_service = ProgramLevelService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(ProgramLevel)
    count = session.exec(count_statement).one()
    
    # Get levels
    levels = program_level_service.get_all(skip=skip, limit=limit)
    
    return ProgramLevelsPublic(data=levels, count=count)


@router.get("/active", response_model=ProgramLevelsPublic)
def read_active_program_levels(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active program levels only.
    """
    program_level_service = ProgramLevelService(session)
    levels = program_level_service.get_active_levels(skip=skip, limit=limit)
    
    # Count active
    count_statement = select(func.count()).select_from(ProgramLevel).where(ProgramLevel.is_active == True)
    count = session.exec(count_statement).one()
    
    return ProgramLevelsPublic(data=levels, count=count)


@router.get("/{level_id}", response_model=ProgramLevelPublicWithDetails)
def read_program_level(
    session: SessionDep,
    current_user: CurrentUser,
    level_id: uuid.UUID,
) -> Any:
    """
    Get program level by ID with program details.
    """
    program_level_service = ProgramLevelService(session)
    level = program_level_service.get_by_id(level_id)
    
    if not level:
        raise HTTPException(status_code=404, detail="Program level not found")
    
    return level


@router.get("/code/{code}", response_model=ProgramLevelPublicWithDetails)
def read_program_level_by_code(
    session: SessionDep,
    current_user: CurrentUser,
    code: str,
) -> Any:
    """
    Get program level by code with program details.
    """
    program_level_service = ProgramLevelService(session)
    level = program_level_service.get_by_code(code)
    
    if not level:
        raise HTTPException(status_code=404, detail="Program level not found")
    
    return level


@router.post("/", response_model=ProgramLevelPublic)
def create_program_level(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    level_in: ProgramLevelCreate,
) -> Any:
    """
    Create new program level.
    Only superusers can create program levels.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_level_service = ProgramLevelService(session)
    
    try:
        level = program_level_service.create_level(level_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return level


@router.put("/{level_id}", response_model=ProgramLevelPublic)
def update_program_level(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    level_id: uuid.UUID,
    level_in: ProgramLevelUpdate,
) -> Any:
    """
    Update a program level.
    Only superusers can update program levels.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_level_service = ProgramLevelService(session)
    
    try:
        level = program_level_service.update_level(level_id, level_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not level:
        raise HTTPException(status_code=404, detail="Program level not found")
    
    return level


@router.delete("/{level_id}")
def delete_program_level(
    session: SessionDep,
    current_user: CurrentUser,
    level_id: uuid.UUID,
) -> Any:
    """
    Delete a program level.
    Only superusers can delete program levels.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    program_level_service = ProgramLevelService(session)
    level = program_level_service.get_by_id(level_id)
    
    if not level:
        raise HTTPException(status_code=404, detail="Program level not found")
    
    success = program_level_service.delete(level_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete program level")
    
    return {"message": "Program level deleted successfully"}