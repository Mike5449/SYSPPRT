import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models.grade import (
    Grade,
    GradeCreate,
    GradePublic,
    GradesPublic,
    GradeUpdate,
    GradePublicWithDetails,
    GradeStatistics,
    StudentTranscript,
    CourseGradeStatistics,
    GradeWithCourseInfo,
    GradesWithCourseInfo,
    CourseStatisticsWithInfo,
    StudentGradesSummaryByLevel,
    StudentGradesSummaryBySession,
    StudentGradesSummaryByCourse,
)
from app.services.grade_service import GradeService

router = APIRouter()


@router.get("/", response_model=GradesPublic)
def read_grades(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    student_query: str | None = None,
    assessment_query: str | None = None,
    exam_type: str | None = None,
    is_published: bool | None = None,
) -> Any:
    """
    Retrieve grades.
    Only superusers can see all grades.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    
    # Count total
    count = grade_service.count_grades(
        student_query=student_query,
        assessment_query=assessment_query,
        exam_type=exam_type,
        is_published=is_published,
    )
    
    # Get grades
    grades = grade_service.get_all(
        skip=skip, 
        limit=limit,
        student_query=student_query,
        assessment_query=assessment_query,
        exam_type=exam_type,
        is_published=is_published,
    )
    
    return GradesPublic(data=grades, count=count)


@router.get("/student/{student_id}", response_model=GradesPublic)
def read_grades_by_student(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by student.
    Students can only see their own grades.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grades = grade_service.get_by_student(student_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Grade).where(
        Grade.student_id == student_id
    )
    count = session.exec(count_statement).one()
    
    return GradesPublic(data=grades, count=count)


@router.get("/student/{student_id}/published", response_model=GradesPublic)
def read_published_grades_by_student(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve published grades by student.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grades = grade_service.get_published_grades(student_id, skip=skip, limit=limit)
    
    return GradesPublic(data=grades, count=len(grades))


@router.get("/student/{student_id}/year-level/{year_level}", response_model=GradesPublic)
def read_grades_by_student_and_year_level(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    year_level: int,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by student for a specific year level.
    Students can only see their own grades.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate year_level
    if year_level < 1 or year_level > 15:
        raise HTTPException(status_code=400, detail="Year level must be between 1 and 15")
    
    grade_service = GradeService(session)
    grades = grade_service.get_by_student_and_year_level(
        student_id, year_level, skip=skip, limit=limit
    )
    
    # Count
    count = grade_service.count_by_student_and_year_level(student_id, year_level)
    
    return GradesPublic(data=grades, count=count)


@router.get("/student/{student_id}/year-level/{year_level}/statistics", response_model=GradeStatistics)
def get_student_year_level_statistics(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    year_level: int,
) -> Any:
    """
    Get grade statistics for a student at a specific year level.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate year_level
    if year_level < 1 or year_level > 15:
        raise HTTPException(status_code=400, detail="Year level must be between 1 and 15")
    
    grade_service = GradeService(session)
    statistics = grade_service.get_year_level_statistics(student_id, year_level)
    
    return statistics


