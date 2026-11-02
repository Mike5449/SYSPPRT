"""
API routes for role management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models.role import Role, RolePublic
from app.services.role_service import RoleService

router = APIRouter()


@router.get(
    "/user/{user_id}",
    response_model=list[RolePublic],
)
def get_user_roles(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    current_user: CurrentUser,
) -> Any:
    """
    Get all roles assigned to a user.
    
    Users can only see their own roles unless they are superusers.
    """
    # Vérifier les permissions - comparaison correcte des UUID
    if not current_user.is_superuser and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    role_service = RoleService(session)
    roles = role_service.get_user_roles(user_id)
    
    return roles


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=list[RolePublic],
)
def get_all_roles(
    *,
    session: SessionDep,
) -> Any:
    """
    Get all available roles (superuser only).
    """
    role_service = RoleService(session)
    roles = role_service.get_all_roles()
    
    return roles


@router.post(
    "/user/{user_id}/role/{role_code}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=dict[str, bool],
)
def assign_role_to_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    role_code: str,
) -> Any:
    """
    Assign a role to a user (superuser only).
    """
    role_service = RoleService(session)
    success = role_service.assign_role_to_user(user_id, role_code)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to assign role")
    
    return {"success": success}


@router.delete(
    "/user/{user_id}/role/{role_code}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=dict[str, bool],
)
def remove_role_from_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    role_code: str,
) -> Any:
    """
    Remove a role from a user (superuser only).
    """
    role_service = RoleService(session)
    success = role_service.remove_role_from_user(user_id, role_code)
    
    if not success:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    
    return {"success": success}
