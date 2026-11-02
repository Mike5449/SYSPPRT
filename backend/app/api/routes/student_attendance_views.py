"""
API endpoints pour la vue complète des présences étudiants
Fournit des endpoints pour interroger v_student_attendance_complete
"""

from datetime import date
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.models.student_attendance_view import (
    StudentAttendanceCompletePublic,
    StudentAttendanceCompleteWithCalculations,
    StudentAttendanceCompletesPublic,
    StudentAttendanceViewFilters,
    StudentAttendanceViewSummary,
    AttendanceReport,
    AttendanceAlerts,
    CourseAttendanceSummary,
)
from app.services.student_attendance_view_service import StudentAttendanceViewService


router = APIRouter()


@router.get(
    "/students/{student_id}/attendance/complete",
    response_model=StudentAttendanceCompletesPublic,
)
def get_student_attendance_complete(
    student_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    # Filtres optionnels
    course_id: Optional[UUID] = None,
    session_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    attendance_status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    is_excused: Optional[bool] = None,
    day_of_week: Optional[int] = None,
    year_level: Optional[int] = None,
) -> Any:
    """
    Récupère toutes les présences d'un étudiant via la vue complète.
    
    Inclut toutes les informations liées : cours, sessions, horaires, enseignants, etc.
    """
    service = StudentAttendanceViewService(session)
    
    # Créer les filtres
    filters = StudentAttendanceViewFilters(
        course_id=course_id,
        session_id=session_id,
        academic_year_id=academic_year_id,
        attendance_status=attendance_status,
        session_date_from=date_from,
        session_date_to=date_to,
        is_excused=is_excused,
        day_of_week=day_of_week,
        session_year_level=year_level,
    )
    
    # Vérifier les permissions (étudiant peut voir ses propres présences, admin peut tout voir)
    # TODO: Implémenter la logique de vérification des permissions selon vos règles métier
    
    # Utiliser le service pour obtenir les données enrichies
    enriched_attendances, count = service.get_student_attendance_with_analysis(
        student_id=student_id,
        skip=skip,
        limit=limit,
        filters=filters,
    )
    
    return StudentAttendanceCompletesPublic(data=enriched_attendances, count=count)


@router.get(
    "/students/{student_id}/attendance/report",
    response_model=AttendanceReport,
)
def get_student_attendance_report(
    student_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    course_id: Optional[UUID] = None,
) -> Any:
    """
    Génère un rapport de présence détaillé pour un étudiant.
    
    Inclut statistiques, analyses, recommandations et données pour graphiques.
    """
    service = StudentAttendanceViewService(session)
    
    # Vérifier les permissions
    # TODO: Implémenter la vérification des permissions
    
    report = service.get_student_attendance_report(
        student_id=student_id,
        date_from=date_from,
        date_to=date_to,
        course_id=course_id,
    )
    
    return report


