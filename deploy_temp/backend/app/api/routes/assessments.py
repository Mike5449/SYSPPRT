import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.assessment import (
    Assessment,
    AssessmentCreate,
    AssessmentPublic,
    AssessmentsPublic,
    AssessmentUpdate,
    AssessmentPublicWithDetails,
)
from app.services.assessment_service import AssessmentService

router = APIRouter()


@router.get("/", response_model=AssessmentsPublic)
def read_assessments(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    name: str | None = None,
    assessment_type: str | None = None,
    due_date: date | None = None,
    course_session_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
) -> Any:
    """
    Retrieve assessments.
    """
    assessment_service = AssessmentService(session)
    
    # Count total with filters
    count = assessment_service.count_assessments(
        name=name,
        assessment_type=assessment_type,
        due_date=due_date,
        course_session_id=course_session_id,
        teacher_id=teacher_id
    )
    
    # Get assessments with filters
    assessments = assessment_service.get_all(
        skip=skip, 
        limit=limit,
        name=name,
        assessment_type=assessment_type,
        due_date=due_date,
        course_session_id=course_session_id,
        teacher_id=teacher_id
    )
    
    return AssessmentsPublic(data=assessments, count=count)


@router.get("/course-session/{course_session_id}", response_model=AssessmentsPublic)
def read_assessments_by_course_session(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve assessments by course session.
    """
    assessment_service = AssessmentService(session)
    assessments = assessment_service.get_by_course_session(
        course_session_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(Assessment).where(
        Assessment.course_session_id == course_session_id
    )
    count = session.exec(count_statement).one()
    
    return AssessmentsPublic(data=assessments, count=count)


@router.get("/course-session/{course_session_id}/published", response_model=AssessmentsPublic)
def read_published_assessments(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve published assessments.
    """
    assessment_service = AssessmentService(session)
    assessments = assessment_service.get_published_assessments(
        course_session_id, skip=skip, limit=limit
    )
    
    return AssessmentsPublic(data=assessments, count=len(assessments))


@router.get("/course-session/{course_session_id}/mandatory", response_model=AssessmentsPublic)
def read_mandatory_assessments(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve mandatory assessments.
    """
    assessment_service = AssessmentService(session)
    assessments = assessment_service.get_mandatory_assessments(
        course_session_id, skip=skip, limit=limit
    )
    
    return AssessmentsPublic(data=assessments, count=len(assessments))


@router.get("/course-session/{course_session_id}/type/{assessment_type}", response_model=AssessmentsPublic)
def read_assessments_by_type(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
    assessment_type: str,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve assessments by type.
    """
    assessment_service = AssessmentService(session)
    assessments = assessment_service.get_by_type(
        course_session_id, assessment_type, skip=skip, limit=limit
    )
    
    return AssessmentsPublic(data=assessments, count=len(assessments))


@router.get("/course-session/{course_session_id}/total-weight")
def get_total_weight(
    session: SessionDep,
    current_user: CurrentUser,
    course_session_id: uuid.UUID,
) -> Any:
    """
    Get total weight of assessments for a course session.
    """
    assessment_service = AssessmentService(session)
    total_weight = assessment_service.get_total_weight(course_session_id)
    
    return {
        "course_session_id": course_session_id,
        "total_weight": total_weight,
        "total_percentage": total_weight * 100,
        "remaining_weight": 1.0 - total_weight,
        "remaining_percentage": (1.0 - total_weight) * 100
    }


@router.get("/{assessment_id}", response_model=AssessmentPublicWithDetails)
def read_assessment(
    session: SessionDep,
    current_user: CurrentUser,
    assessment_id: uuid.UUID,
) -> Any:
    """
    Get assessment by ID.
    """
    assessment_service = AssessmentService(session)
    assessment = assessment_service.get_by_id(assessment_id)
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return assessment


@router.post("/", response_model=AssessmentPublic)
def create_assessment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    assessment_in: AssessmentCreate,
) -> Any:
    """
    Create new assessment.
    Only superusers can create assessments.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    assessment_service = AssessmentService(session)
    
    try:
        assessment = assessment_service.create_assessment(assessment_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return assessment


@router.put("/{assessment_id}", response_model=AssessmentPublic)
def update_assessment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    assessment_id: uuid.UUID,
    assessment_in: AssessmentUpdate,
) -> Any:
    """
    Update an assessment.
    Only superusers can update assessments.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    assessment_service = AssessmentService(session)
    
    try:
        assessment = assessment_service.update_assessment(assessment_id, assessment_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return assessment


@router.delete("/{assessment_id}")
def delete_assessment(
    session: SessionDep,
    current_user: CurrentUser,
    assessment_id: uuid.UUID,
) -> Any:
    """
    Delete an assessment.
    Only superusers can delete assessments.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    assessment_service = AssessmentService(session)
    assessment = assessment_service.get_by_id(assessment_id)
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    success = assessment_service.delete(assessment_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete assessment")
    
    return {"message": "Assessment deleted successfully"}