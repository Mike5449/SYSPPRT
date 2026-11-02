"""
Initialisation du package repositories.
Regroupe tous les repositories pour l'accès aux données.
"""

# Repositories pour les vues académiques
from app.repositories.student_grade_view_repository import StudentGradeViewRepository
from app.repositories.student_attendance_view_repository import StudentAttendanceViewRepository
from app.repositories.student_courses_view_repository import StudentCoursesViewRepository
from app.repositories.student_assessments_view_repository import StudentAssessmentsViewRepository

__all__ = [
    "StudentGradeViewRepository", 
    "StudentAttendanceViewRepository",
    "StudentCoursesViewRepository",
    "StudentAssessmentsViewRepository",
]