@router.get(
    "/course-sessions/{course_session_id}/attendance/complete",
    response_model=dict,
)
def get_course_session_attendance_complete(
    course_session_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    attendance_status: Optional[str] = None,
    is_excused: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Any:
    """
    Récupère toutes les présences d'une session de cours avec statistiques complètes.
    """
    service = StudentAttendanceViewService(session)
    
    # Créer les filtres
    filters = StudentAttendanceViewFilters(
        attendance_status=attendance_status,
        is_excused=is_excused,
        session_date_from=date_from,
        session_date_to=date_to,
    )
    
    # Vérifier les permissions (enseignant du cours, admin, etc.)
    # TODO: Implémenter la vérification des permissions
    
    attendances, count, course_summary = service.get_course_session_attendance_with_statistics(
        course_session_id=course_session_id,
        skip=skip,
        limit=limit,
        filters=filters,
    )
    
    return {
        "attendances": StudentAttendanceCompletesPublic(data=attendances, count=count).model_dump(),
        "course_summary": course_summary.model_dump(),
    }


@router.get(
    "/attendance-sessions/{attendance_session_id}/attendance/complete",
    response_model=StudentAttendanceCompletesPublic,
)
def get_attendance_session_complete(
    attendance_session_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    attendance_status: Optional[str] = None,
) -> Any:
    """
    Récupère toutes les présences pour une séance spécifique.
    """
    service = StudentAttendanceViewService(session)
    
    # Créer les filtres
    filters = StudentAttendanceViewFilters(
        attendance_session_id=attendance_session_id,
        attendance_status=attendance_status,
    )
    
    attendances = service.repository.get_by_attendance_session(
        attendance_session_id=attendance_session_id,
        skip=skip,
        limit=limit,
        filters=filters,
    )
    
    count = service.repository.count_by_filters(filters)
    
    # Enrichir avec les calculs
    enriched_attendances = service._enrich_attendances_with_calculations(attendances)
    
    return StudentAttendanceCompletesPublic(data=enriched_attendances, count=count)


@router.get(
    "/teachers/{teacher_id}/attendance/overview",
    response_model=dict,
)
def get_teacher_attendance_overview(
    teacher_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Any:
    """
    Vue d'ensemble des présences pour un enseignant.
    
    Inclut toutes ses sessions de cours avec statistiques et alertes.
    """
    service = StudentAttendanceViewService(session)
    
    # Vérifier les permissions (enseignant peut voir ses propres cours, admin peut tout voir)
    # TODO: Implémenter la vérification des permissions
    
    overview = service.get_teacher_attendance_overview(
        teacher_id=teacher_id,
        date_from=date_from,
        date_to=date_to,
    )
    
    return overview


@router.get(
    "/sessions/{session_id}/attendance/summary",
    response_model=dict,
)
def get_academic_session_attendance_summary(
    session_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    student_id: Optional[UUID] = None,
    course_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
) -> Any:
    """
    Résumé des présences pour une session académique (semestre).
    """
    service = StudentAttendanceViewService(session)
    
    filters = StudentAttendanceViewFilters(
        session_id=session_id,
        student_id=student_id,
        course_id=course_id,
        teacher_id=teacher_id,
    )
    
    attendances = service.repository.get_by_academic_session(
        session_id=session_id,
        student_id=student_id,
        skip=0,
        limit=10000,  # Récupérer toutes les données pour le résumé
        filters=filters,
    )
    
    # Analyser les données
    summary = service._group_attendances_by_course(attendances)
    statistics = service.repository.get_summary_statistics(filters)
    
    return {
        "session_id": str(session_id),
        "courses_summary": summary,
        "overall_statistics": statistics.model_dump(),
        "total_courses": len(summary),
        "total_students": len(set(a.student_id for a in attendances)),
    }


@router.get(
    "/year-levels/{year_level}/attendance/analysis",
    response_model=dict,
)
def get_year_level_attendance_analysis(
    year_level: int,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    session_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
) -> Any:
    """
    Analyse des présences par niveau d'année.
    """
    service = StudentAttendanceViewService(session)
    
    analysis = service.get_year_level_attendance_analysis(
        year_level=year_level,
        session_id=session_id,
        academic_year_id=academic_year_id,
    )
    
    return analysis


@router.get(
    "/attendance/alerts",
    response_model=AttendanceAlerts,
)
def get_attendance_alerts(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    student_id: Optional[UUID] = None,
    course_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
) -> Any:
    """
    Génère des alertes de présence basées sur des seuils critiques.
    
    Identifie les étudiants avec absentéisme chronique, retards excessifs, etc.
    """
    service = StudentAttendanceViewService(session)
    
    alerts = service.get_attendance_alerts(
        date_from=date_from,
        date_to=date_to,
        student_id=student_id,
        course_id=course_id,
    )
    
    return alerts


@router.get(
    "/attendance/statistics",
    response_model=StudentAttendanceViewSummary,
)
def get_attendance_statistics(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    student_id: Optional[UUID] = None,
    course_id: Optional[UUID] = None,
    session_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
    year_level: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Any:
    """
    Récupère des statistiques résumées des présences selon les filtres.
    """
    service = StudentAttendanceViewService(session)
    
    # Créer les filtres
    filters = StudentAttendanceViewFilters(
        student_id=student_id,
        course_id=course_id,
        session_id=session_id,
        academic_year_id=academic_year_id,
        teacher_id=teacher_id,
        session_year_level=year_level,
        session_date_from=date_from,
        session_date_to=date_to,
    )
    
    return service.repository.get_summary_statistics(filters)


@router.get(
    "/attendance/search",
    response_model=StudentAttendanceCompletesPublic,
)
def search_attendance(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    search_term: str = Query(..., min_length=2),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    attendance_status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> Any:
    """
    Recherche dans les présences par nom d'étudiant, numéro étudiant, cours, etc.
    """
    service = StudentAttendanceViewService(session)
    
    # Créer les filtres
    filters = StudentAttendanceViewFilters(
        attendance_status=attendance_status,
        session_date_from=date_from,
        session_date_to=date_to,
    )
    
    enriched_attendances, count = service.search_attendance_with_context(
        search_term=search_term,
        skip=skip,
        limit=limit,
        filters=filters,
    )
    
    return StudentAttendanceCompletesPublic(data=enriched_attendances, count=count)


@router.get(
    "/attendance/date-range",
    response_model=StudentAttendanceCompletesPublic,
)
def get_attendance_by_date_range(
    start_date: date,
    end_date: date,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    skip: int = 0,
    limit: int = Query(default=100, le=100),
    student_id: Optional[UUID] = None,
    course_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
) -> Any:
    """
    Récupère les présences dans une période donnée.
    """
    service = StudentAttendanceViewService(session)
    
    # Valider la période
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="La date de début doit être antérieure à la date de fin")
    
    # Limiter la période à 1 an maximum
    if (end_date - start_date).days > 365:
        raise HTTPException(status_code=400, detail="La période ne peut pas dépasser 1 an")
    
    attendances = service.repository.get_by_date_range(
        start_date=start_date,
        end_date=end_date,
        student_id=student_id,
        course_id=course_id,
        skip=skip,
        limit=limit,
    )
    
    # Enrichir avec les calculs
    enriched_attendances = service._enrich_attendances_with_calculations(attendances)
    
    # Compter le total pour la pagination
    total_count = service.repository.get_by_date_range(
        start_date=start_date,
        end_date=end_date,
        student_id=student_id,
        course_id=course_id,
        skip=0,
        limit=10000,
    )
    
    return StudentAttendanceCompletesPublic(
        data=enriched_attendances, 
        count=len(total_count)
    )


@router.get(
    "/students/{student_id}/attendance/statistics",
    response_model=dict,
)
def get_student_attendance_statistics(
    student_id: UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    course_id: Optional[UUID] = None,
) -> Any:
    """
    Statistiques détaillées de présence pour un étudiant spécifique.
    """
    service = StudentAttendanceViewService(session)
    
    # Vérifier les permissions
    # TODO: Implémenter la vérification des permissions
    
    statistics = service.repository.get_student_attendance_statistics(
        student_id=student_id,
        date_from=date_from,
        date_to=date_to,
        course_id=course_id,
    )
    
    # Ajouter des analyses contextuelles
    filters = StudentAttendanceViewFilters(
        student_id=student_id,
        session_date_from=date_from,
        session_date_to=date_to,
        course_id=course_id,
    )
    
    attendances = service.repository.get_by_student_id(
        student_id=student_id,
        skip=0,
        limit=1000,
        filters=filters,
    )
    
    enriched_attendances = service._enrich_attendances_with_calculations(attendances, student_id)
    
    # Générer des insights supplémentaires
    insights = {
        "best_day_of_week": None,
        "worst_day_of_week": None,
        "attendance_trend": "stable",
        "risk_level": "low",
    }
    
    if enriched_attendances:
        # Analyser par jour de la semaine
        day_stats = {}
        for attendance in enriched_attendances:
            day = attendance.day_of_week
            if day not in day_stats:
                day_stats[day] = {"present": 0, "total": 0}
            
            day_stats[day]["total"] += 1
            if attendance.attendance_category in ["on_time", "late_arrival"]:
                day_stats[day]["present"] += 1
        
        # Calculer les taux par jour
        day_rates = {
            day: (data["present"] / data["total"] * 100) if data["total"] > 0 else 0
            for day, data in day_stats.items()
        }
        
        if day_rates:
            best_day = max(day_rates.items(), key=lambda x: x[1])
            worst_day = min(day_rates.items(), key=lambda x: x[1])
            
            insights["best_day_of_week"] = {"day": best_day[0], "rate": round(best_day[1], 2)}
            insights["worst_day_of_week"] = {"day": worst_day[0], "rate": round(worst_day[1], 2)}
        
        # Calculer le niveau de risque
        if statistics.attendance_rate < 70:
            insights["risk_level"] = "high"
        elif statistics.attendance_rate < 85:
            insights["risk_level"] = "medium"
        else:
            insights["risk_level"] = "low"
    
    return {
        "student_id": str(student_id),
        "period": {
            "from": date_from.isoformat() if date_from else None,
            "to": date_to.isoformat() if date_to else None,
        },
        "statistics": statistics.model_dump(),
        "insights": insights,
    }