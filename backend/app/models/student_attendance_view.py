"""
Modèles Pydantic pour la vue complète des présences étudiants.
Basé sur la vue v_student_attendance_complete qui agrège toutes les informations
de présence avec les détails des étudiants, cours, sessions, et enseignants.
"""

from datetime import datetime, date, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field
from sqlmodel import SQLModel


class StudentAttendanceCompleteBase(BaseModel):
    """Modèle de base pour la vue complète des présences étudiants."""
    
    # Informations de l'étudiant
    student_id: UUID
    student_number: str
    current_year_level: int
    student_name: str
    student_email: str
    
    # Informations de la présence
    attendance_record_id: UUID
    attendance_status: str
    arrival_time: Optional[datetime] = None
    is_excused: bool = False
    excuse_document: Optional[str] = None
    attendance_notes: Optional[str] = None
    record_created_at: datetime
    
    # Informations de la séance
    attendance_session_id: UUID
    session_date: date
    session_start_time: time
    session_end_time: time
    session_topic: Optional[str] = None
    session_description: Optional[str] = None
    actual_room: Optional[str] = None
    actual_building: Optional[str] = None
    is_cancelled: bool = False
    cancellation_reason: Optional[str] = None
    attendance_taken: bool = False
    session_total_students: Optional[int] = None
    session_present_students: Optional[int] = None
    
    # Calcul du retard
    minutes_late: float = 0.0
    
    # Informations de l'horaire
    schedule_id: UUID
    day_of_week: int
    scheduled_start_time: time
    scheduled_end_time: time
    room: Optional[str] = None
    building: Optional[str] = None
    
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
    
    # Catégorisation enrichie
    attendance_category: str
    status_icon: str


class StudentAttendanceComplete(StudentAttendanceCompleteBase, SQLModel, table=False):
    """Modèle SQLModel pour la vue complète des présences."""
    pass


class StudentAttendanceCompletePublic(StudentAttendanceCompleteBase):
    """Modèle public pour l'API - version de base sans champs sensibles."""
    pass


class StudentAttendanceCompleteWithCalculations(StudentAttendanceCompletePublic):
    """Modèle enrichi avec calculs supplémentaires."""
    
    # Calculs enrichis
    attendance_rate_percentage: Optional[float] = Field(None, description="Pourcentage de présence de l'étudiant")
    is_chronically_late: Optional[bool] = Field(None, description="Indique si l'étudiant est chroniquement en retard")
    total_sessions_for_course: Optional[int] = Field(None, description="Nombre total de sessions pour ce cours")
    sessions_attended_for_course: Optional[int] = Field(None, description="Nombre de sessions assistées pour ce cours")
    average_arrival_delay: Optional[float] = Field(None, description="Retard moyen en minutes")
    attendance_streak: Optional[int] = Field(None, description="Série de présences consécutives")
    
    # Informations contextuelles
    days_since_session: Optional[int] = Field(None, description="Nombre de jours depuis la session")
    is_recent_session: Optional[bool] = Field(None, description="Session récente (moins de 7 jours)")
    semester_week_number: Optional[int] = Field(None, description="Numéro de semaine dans le semestre")
    
    # Statuts dérivés
    punctuality_status: Optional[str] = Field(None, description="Statut de ponctualité (excellent, good, needs_improvement, poor)")
    attendance_trend: Optional[str] = Field(None, description="Tendance de présence (improving, declining, stable)")


class StudentAttendanceCompletesPublic(BaseModel):
    """Modèle pour une liste de présences complètes avec métadonnées."""
    
    data: list[StudentAttendanceCompleteWithCalculations]
    count: int


class StudentAttendanceViewFilters(BaseModel):
    """Modèle pour les filtres de recherche dans la vue des présences."""
    
    # Filtres sur l'étudiant
    student_id: Optional[UUID] = None
    student_number: Optional[str] = None
    current_year_level: Optional[int] = None
    session_year_level: Optional[int] = None
    
    # Filtres sur la présence
    attendance_status: Optional[str] = None  # PRESENT, ABSENT, LATE, EXCUSED
    attendance_category: Optional[str] = None  # on_time, late_arrival, excused_absence, etc.
    is_excused: Optional[bool] = None
    has_excuse_document: Optional[bool] = None
    
    # Filtres temporels
    session_date_from: Optional[date] = None
    session_date_to: Optional[date] = None
    day_of_week: Optional[int] = None  # 1=Lundi, 7=Dimanche
    
    # Filtres sur la séance
    attendance_session_id: Optional[UUID] = None
    is_cancelled: Optional[bool] = None
    attendance_taken: Optional[bool] = None
    
    # Filtres sur les cours
    course_id: Optional[UUID] = None
    course_session_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None
    
    # Filtres sur les sessions académiques
    session_id: Optional[UUID] = None
    academic_year_id: Optional[UUID] = None
    is_current_year: Optional[bool] = None
    
    # Filtres sur la ponctualité
    is_late: Optional[bool] = None  # Arrivé en retard
    max_minutes_late: Optional[int] = None  # Retard maximum acceptable
    
    # Filtres sur les lieux
    building: Optional[str] = None
    room: Optional[str] = None


