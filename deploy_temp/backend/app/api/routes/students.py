import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.student import (
    Student,
    StudentCreate,
    StudentPublic,
    StudentsPublic,
    StudentUpdate,
    StudentPublicWithDetails,
    StudentWithUserCreate,
)
from app.models.course import CoursePublic
from app.models.grade import GradesWithCourseInfo
from app.models.transcript import YearTranscript
from app.services.student_service import StudentService
from app.services.transcript_service import TranscriptService

router = APIRouter()


@router.get("/", response_model=StudentsPublic)
def read_students(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve students.
    """
    student_service = StudentService(session)
    
    # Count total
    count_statement = select(func.count()).select_from(Student)
    count = session.exec(count_statement).one()
    
    # Get students
    students = student_service.get_all(skip=skip, limit=limit)
    
    return StudentsPublic(data=students, count=count)


@router.get("/active", response_model=StudentsPublic)
def read_active_students(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve active students.
    """
    student_service = StudentService(session)
    students = student_service.get_active_students(skip=skip, limit=limit)
    
    return StudentsPublic(data=students, count=len(students))


@router.get("/program/{program_id}", response_model=StudentsPublic)
def read_students_by_program(
    session: SessionDep,
    current_user: CurrentUser,
    program_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve students by program.
    """
    student_service = StudentService(session)
    students = student_service.get_by_program(program_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Student).where(
        Student.program_id == program_id
    )
    count = session.exec(count_statement).one()
    
    return StudentsPublic(data=students, count=count)


@router.get("/year-level/{year_level}", response_model=StudentsPublic)
def read_students_by_year_level(
    session: SessionDep,
    current_user: CurrentUser,
    year_level: int,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve students by year level.
    """
    student_service = StudentService(session)
    students = student_service.get_by_year_level(year_level, skip=skip, limit=limit)
    
    return StudentsPublic(data=students, count=len(students))


@router.get("/program-level/{program_level_id}/year/{year_level}", response_model=StudentsPublic)
def read_students_by_program_level_and_year(
    session: SessionDep,
    current_user: CurrentUser,
    program_level_id: uuid.UUID,
    year_level: int,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve students by program level and year level.
    """
    student_service = StudentService(session)
    students = student_service.get_by_program_level_and_year(
        program_level_id, year_level, skip=skip, limit=limit
    )
    
    # Count
    count_statement = select(func.count()).select_from(Student).where(
        Student.program_level_id == program_level_id,
        Student.current_year_level == year_level
    )
    count = session.exec(count_statement).one()
    
    return StudentsPublic(data=students, count=count)


@router.get("/student-number/{student_number}", response_model=StudentPublic)
def read_student_by_number(
    session: SessionDep,
    current_user: CurrentUser,
    student_number: str,
) -> Any:
    """
    Get student by student number.
    """
    student_service = StudentService(session)
    student = student_service.get_by_student_number(student_number)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return student


@router.get("/user/{user_id}", response_model=StudentPublicWithDetails)
def read_student_by_user(
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
) -> Any:
    """
    Get student by user ID.
    """
    student_service = StudentService(session)
    student = student_service.get_by_user_id(user_id)
    
    if not student:
        raise HTTPException(
            status_code=404, 
            detail=f"Student record not found for user {user_id}. The user may exist but lacks a student profile."
        )
    
    return student


@router.get("/{student_id}", response_model=StudentPublicWithDetails)
def read_student(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
) -> Any:
    """
    Get student by ID.
    """
    student_service = StudentService(session)
    student = student_service.get_by_id(student_id)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return student


    return student


@router.post("/", response_model=StudentPublic)
def create_student(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_in: StudentCreate,
) -> Any:
    """
    Create new student.
    Only superusers can create students.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student_service = StudentService(session)
    
    try:
        student = student_service.create_student(student_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return student


@router.post("/with-user", response_model=StudentPublic)
def create_student_with_user(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_in: StudentWithUserCreate,
) -> Any:
    """
    Create new student with user account.
    Only superusers can create students.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student_service = StudentService(session)
    
    try:
        student = student_service.create_student_with_user(student_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return student


@router.put("/{student_id}", response_model=StudentPublic)
def update_student(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    student_in: StudentUpdate,
) -> Any:
    """
    Update a student.
    Only superusers can update students.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student_service = StudentService(session)
    
    try:
        student = student_service.update_student(student_id, student_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return student


@router.put("/{student_id}/gpa", response_model=StudentPublic)
def update_student_gpa(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    new_gpa: float,
) -> Any:
    """
    Update student GPA.
    Only superusers can update GPA.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student_service = StudentService(session)
    
    try:
        student = student_service.update_gpa(student_id, new_gpa)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return student


@router.delete("/{student_id}")
def delete_student(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
) -> Any:
    """
    Delete a student.
    Only superusers can delete students.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student_service = StudentService(session)
    student = student_service.get_by_id(student_id)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    success = student_service.delete(student_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete student")
    
    return {"message": "Student deleted successfully"}


@router.get("/student-number/{student_number}/theoretical-courses/{year_level}", response_model=list[CoursePublic])
def read_theoretical_courses(
    session: SessionDep,
    current_user: CurrentUser,
    student_number: str,
    year_level: int,
    session_number: int | None = None,
) -> Any:
    """
    Get theoretical courses for a student in a specific year level.
    Based on the student's program level.
    Optional: filter by session_number (1 or 2).
    """
    student_service = StudentService(session)
    
    # Check permissions (superuser or own data)
    if not current_user.is_superuser:
        student = student_service.get_by_user_id(current_user.id)
        if not student or student.user.user_number != student_number:
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
    courses = student_service.get_theoretical_courses_by_year(student_number, year_level, session_number)
    return courses


@router.get("/student-number/{student_number}/grades/{year_level}", response_model=GradesWithCourseInfo)
def read_student_grades_by_year_with_course_info(
    session: SessionDep,
    current_user: CurrentUser,
    student_number: str,
    year_level: int,
    session_number: int | None = None,
    assessment_type: str | None = None,
    assessment_query: str | None = None,
    is_passing: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Get grades for a specific student and year level, including full course details.
    Optional: filter by session_number (1 or 2) and assessment_type (e.g. 'EXAM', 'ASSIGNMENT').
    """
    # 1. Get Student by Number
    student_service = StudentService(session)
    student = student_service.get_by_student_number(student_number)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # 2. Check permissions
    if not current_user.is_superuser:
        user_student = student_service.get_by_user_id(current_user.id)
        if not user_student or user_student.user.user_number != student_number:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # 3. Get Grades with Course Info
    # Utilisation du service étudiant qui encapsule maintenant la logique
    result = student_service.get_grades_by_year_with_course_info(
        student_number,
        year_level,
        session_number,
        assessment_type,
        assessment_query,
        is_passing,
        skip,
        limit
    )
    
    return result


@router.get("/student-number/{student_number}/transcript/{year_level}", response_model=YearTranscript)
def get_student_transcript(
    session: SessionDep,
    current_user: CurrentUser,
    student_number: str,
    year_level: int,
    session_number: int | None = None,
) -> Any:
    """
    Génère le bulletin académique complet pour un étudiant.
    
    Args:
        student_number: Numéro d'étudiant
        year_level: Niveau d'année (1, 2, 3, etc.)
        session_number: Filtre optionnel par session (1 ou 2)
    
    Returns:
        YearTranscript avec:
        - Notes détaillées par type (intra, final, participation)
        - Calculs de moyennes pondérées par cours
        - Moyennes par session et annuelle
        - Crédits obtenus/totaux
        - GPA et statut de réussite
    
    Example:
        GET /api/v1/students/student-number/2345dfgh/transcript/1?session_number=1
        -> Bulletin 1ère année, 1ère session
        
        GET /api/v1/students/student-number/2345dfgh/transcript/2
        -> Bulletin 2ème année complet (toutes sessions)
    """
    # 1. Get Student by Number
    student_service = StudentService(session)
    student = student_service.get_by_student_number(student_number)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # 2. Check permissions
    if not current_user.is_superuser:
        user_student = student_service.get_by_user_id(current_user.id)
        if not user_student or user_student.user.user_number != student_number:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # 3. Generate transcript
    transcript_service = TranscriptService(session)
    try:
        transcript = transcript_service.generate_year_transcript(
            student_number, year_level, session_number
        )
        return transcript
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