@router.get("/student/{student_id}/session/{session_id}", response_model=GradesPublic)
def read_grades_by_student_and_session(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by student for a specific session (semester).
    Students can only see their own grades.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grades = grade_service.get_by_student_and_session(
        student_id, session_id, skip=skip, limit=limit
    )
    
    # Count
    count = grade_service.count_by_student_and_session(student_id, session_id)
    
    return GradesPublic(data=grades, count=count)


@router.get("/student/{student_id}/session/{session_id}/statistics", response_model=GradeStatistics)
def get_student_session_statistics(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    session_id: uuid.UUID,
) -> Any:
    """
    Get grade statistics for a student in a specific session.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    statistics = grade_service.get_session_statistics(student_id, session_id)
    
    return statistics


@router.get("/student/{student_id}/course/{course_id}", response_model=GradesPublic)
def read_grades_by_student_and_course(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    course_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by student for a specific course.
    Students can only see their own grades.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grades = grade_service.get_by_student_and_course(
        student_id, course_id, skip=skip, limit=limit
    )
    
    # Count
    count = grade_service.count_by_student_and_course(student_id, course_id)
    
    return GradesPublic(data=grades, count=count)


@router.get("/student/{student_id}/course/{course_id}/statistics", response_model=CourseGradeStatistics)
def get_student_course_statistics(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    course_id: uuid.UUID,
) -> Any:
    """
    Get grade statistics for a student in a specific course.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    statistics = grade_service.get_course_statistics(student_id, course_id)
    
    return statistics


# =================== ENDPOINTS ENRICHIS AVEC INFORMATIONS DE COURS ===================

@router.get("/student/{student_id}/year-level/{year_level}/with-course-info", response_model=GradesWithCourseInfo)
def read_grades_by_student_and_year_level_with_course_info(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    year_level: int,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by student for a specific year level WITH complete course information.
    Students can only see their own grades.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate year_level
    if year_level < 1 or year_level > 15:
        raise HTTPException(status_code=400, detail="Year level must be between 1 and 15")
    
    grade_service = GradeService(session)
    result = grade_service.get_by_student_and_year_level_with_course_info(
        student_id, year_level, skip=skip, limit=limit
    )
    
    return result


@router.get("/student/{student_id}/session/{session_id}/with-course-info", response_model=GradesWithCourseInfo)
def read_grades_by_student_and_session_with_course_info(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    session_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by student for a specific session WITH complete course information.
    Students can only see their own grades.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    result = grade_service.get_by_student_and_session_with_course_info(
        student_id, session_id, skip=skip, limit=limit
    )
    
    return result


@router.get("/student/{student_id}/course/{course_id}/with-course-info", response_model=GradesWithCourseInfo)
def read_grades_by_student_and_course_with_course_info(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    course_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by student for a specific course WITH complete course information.
    Students can only see their own grades.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    result = grade_service.get_by_student_and_course_with_course_info(
        student_id, course_id, skip=skip, limit=limit
    )
    
    return result


# =================== ENDPOINT AGRÉGÉ AVEC INFORMATIONS ÉTUDIANT ===================

@router.get("/student/{student_id}/year-level/{year_level}/courses-summary", response_model=StudentGradesSummaryByLevel)
def read_student_grades_summary_by_level(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    year_level: int,
) -> Any:
    """
    Récupère le résumé complet des notes d'un étudiant pour un niveau donné,
    AGRÉGÉ PAR COURS avec toutes les informations de l'étudiant et statistiques.
    
    Cette endpoint retourne:
    - Informations complètes de l'étudiant
    - Liste des cours groupés avec toutes leurs notes
    - Statistiques détaillées par cours (moyenne, GPA, etc.)
    - Statistiques globales du niveau
    - Calculs de progression et réussite
    
    Idéal pour: bulletins de notes, tableaux de bord, rapports académiques
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate year_level
    if year_level < 1 or year_level > 15:
        raise HTTPException(status_code=400, detail="Year level must be between 1 and 15")
    
    grade_service = GradeService(session)
    result = grade_service.get_student_grades_summary_by_level(student_id, year_level)
    
    if not result:
        raise HTTPException(status_code=404, detail="No data found for this student and year level")
    
    return result


@router.get("/student/{student_id}/session/{session_id}/courses-summary", response_model=StudentGradesSummaryBySession)
def read_student_grades_summary_by_session(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    session_id: uuid.UUID,
) -> Any:
    """
    Récupère le résumé complet des notes d'un étudiant pour une session donnée,
    AGRÉGÉ PAR COURS avec toutes les informations de l'étudiant.
    
    Idéal pour: bulletins de session, rapports semestriels, suivi par période
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    result = grade_service.get_student_grades_summary_by_session(student_id, session_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="No data found for this student and session")
    
    return result


@router.get("/student/{student_id}/course/{course_id}/course-summary", response_model=StudentGradesSummaryByCourse)
def read_student_grades_summary_by_course(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
    course_id: uuid.UUID,
) -> Any:
    """
    Récupère le résumé complet des notes d'un étudiant pour un cours spécifique,
    avec toutes les informations de l'étudiant et statistiques détaillées du cours.
    
    Idéal pour: suivi détaillé par cours, analyses de performance, rapports spécialisés
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    result = grade_service.get_student_grades_summary_by_course(student_id, course_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="No data found for this student and course")
    
    return result


@router.get("/enrollment/{enrollment_id}", response_model=GradesPublic)
def read_grades_by_enrollment(
    session: SessionDep,
    current_user: CurrentUser,
    enrollment_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by enrollment.
    """
    grade_service = GradeService(session)
    grades = grade_service.get_by_enrollment(enrollment_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Grade).where(
        Grade.enrollment_id == enrollment_id
    )
    count = session.exec(count_statement).one()
    
    return GradesPublic(data=grades, count=count)


@router.get("/enrollment/{enrollment_id}/statistics", response_model=GradeStatistics)
def get_enrollment_statistics(
    session: SessionDep,
    current_user: CurrentUser,
    enrollment_id: uuid.UUID,
) -> Any:
    """
    Get grade statistics for an enrollment.
    """
    grade_service = GradeService(session)
    statistics = grade_service.get_enrollment_statistics(enrollment_id)
    
    return statistics


@router.get("/assessment/{assessment_id}", response_model=GradesPublic)
def read_grades_by_assessment(
    session: SessionDep,
    current_user: CurrentUser,
    assessment_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve grades by assessment.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grades = grade_service.get_by_assessment(assessment_id, skip=skip, limit=limit)
    
    # Count
    count_statement = select(func.count()).select_from(Grade).where(
        Grade.assessment_id == assessment_id
    )
    count = session.exec(count_statement).one()
    
    return GradesPublic(data=grades, count=count)


@router.get("/assessment/{assessment_id}/statistics")
def get_assessment_statistics(
    session: SessionDep,
    current_user: CurrentUser,
    assessment_id: uuid.UUID,
) -> Any:
    """
    Get statistics for an assessment.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    statistics = grade_service.get_assessment_statistics(assessment_id)
    
    return statistics


@router.get("/student/{student_id}/transcript", response_model=StudentTranscript)
def get_student_transcript(
    session: SessionDep,
    current_user: CurrentUser,
    student_id: uuid.UUID,
) -> Any:
    """
    Get complete transcript for a student.
    """
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    
    try:
        transcript = grade_service.get_student_transcript(student_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    return transcript


@router.get("/{grade_id}", response_model=GradePublicWithDetails)
def read_grade(
    session: SessionDep,
    current_user: CurrentUser,
    grade_id: uuid.UUID,
) -> Any:
    """
    Get grade by ID.
    """
    grade_service = GradeService(session)
    grade = grade_service.get_by_id(grade_id)
    
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    # Check permissions
    if not current_user.is_superuser:
        from app.services.student_service import StudentService
        student_service = StudentService(session)
        student = student_service.get_by_user_id(current_user.id)
        
        if not student or str(student.id) != str(grade.student_id):
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return grade


@router.post("/", response_model=GradePublic)
def create_grade(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    grade_in: GradeCreate,
) -> Any:
    """
    Create new grade.
    Only superusers can create grades.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    
    try:
        grade = grade_service.create_grade(grade_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return grade


@router.put("/{grade_id}", response_model=GradePublic)
def update_grade(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    grade_id: uuid.UUID,
    grade_in: GradeUpdate,
) -> Any:
    """
    Update a grade.
    Only superusers can update grades.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grade = grade_service.update_grade(grade_id, grade_in)
    
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    return grade


@router.post("/{grade_id}/publish", response_model=GradePublic)
def publish_grade(
    session: SessionDep,
    current_user: CurrentUser,
    grade_id: uuid.UUID,
) -> Any:
    """
    Publish a grade.
    Only superusers can publish grades.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grade = grade_service.publish_grade(grade_id)
    
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    return grade


@router.post("/{grade_id}/unpublish", response_model=GradePublic)
def unpublish_grade(
    session: SessionDep,
    current_user: CurrentUser,
    grade_id: uuid.UUID,
) -> Any:
    """
    Unpublish a grade.
    Only superusers can unpublish grades.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grade = grade_service.unpublish_grade(grade_id)
    
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    return grade


@router.delete("/{grade_id}")
def delete_grade(
    session: SessionDep,
    current_user: CurrentUser,
    grade_id: uuid.UUID,
) -> Any:
    """
    Delete a grade.
    Only superusers can delete grades.
    """
    if not current_user.is_superuser and not current_user.teacher:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    grade_service = GradeService(session)
    grade = grade_service.get_by_id(grade_id)
    
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    success = grade_service.delete(grade_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete grade")
    
    return {"message": "Grade deleted successfully"}