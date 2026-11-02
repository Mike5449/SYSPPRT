"""
Modèles Pydantic pour la vue complète des évaluations étudiants.
Basé sur la vue v_student_assessments_complete qui agrège toutes les informations
des évaluations avec les détails des étudiants, enseignants, notes et délais.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field
from sqlmodel import SQLModel


class StudentAssessmentsCompleteBase(BaseModel):
    """Modèle de base pour la vue complète des évaluations étudiants."""
    
    # Informations de l'étudiant
    student_id: UUID
    student_number: str
    current_year_level: int
    student_name: str
    student_email: str
    
    # Informations de l'évaluation
    assessment_id: UUID
    assessment_name: str
    assessment_description: Optional[str] = None
    assessment_type: str  # exam, quiz, assignment, project, etc.
    max_score: float
    weight: float
    due_date: Optional[date] = None
    assessment_date: Optional[date] = None
    duration_minutes: Optional[int] = None
    is_mandatory: bool = True
    passing_score: Optional[float] = None
    instructions: Optional[str] = None
    is_published: bool = True
    
    # Informations de la note (peut être NULL)
    grade_id: Optional[UUID] = None
    score: Optional[float] = None
    letter_grade: Optional[str] = None
    grade_points: Optional[float] = None
    is_passing: Optional[bool] = None
    graded_date: Optional[datetime] = None
    graded_by: Optional[UUID] = None
    grade_comments: Optional[str] = None
    grade_published: Optional[bool] = None
    
    # Statut de l'évaluation
    student_assessment_status: str  # not_submitted, graded_not_published, passed, failed
    
    # Informations du cours
    course_id: UUID
    course_code: str
    course_name: str
    credits: int
    
    # Informations de la session du cours
    course_session_id: UUID
    classroom: Optional[str] = None
    session_year_level: int
    
    # Informations de la session académique
    session_id: UUID
    session_name: str
    session_number: int
    session_start_date: date
    session_end_date: date
    
    # Informations de l'année académique
    academic_year_id: UUID
    academic_year_name: str
    is_current_year: bool = False
    
    # Informations du professeur
    teacher_id: UUID
    teacher_name: str
    teacher_email: str
    
    # Délai et urgence
    deadline_status: Optional[str] = None  # overdue, urgent, upcoming, future
    days_until_due: Optional[int] = None


class StudentAssessmentsComplete(StudentAssessmentsCompleteBase, SQLModel, table=False):
    """Modèle SQLModel pour la vue complète des évaluations."""
    pass


class StudentAssessmentsCompletePublic(StudentAssessmentsCompleteBase):
    """Modèle public pour l'API - version de base sans champs sensibles."""
    pass


class StudentAssessmentsCompleteWithAnalytics(StudentAssessmentsCompletePublic):
    """Modèle enrichi avec analyses et calculs supplémentaires."""
    
    # Calculs enrichis
    score_percentage: Optional[float] = Field(None, description="Pourcentage de réussite (score/max_score)")
    performance_level: Optional[str] = Field(None, description="Niveau de performance (excellent, good, average, poor)")
    grade_status: Optional[str] = Field(None, description="Statut détaillé de la note")
    is_late_submission: Optional[bool] = Field(None, description="Indique si la soumission est en retard")
    
    # Analyses temporelles
    submission_urgency: Optional[str] = Field(None, description="Urgence de soumission (critical, high, medium, low)")
    time_remaining: Optional[str] = Field(None, description="Temps restant formaté")
    is_overdue: Optional[bool] = Field(None, description="Indique si l'évaluation est en retard")
    days_since_graded: Optional[int] = Field(None, description="Jours depuis la notation")
    
    # Analyses de performance
    class_rank: Optional[int] = Field(None, description="Rang dans la classe pour cette évaluation")
    percentile_rank: Optional[float] = Field(None, description="Percentile par rapport à la classe")
    deviation_from_average: Optional[float] = Field(None, description="Écart par rapport à la moyenne de classe")
    class_average: Optional[float] = Field(None, description="Moyenne de la classe")
    class_median: Optional[float] = Field(None, description="Médiane de la classe")
    
    # Pondération et impact
    weighted_contribution: Optional[float] = Field(None, description="Contribution pondérée au cours")
    impact_on_final_grade: Optional[float] = Field(None, description="Impact sur la note finale")
    
    # Difficultés et recommandations
    difficulty_level: Optional[str] = Field(None, description="Niveau de difficulté estimé")
    improvement_needed: Optional[float] = Field(None, description="Points nécessaires pour améliorer la note")
    next_milestone: Optional[str] = Field(None, description="Prochain objectif à atteindre")
    
    # Indicateurs visuels
    status_icon: Optional[str] = Field(None, description="Icône du statut")
    priority_level: Optional[int] = Field(None, description="Niveau de priorité (1-5)")
    color_indicator: Optional[str] = Field(None, description="Indicateur de couleur")


class StudentAssessmentsCompletesPublic(BaseModel):
    """Modèle pour une liste d'évaluations complètes avec métadonnées."""
    
    data: list[StudentAssessmentsCompleteWithAnalytics]
    count: int