class StudentAttendanceStatistics(BaseModel):
    """Modèle pour les statistiques de présence."""
    
    # Statistiques générales
    total_sessions: int = 0
    attended_sessions: int = 0
    absent_sessions: int = 0
    late_sessions: int = 0
    excused_sessions: int = 0
    cancelled_sessions: int = 0
    
    # Pourcentages
    attendance_rate: float = 0.0
    absence_rate: float = 0.0
    punctuality_rate: float = 0.0  # Pourcentage d'arrivées à l'heure
    excuse_rate: float = 0.0
    
    # Moyennes
    average_minutes_late: float = 0.0
    average_sessions_per_week: float = 0.0
    
    # Tendances
    attendance_trend: Optional[str] = None  # improving, declining, stable
    best_day_of_week: Optional[int] = None  # Jour avec meilleure présence
    worst_day_of_week: Optional[int] = None  # Jour avec plus d'absences
    
    # Périodes
    best_performing_week: Optional[int] = None
    most_absences_week: Optional[int] = None


class StudentAttendanceViewSummary(BaseModel):
    """Modèle pour le résumé statistique de la vue des présences."""
    
    # Compteurs globaux
    total_records: int = 0
    total_students: int = 0
    total_courses: int = 0
    total_sessions: int = 0
    
    # Statistiques de présence
    overall_statistics: StudentAttendanceStatistics
    
    # Répartition par statut
    status_distribution: dict[str, int] = {}
    category_distribution: dict[str, int] = {}
    
    # Répartition temporelle
    daily_distribution: dict[int, int] = {}  # Par jour de la semaine
    monthly_distribution: dict[str, int] = {}  # Par mois
    
    # Top 5
    most_present_students: list[dict] = []
    most_absent_students: list[dict] = []
    most_punctual_students: list[dict] = []
    most_late_students: list[dict] = []


class AttendanceReport(BaseModel):
    """Modèle pour un rapport de présence détaillé."""
    
    # Informations générales
    report_period: str
    generated_at: datetime
    generated_for: str  # student, course, session, etc.
    
    # Données du rapport
    student_info: Optional[dict] = None
    course_info: Optional[dict] = None
    session_info: Optional[dict] = None
    
    # Statistiques détaillées
    statistics: StudentAttendanceStatistics
    
    # Données de présence
    attendance_records: list[StudentAttendanceCompleteWithCalculations]
    
    # Analyses et recommandations
    analysis: dict = {}
    recommendations: list[str] = []
    
    # Graphiques de données (pour le frontend)
    charts_data: dict = {}


class AttendanceAlerts(BaseModel):
    """Modèle pour les alertes de présence."""
    
    # Types d'alertes
    chronic_absenteeism: list[dict] = []  # Absentéisme chronique
    excessive_tardiness: list[dict] = []  # Retards excessifs
    sudden_absence_pattern: list[dict] = []  # Changement soudain de présence
    perfect_attendance: list[dict] = []  # Présence parfaite
    
    # Métadonnées
    alert_threshold: dict = {}
    generated_at: datetime = Field(default_factory=datetime.now)


class CourseAttendanceSummary(BaseModel):
    """Modèle pour le résumé de présence par cours."""
    
    course_info: dict
    teacher_info: dict
    session_info: dict
    
    # Statistiques du cours
    total_students_enrolled: int = 0
    total_sessions_planned: int = 0
    total_sessions_held: int = 0
    total_sessions_cancelled: int = 0
    
    # Moyennes du cours
    average_attendance_rate: float = 0.0
    average_students_per_session: float = 0.0
    
    # Distribution des présences
    attendance_by_session: list[dict] = []
    student_attendance_summary: list[dict] = []
    
    # Analyses
    best_attended_sessions: list[dict] = []
    poorly_attended_sessions: list[dict] = []
    attendance_trends: dict = {}


# Modèles pour les filtres et groupements avancés
class AttendanceGroupBy(BaseModel):
    """Options de groupement pour les analyses."""
    
    group_by: str  # student, course, session, teacher, day_of_week, month, etc.
    include_statistics: bool = True
    include_trends: bool = False
    date_range: Optional[tuple[date, date]] = None