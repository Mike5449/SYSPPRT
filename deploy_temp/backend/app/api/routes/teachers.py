import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select, func

from app.api.deps import CurrentUser, SessionDep, get_db
from app.models.teacher import (
    Teacher,
    TeacherCreate,
    TeacherPublic,
    TeachersPublic,
    TeacherUpdate,
    TeacherPublicWithDetails,
    TeacherWithUserCreate,
)
from app.services.teacher_service import TeacherService

router = APIRouter()


@router.get("/", response_model=TeachersPublic)
def read_teachers(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    count_statement = select(func.count()).select_from(Teacher)
    count = db.exec(count_statement).one()
    teachers = TeacherService.get_teachers(db, skip=skip, limit=limit)
    return TeachersPublic(data=teachers, count=count)


@router.get("/active", response_model=TeachersPublic)
def read_active_teachers(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active teachers.
    """
    teachers = TeacherService.get_active_teachers(session, skip=skip, limit=limit)

    return TeachersPublic(data=teachers, count=len(teachers))


@router.get("/department/{department_id}", response_model=TeachersPublic)
def read_teachers_by_department(
    session: SessionDep,
    current_user: CurrentUser,
    department_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve teachers by department.
    """
    teachers = TeacherService.get_by_department(session, department_id, skip=skip, limit=limit)

    # Count
    count_statement = select(func.count()).select_from(Teacher).where(
        Teacher.department_id == department_id
    )
    count = session.exec(count_statement).one()

    return TeachersPublic(data=teachers, count=count)


@router.get("/user-number/{user_number}", response_model=TeacherPublic)
def read_teacher_by_user_number(
    session: SessionDep,
    current_user: CurrentUser,
    user_number: str,
) -> Any:
    """
    Get teacher by user number.
    """
    teacher = TeacherService.get_by_user_number(session, user_number)

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return teacher


@router.get("/user/{user_id}", response_model=TeacherPublic)
def read_teacher_by_user(
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
) -> Any:
    """
    Get teacher by user ID.
    """
    teacher = TeacherService.get_by_user_id(session, user_id)

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return teacher


@router.get("/{teacher_id}", response_model=TeacherPublicWithDetails)
def read_teacher(
    session: SessionDep,
    current_user: CurrentUser,
    teacher_id: uuid.UUID,
) -> Any:
    """
    Get teacher by ID.
    """
    teacher = TeacherService.get_by_id(session, teacher_id)

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return teacher


@router.post("/", response_model=TeacherPublic)
def create_teacher(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    teacher_in: TeacherCreate,
) -> Any:
    """
    Create new teacher.
    Only superusers can create teachers.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    try:
        teacher = TeacherService.create_teacher(session, teacher_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return teacher


@router.post("/with-user", response_model=TeacherPublic)
def create_teacher_with_user(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    teacher_in: TeacherWithUserCreate,
) -> Any:
    """
    Create new teacher with user account.
    Only superusers can create teachers.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    try:
        teacher = TeacherService.create_teacher_with_user(session, teacher_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return teacher


@router.put("/{teacher_id}", response_model=TeacherPublic)
def update_teacher(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    teacher_id: uuid.UUID,
    teacher_in: TeacherUpdate,
) -> Any:
    """
    Update a teacher.
    Only superusers can update teachers.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    try:
        teacher = TeacherService.update_teacher(session, teacher_id, teacher_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return teacher


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: str,
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a teacher.
    Only superusers can delete teachers.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    teacher = TeacherService.get_by_id(db, teacher_id)

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # teacher_service.delete_teacher(teacher_id)