class StudentAssessmentsViewFilters(BaseModel):
    """Modèle pour les filtres de recherche dans la vue des évaluations."""
    
    # Filtres sur l'étudiant
    student_id: Optional[UUID] = None
    student_number: Optional[str] = None
    current_year_level: Optional[int] = None
    
    # Filtres sur les évaluations
    assessment_id: Optional[UUID] = None
    assessment_name: Optional[str] = None
    assessment_type: Optional[str] = None
    is_mandatory: Optional[bool] = None
    is_published: Optional[bool] = None
    
    # Filtres sur les notes
    has_grade: Optional[bool] = None
    grade_published: Optional[bool] = None
    is_passing: Optional[bool] = None
    min_score: Optional[float] = None
    max_score_filter: Optional[float] = None
    letter_grade: Optional[str] = None
    
    # Filtres sur les cours
    course_id: Optional[UUID] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    
    # Filtres sur les sessions
    course_session_id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    academic_year_id: Optional[UUID] = None
    is_current_year: Optional[bool] = None
    
    # Filtres sur les enseignants
    teacher_id: Optional[UUID] = None
    
    # Filtres sur les statuts et délais
    student_assessment_status: Optional[str] = None
    deadline_status: Optional[str] = None
    
    # Filtres temporels
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    assessment_date_from: Optional[date] = None
    assessment_date_to: Optional[date] = None
    graded_date_from: Optional[date] = None
    graded_date_to: Optional[date] = None


class AssessmentStatistics(BaseModel):
    """Modèle pour les statistiques d'évaluations d'un étudiant."""
    
    # Compteurs généraux
    total_assessments: int = 0
    completed_assessments: int = 0
    pending_assessments: int = 0
    overdue_assessments: int = 0
    passed_assessments: int = 0
    failed_assessments: int = 0
    
    # Moyennes et performances
    overall_average: float = 0.0
    weighted_average: float = 0.0
    current_semester_average: float = 0.0
    
    # Taux de réussite
    completion_rate: float = 0.0
    success_rate: float = 0.0
    on_time_submission_rate: float = 0.0
    
    # Par type d'évaluation
    exam_average: Optional[float] = None
    quiz_average: Optional[float] = None
    assignment_average: Optional[float] = None
    project_average: Optional[float] = None
    
    # Tendances
    performance_trend: Optional[str] = None  # improving, declining, stable
    consistency_score: float = 0.0
    
    # Prochaines échéances
    upcoming_deadlines: int = 0
    urgent_submissions: int = 0


class StudentAssessmentsViewSummary(BaseModel):
    """Modèle pour le résumé statistique de la vue des évaluations."""
    
    # Compteurs globaux
    total_records: int = 0
    total_students: int = 0
    total_assessments: int = 0
    total_courses: int = 0
    
    # Statistiques académiques
    overall_statistics: AssessmentStatistics
    
    # Répartitions
    status_distribution: dict[str, int] = {}
    type_distribution: dict[str, int] = {}
    deadline_status_distribution: dict[str, int] = {}
    
    # Performance
    grade_distribution: dict[str, int] = {}
    average_scores_by_type: dict[str, float] = {}
    
    # Urgences
    overdue_count: int = 0
    urgent_count: int = 0
    upcoming_count: int = 0


class AssessmentPerformanceReport(BaseModel):
    """Modèle pour un rapport de performance d'évaluations."""
    
    # Informations générales
    report_period: str
    generated_at: str
    student_info: dict
    
    # Performance académique
    assessments_summary: AssessmentStatistics
    assessment_details: list[StudentAssessmentsCompleteWithAnalytics]
    
    # Analyses détaillées
    strengths_by_type: dict[str, list[str]] = {}
    weaknesses_by_type: dict[str, list[str]] = {}
    improvement_recommendations: list[str] = []
    
    # Comparaisons temporelles
    monthly_performance: dict[str, float] = {}
    semester_comparison: dict[str, dict] = {}
    
    # Prédictions
    projected_final_grades: dict[str, float] = {}  # Par cours
    at_risk_assessments: list[dict] = []
    
    # Planning
    upcoming_deadlines: list[dict] = []
    recommended_study_schedule: list[dict] = []
    
    # Données pour graphiques
    charts_data: dict = {}


class TeacherAssessmentsOverview(BaseModel):
    """Modèle pour la vue d'ensemble des évaluations d'un enseignant."""
    
    teacher_info: dict
    
    # Statistiques des évaluations
    total_assessments: int = 0
    graded_assessments: int = 0
    pending_grading: int = 0
    
    # Performance des étudiants
    class_averages: dict[str, float] = {}  # Par évaluation
    distribution_by_grade: dict[str, dict] = {}
    completion_rates: dict[str, float] = {}
    
    # Workload
    grading_workload: dict = {}
    upcoming_deadlines: list[dict] = []
    
    # Analyses
    most_challenging_assessments: list[dict] = []
    best_performing_assessments: list[dict] = []
    students_needing_attention: list[dict] = []


