import uuid
from datetime import datetime, date
from typing import TYPE_CHECKING, List, Optional
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.student import Student, StudentPublic
    from app.models.assessment import Assessment, AssessmentPublic


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
    letter_grade: str | None = Field(default=None, max_length=5)
    grade_points: float | None = Field(default=None, ge=0.0, le=4.0)
    is_passing: bool = Field(default=True)
    graded_date: date | None = None
    graded_by: str | None = Field(default=None, max_length=255)
    comments: str | None = Field(default=None, max_length=2000)
    is_published: bool = Field(default=False)
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
    exam_type: ExamType | None = None


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
    student: Optional["StudentPublic"] = None
    assessment: Optional["AssessmentPublic"] = None


class GradesPublic(SQLModel):
    data: list[GradePublicWithDetails]
    count: int


# Nouveaux modèles enrichis avec informations de cours
class GradeWithCourseInfo(SQLModel):
    """Note avec informations complètes du cours."""
    # Informations de la note
    id: uuid.UUID
    score: float
    is_passing: bool
    graded_date: date | None
    graded_by: str | None
    comments: str | None
    is_published: bool
    exam_type: str
    created_at: datetime
    updated_at: datetime
    
    # Informations de l'évaluation
    assessment_name: str
    assessment_type: str
    assessment_max_score: float
    assessment_weight: float
    assessment_due_date: date | None
    
    # Informations du cours
    course_id: uuid.UUID
    course_name: str
    course_code: str
    course_description: str | None
    course_credits: int
    
    # Informations de la session du cours
    course_session_id: uuid.UUID
    course_session_year_level: int
    course_session_classroom: str | None
    
    # Informations de la session académique
    session_name: str
    session_code: str
    session_start_date: date
    session_end_date: date
    
    # Informations du professeur
    teacher_name: str | None
    teacher_email: str | None
    
    # Informations du programme
    program_name: str | None
    program_level_name: str | None


class GradesWithCourseInfo(SQLModel):
    """Liste de notes enrichies."""
    data: list[GradeWithCourseInfo]
    count: int


class CourseStatistics(SQLModel):
    """Statistiques d'un cours spécifique."""
    average_score: float | None
    weighted_average: float | None
    highest_score: float | None
    lowest_score: float | None
    final_grade: str | None
    gpa: float | None
    passing_count: int
    failing_count: int
    total_assessments: int
    is_completed: bool


class CourseGradeStatistics(CourseStatistics):
    """Statistiques détaillées pour un cours."""
    total_sessions: int


class CourseStatisticsWithInfo(SQLModel):
    """Statistiques d'un cours avec informations descriptives."""
    course_id: uuid.UUID
    course_name: str
    course_code: str
    credits: int
    teacher_name: str | None
    statistics: CourseStatistics


class GradeStatistics(SQLModel):
    """Statistiques globales des notes."""
    total_assessments: int
    graded_assessments: int
    average_score: float
    highest_score: float
    lowest_score: float
    gpa: float | None = None
    letter_grade: str | None = None
    is_passing: bool


class GradeWithAssessment(SQLModel):
    id: uuid.UUID
    score: float
    max_score: float
    weight: float
    assessment_name: str
    assessment_type: str
    exam_type: str
    graded_date: date | None
    is_passing: bool


class CourseGradeSummary(SQLModel):
    course_id: uuid.UUID
    course_name: str
    course_code: str
    course_credits: int
    course_description: str | None = None
    teacher_name: str | None = None
    teacher_email: str | None = None
    session_name: str | None = None
    session_year: int | None = None
    session_semester: int | None = None
    program_name: str | None = None
    program_degree: str | None = None
    grades: list[GradeWithAssessment] = []
    course_statistics: CourseStatistics | None = None


class StudentInfo(SQLModel):
    student_id: uuid.UUID
    student_number: str
    student_name: str
    program_name: str | None = None


class LevelStatistics(SQLModel):
    total_credits: int
    earned_credits: int
    average_score: float | None
    gpa: float | None
    is_passing: bool


class StudentGradesSummaryByLevel(SQLModel):
    student_info: StudentInfo
    year_level: int
    courses: list[CourseGradeSummary]
    level_statistics: LevelStatistics
    total_courses: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class StudentTranscript(SQLModel):
    """Bulletin académique complet."""
    student: "StudentPublic"
    program: Optional[dict] = None
    total_credits_earned: int = 0
    gpa: float = 0.0
    enrollments: list[dict] = []
    generated_at: date = Field(default_factory=date.today)


class StudentGradesSummaryBySession(SQLModel):
    student_info: StudentInfo
    session_id: uuid.UUID
    session_name: str | None = None
    courses: list[CourseGradeSummary]
    level_statistics: LevelStatistics
    total_courses: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class StudentGradesSummaryByCourse(SQLModel):
    student_info: StudentInfo
    course_id: uuid.UUID
    course: CourseGradeSummary
    generated_at: datetime = Field(default_factory=datetime.utcnow)
