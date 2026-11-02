import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.common import Message
from app.models.item import Item, ItemCreate, ItemPublic, ItemsPublic, ItemUpdate
from app.services.item_service import ItemService

router = APIRouter(tags=["items"])


@router.get("/", response_model=ItemsPublic)
def read_items(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve items.
    """
    item_service = ItemService(session)
    
    if current_user.is_superuser:
        items = item_service.get_all(skip=skip, limit=limit)
        count = item_service.repository.count()
    else:
        items, count = item_service.get_user_items_paginated(
            owner_id=current_user.id, skip=skip, limit=limit
        )

    return ItemsPublic(data=items, count=count)


@router.get("/{id}", response_model=ItemPublic)
def read_item(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get item by ID.
    """
    item_service = ItemService(session)
    item = item_service.get_by_id(id)
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return item


@router.post("/", response_model=ItemPublic)
def create_item(
    *, session: SessionDep, current_user: CurrentUser, item_in: ItemCreate
) -> Any:
    """
    Create new item.
    """
    item_service = ItemService(session)
    item = item_service.create_item(item_create=item_in, owner_id=current_user.id)
    return item


@router.put("/{id}", response_model=ItemPublic)
def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    item_in: ItemUpdate,
) -> Any:
    """
    Update an item.
    """
    item_service = ItemService(session)
    item = item_service.get_by_id(id)
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    updated_item = item_service.update_item(
        item_id=id, item_update=item_in, owner_id=current_user.id
    )
    
    if not updated_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return updated_item


@router.delete("/{id}")
def delete_item(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an item.
    """
    item_service = ItemService(session)
    item = item_service.get_by_id(id)
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    item_service.delete_item(item_id=id, owner_id=current_user.id)
    return Message(message="Item deleted successfully")