class AssessmentAlert(BaseModel):
    """Modèle pour les alertes d'évaluations."""
    
    alert_type: str  # overdue, urgent, poor_performance, excellent, etc.
    severity: str    # low, medium, high, critical
    student_id: UUID
    student_name: str
    assessment_id: UUID
    assessment_name: str
    course_name: str
    
    # Détails de l'alerte
    current_status: str
    due_date: Optional[date] = None
    days_overdue: Optional[int] = None
    current_score: Optional[float] = None
    
    # Recommandations
    description: str
    recommended_actions: list[str] = []
    
    # Métadonnées
    created_at: str
    requires_immediate_action: bool = False
    escalation_level: int = 1


class AssessmentAlerts(BaseModel):
    """Modèle pour une collection d'alertes d'évaluations."""
    
    # Types d'alertes
    critical_alerts: list[AssessmentAlert] = []
    urgent_alerts: list[AssessmentAlert] = []
    warning_alerts: list[AssessmentAlert] = []
    positive_alerts: list[AssessmentAlert] = []
    
    # Résumés
    total_alerts: int = 0
    overdue_submissions: int = 0
    urgent_deadlines: int = 0
    poor_performances: int = 0
    
    # Configuration
    alert_thresholds: dict = {}
    generated_at: str = ""


class AssessmentProgressTracker(BaseModel):
    """Modèle pour le suivi de progression des évaluations."""
    
    student_info: dict
    
    # Progression générale
    total_assessments_semester: int = 0
    completed_assessments: int = 0
    pending_assessments: int = 0
    upcoming_assessments: int = 0
    
    # Performance tracking
    current_gpa: float = 0.0
    target_gpa: float = 0.0
    gpa_trend: str = "stable"  # improving, declining, stable
    
    # Timeline
    assessment_timeline: list[dict] = []
    milestones_achieved: list[dict] = []
    upcoming_milestones: list[dict] = []
    
    # Predictions
    semester_projection: dict = {}
    risk_assessment: dict = {}
    
    # Study recommendations
    study_plan: list[dict] = []
    priority_assessments: list[dict] = []


class AssessmentComparison(BaseModel):
    """Modèle pour la comparaison d'évaluations."""
    
    comparison_type: str  # student_vs_class, course_vs_course, period_vs_period
    
    baseline: dict
    comparison: dict
    
    metrics: dict = {
        "average_difference": 0.0,
        "performance_gap": 0.0,
        "improvement_rate": 0.0,
        "consistency_comparison": 0.0,
    }
    
    insights: list[str] = []
    recommendations: list[str] = []


class CourseAssessmentAnalysis(BaseModel):
    """Modèle pour l'analyse des évaluations par cours."""
    
    course_info: dict
    
    # Statistiques du cours
    total_assessments: int = 0
    assessment_types: dict[str, int] = {}
    
    # Performance globale
    course_average: float = 0.0
    pass_rate: float = 0.0
    completion_rate: float = 0.0
    
    # Distribution des difficultés
    difficulty_analysis: dict = {
        "easy_assessments": [],
        "moderate_assessments": [],
        "difficult_assessments": [],
    }
    
    # Tendances temporelles
    performance_over_time: list[dict] = []
    seasonal_patterns: dict = {}
    
    # Recommandations pédagogiques
    pedagogical_insights: list[str] = []
    suggested_improvements: list[str] = []


# Modèles pour les analyses avancées
class AssessmentWorkloadAnalysis(BaseModel):
    """Modèle pour l'analyse de la charge de travail."""
    
    analysis_period: str
    
    # Distribution temporelle
    workload_by_week: dict[str, int] = {}
    peak_periods: list[dict] = []
    light_periods: list[dict] = []
    
    # Par type d'évaluation
    workload_by_type: dict[str, dict] = {}
    
    # Recommandations de planification
    optimal_scheduling: list[dict] = []
    conflict_alerts: list[dict] = []
    balance_suggestions: list[str] = []


class AssessmentGradingEfficiency(BaseModel):
    """Modèle pour l'efficacité de notation."""
    
    teacher_info: dict
    
    # Métriques de notation
    average_grading_time: float = 0.0  # en jours
    grading_consistency: float = 0.0
    feedback_quality_score: float = 0.0
    
    # Workload
    pending_grading_count: int = 0
    overdue_grading_count: int = 0
    grading_queue: list[dict] = []
    
    # Efficiency metrics
    assessments_per_day: float = 0.0
    peak_grading_days: list[str] = []
    
    # Recommendations
    workload_optimization: list[str] = []
    efficiency_tips: list[str] = []


class AssessmentCalendar(BaseModel):
    """Modèle pour le calendrier des évaluations."""
    
    calendar_view: str  # weekly, monthly, semester
    
    # Events by date
    calendar_events: dict[str, list[dict]] = {}
    
    # Summary information
    busy_periods: list[dict] = []
    free_periods: list[dict] = []
    conflicts: list[dict] = []
    
    # Student-specific
    personal_deadlines: list[dict] = []
    study_schedule_suggestions: list[dict] = []
    
    # Visual indicators
    color_coding: dict[str, str] = {}
    priority_indicators: dict[str, int] = {}