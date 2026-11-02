"""
Modèles Pydantic pour la vue complète des cours étudiants.
Basé sur la vue v_student_courses_complete qui agrège toutes les informations
des cours avec les détails des étudiants, enseignants, sessions, et statistiques.
"""

from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field
from sqlmodel import SQLModel


class StudentCoursesCompleteBase(BaseModel):
    """Modèle de base pour la vue complète des cours étudiants."""
    
    # Informations de l'étudiant
    student_id: UUID
    student_number: str
    current_year_level: int
    student_name: str
    student_email: str
    
    # Informations du cours
    course_id: UUID
    course_name: str
    course_code: str
    course_description: Optional[str] = None
    credits: int
    hours_per_week: int
    course_mandatory: bool = False
    prerequisites: Optional[str] = None
    syllabus: Optional[str] = None
    
    # Informations du CourseProgramLevel
    course_program_level_id: UUID
    cpl_year_level: int
    
    # Informations de la session du cours
    course_session_id: UUID
    classroom: Optional[str] = None
    max_students: Optional[int] = None
    session_year_level: int
    session_active: bool = True
    
    # Informations de la session académique
    session_id: UUID
    session_name: str
    session_code: str
    session_number: int
    session_start_date: date
    session_end_date: date
    
    # Informations de l'année académique
    academic_year_id: UUID
    academic_year_name: str
    academic_year_code: str
    year_start_date: date
    year_end_date: date
    is_current_year: bool = False
    
    # Informations du professeur
    teacher_id: UUID
    employee_number: str
    teacher_name: str
    teacher_email: str
    specialization: Optional[str] = None
    academic_rank: Optional[str] = None
    office_location: Optional[str] = None
    phone_extension: Optional[str] = None
    
    # Informations du programme
    program_level_id: UUID
    program_level_name: str
    program_level_code: str
    typical_duration: Optional[int] = None
    
    # Statistiques du cours
    total_assessments: int = 0
    completed_assessments: int = 0
    current_average: Optional[float] = None
    weighted_average: Optional[float] = None
    computed_status: str  # not_started, in_progress, completed, failed
    enrolled_students_count: int = 0


class StudentCoursesComplete(StudentCoursesCompleteBase, SQLModel, table=False):
    """Modèle SQLModel pour la vue complète des cours."""
    pass


class StudentCoursesCompletePublic(StudentCoursesCompleteBase):
    """Modèle public pour l'API - version de base sans champs sensibles."""
    pass


class StudentCoursesCompleteWithAnalytics(StudentCoursesCompletePublic):
    """Modèle enrichi avec analyses et calculs supplémentaires."""
    
    # Calculs enrichis
    completion_percentage: Optional[float] = Field(None, description="Pourcentage d'évaluations complétées")
    performance_level: Optional[str] = Field(None, description="Niveau de performance (excellent, good, average, poor)")
    grade_letter: Optional[str] = Field(None, description="Note lettre basée sur la moyenne")
    is_passing: Optional[bool] = Field(None, description="Indique si l'étudiant réussit le cours")
    
    # Analyses temporelles
    days_remaining: Optional[int] = Field(None, description="Nombre de jours restants dans la session")
    weeks_elapsed: Optional[int] = Field(None, description="Nombre de semaines écoulées")
    progress_rate: Optional[float] = Field(None, description="Rythme de progression (évaluations/semaine)")
    
    # Analyses comparatives
    rank_in_class: Optional[int] = Field(None, description="Rang dans la classe")
    percentile: Optional[float] = Field(None, description="Percentile par rapport aux autres étudiants")
    class_average: Optional[float] = Field(None, description="Moyenne de la classe")
    above_class_average: Optional[bool] = Field(None, description="Au-dessus de la moyenne de classe")
    
    # Prédictions et recommandations
    predicted_final_grade: Optional[float] = Field(None, description="Note finale prédite")
    risk_level: Optional[str] = Field(None, description="Niveau de risque (low, medium, high)")
    recommendation_type: Optional[str] = Field(None, description="Type de recommandation")
    
    # Indicateurs visuels
    status_icon: Optional[str] = Field(None, description="Icône du statut")
    progress_bar_percentage: Optional[float] = Field(None, description="Pourcentage pour barre de progression")


