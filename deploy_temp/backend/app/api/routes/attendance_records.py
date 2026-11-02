import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Body
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.attendance_record import (
    AttendanceRecord,
    AttendanceRecordCreate,
    AttendanceRecordPublic,
    AttendanceRecordsPublic,
    AttendanceRecordUpdate,
    AttendanceStatus,
    AttendanceStatistics,
)
from app.services.attendance_record_service import AttendanceRecordService

router = APIRouter()


@router.get("/", response_model=AttendanceRecordsPublic)
def read_attendance_records(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve attendance records.
    """
    attendance_record_service = AttendanceRecordService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(AttendanceRecord)
    count = session.exec(count_statement).one()
    
    # Get records
    attendance_records = attendance_record_service.get_all(skip=skip, limit=limit)
    
    return AttendanceRecordsPublic(data=attendance_records, count=count)


@router.get("/session/{attendance_session_id}", response_model=AttendanceRecordsPublic)
def read_attendance_records_by_session(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve attendance records by session.
    """
    attendance_record_service = AttendanceRecordService(session)
    attendance_records = attendance_record_service.get_by_attendance_session(
        attendance_session_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(AttendanceRecord).where(
        AttendanceRecord.attendance_session_id == attendance_session_id
    )
    count = session.exec(count_statement).one()
    
    return AttendanceRecordsPublic(data=attendance_records, count=count)


@router.get("/student/{student_id}", response_model=AttendanceRecordsPublic)
def read_attendance_records_by_student(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve attendance records by student.
    """
    # Students can only see their own records
    if not current_user.is_superuser and str(current_user.id) != str(student_id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    attendance_records = attendance_record_service.get_by_student(
        student_id, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(AttendanceRecord).where(
        AttendanceRecord.student_id == student_id
    )
    count = session.exec(count_statement).one()
    
    return AttendanceRecordsPublic(data=attendance_records, count=count)


@router.get("/session/{attendance_session_id}/status/{status}", response_model=AttendanceRecordsPublic)
def read_attendance_records_by_status(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID,
    status: AttendanceStatus,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve attendance records by status.
    """
    attendance_record_service = AttendanceRecordService(session)
    attendance_records = attendance_record_service.get_by_status(
        attendance_session_id, status, skip=skip, limit=limit
    )
    
    return AttendanceRecordsPublic(data=attendance_records, count=len(attendance_records))


@router.get("/student/{student_id}/schedule/{schedule_id}/statistics", response_model=AttendanceStatistics)
def get_student_statistics(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    schedule_id: uuid.UUID,
) -> Any:
    """
    Get attendance statistics for a student in a specific schedule.
    """
    # Students can only see their own statistics
    if not current_user.is_superuser and str(current_user.id) != str(student_id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    statistics = attendance_record_service.get_student_statistics(student_id, schedule_id)
    
    return statistics


@router.get("/{attendance_record_id}", response_model=AttendanceRecordPublic)
def read_attendance_record(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_record_id: uuid.UUID,
) -> Any:
    """
    Get attendance record by ID.
    """
    attendance_record_service = AttendanceRecordService(session)
    attendance_record = attendance_record_service.get_by_id(attendance_record_id)
    
    if not attendance_record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    return attendance_record


@router.post("/", response_model=AttendanceRecordPublic)
def create_attendance_record(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    attendance_record_in: AttendanceRecordCreate,
) -> Any:
    """
    Create new attendance record.
    Only superusers can create attendance records.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    
    try:
        attendance_record = attendance_record_service.create_attendance_record(
            attendance_record_in
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return attendance_record


@router.post("/bulk-mark", response_model=AttendanceRecordsPublic)
def bulk_mark_attendance(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    attendance_session_id: uuid.UUID = Body(...),
    student_statuses: list[dict] = Body(...),
) -> Any:
    """
    Mark attendance for multiple students at once.
    student_statuses format: [{"student_id": "uuid", "status": "present|absent|late|excused"}]
    Only superusers can mark attendance.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    records = attendance_record_service.bulk_mark_attendance(
        attendance_session_id, student_statuses
    )
    
    return AttendanceRecordsPublic(data=records, count=len(records))


@router.post("/mark-present", response_model=AttendanceRecordPublic)
def mark_present(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID = Body(...),
    attendance_session_id: uuid.UUID = Body(...),
) -> Any:
    """
    Mark a student as present.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    attendance_record = attendance_record_service.mark_present(
        student_id, attendance_session_id
    )
    
    return attendance_record


@router.post("/mark-absent", response_model=AttendanceRecordPublic)
def mark_absent(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID = Body(...),
    attendance_session_id: uuid.UUID = Body(...),
) -> Any:
    """
    Mark a student as absent.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    attendance_record = attendance_record_service.mark_absent(
        student_id, attendance_session_id
    )
    
    return attendance_record


@router.post("/mark-late", response_model=AttendanceRecordPublic)
def mark_late(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID = Body(...),
    attendance_session_id: uuid.UUID = Body(...),
) -> Any:
    """
    Mark a student as late.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    attendance_record = attendance_record_service.mark_late(
        student_id, attendance_session_id
    )
    
    return attendance_record


@router.post("/mark-excused", response_model=AttendanceRecordPublic)
def mark_excused(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID = Body(...),
    attendance_session_id: uuid.UUID = Body(...),
    excuse_document: str | None = Body(None),
) -> Any:
    """
    Mark a student as excused.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    attendance_record = attendance_record_service.mark_excused(
        student_id, attendance_session_id, excuse_document
    )
    
    return attendance_record


@router.put("/{attendance_record_id}", response_model=AttendanceRecordPublic)
def update_attendance_record(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    attendance_record_id: uuid.UUID,
    attendance_record_in: AttendanceRecordUpdate,
) -> Any:
    """
    Update an attendance record.
    Only superusers can update attendance records.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    attendance_record = attendance_record_service.update_attendance_record(
        attendance_record_id, attendance_record_in
    )
    
    if not attendance_record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    return attendance_record


@router.delete("/{attendance_record_id}")
def delete_attendance_record(
    session: SessionDep,
    current_user: CurrentUser,
    attendance_record_id: uuid.UUID,
) -> Any:
    """
    Delete an attendance record.
    Only superusers can delete attendance records.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    attendance_record_service = AttendanceRecordService(session)
    attendance_record = attendance_record_service.get_by_id(attendance_record_id)
    
    if not attendance_record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    success = attendance_record_service.delete(attendance_record_id)
    
    if not success:
        raise HTTPException(
            status_code=400, 
            detail="Could not delete attendance record"
        )
    
    return {"message": "Attendance record deleted successfully"}