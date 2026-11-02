import uuid
from datetime import datetime, date
from typing import Optional

from sqlmodel import Session

from app.models.grade import (
    Grade,
    GradeCreate,
    GradeUpdate,
    GradeStatistics,
    StudentTranscript,
    CourseGradeStatistics,
    GradeWithCourseInfo,
    GradesWithCourseInfo,
    CourseStatisticsWithInfo,
)
from app.repositories.grade_repository import GradeRepository
from app.repositories.student_repository import StudentRepository
from app.services.base_service import BaseService


class GradeService(BaseService[Grade, GradeRepository]):
    """Service pour la gestion des notes."""

    def __init__(self, session: Session):
        repository = GradeRepository(session)
        super().__init__(repository)
        self.student_repository = StudentRepository(session)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        student_query: Optional[str] = None,
        assessment_query: Optional[str] = None,
        exam_type: Optional[str] = None,
        is_published: Optional[bool] = None,
    ) -> list[Grade]:
        """Récupère toutes les notes avec filtres."""
        return self.repository.get_all(
            skip=skip,
            limit=limit,
            student_query=student_query,
            assessment_query=assessment_query,
            exam_type=exam_type,
            is_published=is_published,
        )

    def count_grades(
        self,
        student_query: Optional[str] = None,
        assessment_query: Optional[str] = None,
        exam_type: Optional[str] = None,
        is_published: Optional[bool] = None,
    ) -> int:
        """Compte les notes avec filtres."""
        return self.repository.count_grades(
            student_query=student_query,
            assessment_query=assessment_query,
            exam_type=exam_type,
            is_published=is_published,
        )

    def create_grade(self, grade_create: GradeCreate) -> Grade:
        """Crée une nouvelle note avec validations."""
        # Vérifier si une note existe déjà
        if self.repository.exists_grade(
            grade_create.student_id,
            grade_create.assessment_id
        ):
            raise ValueError(
                "A grade already exists for this student and assessment"
            )

        # Calculer la lettre et les points
        grade_create_dict = grade_create.model_dump()
        grade_create_dict['letter_grade'] = self._calculate_letter_grade(
            grade_create.score
        )
        grade_create_dict['grade_points'] = self._calculate_grade_points(
            grade_create.score
        )
        grade_create_dict['is_passing'] = grade_create.score >= 60.0
        grade_create_dict['graded_date'] = date.today()

        # Créer la note
        grade = Grade.model_validate(grade_create_dict)
        created_grade = self.repository.create(grade)
        
        # Mettre à jour le GPA de l'étudiant
        self._update_student_gpa(grade_create.student_id)
        
        return created_grade

    def update_grade(
        self, grade_id: uuid.UUID, grade_update: GradeUpdate
    ) -> Optional[Grade]:
        """Met à jour une note avec validations."""
        grade = self.repository.get_by_id(grade_id)
        if not grade:
            return None

        # Recalculer la lettre et les points si le score change
        if grade_update.score is not None:
            grade_update.letter_grade = self._calculate_letter_grade(
                grade_update.score
            )
            grade_update.grade_points = self._calculate_grade_points(
                grade_update.score
            )
            grade_update.is_passing = grade_update.score >= 60.0

        grade_update.updated_at = datetime.utcnow()
        updated_grade = self.repository.update(grade_id, grade_update)
        
        # Mettre à jour le GPA de l'étudiant
        if updated_grade:
            self._update_student_gpa(updated_grade.student_id)
        
        return updated_grade

    def _calculate_letter_grade(self, score: float) -> str:
        """Calcule la note en lettre selon le score."""
        if score >= 93: return "A"
        elif score >= 90: return "A-"
        elif score >= 87: return "B+"
        elif score >= 83: return "B"
        elif score >= 80: return "B-"
        elif score >= 77: return "C+"
        elif score >= 73: return "C"
        elif score >= 70: return "C-"
        elif score >= 67: return "D+"
        elif score >= 63: return "D"
        elif score >= 60: return "D-"
        else: return "F"

    def _calculate_grade_points(self, score: float) -> float:
        """Calcule les points GPA selon le score."""
        if score >= 93: return 4.0
        elif score >= 90: return 3.7
        elif score >= 87: return 3.3
        elif score >= 83: return 3.0
        elif score >= 80: return 2.7
        elif score >= 77: return 2.3
        elif score >= 73: return 2.0
        elif score >= 70: return 1.7
        elif score >= 67: return 1.3
        elif score >= 63: return 1.0
        elif score >= 60: return 0.7
        else: return 0.0

    def _update_student_gpa(self, student_id: uuid.UUID) -> None:
        """Met à jour le GPA d'un étudiant."""
        # Récupérer toutes les notes de l'étudiant
        grades = self.repository.get_by_student(student_id)
        
        if not grades:
            return
        
        # Calculer le GPA moyen
        total_points = sum(g.grade_points for g in grades if g.grade_points)
        count = len([g for g in grades if g.grade_points])
        
        if count > 0:
            gpa = total_points / count
            self.student_repository.update_gpa(student_id, round(gpa, 2))

    def get_by_student(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'un étudiant."""
        return self.repository.get_by_student(student_id, skip, limit)

    def get_by_enrollment(
        self, enrollment_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'une inscription."""
        return self.repository.get_by_enrollment(enrollment_id, skip, limit)

    def get_by_assessment(
        self, assessment_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'une évaluation."""
        return self.repository.get_by_assessment(assessment_id, skip, limit)

    def get_published_grades(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes publiées d'un étudiant."""
        return self.repository.get_published_grades(student_id, skip, limit)

    def publish_grade(self, grade_id: uuid.UUID) -> Optional[Grade]:
        """Publie une note."""
        update = GradeUpdate(is_published=True, updated_at=datetime.utcnow())
        return self.repository.update(grade_id, update)

    def unpublish_grade(self, grade_id: uuid.UUID) -> Optional[Grade]:
        """Dépublie une note."""
        update = GradeUpdate(is_published=False, updated_at=datetime.utcnow())
        return self.repository.update(grade_id, update)

    def get_enrollment_statistics(
        self, enrollment_id: uuid.UUID
    ) -> GradeStatistics:
        """Récupère les statistiques pour une inscription."""
        stats = self.repository.calculate_enrollment_average(enrollment_id)
        grades = self.repository.get_by_enrollment(enrollment_id)
        
        if not grades:
            return GradeStatistics(
                total_assessments=0,
                graded_assessments=0,
                average_score=0.0,
                highest_score=0.0,
                lowest_score=0.0,
                gpa=0.0,
                letter_grade="N/A",
                is_passing=False
            )
        
        scores = [g.score for g in grades]
        weighted_avg = stats['weighted_average']
        
        return GradeStatistics(
            total_assessments=len(grades),
            graded_assessments=stats['grades_count'],
            average_score=stats['average'],
            highest_score=max(scores),
            lowest_score=min(scores),
            gpa=self._calculate_grade_points(weighted_avg),
            letter_grade=self._calculate_letter_grade(weighted_avg),
            is_passing=weighted_avg >= 60.0
        )

    def get_by_student_and_year_level(
        self, student_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'un étudiant pour un niveau d'année spécifique."""
        return self.repository.get_by_student_and_year_level(
            student_id, year_level, skip, limit
        )

    def count_by_student_and_year_level(
        self, student_id: uuid.UUID, year_level: int
    ) -> int:
        """Compte les notes d'un étudiant pour un niveau d'année spécifique."""
        return self.repository.count_by_student_and_year_level(student_id, year_level)

    def get_year_level_statistics(
        self, student_id: uuid.UUID, year_level: int
    ) -> GradeStatistics:
        """Récupère les statistiques d'un étudiant pour un niveau d'année."""
        stats = self.repository.get_year_level_statistics(student_id, year_level)
        
        if stats['total_assessments'] == 0:
            return GradeStatistics(
                total_assessments=0,
                graded_assessments=0,
                average_score=0.0,
                highest_score=0.0,
                lowest_score=0.0,
                gpa=0.0,
                letter_grade="N/A",
                is_passing=False
            )
        
        weighted_avg = stats['weighted_average']
        
        return GradeStatistics(
            total_assessments=stats['total_assessments'],
            graded_assessments=stats['total_assessments'],
            average_score=stats['average_score'],
            highest_score=stats['highest_score'],
            lowest_score=stats['lowest_score'],
            gpa=stats['gpa'],
            letter_grade=self._calculate_letter_grade(weighted_avg),
            is_passing=weighted_avg >= 60.0
        )

    def get_by_student_and_session(
        self, student_id: uuid.UUID, session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'un étudiant pour une session spécifique."""
        return self.repository.get_by_student_and_session(
            student_id, session_id, skip, limit
        )

    def count_by_student_and_session(
        self, student_id: uuid.UUID, session_id: uuid.UUID
    ) -> int:
        """Compte les notes d'un étudiant pour une session spécifique."""
        return self.repository.count_by_student_and_session(student_id, session_id)

    def get_session_statistics(
        self, student_id: uuid.UUID, session_id: uuid.UUID
    ) -> GradeStatistics:
        """Récupère les statistiques d'un étudiant pour une session."""
        stats = self.repository.get_session_statistics(student_id, session_id)
        
        if stats['total_assessments'] == 0:
            return GradeStatistics(
                total_assessments=0,
                graded_assessments=0,
                average_score=0.0,
                highest_score=0.0,
                lowest_score=0.0,
                gpa=0.0,
                letter_grade="N/A",
                is_passing=False
            )
        
        weighted_avg = stats['weighted_average']
        
        return GradeStatistics(
            total_assessments=stats['total_assessments'],
            graded_assessments=stats['total_assessments'],
            average_score=stats['average_score'],
            highest_score=stats['highest_score'],
            lowest_score=stats['lowest_score'],
            gpa=stats['gpa'],
            letter_grade=self._calculate_letter_grade(weighted_avg),
            is_passing=weighted_avg >= 60.0
        )

    def get_by_student_and_course(
        self, student_id: uuid.UUID, course_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'un étudiant pour un cours spécifique."""
        return self.repository.get_by_student_and_course(
            student_id, course_id, skip, limit
        )

    def count_by_student_and_course(
        self, student_id: uuid.UUID, course_id: uuid.UUID
    ) -> int:
        """Compte les notes d'un étudiant pour un cours spécifique."""
        return self.repository.count_by_student_and_course(student_id, course_id)

    def get_course_statistics(
        self, student_id: uuid.UUID, course_id: uuid.UUID
    ) -> CourseGradeStatistics:
        """Récupère les statistiques d'un étudiant pour un cours."""
        stats = self.repository.get_course_statistics(student_id, course_id)
        
        return CourseGradeStatistics(
            total_sessions=stats['total_sessions'],
            total_assessments=stats['total_assessments'],
            average_score=stats['average_score'],
            weighted_average=stats['weighted_average'],
            highest_score=stats['highest_score'],
            lowest_score=stats['lowest_score'],
            final_grade=stats['final_grade'],
            gpa=stats['gpa'],
            passing_count=stats['passing_count'],
            failing_count=stats['failing_count'],
            is_completed=stats['is_completed']
        )

    def get_by_student_and_year_level_with_course_info(
        self, student_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> GradesWithCourseInfo:
        """Récupère les notes d'un étudiant pour un niveau avec infos complètes du cours."""
        enriched_grades_data = self.repository.get_by_student_and_year_level_with_course_info(
            student_id, year_level, skip, limit
        )
        
        # Convertir en objets GradeWithCourseInfo
        grades_with_info = []
        for data in enriched_grades_data:
            grade_with_info = GradeWithCourseInfo(**data)
            grades_with_info.append(grade_with_info)
        
        # Compter le total
        total_count = self.repository.count_by_student_and_year_level(student_id, year_level)
        
        return GradesWithCourseInfo(data=grades_with_info, count=total_count)

    def get_by_student_and_session_with_course_info(
        self, student_id: uuid.UUID, session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> GradesWithCourseInfo:
        """Récupère les notes d'un étudiant pour une session avec infos complètes du cours."""
        enriched_grades_data = self.repository.get_by_student_and_session_with_course_info(
            student_id, session_id, skip, limit
        )
        
        # Convertir en objets GradeWithCourseInfo
        grades_with_info = []
        for data in enriched_grades_data:
            grade_with_info = GradeWithCourseInfo(**data)
            grades_with_info.append(grade_with_info)
        
        # Compter le total
        total_count = self.repository.count_by_student_and_session(student_id, session_id)
        
        return GradesWithCourseInfo(data=grades_with_info, count=total_count)

    def get_by_student_and_course_with_course_info(
        self, student_id: uuid.UUID, course_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> GradesWithCourseInfo:
        """Récupère les notes d'un étudiant pour un cours avec infos complètes."""
        enriched_grades_data = self.repository.get_by_student_and_course_with_course_info(
            student_id, course_id, skip, limit
        )
        
        # Convertir en objets GradeWithCourseInfo
        grades_with_info = []
        for data in enriched_grades_data:
            grade_with_info = GradeWithCourseInfo(**data)
            grades_with_info.append(grade_with_info)
        
        # Compter le total
        total_count = self.repository.count_by_student_and_course(student_id, course_id)
        
        return GradesWithCourseInfo(data=grades_with_info, count=total_count)

    def get_assessment_statistics(self, assessment_id: uuid.UUID) -> dict:
        """Récupère les statistiques d'une évaluation."""
        return self.repository.get_assessment_statistics(assessment_id)

    def get_student_transcript(
        self, student_id: uuid.UUID
    ) -> StudentTranscript:
        """Génère le relevé de notes complet d'un étudiant."""
        from app.models.enrollment import Enrollment
        from app.models.course_session import CourseSession
        from app.models.course import Course
        
        student = self.student_repository.get_by_id(student_id)
        if not student:
            raise ValueError("Student not found")
        
        # Récupérer toutes les inscriptions
        from app.repositories.enrollment_repository import EnrollmentRepository
        enrollment_repo = EnrollmentRepository(self.repository.session)
        enrollments = enrollment_repo.get_by_student(student_id)
        
        # Construire les données du relevé
        enrollments_data = []
        for enrollment in enrollments:
            grades = self.repository.get_by_enrollment(enrollment.id)
            stats = self.repository.calculate_enrollment_average(enrollment.id)
            
            enrollments_data.append({
                "enrollment_id": str(enrollment.id),
                "course_session_id": str(enrollment.course_session_id),
                "status": enrollment.status,
                "grades": [
                    {
                        "score": g.score,
                        "letter_grade": g.letter_grade,
                        "assessment_name": g.assessment.name if hasattr(g, 'assessment') else "N/A"
                    }
                    for g in grades
                ],
                "average": stats['average'],
                "weighted_average": stats['weighted_average'],
                "final_grade": self._calculate_letter_grade(stats['weighted_average'])
            })
        
        return StudentTranscript(
            student=student,
            program=student.program,
            total_credits_earned=student.total_credits_earned,
            gpa=student.gpa or 0.0,
            enrollments=enrollments_data
        )

    def get_student_grades_summary_by_level(
        self, student_id: uuid.UUID, year_level: int
    ):
        """
        Récupère le résumé complet des notes d'un étudiant pour un niveau donné,
        agrégé par cours avec informations de l'étudiant.
        """
        from app.models.grade import (
            StudentGradesSummaryByLevel, 
            StudentInfo, 
            CourseGradeSummary, 
            LevelStatistics, 
            CourseStatistics,
            GradeWithAssessment
        )
        
        # Utiliser la méthode du repository avec requête native
        raw_data = self.repository.get_student_grades_summary_by_level_native(
            student_id, year_level
        )
        
        if not raw_data:
            return None
        
        # Convertir en objets Pydantic pour validation et sérialisation
        student_info = StudentInfo(**raw_data["student_info"])
        
        # Convertir les cours et leurs statistiques
        courses = []
        for course_data in raw_data["courses"]:
            # Convertir les notes du cours
            grades = [GradeWithAssessment(**grade_data) for grade_data in course_data["grades"]]
            
            # Convertir les statistiques du cours
            course_stats = CourseStatistics(**course_data["course_statistics"])
            
            # Créer l'objet cours complet
            course_summary = CourseGradeSummary(
                course_id=course_data["course_id"],
                course_name=course_data["course_name"],
                course_code=course_data["course_code"],
                course_credits=course_data["course_credits"],
                course_description=course_data["course_description"],
                teacher_name=course_data["teacher_name"],
                teacher_email=course_data["teacher_email"],
                session_name=course_data["session_name"],
                session_year=course_data["session_year"],
                session_semester=course_data["session_semester"],
                program_name=course_data["program_name"],
                program_degree=course_data["program_degree"],
                grades=grades,
                course_statistics=course_stats
            )
            courses.append(course_summary)
        
        # Convertir les statistiques du niveau
        level_stats = LevelStatistics(**raw_data["level_statistics"])
        
        # Créer la réponse finale
        summary = StudentGradesSummaryByLevel(
            student_info=student_info,
            year_level=raw_data["year_level"],
            courses=courses,
            level_statistics=level_stats,
            total_courses=raw_data["total_courses"],
            generated_at=raw_data["generated_at"]
        )
        
        return summary

    def get_student_grades_summary_by_session(
        self, student_id: uuid.UUID, session_id: uuid.UUID
    ):
        """
        Récupère le résumé complet des notes d'un étudiant pour une session donnée,
        agrégé par cours avec informations de l'étudiant.
        """
        from app.models.grade import (
            StudentGradesSummaryBySession,
            StudentInfo,
            CourseGradeSummary,
            LevelStatistics,
            CourseStatistics,
            GradeWithAssessment
        )
        
        raw_data = self.repository.get_student_grades_summary_by_session_native(
            student_id, session_id
        )
        
        if not raw_data:
            return None
        
        # Convertir en objets Pydantic
        student_info = StudentInfo(**raw_data["student_info"])
        
        courses = []
        for course_data in raw_data["courses"]:
            grades = [GradeWithAssessment(**grade_data) for grade_data in course_data["grades"]]
            course_stats = CourseStatistics(**course_data["course_statistics"])
            
            course_summary = CourseGradeSummary(
                course_id=course_data["course_id"],
                course_name=course_data["course_name"],
                course_code=course_data["course_code"],
                course_credits=course_data["course_credits"],
                course_description=course_data["course_description"],
                teacher_name=course_data["teacher_name"],
                teacher_email=course_data["teacher_email"],
                session_name=course_data["session_name"],
                session_year=course_data["session_year"],
                session_semester=course_data["session_semester"],
                program_name=course_data["program_name"],
                program_degree=course_data["program_degree"],
                grades=grades,
                course_statistics=course_stats
            )
            courses.append(course_summary)
        
        level_stats = LevelStatistics(**raw_data["level_statistics"])
        
        summary = StudentGradesSummaryBySession(
            student_info=student_info,
            session_id=raw_data["context"]["session_id"],
            courses=courses,
            level_statistics=level_stats,
            total_courses=raw_data["total_courses"],
            generated_at=raw_data["generated_at"]
        )
        
        return summary

    def get_student_grades_summary_by_course(
        self, student_id: uuid.UUID, course_id: uuid.UUID
    ):
        """
        Récupère le résumé complet des notes d'un étudiant pour un cours donné,
        avec informations de l'étudiant et statistiques détaillées du cours.
        """
        from app.models.grade import (
            StudentGradesSummaryByCourse,
            StudentInfo,
            CourseGradeSummary,
            CourseStatistics,
            GradeWithAssessment
        )
        
        raw_data = self.repository.get_student_grades_summary_by_course_native(
            student_id, course_id
        )
        
        if not raw_data:
            return None
        
        # Convertir en objets Pydantic
        student_info = StudentInfo(**raw_data["student_info"])
        
        # Pour un cours spécifique, on aura normalement un seul cours
        course_data = raw_data["courses"][0] if raw_data["courses"] else None
        
        if not course_data:
            return None
        
        grades = [GradeWithAssessment(**grade_data) for grade_data in course_data["grades"]]
        course_stats = CourseStatistics(**course_data["course_statistics"])
        
        course_summary = CourseGradeSummary(
            course_id=course_data["course_id"],
            course_name=course_data["course_name"],
            course_code=course_data["course_code"],
            course_credits=course_data["course_credits"],
            course_description=course_data["course_description"],
    
            teacher_email=course_data["teacher_email"],
            session_name=course_data["session_name"],
            session_year=course_data["session_year"],
            session_semester=course_data["session_semester"],
            program_name=course_data["program_name"],
            program_degree=course_data["program_degree"],
            grades=grades,
            course_statistics=course_stats
        )
        
        summary = StudentGradesSummaryByCourse(
            student_info=student_info,
            course_id=raw_data["context"]["course_id"],
            course=course_summary,
            generated_at=raw_data["generated_at"]
        )
        
        return summary