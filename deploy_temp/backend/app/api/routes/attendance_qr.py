import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api import deps
from app.models.attendance_record import AttendanceRecordPublic, AttendanceRecordPublicWithDetails
from app.services.attendance_qr_service import AttendanceQRService

from app.models.attendance_session import AttendanceQRResponse

router = APIRouter()

@router.post("/{session_id}/generate-qr", response_model=AttendanceQRResponse)
def generate_qr_token(
    *,
    session_id: uuid.UUID,
    refresh_interval: int = 60,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """
    Generate a new single‑use QR token for an attendance session.
    Only superusers and teachers can generate QR tokens.
    """
    is_teacher = any(role.code == "TEACHER" for role in current_user.roles)
    if not current_user.is_superuser and not is_teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    qr_service = AttendanceQRService(db)
    try:
        return qr_service.generate_qr_token(str(session_id), refresh_interval)
    except ValueError as e:
        # Standardize: if "not found", return 404
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/scan-qr", response_model=AttendanceRecordPublicWithDetails)
def scan_qr_token(
    *,
    token: str,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user),
) -> Any:
    """
    Scan a QR token to record attendance.
    The student must be logged in.
    Returns attendance record with student and session details.
    """
    from app.repositories.student_repository import StudentRepository
    from app.repositories.attendance_record_repository import AttendanceRecordRepository
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Scan QR attempt - User ID: {current_user.id}, Token: {token[:20]}...")
    
    student_repo = StudentRepository(db)
    qr_service = AttendanceQRService(db)
    attendance_repo = AttendanceRecordRepository(db)
    
    try:
        student = student_repo.get_by_user_id(current_user.id)
        if not student:
            logger.error(f"User {current_user.id} is not a student")
            raise ValueError("Authenticated user is not an active student")
        
        logger.info(f"Student found: {student.id}")
        attendance_record = qr_service.validate_and_record_attendance(token, str(student.id))
        
        # Fetch with relationships to return full details
        record_with_details = attendance_repo.get_by_id_with_details(attendance_record.id)
        if not record_with_details:
            raise ValueError("Failed to retrieve attendance record details")
        
        return record_with_details
    except ValueError as e:
        logger.error(f"ValueError during scan: {str(e)}")
        # Standardize: if "Invalid" or "Expired" or "not found", return 404
        if any(msg in str(e).lower() for msg in ["invalid", "expired", "not found"]):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