class StudentCoursesCompletesPublic(BaseModel):
    """Modèle pour une liste de cours complets avec métadonnées."""
    
    data: list[StudentCoursesCompleteWithAnalytics]
    count: int


class StudentCoursesViewFilters(BaseModel):
    """Modèle pour les filtres de recherche dans la vue des cours."""
    
    # Filtres sur l'étudiant
    student_id: Optional[UUID] = None
    student_number: Optional[str] = None
    current_year_level: Optional[int] = None
    
    # Filtres sur les cours
    course_id: Optional[UUID] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    course_mandatory: Optional[bool] = None
    min_credits: Optional[int] = None
    max_credits: Optional[int] = None
    
    # Filtres sur les sessions
    course_session_id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    academic_year_id: Optional[UUID] = None
    is_current_year: Optional[bool] = None
    session_active: Optional[bool] = None
    
    # Filtres sur les enseignants
    teacher_id: Optional[UUID] = None
    academic_rank: Optional[str] = None
    specialization: Optional[str] = None
    
    # Filtres sur les programmes
    program_level_id: Optional[UUID] = None
    program_level_code: Optional[str] = None
    
    # Filtres sur les statuts et performances
    computed_status: Optional[str] = None  # not_started, in_progress, completed, failed
    min_average: Optional[float] = None
    max_average: Optional[float] = None
    is_passing: Optional[bool] = None
    
    # Filtres temporels
    session_start_from: Optional[date] = None
    session_start_to: Optional[date] = None
    session_end_from: Optional[date] = None
    session_end_to: Optional[date] = None


class StudentCoursesStatistics(BaseModel):
    """Modèle pour les statistiques de cours d'un étudiant."""
    
    # Statistiques générales
    total_courses: int = 0
    active_courses: int = 0
    completed_courses: int = 0
    failed_courses: int = 0
    not_started_courses: int = 0
    in_progress_courses: int = 0
    
    # Crédits
    total_credits: int = 0
    completed_credits: int = 0
    credits_this_year: int = 0
    
    # Moyennes
    overall_average: float = 0.0
    current_year_average: float = 0.0
    weighted_gpa: float = 0.0
    
    # Pourcentages
    completion_rate: float = 0.0  # Pourcentage de cours complétés
    success_rate: float = 0.0     # Pourcentage de cours réussis
    
    # Performance par type de cours
    mandatory_courses_average: Optional[float] = None
    elective_courses_average: Optional[float] = None
    
    # Tendances
    performance_trend: Optional[str] = None  # improving, declining, stable
    best_performing_subject: Optional[str] = None
    challenging_subjects: list[str] = []


class StudentCoursesViewSummary(BaseModel):
    """Modèle pour le résumé statistique de la vue des cours."""
    
    # Compteurs globaux
    total_records: int = 0
    total_students: int = 0
    total_courses: int = 0
    total_course_sessions: int = 0
    total_teachers: int = 0
    
    # Statistiques académiques
    overall_statistics: StudentCoursesStatistics
    
    # Répartitions
    status_distribution: dict[str, int] = {}
    year_level_distribution: dict[int, int] = {}
    program_distribution: dict[str, int] = {}
    
    # Performance
    grade_distribution: dict[str, int] = {}  # A, B, C, D, F
    average_performance_by_year: dict[int, float] = {}
    
    # Top performances
    top_performing_students: list[dict] = []
    most_challenging_courses: list[dict] = []
    best_performing_courses: list[dict] = []
    top_teachers_by_performance: list[dict] = []


class CoursePerformanceReport(BaseModel):
    """Modèle pour un rapport de performance de cours."""
    
    # Informations générales
    report_period: str
    generated_at: str
    student_info: dict
    
    # Performance académique
    courses_summary: StudentCoursesStatistics
    course_details: list[StudentCoursesCompleteWithAnalytics]
    
    # Analyses détaillées
    strengths: list[str] = []
    areas_for_improvement: list[str] = []
    recommendations: list[str] = []
    
    # Comparaisons
    peer_comparison: dict = {}
    historical_comparison: dict = {}
    
    # Prédictions
    graduation_prediction: dict = {}
    at_risk_courses: list[dict] = []
    
    # Données pour graphiques
    charts_data: dict = {}


