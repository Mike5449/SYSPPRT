from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import get_db, get_current_user
from app.models.teacher_analytics import TeacherDashboardMetrics
from app.repositories.teacher_analytics_repository import TeacherAnalyticsRepository

router = APIRouter()

@router.get(
    "/teacher/assigned-program-levels",
    response_model=List[dict],
    summary="Get program levels assigned to a teacher",
    description="Returns program levels where the teacher has active course sessions in the specific academic year."
)
def get_assigned_program_levels(
    teacher_id: UUID,
    academic_year_id: Optional[UUID] = None,
    # current_user = Depends(get_current_user),
    session: Session = Depends(get_db)
) -> List[dict]:
    print(f"DEBUG: get_assigned_program_levels - teacher_id: {teacher_id}, academic_year_id: {academic_year_id}")
    repository = TeacherAnalyticsRepository(session)
    return repository.get_assigned_program_levels(teacher_id, academic_year_id)


@router.get(
    "/admin/assigned-teachers",
    response_model=List[dict],
    summary="Get teachers assigned to a program level (Admin)",
    description="Returns teachers who have active course sessions in the specific program level and academic year."
)
def get_assigned_teachers(
    program_level_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    session: Session = Depends(get_db)
) -> List[dict]:
    repository = TeacherAnalyticsRepository(session)
    return repository.get_assigned_teachers(program_level_id, academic_year_id)


@router.get(
    "/teacher/dashboard",
    response_model=TeacherDashboardMetrics,
    summary="Get teacher dashboard metrics",
    description="Calculates aggregate metrics for all students associated with the teacher's sessions."
)
def get_teacher_dashboard_metrics(
    teacher_id: UUID,
    academic_year_id: Optional[UUID] = None,
    program_level_id: Optional[UUID] = None,
    year_level: Optional[int] = None,
    # current_user = Depends(get_current_user),
    session: Session = Depends(get_db)
) -> TeacherDashboardMetrics:
    repository = TeacherAnalyticsRepository(session)
    try:
        metrics = repository.get_dashboard_metrics(
            teacher_id=teacher_id,
            academic_year_id=academic_year_id,
            program_level_id=program_level_id,
            year_level=year_level
        )
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
