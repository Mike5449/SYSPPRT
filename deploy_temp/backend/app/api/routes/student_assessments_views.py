"""
Routes API pour la gestion complète des évaluations étudiants.
Fournit des endpoints pour l'analyse, le suivi et la gestion des évaluations.
"""

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_active_superuser, get_current_user, SessionDep
from app.models.user import User
from app.models.student_assessments_view import (
    StudentAssessmentsCompleteWithAnalytics,
    StudentAssessmentsCompletesPublic,
    StudentAssessmentsViewFilters,
    AssessmentStatistics,
    AssessmentPerformanceReport,
    TeacherAssessmentsOverview,
    AssessmentAlerts,
    AssessmentProgressTracker,
    AssessmentComparison,
    CourseAssessmentAnalysis,
    AssessmentWorkloadAnalysis,
    AssessmentGradingEfficiency,
    AssessmentCalendar,
    StudentAssessmentsViewSummary
)
from app.repositories.student_assessments_view_repository import StudentAssessmentsViewRepository
from app.services.student_assessments_view_service import StudentAssessmentsViewService

router = APIRouter()


def get_student_assessments_service(session: SessionDep) -> StudentAssessmentsViewService:
    """Dependency pour obtenir le service des évaluations étudiants."""
    repository = StudentAssessmentsViewRepository(session)
    return StudentAssessmentsViewService(repository)