class TeacherCoursesOverview(BaseModel):
    """Modèle pour la vue d'ensemble des cours d'un enseignant."""
    
    teacher_info: dict
    
    # Statistiques des cours
    total_courses: int = 0
    total_students: int = 0
    active_sessions: int = 0
    
    # Performance des étudiants
    average_class_performance: float = 0.0
    students_passing_rate: float = 0.0
    students_at_risk: int = 0
    
    # Détails des cours
    courses_details: list[dict] = []
    
    # Analyses
    best_performing_classes: list[dict] = []
    classes_needing_attention: list[dict] = []
    
    # Tendances
    performance_trends: dict = {}


class ProgramPerformanceAnalysis(BaseModel):
    """Modèle pour l'analyse de performance par programme."""
    
    program_info: dict
    
    # Statistiques du programme
    total_students: int = 0
    total_courses: int = 0
    average_completion_time: float = 0.0
    
    # Performance académique
    program_average: float = 0.0
    graduation_rate: float = 0.0
    dropout_rate: float = 0.0
    
    # Analyse par année
    performance_by_year: dict[int, dict] = {}
    
    # Cours critiques
    most_failed_courses: list[dict] = []
    gateway_courses: list[dict] = []  # Cours cruciaux pour la progression
    
    # Tendances
    enrollment_trends: dict = {}
    success_trends: dict = {}


class AcademicAlert(BaseModel):
    """Modèle pour les alertes académiques."""
    
    alert_type: str  # low_performance, at_risk, excellent_performance, etc.
    severity: str    # low, medium, high, critical
    student_id: UUID
    student_name: str
    course_id: UUID
    course_name: str
    
    # Détails de l'alerte
    current_average: Optional[float] = None
    threshold_value: Optional[float] = None
    description: str
    recommendations: list[str] = []
    
    # Métadonnées
    created_at: str
    requires_action: bool = False
    action_deadline: Optional[date] = None


class AcademicAlerts(BaseModel):
    """Modèle pour une collection d'alertes académiques."""
    
    # Types d'alertes
    critical_alerts: list[AcademicAlert] = []
    warning_alerts: list[AcademicAlert] = []
    positive_alerts: list[AcademicAlert] = []
    
    # Résumés
    total_alerts: int = 0
    students_at_risk: int = 0
    courses_with_issues: int = 0
    
    # Configuration des seuils
    alert_thresholds: dict = {}
    generated_at: str = ""


class StudentProgressTracker(BaseModel):
    """Modèle pour le suivi de progression d'un étudiant."""
    
    student_info: dict
    
    # Progression académique
    current_year: int
    total_years: int
    years_completed: int
    
    # Crédits
    credits_earned: int = 0
    credits_required: int = 0
    credits_in_progress: int = 0
    
    # Cours
    courses_completed: list[dict] = []
    courses_in_progress: list[dict] = []
    courses_planned: list[dict] = []
    
    # Milestones
    milestones_achieved: list[dict] = []
    upcoming_milestones: list[dict] = []
    
    # Prédictions
    expected_graduation_date: Optional[date] = None
    graduation_probability: float = 0.0
    
    # Timeline
    academic_timeline: list[dict] = []


# Modèles pour les analyses avancées
class CourseComparisonAnalysis(BaseModel):
    """Modèle pour la comparaison de cours."""
    
    course_a: dict
    course_b: dict
    
    comparison_metrics: dict = {
        "difficulty": {"course_a": 0.0, "course_b": 0.0},
        "student_satisfaction": {"course_a": 0.0, "course_b": 0.0},
        "completion_rate": {"course_a": 0.0, "course_b": 0.0},
        "average_grade": {"course_a": 0.0, "course_b": 0.0},
    }
    
    recommendations: list[str] = []


class AcademicYearSummary(BaseModel):
    """Modèle pour le résumé d'une année académique."""
    
    academic_year_info: dict
    
    # Statistiques globales
    total_students: int = 0
    total_courses: int = 0
    total_enrollments: int = 0
    
    # Performance
    overall_gpa: float = 0.0
    completion_rate: float = 0.0
    retention_rate: float = 0.0
    
    # Analyses par programme
    program_performances: list[dict] = []
    
    # Tendances
    monthly_performance: dict = {}
    semester_comparison: dict = {}
    
    # Highlights
    achievements: list[str] = []
    challenges: list[str] = []
    improvements: list[str] = []