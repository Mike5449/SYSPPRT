from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import get_db, get_current_user
from app.models.student_analytics import StudentDashboardMetrics
from app.models.student import Student
from app.models.user import User
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
    academic_year_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db)
) -> StudentDashboardMetrics:
    # Authorization: superusers can access any student; others only their own data
    if not current_user.is_superuser:
        student = session.get(Student, student_id)
        if not student or student.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied: you can only view your own dashboard")
    repository = StudentAnalyticsRepository(session)
    try:
        metrics = repository.get_dashboard_metrics(
            student_id=student_id,
            year_level=year_level,
            academic_year_id=academic_year_id
        )
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
