"""
Routes API pour la gestion complète des cours étudiants.
Fournit des endpoints pour l'analyse, le reporting et le suivi des cours.
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_active_superuser, get_current_user, SessionDep
from app.models.user import User
from app.models.student_courses_view import (
    StudentCoursesCompleteWithAnalytics,
    StudentCoursesCompletesPublic,
    StudentCoursesViewFilters,
    StudentCoursesStatistics,
    CoursePerformanceReport,
    TeacherCoursesOverview,
    AcademicAlerts,
    StudentProgressTracker,
    CourseComparisonAnalysis,
    AcademicYearSummary,
    ProgramPerformanceAnalysis,
    StudentCoursesViewSummary
)
from app.repositories.student_courses_view_repository import StudentCoursesViewRepository
from app.services.student_courses_view_service import StudentCoursesViewService

router = APIRouter()


def get_student_courses_service(session: SessionDep) -> StudentCoursesViewService:
    """Dependency pour obtenir le service des cours étudiants."""
    repository = StudentCoursesViewRepository(session)
    return StudentCoursesViewService(repository)


@router.get(
    "/students/{student_id}/courses",
    response_model=list[StudentCoursesCompleteWithAnalytics],
    summary="Récupérer tous les cours d'un étudiant",
    description="Obtient la liste complète des cours d'un étudiant avec analyses détaillées et métriques de performance."
)
def get_student_courses(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> list[StudentCoursesCompleteWithAnalytics]:
    """
    Récupère tous les cours d'un étudiant avec analyses complètes.
    
    - **student_id**: UUID de l'étudiant
    
    Retourne la liste des cours avec:
    - Informations complètes du cours et de l'étudiant
    - Statistiques de performance et de progression
    - Analyses comparatives et prédictions
    - Recommandations personnalisées
    """
    try:
        courses = service.get_student_courses_with_analytics(student_id)
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des cours: {str(e)}")


@router.get(
    "/students/{student_id}/courses/statistics",
    response_model=StudentCoursesStatistics,
    summary="Statistiques des cours d'un étudiant",
    description="Calcule les statistiques complètes des cours pour un étudiant (moyennes, crédits, taux de réussite, etc.)."
)
def get_student_courses_statistics(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> StudentCoursesStatistics:
    """
    Calcule les statistiques complètes des cours pour un étudiant.
    
    - **student_id**: UUID de l'étudiant
    
    Retourne:
    - Compteurs de cours par statut
    - Moyennes et GPA
    - Taux de completion et de réussite
    - Crédits obtenus et requis
    """
    try:
        repository = StudentCoursesViewRepository(service.repository.session)
        statistics = repository.get_student_courses_statistics(student_id)
        return statistics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques: {str(e)}")


@router.get(
    "/students/{student_id}/courses/report",
    response_model=CoursePerformanceReport,
    summary="Rapport de performance académique",
    description="Génère un rapport détaillé de la performance académique d'un étudiant avec analyses et recommandations."
)
def get_student_performance_report(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> CoursePerformanceReport:
    """
    Génère un rapport complet de performance pour un étudiant.
    
    - **student_id**: UUID de l'étudiant
    
    Le rapport inclut:
    - Analyse détaillée des performances
    - Comparaisons avec les pairs
    - Prédictions de réussite
    - Recommandations personnalisées
    - Données pour visualisations
    """
    try:
        report = service.generate_student_performance_report(student_id)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du rapport: {str(e)}")


@router.get(
    "/course-sessions/{course_session_id}/students",
    response_model=list[StudentCoursesCompleteWithAnalytics],
    summary="Étudiants d'une session de cours",
    description="Récupère tous les étudiants inscrits dans une session de cours spécifique avec leurs performances."
)
def get_course_session_students(
    course_session_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> list[StudentCoursesCompleteWithAnalytics]:
    """
    Récupère tous les étudiants d'une session de cours avec analyses.
    
    - **course_session_id**: UUID de la session de cours
    
    Utile pour les enseignants pour voir:
    - La liste de leurs étudiants
    - Les performances individuelles
    - Les statistiques de classe
    """
    try:
        repository = StudentCoursesViewRepository(service.repository.session)
        courses = repository.get_by_course_session_id(course_session_id)
        
        # Enrichir avec les analyses pour chaque étudiant
        enriched_courses = []
        current_date = date.today()
        
        for course in courses:
            student_stats = repository.get_student_courses_statistics(course.student_id)
            analytics = service._calculate_course_analytics(course, student_stats, current_date)
            enriched_courses.append(analytics)
        
        return enriched_courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des étudiants: {str(e)}")


@router.get(
    "/teachers/{teacher_id}/courses",
    response_model=list[StudentCoursesCompleteWithAnalytics],
    summary="Cours enseignés par un professeur",
    description="Récupère tous les cours enseignés par un professeur avec les détails des étudiants."
)
def get_teacher_courses(
    teacher_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> list[StudentCoursesCompleteWithAnalytics]:
    """
    Récupère tous les cours enseignés par un professeur.
    
    - **teacher_id**: UUID de l'enseignant
    
    Permet aux enseignants de voir:
    - Tous leurs cours et étudiants
    - Les performances par classe
    - Une vue d'ensemble de leur enseignement
    """
    try:
        repository = StudentCoursesViewRepository(service.repository.session)
        courses = repository.get_by_teacher_id(teacher_id)
        
        # Enrichir avec les analyses
        enriched_courses = []
        current_date = date.today()
        
        for course in courses:
            student_stats = repository.get_student_courses_statistics(course.student_id)
            analytics = service._calculate_course_analytics(course, student_stats, current_date)
            enriched_courses.append(analytics)
        
        return enriched_courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des cours: {str(e)}")


@router.get(
    "/teachers/{teacher_id}/overview",
    response_model=TeacherCoursesOverview,
    summary="Vue d'ensemble des cours d'un enseignant",
    description="Fournit une vue d'ensemble statistique des cours et performances pour un enseignant."
)
def get_teacher_courses_overview(
    teacher_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> TeacherCoursesOverview:
    """
    Obtient une vue d'ensemble complète des cours d'un enseignant.
    
    - **teacher_id**: UUID de l'enseignant
    
    Inclut:
    - Statistiques globales d'enseignement
    - Performance moyenne des classes
    - Classes performantes et à problèmes
    - Tendances de performance
    """
    try:
        overview = service.get_teacher_courses_overview(teacher_id)
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération de la vue d'ensemble: {str(e)}")


@router.get(
    "/courses/search",
    response_model=list[StudentCoursesCompleteWithAnalytics],
    summary="Rechercher des cours",
    description="Recherche des cours par nom, code, description, nom d'étudiant ou d'enseignant."
)
def search_courses(
    q: str = Query(..., description="Terme de recherche"),
    limit: int = Query(50, ge=1, le=200, description="Nombre maximum de résultats"),
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> list[StudentCoursesCompleteWithAnalytics]:
    """
    Recherche des cours avec analyses enrichies.
    
    - **q**: Terme de recherche (nom de cours, code, étudiant, enseignant)
    - **limit**: Nombre maximum de résultats (1-200)
    
    La recherche s'effectue dans:
    - Noms et codes de cours
    - Descriptions de cours
    - Noms d'étudiants et d'enseignants
    """
    try:
        courses = service.search_courses(q.strip(), limit)
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche: {str(e)}")


@router.post(
    "/courses/filter",
    response_model=StudentCoursesCompletesPublic,
    summary="Filtrer les cours",
    description="Applique des filtres avancés pour récupérer des cours spécifiques avec pagination."
)
def filter_courses(
    filters: StudentCoursesViewFilters,
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=500, description="Nombre maximum d'éléments à retourner"),
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> StudentCoursesCompletesPublic:
    """
    Applique des filtres avancés pour récupérer des cours.
    
    - **filters**: Critères de filtrage détaillés
    - **skip**: Pagination - éléments à ignorer
    - **limit**: Pagination - nombre maximum d'éléments
    
    Filtres disponibles:
    - Par étudiant, cours, enseignant
    - Par performance et statut
    - Par période et année académique
    - Par programme et niveau
    """
    try:
        repository = StudentCoursesViewRepository(service.repository.session)
        
        # Récupérer les données avec pagination
        courses = repository.get_by_filters(filters, skip, limit)
        total_count = repository.count_by_filters(filters)
        
        # Enrichir avec les analyses
        enriched_courses = []
        current_date = date.today()
        
        for course in courses:
            student_stats = repository.get_student_courses_statistics(course.student_id)
            analytics = service._calculate_course_analytics(course, student_stats, current_date)
            enriched_courses.append(analytics)
        
        return StudentCoursesCompletesPublic(
            data=enriched_courses,
            count=total_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du filtrage: {str(e)}")


@router.get(
    "/courses/alerts",
    response_model=AcademicAlerts,
    summary="Alertes académiques",
    description="Génère des alertes basées sur les performances et risques académiques."
)
def get_academic_alerts(
    student_id: Optional[UUID] = Query(None, description="Filtrer par étudiant spécifique"),
    teacher_id: Optional[UUID] = Query(None, description="Filtrer par enseignant spécifique"),
    course_id: Optional[UUID] = Query(None, description="Filtrer par cours spécifique"),
    risk_level: Optional[str] = Query(None, description="Filtrer par niveau de risque"),
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> AcademicAlerts:
    """
    Génère des alertes académiques basées sur les performances.
    
    Types d'alertes:
    - **Critiques**: Performance très faible, intervention urgente
    - **Avertissements**: Risques modérés, surveillance requise  
    - **Positives**: Performances excellentes, opportunités
    
    Filtres optionnels disponibles pour cibler les alertes.
    """
    try:
        # Construire les filtres basés sur les paramètres
        filters = StudentCoursesViewFilters()
        if student_id:
            filters.student_id = student_id
        if teacher_id:
            filters.teacher_id = teacher_id
        if course_id:
            filters.course_id = course_id
        
        alerts = service.generate_academic_alerts(filters)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération des alertes: {str(e)}")


@router.get(
    "/courses/date-range",
    response_model=list[StudentCoursesCompleteWithAnalytics],
    summary="Cours par période",
    description="Récupère les cours dans une période donnée, optionnellement pour un étudiant spécifique."
)
def get_courses_by_date_range(
    start_date: date = Query(..., description="Date de début de la période"),
    end_date: date = Query(..., description="Date de fin de la période"),
    student_id: Optional[UUID] = Query(None, description="UUID optionnel de l'étudiant"),
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> list[StudentCoursesCompleteWithAnalytics]:
    """
    Récupère les cours dans une période spécifique.
    
    - **start_date**: Date de début (format: YYYY-MM-DD)
    - **end_date**: Date de fin (format: YYYY-MM-DD)  
    - **student_id**: UUID optionnel pour filtrer par étudiant
    
    Utile pour:
    - Rapports de période
    - Analyses de semestre
    - Suivi chronologique
    """
    try:
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="La date de début doit être antérieure à la date de fin")
        
        repository = StudentCoursesViewRepository(service.repository.session)
        courses = repository.get_courses_by_date_range(start_date, end_date, student_id)
        
        # Enrichir avec les analyses
        enriched_courses = []
        current_date = date.today()
        
        for course in courses:
            student_stats = repository.get_student_courses_statistics(course.student_id)
            analytics = service._calculate_course_analytics(course, student_stats, current_date)
            enriched_courses.append(analytics)
        
        return enriched_courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération par période: {str(e)}")


@router.get(
    "/course-sessions/{course_session_id}/statistics",
    response_model=dict,
    summary="Statistiques d'une session de cours",
    description="Calcule les statistiques détaillées pour une session de cours spécifique."
)
def get_course_session_statistics(
    course_session_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> dict:
    """
    Calcule les statistiques complètes pour une session de cours.
    
    - **course_session_id**: UUID de la session de cours
    
    Retourne:
    - Nombres d'étudiants par statut
    - Moyennes, min, max de la classe
    - Distribution des notes (A, B, C, D, F)
    - Écart-type et autres métriques
    """
    try:
        repository = StudentCoursesViewRepository(service.repository.session)
        statistics = repository.get_course_session_statistics(course_session_id)
        
        if not statistics:
            raise HTTPException(status_code=404, detail="Session de cours non trouvée ou sans données")
        
        return statistics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques: {str(e)}")


@router.get(
    "/students/{student_id}/performance-trends",
    response_model=dict,
    summary="Tendances de performance d'un étudiant",
    description="Analyse les tendances de performance d'un étudiant au fil du temps."
)
def get_student_performance_trends(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> dict:
    """
    Analyse les tendances de performance d'un étudiant.
    
    - **student_id**: UUID de l'étudiant
    
    Fournit:
    - Tendance générale (amélioration, déclin, stable)
    - Corrélation temporelle des performances
    - Comparaison première/seconde moitié
    - Consistance des résultats
    """
    try:
        repository = StudentCoursesViewRepository(service.repository.session)
        trends = repository.get_performance_trends(student_id)
        
        if trends.get("trend") == "insufficient_data":
            raise HTTPException(status_code=404, detail="Données insuffisantes pour analyser les tendances")
        
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse des tendances: {str(e)}")


# Routes pour les administrateurs
@router.get(
    "/admin/courses/summary",
    response_model=dict,
    summary="Résumé global des cours (Admin)",
    description="Fournit un résumé statistique global de tous les cours pour les administrateurs."
)
def get_courses_summary_admin(
    academic_year_id: Optional[UUID] = None,
    program_level_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_superuser),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> dict:
    """
    Résumé statistique global pour les administrateurs.

    **Accès**: Administrateurs uniquement

    Inclut:
    - Statistiques globales du système
    - Répartitions par statut et programme
    - Indicateurs de performance générale
    - Métriques d'alerte système
    """
    try:
        repository = StudentCoursesViewRepository(service.repository.session)

        # Récupérer un échantillon représentatif pour les calculs globaux
        filters = StudentCoursesViewFilters(
            academic_year_id=academic_year_id,
            program_level_id=program_level_id
        )
        all_courses = repository.get_by_filters(filters, limit=10000)
        
        total_records = len(all_courses)
        total_students = len(set(course.student_id for course in all_courses))
        total_course_sessions = len(set(course.course_session_id for course in all_courses))
        total_teachers = len(set(course.teacher_id for course in all_courses))
        
        # Distributions
        status_distribution = {}
        year_level_distribution = {}
        program_distribution = {}
        grade_distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "No Grade": 0}
        
        total_grades = 0
        total_grade_sum = 0
        
        for course in all_courses:
            # Distribution des statuts
            status = course.computed_status
            status_distribution[status] = status_distribution.get(status, 0) + 1
            
            # Distribution par niveau d'année
            year = course.current_year_level
            year_level_distribution[year] = year_level_distribution.get(year, 0) + 1
            
            # Distribution par programme
            program = course.program_level_name
            program_distribution[program] = program_distribution.get(program, 0) + 1
            
            # Distribution des notes
            if course.current_average:
                total_grades += 1
                total_grade_sum += course.current_average
                
                if course.current_average >= 90:
                    grade_distribution["A"] += 1
                elif course.current_average >= 80:
                    grade_distribution["B"] += 1
                elif course.current_average >= 70:
                    grade_distribution["C"] += 1
                elif course.current_average >= 60:
                    grade_distribution["D"] += 1
                else:
                    grade_distribution["F"] += 1
            else:
                grade_distribution["No Grade"] += 1
        
        overall_average = total_grade_sum / total_grades if total_grades > 0 else 0
        
        return {
            "total_records": total_records,
            "total_students": total_students,
            "total_course_sessions": total_course_sessions,
            "total_teachers": total_teachers,
            "overall_average": round(overall_average, 2),
            "status_distribution": status_distribution,
            "year_level_distribution": year_level_distribution,
            "program_distribution": program_distribution,
            "grade_distribution": grade_distribution,
            "generated_at": date.today().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du résumé: {str(e)}")


@router.get(
    "/admin/courses/analytics",
    response_model=dict,
    summary="Analytics avancées des cours (Admin)",
    description="Fournit des analytics avancées sur les performances académiques pour les administrateurs."
)
def get_courses_analytics_admin(
    academic_year_id: Optional[UUID] = None,
    program_level_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_superuser),
    service: StudentCoursesViewService = Depends(get_student_courses_service)
) -> dict:
    """
    Analytics avancées pour les administrateurs.

    **Accès**: Administrateurs uniquement

    Fournit des analyses approfondies:
    - Tendances de performance par période
    - Analyses comparatives par programme
    - Identification des cours problématiques
    - Recommandations système
    """
    try:
        # Générer des alertes globales avec les filtres sélectionnés
        filters = StudentCoursesViewFilters(
            academic_year_id=academic_year_id,
            program_level_id=program_level_id
        )
        alerts = service.generate_academic_alerts(filters)
        
        # Calculer des métriques système
        system_health = {
            "total_alerts": alerts.total_alerts,
            "critical_alerts": len(alerts.critical_alerts),
            "students_at_risk": alerts.students_at_risk,
            "courses_with_issues": alerts.courses_with_issues,
            "alert_rate": (alerts.total_alerts / max(1000, alerts.total_alerts)) * 100,  # Simulation
        }
        
        # Recommandations système
        recommendations = []
        if alerts.students_at_risk > 50:
            recommendations.append("Considérer un programme de soutien académique élargi")
        if len(alerts.critical_alerts) > 20:
            recommendations.append("Intervention immédiate requise pour les alertes critiques")
        if alerts.courses_with_issues > 30:
            recommendations.append("Révision des programmes de cours problématiques recommandée")
        
        return {
            "system_health": system_health,
            "alert_summary": {
                "critical": len(alerts.critical_alerts),
                "warning": len(alerts.warning_alerts),
                "positive": len(alerts.positive_alerts)
            },
            "recommendations": recommendations,
            "generated_at": date.today().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération des analytics: {str(e)}")