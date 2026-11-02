"""
API endpoints pour la vue complète des notes étudiants
Fournit des endpoints pour interroger v_student_grades_complete
"""

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.models.student_grade_view import (
    StudentGradeCompletePublic,
    StudentGradeCompleteWithCalculations,
    StudentGradeCompletesPublic,
    StudentGradeViewFilters,
    StudentGradeViewSummary,
)
from app.services.student_grade_view_service import StudentGradeViewService


router = APIRouter()


@router.get(
    "/students/{student_id}/grades/complete",
    response_model=StudentGradeCompletesPublic,
)
def get_student_grades_complete(
    student_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    # Filtres optionnels
    course_id: Optional[UUID] = None,
    session_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    year_level: Optional[int] = None,
    is_published: Optional[bool] = None,
    is_passing: Optional[bool] = None,
    assessment_type: Optional[str] = None,
) -> Any:
    """
    Récupère toutes les notes d'un étudiant via la vue complète.
    
    Inclut toutes les informations liées : cours, évaluations, sessions, programmes, etc.
    """
    service = StudentGradeViewService(session)
    
    # Créer les filtres
    filters = StudentGradeViewFilters(
        course_id=course_id,
        session_id=session_id,
        academic_year_id=academic_year_id,
        year_level=year_level,
        is_published=is_published,
        is_passing=is_passing,
        assessment_type=assessment_type,
    )
    
    # Vérifier les permissions (étudiant peut voir ses propres notes, admin peut tout voir)
    # TODO: Implémenter la logique de vérification des permissions selon vos règles métier
    
    # Utiliser le service pour obtenir les données enrichies
    enriched_grades, count = service.get_student_grades_with_calculations(
        student_id=student_id,
        skip=skip,
        limit=limit,
        filters=filters,
    )
    
    return StudentGradeCompletesPublic(data=enriched_grades, count=count)


@router.get(
    "/students/{student_id}/transcript",
    response_model=StudentGradeCompletesPublic,
)
def get_student_transcript(
    student_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    academic_year_id: Optional[UUID] = None,
    include_unpublished: bool = False,
) -> Any:
    """
    Récupère le relevé complet d'un étudiant (toutes ses notes publiées).
    """
    service = StudentGradeViewService(session)
    
    # Vérifier les permissions
    # TODO: Implémenter la vérification des permissions
    
    grades = service.get_student_transcript(
        student_id=student_id,
        academic_year_id=academic_year_id,
        include_unpublished=include_unpublished,
    )
    
    return StudentGradeCompletesPublic(data=grades, count=len(grades))


@router.get(
    "/course-sessions/{course_session_id}/grades/complete",
    response_model=dict,
)
def get_course_session_grades_complete(
    course_session_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    is_published: Optional[bool] = None,
    is_passing: Optional[bool] = None,
) -> Any:
    """
    Récupère toutes les notes d'une session de cours via la vue complète avec statistiques.
    """
    service = StudentGradeViewService(session)
    
    # Créer les filtres
    filters = StudentGradeViewFilters(
        is_published=is_published,
        is_passing=is_passing,
    )
    
    # Vérifier les permissions (enseignant du cours, admin, etc.)
    # TODO: Implémenter la vérification des permissions
    
    grades, count, statistics = service.get_course_session_grades_with_statistics(
        course_session_id=course_session_id,
        skip=skip,
        limit=limit,
        filters=filters,
    )
    
    return {
        "grades": StudentGradeCompletesPublic(data=grades, count=count).model_dump(),
        "statistics": statistics,
    }


@router.get(
    "/sessions/{session_id}/grades/summary",
    response_model=dict,
)
def get_academic_session_summary(
    session_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    student_id: Optional[UUID] = None,
    course_id: Optional[UUID] = None,
) -> Any:
    """
    Résumé des notes pour une session académique (semestre).
    """
    service = StudentGradeViewService(session)
    
    summary = service.get_academic_session_summary(
        session_id=session_id,
        student_id=student_id,
        course_id=course_id,
    )
    
    return summary


@router.get(
    "/year-levels/{year_level}/performance-analysis",
    response_model=dict,
)
def get_year_level_performance_analysis(
    year_level: int,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    session_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
) -> Any:
    """
    Analyse des performances par niveau d'année.
    """
    service = StudentGradeViewService(session)
    
    analysis = service.get_year_level_performance_analysis(
        year_level=year_level,
        session_id=session_id,
        academic_year_id=academic_year_id,
    )
    
    return analysis


@router.get(
    "/grades/statistics",
    response_model=StudentGradeViewSummary,
)
def get_grades_statistics(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    student_id: Optional[UUID] = None,
    course_id: Optional[UUID] = None,
    session_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
    year_level: Optional[int] = None,
    is_published: Optional[bool] = None,
) -> Any:
    """
    Récupère des statistiques résumées des notes selon les filtres.
    """
    service = StudentGradeViewService(session)
    
    # Créer les filtres
    filters = StudentGradeViewFilters(
        student_id=student_id,
        course_id=course_id,
        session_id=session_id,
        academic_year_id=academic_year_id,
        teacher_id=teacher_id,
        year_level=year_level,
        is_published=is_published,
    )
    
    return service.repository.get_summary_statistics(filters)


@router.get(
    "/grades/search",
    response_model=StudentGradeCompletesPublic,
)
def search_grades(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    search_term: str = Query(..., min_length=2),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    is_published: Optional[bool] = None,
) -> Any:
    """
    Recherche dans les notes par nom d'étudiant, numéro étudiant, cours, etc.
    """
    service = StudentGradeViewService(session)
    
    # Créer les filtres
    filters = StudentGradeViewFilters(
        is_published=is_published,
    )
    
    enriched_grades, count = service.search_grades_with_context(
        search_term=search_term,
        skip=skip,
        limit=limit,
        filters=filters,
    )
    
    return StudentGradeCompletesPublic(data=enriched_grades, count=count)