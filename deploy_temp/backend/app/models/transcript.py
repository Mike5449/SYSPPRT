"""
Modèles pour le bulletin académique (transcript).
"""
import uuid
from datetime import date
from typing import Optional

from sqlmodel import SQLModel


class GradeDetail(SQLModel):
    """Détail d'une note pour un type d'examen."""
    exam_type: str  # INTRA, FINAL, REGULAR
    score: float
    max_score: float
    assessment_name: str
    graded_date: date | None = None


class CourseGrade(SQLModel):
    """Note finale pour un cours avec détails."""
    course_id: uuid.UUID
    course_code: str
    course_name: str
    course_credits: int
    
    # Notes par type d'examen
    intra_grade: GradeDetail | None = None
    final_grade: GradeDetail | None = None
    participation_grades: list[GradeDetail] = []
    
    # Pourcentages configurés dans course_session
    intra_percentage: float | None = None
    final_percentage: float | None = None
    participation_percentage: float | None = None
    
    # Calculs
    participation_average: float | None = None  # Moyenne des participations
    weighted_score: float | None = None  # Note pondérée finale
    letter_grade: str | None = None
    is_passing: bool = False
    
    # Informations supplémentaires
    teacher_name: str | None = None
    classroom: str | None = None


class SessionTranscript(SQLModel):
    """Bulletin pour une session spécifique."""
    session_id: uuid.UUID
    session_name: str
    session_number: int
    session_start_date: date | None = None
    session_end_date: date | None = None
    
    # Cours de cette session
    courses: list[CourseGrade] = []
    
    # Statistiques de session
    total_credits: int = 0
    earned_credits: int = 0
    session_average: float | None = None
    session_gpa: float | None = None


class YearTranscript(SQLModel):
    """Bulletin annuel complet."""
    student_id: uuid.UUID
    student_number: str
    student_name: str
    
    year_level: int
    
    # Programme (optionnel)
    program_name: str | None = None
    
    # Sessions de l'année
    sessions: list[SessionTranscript] = []
    
    # Statistiques annuelles
    total_credits: int = 0
    earned_credits: int = 0
    year_average: float | None = None
    year_gpa: float | None = None
    
    # Statut
    is_passing_year: bool = False
    
    # Métadonnées
    generated_at: date
