"""
Modèles pour la vue v_student_grades_complete
Vue complète des notes étudiants avec toutes les informations liées
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from sqlmodel import SQLModel


class StudentGradeCompleteBase(SQLModel):
    """Modèle de base pour la vue complète des notes étudiants."""
    
    # Informations de la note
    grade_id: UUID
    score: Optional[float] = None
    letter_grade: Optional[str] = None
    grade_points: Optional[float] = None
    is_passing: Optional[bool] = None
    graded_date: Optional[datetime] = None
    graded_by: Optional[UUID] = None
    comments: Optional[str] = None
    is_published: bool = False
    grade_created_at: datetime
    grade_updated_at: datetime
    
    # Informations de l'évaluation
    assessment_id: UUID
    assessment_name: str
    assessment_type: str
    assessment_max_score: float
    assessment_weight: float
    assessment_due_date: Optional[datetime] = None
    assessment_date: Optional[datetime] = None
    assessment_mandatory: bool = True
    
    # Informations du cours
    course_id: UUID
    course_name: str
    course_code: str
    course_description: Optional[str] = None
    course_credits: int
    course_mandatory: bool = True
    
    # Informations de la session du cours
    course_session_id: UUID
    course_session_year_level: int
    classroom: Optional[str] = None
    max_students: Optional[int] = None
    
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
    is_current_year: bool = False
    
    # Informations du professeur
    teacher_id: UUID
    teacher_name: str
    teacher_email: str
    
    # Informations du programme
    program_id: Optional[UUID] = None
    program_name: Optional[str] = None
    program_code: Optional[str] = None
    
    # Informations du niveau de programme
    program_level_id: Optional[UUID] = None
    program_level_name: Optional[str] = None
    program_level_code: Optional[str] = None
    
    # Informations de l'étudiant
    student_id: UUID
    student_number: str
    student_user_id: UUID
    student_first_name: str
    student_last_name: str
    student_email: str
    
    # Informations de l'inscription
    enrollment_id: UUID
    enrollment_date: date
    enrollment_status: str


class StudentGradeComplete(StudentGradeCompleteBase, table=False):
    """
    Vue complète des notes étudiants - Lecture seule
    Correspond à la vue v_student_grades_complete
    """
    model_config = ConfigDict(from_attributes=True)


class StudentGradeCompletePublic(BaseModel):
    """Version publique de la vue complète des notes étudiants."""
    
    # Informations de la note
    grade_id: UUID
    score: Optional[float] = None
    letter_grade: Optional[str] = None
    grade_points: Optional[float] = None
    is_passing: Optional[bool] = None
    graded_date: Optional[datetime] = None
    comments: Optional[str] = None
    is_published: bool
    grade_created_at: datetime
    
    # Informations de l'évaluation
    assessment_id: UUID
    assessment_name: str
    assessment_type: str
    assessment_max_score: float
    assessment_weight: float
    assessment_due_date: Optional[datetime] = None
    assessment_date: Optional[datetime] = None
    assessment_mandatory: bool
    
    # Informations du cours
    course_id: UUID
    course_name: str
    course_code: str
    course_description: Optional[str] = None
    course_credits: int
    course_mandatory: bool
    
    # Informations de la session du cours
    course_session_id: UUID
    course_session_year_level: int
    classroom: Optional[str] = None
    
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
    is_current_year: bool
    
    # Informations du professeur
    teacher_id: UUID
    teacher_name: str
    teacher_email: str
    
    # Informations du programme
    program_id: Optional[UUID] = None
    program_name: Optional[str] = None
    program_code: Optional[str] = None
    
    # Informations du niveau de programme
    program_level_id: Optional[UUID] = None
    program_level_name: Optional[str] = None
    program_level_code: Optional[str] = None
    
    # Informations de l'étudiant
    student_id: UUID
    student_number: str
    student_first_name: str
    student_last_name: str
    student_email: str
    
    # Informations de l'inscription
    enrollment_id: UUID
    enrollment_date: date
    enrollment_status: str

    model_config = ConfigDict(from_attributes=True)


class StudentGradeCompleteWithCalculations(StudentGradeCompletePublic):
    """Version enrichie avec des calculs supplémentaires."""
    
    # Calculs supplémentaires
    percentage_score: Optional[float] = None  # score / assessment_max_score * 100
    weighted_score: Optional[float] = None   # score * assessment_weight / 100
    student_full_name: str                   # student_first_name + " " + student_last_name
    
    model_config = ConfigDict(from_attributes=True)


class StudentGradeCompletesPublic(BaseModel):
    """Collection de notes complètes avec métadonnées."""
    
    data: list[StudentGradeCompletePublic]
    count: int
    
    model_config = ConfigDict(from_attributes=True)


class StudentGradeViewFilters(BaseModel):
    """Filtres pour les requêtes sur la vue des notes complètes."""
    
    student_id: Optional[UUID] = None
    course_id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    academic_year_id: Optional[UUID] = None
    teacher_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    program_level_id: Optional[UUID] = None
    year_level: Optional[int] = None
    is_published: Optional[bool] = None
    is_passing: Optional[bool] = None
    assessment_type: Optional[str] = None
    enrollment_status: Optional[str] = None
    
    # Filtres de date
    graded_after: Optional[date] = None
    graded_before: Optional[date] = None
    session_start_after: Optional[date] = None
    session_start_before: Optional[date] = None
    
    # Filtres de score
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)


class StudentGradeViewSummary(BaseModel):
    """Résumé statistique d'une collection de notes."""
    
    total_grades: int
    published_grades: int
    passing_grades: int
    failing_grades: int
    average_score: Optional[float] = None
    weighted_average: Optional[float] = None
    highest_score: Optional[float] = None
    lowest_score: Optional[float] = None
    total_credits: int
    total_assessments: int
    unique_courses: int
    unique_sessions: int
    
    model_config = ConfigDict(from_attributes=True)