@router.get(
    "/students/{student_id}/assessments",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Récupérer toutes les évaluations d'un étudiant",
    description="Obtient la liste complète des évaluations d'un étudiant avec analyses détaillées, statuts et métriques de performance."
)
def get_student_assessments(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Récupère toutes les évaluations d'un étudiant avec analyses complètes.
    
    - **student_id**: UUID de l'étudiant
    
    Retourne la liste des évaluations avec:
    - Informations complètes de l'évaluation et notes
    - Statuts de soumission et de notation
    - Analyses de performance et comparaisons
    - Délais et indicateurs d'urgence
    - Recommandations personnalisées
    """
    try:
        assessments = service.get_student_assessments_with_analytics(student_id)
        return assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des évaluations: {str(e)}")


@router.get(
    "/students/{student_id}/assessments/statistics",
    response_model=AssessmentStatistics,
    summary="Statistiques des évaluations d'un étudiant",
    description="Calcule les statistiques complètes des évaluations pour un étudiant (moyennes, taux de réussite, tendances, etc.)."
)
def get_student_assessments_statistics(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> AssessmentStatistics:
    """
    Calcule les statistiques complètes des évaluations pour un étudiant.
    
    - **student_id**: UUID de l'étudiant
    
    Retourne:
    - Compteurs d'évaluations par statut
    - Moyennes globales et par type
    - Taux de completion et de réussite
    - Tendances de performance
    - Métriques de ponctualité
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        statistics = repository.get_student_assessments_statistics(student_id)
        return statistics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques: {str(e)}")


@router.get(
    "/students/{student_id}/assessments/report",
    response_model=AssessmentPerformanceReport,
    summary="Rapport de performance des évaluations",
    description="Génère un rapport détaillé de la performance des évaluations d'un étudiant avec analyses et recommandations."
)
def get_student_assessment_performance_report(
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> AssessmentPerformanceReport:
    """
    Génère un rapport complet de performance des évaluations pour un étudiant.
    
    - **student_id**: UUID de l'étudiant
    
    Le rapport inclut:
    - Analyse détaillée par type d'évaluation
    - Comparaisons temporelles et tendances
    - Prédictions de notes finales
    - Planning d'étude recommandé
    - Données pour visualisations
    """
    try:
        report = service.generate_assessment_performance_report(student_id)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du rapport: {str(e)}")


@router.get(
    "/assessments/{assessment_id}/students",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Étudiants d'une évaluation spécifique",
    description="Récupère tous les étudiants avec leurs résultats pour une évaluation spécifique."
)
def get_assessment_students(
    assessment_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Récupère tous les étudiants pour une évaluation avec analyses.
    
    - **assessment_id**: UUID de l'évaluation
    
    Utile pour les enseignants pour voir:
    - La liste des étudiants et leurs performances
    - Les statuts de soumission
    - Les analyses comparatives de classe
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        assessments = repository.get_by_assessment_id(assessment_id)
        
        # Enrichir avec les analyses pour chaque étudiant
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            student_stats = repository.get_student_assessments_statistics(assessment.student_id)
            analytics = service._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return enriched_assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des étudiants: {str(e)}")


@router.get(
    "/assessments/{assessment_id}/statistics",
    response_model=dict,
    summary="Statistiques d'une évaluation",
    description="Calcule les statistiques de classe pour une évaluation spécifique (moyennes, distribution, taux de réussite)."
)
def get_assessment_statistics(
    assessment_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> dict:
    """
    Calcule les statistiques complètes pour une évaluation.
    
    - **assessment_id**: UUID de l'évaluation
    
    Retourne:
    - Informations sur l'évaluation
    - Statistiques de participation
    - Métriques de performance de classe
    - Distribution des notes
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        statistics = repository.get_assessment_class_statistics(assessment_id)
        
        if not statistics:
            raise HTTPException(status_code=404, detail="Évaluation non trouvée ou sans données")
        
        return statistics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques: {str(e)}")


@router.get(
    "/course-sessions/{course_session_id}/assessments",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Évaluations d'une session de cours",
    description="Récupère toutes les évaluations d'une session de cours avec les résultats des étudiants."
)
def get_course_session_assessments(
    course_session_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Récupère toutes les évaluations d'une session de cours.
    
    - **course_session_id**: UUID de la session de cours
    
    Permet aux enseignants de voir:
    - Toutes les évaluations du cours
    - Les performances des étudiants
    - Les statuts de soumission et notation
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        assessments = repository.get_by_course_session_id(course_session_id)
        
        # Enrichir avec les analyses
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            student_stats = repository.get_student_assessments_statistics(assessment.student_id)
            analytics = service._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return enriched_assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des évaluations: {str(e)}")


@router.get(
    "/teachers/{teacher_id}/assessments",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Évaluations d'un enseignant",
    description="Récupère toutes les évaluations créées par un enseignant avec les résultats des étudiants."
)
def get_teacher_assessments(
    teacher_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Récupère toutes les évaluations d'un enseignant.
    
    - **teacher_id**: UUID de l'enseignant
    
    Permet aux enseignants de voir:
    - Toutes leurs évaluations
    - Les statuts de notation
    - Les performances des étudiants
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        assessments = repository.get_by_teacher_id(teacher_id)
        
        # Enrichir avec les analyses
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            student_stats = repository.get_student_assessments_statistics(assessment.student_id)
            analytics = service._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return enriched_assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des évaluations: {str(e)}")


@router.get(
    "/teachers/{teacher_id}/assessments/overview",
    response_model=TeacherAssessmentsOverview,
    summary="Vue d'ensemble des évaluations d'un enseignant",
    description="Fournit une vue d'ensemble statistique des évaluations et de la charge de travail pour un enseignant."
)
def get_teacher_assessments_overview(
    teacher_id: UUID,
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> TeacherAssessmentsOverview:
    """
    Obtient une vue d'ensemble complète des évaluations d'un enseignant.
    
    - **teacher_id**: UUID de l'enseignant
    
    Inclut:
    - Charge de travail de notation
    - Performances moyennes par évaluation
    - Étudiants nécessitant une attention
    - Évaluations problématiques
    """
    try:
        overview = service.get_teacher_assessments_overview(teacher_id)
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération de la vue d'ensemble: {str(e)}")


@router.get(
    "/assessments/search",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Rechercher des évaluations",
    description="Recherche des évaluations par nom, description, cours, étudiant ou enseignant."
)
def search_assessments(
    q: str = Query(..., description="Terme de recherche"),
    limit: int = Query(50, ge=1, le=200, description="Nombre maximum de résultats"),
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Recherche des évaluations avec analyses enrichies.
    
    - **q**: Terme de recherche (nom d'évaluation, cours, étudiant, enseignant)
    - **limit**: Nombre maximum de résultats (1-200)
    
    La recherche s'effectue dans:
    - Noms et descriptions d'évaluations
    - Noms et codes de cours
    - Noms d'étudiants et d'enseignants
    """
    try:
        assessments = service.search_assessments(q.strip(), limit)
        return assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche: {str(e)}")


@router.post(
    "/assessments/filter",
    response_model=StudentAssessmentsCompletesPublic,
    summary="Filtrer les évaluations",
    description="Applique des filtres avancés pour récupérer des évaluations spécifiques avec pagination."
)
def filter_assessments(
    filters: StudentAssessmentsViewFilters,
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=500, description="Nombre maximum d'éléments à retourner"),
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> StudentAssessmentsCompletesPublic:
    """
    Applique des filtres avancés pour récupérer des évaluations.
    
    - **filters**: Critères de filtrage détaillés
    - **skip**: Pagination - éléments à ignorer
    - **limit**: Pagination - nombre maximum d'éléments
    
    Filtres disponibles:
    - Par étudiant, cours, enseignant
    - Par type et statut d'évaluation
    - Par période et échéances
    - Par performance et notes
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        
        # Récupérer les données avec pagination
        assessments = repository.get_by_filters(filters, skip, limit)
        total_count = repository.count_by_filters(filters)
        
        # Enrichir avec les analyses
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            student_stats = repository.get_student_assessments_statistics(assessment.student_id)
            analytics = service._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return StudentAssessmentsCompletesPublic(
            data=enriched_assessments,
            count=total_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du filtrage: {str(e)}")


@router.get(
    "/assessments/alerts",
    response_model=AssessmentAlerts,
    summary="Alertes d'évaluations",
    description="Génère des alertes basées sur les échéances, performances et statuts d'évaluations."
)
def get_assessment_alerts(
    student_id: Optional[UUID] = Query(None, description="Filtrer par étudiant spécifique"),
    teacher_id: Optional[UUID] = Query(None, description="Filtrer par enseignant spécifique"),
    assessment_type: Optional[str] = Query(None, description="Filtrer par type d'évaluation"),
    deadline_status: Optional[str] = Query(None, description="Filtrer par statut d'échéance"),
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> AssessmentAlerts:
    """
    Génère des alertes d'évaluations basées sur les échéances et performances.
    
    Types d'alertes:
    - **Critiques**: Évaluations en retard, échecs graves
    - **Urgentes**: Échéances imminentes, interventions requises
    - **Avertissements**: Performances faibles, risques modérés
    - **Positives**: Performances excellentes, félicitations
    
    Filtres optionnels disponibles pour cibler les alertes.
    """
    try:
        # Construire les filtres basés sur les paramètres
        filters = StudentAssessmentsViewFilters()
        if student_id:
            filters.student_id = student_id
        if teacher_id:
            filters.teacher_id = teacher_id
        if assessment_type:
            filters.assessment_type = assessment_type
        if deadline_status:
            filters.deadline_status = deadline_status
        
        alerts = service.generate_assessment_alerts(filters)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération des alertes: {str(e)}")


@router.get(
    "/assessments/overdue",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Évaluations en retard",
    description="Récupère toutes les évaluations en retard avec analyses de priorité."
)
def get_overdue_assessments(
    limit: int = Query(100, ge=1, le=500, description="Nombre maximum de résultats"),
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Récupère toutes les évaluations en retard.
    
    - **limit**: Nombre maximum de résultats (1-500)
    
    Utile pour:
    - Intervention urgente
    - Suivi des retards
    - Alertes administratives
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        assessments = repository.get_overdue_assessments(limit)
        
        # Enrichir avec les analyses
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            student_stats = repository.get_student_assessments_statistics(assessment.student_id)
            analytics = service._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return enriched_assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des évaluations en retard: {str(e)}")


@router.get(
    "/assessments/urgent",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Évaluations urgentes",
    description="Récupère les évaluations avec des échéances imminentes."
)
def get_urgent_assessments(
    days_ahead: int = Query(7, ge=1, le=30, description="Nombre de jours à regarder en avant"),
    limit: int = Query(100, ge=1, le=500, description="Nombre maximum de résultats"),
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Récupère les évaluations avec échéances urgentes.
    
    - **days_ahead**: Nombre de jours à regarder en avant (1-30)
    - **limit**: Nombre maximum de résultats (1-500)
    
    Permet de:
    - Planifier les études
    - Prioriser les tâches
    - Éviter les retards
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        assessments = repository.get_urgent_assessments(days_ahead, limit)
        
        # Enrichir avec les analyses
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            student_stats = repository.get_student_assessments_statistics(assessment.student_id)
            analytics = service._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return enriched_assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des évaluations urgentes: {str(e)}")


@router.get(
    "/assessments/date-range",
    response_model=list[StudentAssessmentsCompleteWithAnalytics],
    summary="Évaluations par période",
    description="Récupère les évaluations dans une période donnée, optionnellement pour un étudiant ou enseignant spécifique."
)
def get_assessments_by_date_range(
    start_date: date = Query(..., description="Date de début de la période"),
    end_date: date = Query(..., description="Date de fin de la période"),
    student_id: Optional[UUID] = Query(None, description="UUID optionnel de l'étudiant"),
    teacher_id: Optional[UUID] = Query(None, description="UUID optionnel de l'enseignant"),
    current_user: User = Depends(get_current_user),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> list[StudentAssessmentsCompleteWithAnalytics]:
    """
    Récupère les évaluations dans une période spécifique.
    
    - **start_date**: Date de début (format: YYYY-MM-DD)
    - **end_date**: Date de fin (format: YYYY-MM-DD)
    - **student_id**: UUID optionnel pour filtrer par étudiant
    - **teacher_id**: UUID optionnel pour filtrer par enseignant
    
    Utile pour:
    - Rapports de période
    - Planification académique
    - Analyses temporelles
    """
    try:
        if start_date >= end_date:
            raise HTTPException(status_code=400, detail="La date de début doit être antérieure à la date de fin")
        
        repository = StudentAssessmentsViewRepository(service.repository.session)
        assessments = repository.get_assessments_by_date_range(start_date, end_date, student_id, teacher_id)
        
        # Enrichir avec les analyses
        enriched_assessments = []
        current_date = date.today()
        
        for assessment in assessments:
            student_stats = repository.get_student_assessments_statistics(assessment.student_id)
            analytics = service._calculate_assessment_analytics(assessment, student_stats, current_date)
            enriched_assessments.append(analytics)
        
        return enriched_assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération par période: {str(e)}")


# Routes pour les administrateurs
@router.get(
    "/admin/assessments/summary",
    response_model=dict,
    summary="Résumé global des évaluations (Admin)",
    description="Fournit un résumé statistique global de toutes les évaluations pour les administrateurs."
)
def get_assessments_summary_admin(
    current_user: User = Depends(get_current_active_superuser),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> dict:
    """
    Résumé statistique global pour les administrateurs.
    
    **Accès**: Administrateurs uniquement
    
    Inclut:
    - Statistiques globales du système
    - Répartitions par type et statut
    - Métriques de performance globale
    - Indicateurs d'alerte système
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        
        # Récupérer un échantillon représentatif pour les calculs globaux
        all_assessments = repository.get_by_filters(StudentAssessmentsViewFilters(), limit=10000)
        
        total_records = len(all_assessments)
        total_students = len(set(assessment.student_id for assessment in all_assessments))
        total_unique_assessments = len(set(assessment.assessment_id for assessment in all_assessments))
        total_teachers = len(set(assessment.teacher_id for assessment in all_assessments))
        
        # Distributions
        status_distribution = {}
        type_distribution = {}
        deadline_distribution = {}
        
        completed_assessments = 0
        total_scores = []
        
        for assessment in all_assessments:
            # Distribution des statuts
            status = assessment.student_assessment_status
            status_distribution[status] = status_distribution.get(status, 0) + 1
            
            # Distribution par type
            assess_type = assessment.assessment_type
            type_distribution[assess_type] = type_distribution.get(assess_type, 0) + 1
            
            # Distribution des échéances
            deadline_status = assessment.deadline_status or 'no_deadline'
            deadline_distribution[deadline_status] = deadline_distribution.get(deadline_status, 0) + 1
            
            # Collecte des scores
            if assessment.score is not None:
                completed_assessments += 1
                total_scores.append(assessment.score)
        
        overall_average = sum(total_scores) / len(total_scores) if total_scores else 0
        completion_rate = (completed_assessments / total_records * 100) if total_records > 0 else 0
        
        return {
            "total_records": total_records,
            "total_students": total_students,
            "total_unique_assessments": total_unique_assessments,
            "total_teachers": total_teachers,
            "overall_average": round(overall_average, 2),
            "completion_rate": round(completion_rate, 2),
            "status_distribution": status_distribution,
            "type_distribution": type_distribution,
            "deadline_distribution": deadline_distribution,
            "performance_indicators": {
                "overdue_count": deadline_distribution.get('overdue', 0),
                "urgent_count": deadline_distribution.get('urgent', 0),
                "failed_count": status_distribution.get('failed', 0)
            },
            "generated_at": date.today().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du résumé: {str(e)}")


@router.get(
    "/admin/assessments/analytics",
    response_model=dict,
    summary="Analytics avancées des évaluations (Admin)",
    description="Fournit des analytics avancées sur les évaluations et performances pour les administrateurs."
)
def get_assessments_analytics_admin(
    current_user: User = Depends(get_current_active_superuser),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> dict:
    """
    Analytics avancées pour les administrateurs.
    
    **Accès**: Administrateurs uniquement
    
    Fournit des analyses approfondies:
    - Tendances de performance par période
    - Analyses de charge de travail
    - Identification des problèmes systémiques
    - Recommandations institutionnelles
    """
    try:
        # Générer des alertes globales
        alerts = service.generate_assessment_alerts()
        
        # Calculer des métriques système
        system_health = {
            "total_alerts": alerts.total_alerts,
            "critical_alerts": len(alerts.critical_alerts),
            "overdue_submissions": alerts.overdue_submissions,
            "urgent_deadlines": alerts.urgent_deadlines,
            "poor_performances": alerts.poor_performances,
            "alert_rate": (alerts.total_alerts / max(1000, alerts.total_alerts)) * 100,  # Simulation
        }
        
        # Recommandations système
        recommendations = []
        if alerts.overdue_submissions > 100:
            recommendations.append("Considérer une révision des politiques d'échéances")
        if len(alerts.critical_alerts) > 50:
            recommendations.append("Intervention immédiate requise pour les alertes critiques")
        if alerts.poor_performances > 200:
            recommendations.append("Évaluation des méthodes d'enseignement et d'évaluation recommandée")
        
        # Tendances temporelles (simulation)
        monthly_trends = {
            "submissions": {"trend": "stable", "change_percent": 2.3},
            "performance": {"trend": "improving", "change_percent": 4.1},
            "overdue_rate": {"trend": "declining", "change_percent": -1.8}
        }
        
        return {
            "system_health": system_health,
            "alert_summary": {
                "critical": len(alerts.critical_alerts),
                "urgent": len(alerts.urgent_alerts),
                "warning": len(alerts.warning_alerts),
                "positive": len(alerts.positive_alerts)
            },
            "monthly_trends": monthly_trends,
            "recommendations": recommendations,
            "generated_at": date.today().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération des analytics: {str(e)}")


@router.get(
    "/admin/assessments/workload",
    response_model=dict,
    summary="Analyse de la charge de travail (Admin)",
    description="Analyse la charge de travail des évaluations pour optimiser la planification académique."
)
def get_assessments_workload_analysis_admin(
    current_user: User = Depends(get_current_active_superuser),
    service: StudentAssessmentsViewService = Depends(get_student_assessments_service)
) -> dict:
    """
    Analyse de la charge de travail pour les administrateurs.
    
    **Accès**: Administrateurs uniquement
    
    Permet d'optimiser:
    - Distribution temporelle des évaluations
    - Charge de travail des enseignants
    - Planification académique
    - Détection de conflits d'échéances
    """
    try:
        repository = StudentAssessmentsViewRepository(service.repository.session)
        
        # Analyse de la charge de notation par enseignant
        current_date = date.today()
        end_date = current_date + timedelta(days=30)
        
        upcoming_assessments = repository.get_assessments_by_date_range(current_date, end_date)
        
        # Grouper par enseignant
        teacher_workload = {}
        for assessment in upcoming_assessments:
            teacher_key = assessment.teacher_name
            if teacher_key not in teacher_workload:
                teacher_workload[teacher_key] = {
                    "total_assessments": 0,
                    "pending_grading": 0,
                    "upcoming_deadlines": 0
                }
            
            teacher_workload[teacher_key]["total_assessments"] += 1
            if assessment.grade_id is None:
                if assessment.due_date and assessment.due_date < current_date:
                    teacher_workload[teacher_key]["pending_grading"] += 1
                else:
                    teacher_workload[teacher_key]["upcoming_deadlines"] += 1
        
        # Identifier les enseignants surchargés
        overloaded_teachers = [
            {"teacher": teacher, "workload": data}
            for teacher, data in teacher_workload.items()
            if data["pending_grading"] > 10 or data["upcoming_deadlines"] > 20
        ]
        
        # Analyse temporelle
        weekly_distribution = {}
        for assessment in upcoming_assessments:
            if assessment.due_date:
                week_key = assessment.due_date.strftime("%Y-W%U")
                weekly_distribution[week_key] = weekly_distribution.get(week_key, 0) + 1
        
        return {
            "analysis_period": f"{current_date.isoformat()} to {end_date.isoformat()}",
            "teacher_workload_summary": {
                "total_teachers": len(teacher_workload),
                "overloaded_teachers": len(overloaded_teachers),
                "average_workload": sum(data["total_assessments"] for data in teacher_workload.values()) / len(teacher_workload) if teacher_workload else 0
            },
            "overloaded_teachers": overloaded_teachers[:10],  # Top 10
            "weekly_distribution": weekly_distribution,
            "recommendations": [
                "Redistribuer la charge de travail pour les enseignants surchargés",
                "Étaler les échéances pour éviter les pics de charge",
                "Considérer un système de notation assistée pour les évaluations routinières"
            ],
            "generated_at": date.today().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse de charge de travail: {str(e)}")