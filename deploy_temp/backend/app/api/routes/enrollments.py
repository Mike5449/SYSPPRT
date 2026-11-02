import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.enrollment import (
    Enrollment,
    EnrollmentCreate,
    EnrollmentPublic,
    EnrollmentsPublic,
    EnrollmentUpdate,
    EnrollmentPublicWithDetails,
)
from app.services.enrollment_service import EnrollmentService

router = APIRouter()


@router.get("/", response_model=EnrollmentsPublic)
def read_enrollments(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve enrollments.
    """
    enrollment_service = EnrollmentService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(Enrollment)
    count = session.exec(count_statement).one()
    
    # Get enrollments
    enrollments = enrollment_service.get_all(skip=skip, limit=limit)
    
    return EnrollmentsPublic(data=enrollments, count=count)


@router.get("/student/{student_id}", response_model=EnrollmentsPublic)
def read_enrollments_by_student(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve enrollments by student.
    Students can only see their own enrollments.
    """
    # Check permissions
    if not current_user.is_superuser:
        # Students can only see their own enrollments
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    enrollment_service = EnrollmentService(session)
    enrollments = enrollment_service.get_by_student(student_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Enrollment).where(
        Enrollment.student_id == student_id
    )
    count = session.exec(count_statement).one()
    
    return EnrollmentsPublic(data=enrollments, count=count)


@router.get("/student/{student_id}/active", response_model=EnrollmentsPublic)
def read_active_enrollments_by_student(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active enrollments by student.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    enrollment_service = EnrollmentService(session)
    enrollments = enrollment_service.get_active_enrollments(student_id, skip=skip, limit=limit)
    
    return EnrollmentsPublic(data=enrollments, count=len(enrollments))


@router.get("/course-session/{course_session_id}", response_model=EnrollmentsPublic)
def read_enrollments_by_course_session(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve enrollments by course session.
    """
    enrollment_service = EnrollmentService(session)
    enrollments = enrollment_service.get_by_course_session(
        course_session_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(Enrollment).where(
        Enrollment.course_session_id == course_session_id
    )
    count = session.exec(count_statement).one()
    
    return EnrollmentsPublic(data=enrollments, count=count)


@router.get("/{enrollment_id}", response_model=EnrollmentPublicWithDetails)
def read_enrollment(
    session: SessionDep,
    current_user: CurrentUser,
    enrollment_id: uuid.UUID,
) -> Any:
    """
    Get enrollment by ID.
    """
    enrollment_service = EnrollmentService(session)
    enrollment = enrollment_service.get_by_id(enrollment_id)
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(enrollment.student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return enrollment


@router.post("/", response_model=EnrollmentPublic)
def create_enrollment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    enrollment_in: EnrollmentCreate,
) -> Any:
    """
    Create new enrollment.
    Only superusers can create enrollments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    enrollment_service = EnrollmentService(session)
    
    try:
        enrollment = enrollment_service.create_enrollment(enrollment_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return enrollment


@router.put("/{enrollment_id}", response_model=EnrollmentPublic)
def update_enrollment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    enrollment_id: uuid.UUID,
    enrollment_in: EnrollmentUpdate,
) -> Any:
    """
    Update an enrollment.
    Only superusers can update enrollments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    enrollment_service = EnrollmentService(session)
    enrollment = enrollment_service.update_enrollment(enrollment_id, enrollment_in)
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return enrollment


@router.post("/{enrollment_id}/drop", response_model=EnrollmentPublic)
def drop_enrollment(
    session: SessionDep,
    current_user: CurrentUser,
    enrollment_id: uuid.UUID,
) -> Any:
    """
    Drop an enrollment.
    Only superusers can drop enrollments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    enrollment_service = EnrollmentService(session)
    enrollment = enrollment_service.drop_enrollment(enrollment_id)
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return enrollment


@router.delete("/{enrollment_id}")
def delete_enrollment(
    session: SessionDep,
    current_user: CurrentUser,
    enrollment_id: uuid.UUID,
) -> Any:
    """
    Delete an enrollment.
    Only superusers can delete enrollments.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    enrollment_service = EnrollmentService(session)
    enrollment = enrollment_service.get_by_id(enrollment_id)
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    success = enrollment_service.delete(enrollment_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete enrollment")
    
    return {"message": "Enrollment deleted successfully"}