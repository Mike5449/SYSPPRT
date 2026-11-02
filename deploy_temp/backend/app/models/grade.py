import uuid
from datetime import datetime, date
from typing import TYPE_CHECKING
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.student import Student, StudentPublic
    from app.models.assessment import Assessment, AssessmentPublic
    from app.models.program import ProgramPublic


class ExamType(str, Enum):
    """Type d'examen pour les notes."""
    INTRA = "intra"  # Examen de mi-session
    FINAL = "final"  # Examen final
    REGULAR = "regular"  # Évaluation régulière (devoirs, quiz, etc.)


# Shared properties
class GradeBase(SQLModel):
    """
    Note d'un étudiant pour une évaluation.
    """
    score: float = Field(ge=0.0, le=100.0)
    letter_grade: str | None = Field(default=None, max_length=5)  # A, B+, C-, etc.
    grade_points: float | None = Field(default=None, ge=0.0, le=4.0)  # Pour GPA
    is_passing: bool = Field(default=True)
    graded_date: date | None = None
    graded_by: str | None = Field(default=None, max_length=255)  # Nom du professeur
    comments: str | None = Field(default=None, max_length=2000)
    is_published: bool = Field(default=False)  # Si la note est visible par l'étudiant
    exam_type: ExamType = Field(default=ExamType.REGULAR)  # Type d'examen
    
    # Foreign keys
    student_id: uuid.UUID = Field(foreign_key="student.id", index=True)
    assessment_id: uuid.UUID = Field(foreign_key="assessment.id", index=True)


class GradeCreate(GradeBase):
    pass


class GradeUpdate(SQLModel):
    score: float | None = Field(default=None, ge=0.0, le=100.0)
    letter_grade: str | None = None
    grade_points: float | None = Field(default=None, ge=0.0, le=4.0)
    is_passing: bool | None = None
    graded_date: date | None = None
    graded_by: str | None = None
    comments: str | None = None
    is_published: bool | None = None
    exam_type: ExamType | None = None  # AJOUTER CETTE LIGNE


