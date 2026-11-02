from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import get_db, get_current_user
from app.models.student_analytics import StudentDashboardMetrics
from app.repositories.student_analytics_repository import StudentAnalyticsRepository

router = APIRouter()

@router.get(
    "/student/dashboard",
    response_model=StudentDashboardMetrics,
    summary="Get student dashboard metrics",
    description="Calculates dashboard metrics using direct table queries instead of views."
)
def get_student_dashboard_metrics(
    student_id: UUID,
    year_level: Optional[int] = None,
    # current_user = Depends(get_current_user),  # Uncomment for auth
    session: Session = Depends(get_db)
) -> StudentDashboardMetrics:
    repository = StudentAnalyticsRepository(session)
    try:
        metrics = repository.get_dashboard_metrics(
            student_id=student_id,
            year_level=year_level
        )
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