class Grade(GradeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    student: "Student" = Relationship(back_populates="grades")
    assessment: "Assessment" = Relationship(back_populates="grades")


class GradePublic(GradeBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class GradePublicWithDetails(GradePublic):
    student: "StudentPublicWithDetails"
    assessment: "AssessmentPublicWithDetails"


class GradesPublic(SQLModel):
    data: list[GradePublicWithDetails]
    count: int


# Grade Statistics
class GradeStatistics(SQLModel):
    """Statistiques de notes pour un étudiant ou un cours."""
    total_assessments: int
    graded_assessments: int
    average_score: float
    highest_score: float
    lowest_score: float
    gpa: float | None = None
    letter_grade: str | None = None
    is_passing: bool


class StudentTranscript(SQLModel):
    """Relevé de notes complet d'un étudiant."""
    student: "StudentPublic"
    program: "ProgramPublic"
    total_credits_earned: int
    gpa: float
    enrollments: list[dict]  # Cours avec notes


class CourseGradeStatistics(SQLModel):
    """Statistiques de notes pour un cours spécifique."""
    total_sessions: int
    total_assessments: int
    average_score: float
    weighted_average: float
    highest_score: float
    lowest_score: float
    final_grade: str
    gpa: float
    passing_count: int
    failing_count: int
    is_completed: bool


# Nouveaux modèles enrichis avec informations de cours
class GradeWithCourseInfo(SQLModel):
    """Note avec informations complètes du cours."""
    # Informations de la note
    id: uuid.UUID
    score: float
    letter_grade: str | None = None
    grade_points: float | None = None
    is_passing: bool = True
    graded_date: date | None = None
    graded_by: str | None = None
    comments: str | None = None
    is_published: bool = False
    created_at: datetime
    updated_at: datetime
    
    # Informations de l'évaluation
    assessment_name: str
    assessment_type: str
    assessment_max_score: float
    assessment_weight: float
    assessment_due_date: date | None = None
    
    # Informations du cours complet
    course_id: uuid.UUID
    course_name: str
    course_code: str
    course_description: str | None = None
    course_credits: int
    
    # Informations de la session du cours
    course_session_id: uuid.UUID
    course_session_year_level: int
    course_session_classroom: str | None = None
    
    # Informations de la session académique
    session_name: str
    session_code: str
    session_start_date: date | None = None
    session_end_date: date | None = None
    
    # Informations du professeur
    teacher_name: str | None = None
    teacher_email: str | None = None
    
    # Informations du programme
    program_name: str | None = None
    program_level_name: str | None = None


class GradesWithCourseInfo(SQLModel):
    """Collection de notes avec informations de cours."""
    data: list[GradeWithCourseInfo]
    count: int


class CourseStatisticsWithInfo(SQLModel):
    """Statistiques de cours avec informations complètes."""
    # Informations du cours
    course_id: uuid.UUID
    course_name: str
    course_code: str
    course_description: str | None = None
    course_credits: int
    
    # Statistiques
    total_sessions: int
    total_assessments: int
    average_score: float
    weighted_average: float
    highest_score: float
    lowest_score: float
    final_grade: str
    gpa: float
    passing_count: int
    failing_count: int
    is_completed: bool
    
    # Informations additionnelles
    program_name: str | None = None
    sessions_studied: list[str] = []  # Noms des sessions où le cours a été suivi


# =================== NOUVEAUX MODÈLES POUR AGRÉGATION ===================

# Modèles pour les statistiques de cours
class CourseStatistics(SQLModel):
    total_grades: int
    average_score: float | None = None
    weighted_average: float | None = None
    highest_score: float | None = None
    lowest_score: float | None = None
    final_grade: str | None = None
    total_points_earned: float | None = None
    total_points_possible: float | None = None
    completion_percentage: float | None = None
    is_passing_course: bool | None = None


# Modèle pour une note avec évaluation
class GradeWithAssessment(SQLModel):
    id: uuid.UUID
    score: float | None = None
    grade_letter: str | None = None
    points: float | None = None
    is_passing: bool | None = None
    graded_date: datetime | None = None
    comments: str | None = None
    assessment_name: str
    assessment_type: str | None = None
    assessment_weight: float | None = None
    assessment_max_score: float | None = None
    assessment_due_date: datetime | None = None


# Modèle pour résumé d'un cours avec toutes ses notes
class CourseGradeSummary(SQLModel):
    course_id: uuid.UUID
    course_name: str
    course_code: str
    course_credits: int
    course_description: str | None = None
    
    # Informations du professeur
    teacher_name: str
    teacher_email: str | None = None
    
    # Informations de la session
    session_name: str
    session_year: int
    session_semester: str | None = None
    
    # Informations du programme
    program_name: str
    program_degree: str | None = None
    
    # Notes de ce cours
    grades: list[GradeWithAssessment]
    
    # Statistiques du cours
    course_statistics: CourseStatistics


# Informations de l'étudiant
class StudentInfo(SQLModel):
    id: uuid.UUID
    student_number: str
    user_id: uuid.UUID
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    admission_date: datetime | None = None
    is_active: bool
    program_name: str | None = None
    program_level_name: str | None = None


# Statistiques du niveau
class LevelStatistics(SQLModel):
    total_courses: int
    total_grades: int
    overall_average: float | None = None
    total_credits: int
    credits_earned: int
    gpa: float | None = None
    total_points_earned: float | None = None
    total_points_possible: float | None = None
    completion_percentage: float | None = None
    passing_courses: int
    failing_courses: int


# Réponse complète avec agrégation par cours + infos étudiant
class StudentGradesSummaryByLevel(SQLModel):
    student_info: StudentInfo
    year_level: int
    courses: list[CourseGradeSummary]
    level_statistics: LevelStatistics
    total_courses: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# Réponse agrégée par session
class StudentGradesSummaryBySession(SQLModel):
    student_info: StudentInfo
    session_id: uuid.UUID
    courses: list[CourseGradeSummary]
    level_statistics: LevelStatistics
    total_courses: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# Réponse agrégée par cours spécifique
class StudentGradesSummaryByCourse(SQLModel):
    student_info: StudentInfo
    course_id: uuid.UUID
    course: CourseGradeSummary
    generated_at: datetime = Field(default_factory=datetime.utcnow)