import uuid
from typing import Optional
from datetime import datetime

from sqlmodel import Session, select, func

from app.models.grade import Grade
from app.repositories.base_repository import BaseRepository


class GradeRepository(BaseRepository[Grade]):
    """Repository pour la gestion des notes."""

    def __init__(self, session: Session):
        super().__init__(Grade, session)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        student_query: Optional[str] = None,
        assessment_query: Optional[str] = None,
        exam_type: Optional[str] = None,
        is_published: Optional[bool] = None,
    ) -> list[Grade]:
        """Récupère les notes avec filtres de recherche."""
        from app.models.student import Student
        from app.models.user import User
        from app.models.assessment import Assessment

        statement = select(Grade)

        if student_query or assessment_query or exam_type:
            statement = statement.join(Assessment, Grade.assessment_id == Assessment.id)
            statement = statement.join(Student, Grade.student_id == Student.id)
            statement = statement.join(User, Student.user_id == User.id)

            if student_query:
                statement = statement.where(
                    (User.first_name.ilike(f"%{student_query}%")) |
                    (User.last_name.ilike(f"%{student_query}%")) |
                    (User.user_number.ilike(f"%{student_query}%"))
                )
            
            if assessment_query:
                statement = statement.where(Assessment.name.ilike(f"%{assessment_query}%"))
            
            if exam_type:
                statement = statement.where(Assessment.assessment_type == exam_type)
        
        if is_published is not None:
            statement = statement.where(Grade.is_published == is_published)

        statement = statement.offset(skip).limit(limit).order_by(Grade.created_at.desc())
        return list(self.session.exec(statement).all())

    def count_grades(
        self,
        student_query: Optional[str] = None,
        assessment_query: Optional[str] = None,
        exam_type: Optional[str] = None,
        is_published: Optional[bool] = None,
    ) -> int:
        """Compte les notes avec filtres de recherche."""
        from app.models.student import Student
        from app.models.user import User
        from app.models.assessment import Assessment

        statement = select(func.count(Grade.id)).select_from(Grade)

        if student_query or assessment_query or exam_type:
            statement = statement.join(Assessment, Grade.assessment_id == Assessment.id)
            statement = statement.join(Student, Grade.student_id == Student.id)
            statement = statement.join(User, Student.user_id == User.id)

            if student_query:
                statement = statement.where(
                    (User.first_name.ilike(f"%{student_query}%")) |
                    (User.last_name.ilike(f"%{student_query}%")) |
                    (User.user_number.ilike(f"%{student_query}%"))
                )
            
            if assessment_query:
                statement = statement.where(Assessment.name.ilike(f"%{assessment_query}%"))
            
            if exam_type:
                statement = statement.where(Assessment.assessment_type == exam_type)
        
        if is_published is not None:
            statement = statement.where(Grade.is_published == is_published)

        return self.session.exec(statement).one()

    def get_by_student(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère toutes les notes d'un étudiant."""
        statement = (
            select(Grade)
            .where(Grade.student_id == student_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_enrollment(
        self, enrollment_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère toutes les notes d'une inscription."""
        statement = (
            select(Grade)
            .where(Grade.enrollment_id == enrollment_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_assessment(
        self, assessment_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère toutes les notes d'une évaluation."""
        statement = (
            select(Grade)
            .where(Grade.assessment_id == assessment_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_student_and_assessment(
        self, student_id: uuid.UUID, assessment_id: uuid.UUID
    ) -> Optional[Grade]:
        """Récupère la note d'un étudiant pour une évaluation."""
        statement = select(Grade).where(
            Grade.student_id == student_id,
            Grade.assessment_id == assessment_id
        )
        return self.session.exec(statement).first()

    def get_published_grades(
        self, student_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes publiées d'un étudiant."""
        statement = (
            select(Grade)
            .where(
                Grade.student_id == student_id,
                Grade.is_published == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def exists_grade(
        self, student_id: uuid.UUID, assessment_id: uuid.UUID,
        exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si une note existe."""
        statement = select(Grade).where(
            Grade.student_id == student_id,
            Grade.assessment_id == assessment_id
        )
        
        if exclude_id:
            statement = statement.where(Grade.id != exclude_id)
        
        return self.session.exec(statement).first() is not None

    def calculate_enrollment_average(self, enrollment_id: uuid.UUID) -> dict:
        """Calcule la moyenne pondérée pour une inscription."""
        from app.models.assessment import Assessment
        
        # Récupérer toutes les notes avec leurs poids
        statement = (
            select(Grade, Assessment.weight)
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .where(
                Grade.enrollment_id == enrollment_id,
                Grade.is_published == True
            )
        )
        
        results = list(self.session.exec(statement).all())
        
        if not results:
            return {
                "average": 0.0,
                "weighted_average": 0.0,
                "total_weight": 0.0,
                "grades_count": 0
            }
        
        total_score = 0.0
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for grade, weight in results:
            total_score += grade.score
            total_weighted_score += grade.score * weight
            total_weight += weight
        
        average = total_score / len(results) if results else 0.0
        weighted_average = total_weighted_score / total_weight if total_weight > 0 else 0.0
        
        return {
            "average": round(average, 2),
            "weighted_average": round(weighted_average, 2),
            "total_weight": round(total_weight, 2),
            "grades_count": len(results)
        }

    def get_by_student_and_year_level(
        self, student_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'un étudiant pour un niveau d'année spécifique."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        
        statement = (
            select(Grade)
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.year_level == year_level
            )
            .offset(skip)
            .limit(limit)
            .order_by(Grade.created_at.desc())
        )
        return list(self.session.exec(statement).all())

    def count_by_student_and_year_level(
        self, student_id: uuid.UUID, year_level: int
    ) -> int:
        """Compte les notes d'un étudiant pour un niveau d'année spécifique."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        
        statement = (
            select(func.count(Grade.id))
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.year_level == year_level
            )
        )
        return self.session.exec(statement).one()

    def get_by_student_and_session(
        self, student_id: uuid.UUID, session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'un étudiant pour une session spécifique."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        
        statement = (
            select(Grade)
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.session_id == session_id
            )
            .offset(skip)
            .limit(limit)
            .order_by(Grade.created_at.desc())
        )
        return list(self.session.exec(statement).all())

    def count_by_student_and_session(
        self, student_id: uuid.UUID, session_id: uuid.UUID
    ) -> int:
        """Compte les notes d'un étudiant pour une session spécifique."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        
        statement = (
            select(func.count(Grade.id))
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.session_id == session_id
            )
        )
        return self.session.exec(statement).one()

    def get_session_statistics(
        self, student_id: uuid.UUID, session_id: uuid.UUID
    ) -> dict:
        """Calcule les statistiques pour un étudiant dans une session donnée."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        
        # Récupérer toutes les notes avec poids pour cette session
        statement = (
            select(Grade, Assessment.weight)
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.session_id == session_id,
                Grade.is_published == True
            )
        )
        
        results = list(self.session.exec(statement).all())
        
        if not results:
            return {
                "total_courses": 0,
                "total_assessments": 0,
                "average_score": 0.0,
                "weighted_average": 0.0,
                "highest_score": 0.0,
                "lowest_score": 0.0,
                "gpa": 0.0,
                "passing_count": 0,
                "failing_count": 0
            }
        
        scores = [grade.score for grade, _ in results]
        total_score = sum(scores)
        total_weighted_score = 0.0
        total_weight = 0.0
        passing_count = 0
        
        for grade, weight in results:
            total_weighted_score += grade.score * weight
            total_weight += weight
            if grade.is_passing:
                passing_count += 1
        
        average = total_score / len(results)
        weighted_average = total_weighted_score / total_weight if total_weight > 0 else average
        
        # Compter les cours uniques dans cette session
        unique_course_sessions = set()
        for grade, _ in results:
            assessment_statement = select(Assessment).where(Assessment.id == grade.assessment_id)
            assessment = self.session.exec(assessment_statement).first()
            if assessment:
                unique_course_sessions.add(assessment.course_session_id)
        
        return {
            "total_courses": len(unique_course_sessions),
            "total_assessments": len(results),
            "average_score": round(average, 2),
            "weighted_average": round(weighted_average, 2),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "gpa": round(weighted_average / 25, 2) if weighted_average > 0 else 0.0,
            "passing_count": passing_count,
            "failing_count": len(results) - passing_count
        }

    def get_by_student_and_course(
        self, student_id: uuid.UUID, course_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Grade]:
        """Récupère les notes d'un étudiant pour un cours spécifique."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        
        statement = (
            select(Grade)
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .where(
                Grade.student_id == student_id,
                CourseProgramLevel.course_id == course_id
            )
            .offset(skip)
            .limit(limit)
            .order_by(Grade.created_at.desc())
        )
        return list(self.session.exec(statement).all())

    def count_by_student_and_course(
        self, student_id: uuid.UUID, course_id: uuid.UUID
    ) -> int:
        """Compte les notes d'un étudiant pour un cours spécifique."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        
        statement = (
            select(func.count(Grade.id))
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .where(
                Grade.student_id == student_id,
                CourseProgramLevel.course_id == course_id
            )
        )
        return self.session.exec(statement).one()

    def get_course_statistics(
        self, student_id: uuid.UUID, course_id: uuid.UUID
    ) -> dict:
        """Calcule les statistiques pour un étudiant dans un cours donné."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        
        # Récupérer toutes les notes avec poids pour ce cours
        statement = (
            select(Grade, Assessment.weight)
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .where(
                Grade.student_id == student_id,
                CourseProgramLevel.course_id == course_id,
                Grade.is_published == True
            )
        )
        
        results = list(self.session.exec(statement).all())
        
        if not results:
            return {
                "total_sessions": 0,
                "total_assessments": 0,
                "average_score": 0.0,
                "weighted_average": 0.0,
                "highest_score": 0.0,
                "lowest_score": 0.0,
                "final_grade": "N/A",
                "gpa": 0.0,
                "passing_count": 0,
                "failing_count": 0,
                "is_completed": False
            }
        
        scores = [grade.score for grade, _ in results]
        total_score = sum(scores)
        total_weighted_score = 0.0
        total_weight = 0.0
        passing_count = 0
        
        for grade, weight in results:
            total_weighted_score += grade.score * weight
            total_weight += weight
            if grade.is_passing:
                passing_count += 1
        
        average = total_score / len(results)
        weighted_average = total_weighted_score / total_weight if total_weight > 0 else average
        
        # Compter les sessions uniques pour ce cours
        unique_course_sessions = set()
        for grade, _ in results:
            assessment_statement = select(Assessment).where(Assessment.id == grade.assessment_id)
            assessment = self.session.exec(assessment_statement).first()
            if assessment:
                unique_course_sessions.add(assessment.course_session_id)
        
        return {
            "total_sessions": len(unique_course_sessions),
            "total_assessments": len(results),
            "average_score": round(average, 2),
            "weighted_average": round(weighted_average, 2),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "final_grade": self._calculate_letter_grade(weighted_average),
            "gpa": round(weighted_average / 25, 2) if weighted_average > 0 else 0.0,
            "passing_count": passing_count,
            "failing_count": len(results) - passing_count,
            "is_completed": weighted_average >= 60.0
        }

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

    def get_by_student_and_year_level_with_course_info(
        self, student_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[dict]:
        """Récupère les notes d'un étudiant pour un niveau avec infos complètes du cours."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        from app.models.course import Course
        from app.models.session import Session as SessionModel
        from app.models.program import Program
        from app.models.program_level import ProgramLevel
        from app.models.teacher import Teacher
        from app.models.user import User
        
        statement = (
            select(
                Grade,
                Assessment.name.label("assessment_name"),
                Assessment.assessment_type.label("assessment_type"),
                Assessment.max_score.label("assessment_max_score"),
                Assessment.weight.label("assessment_weight"),
                Assessment.due_date.label("assessment_due_date"),
                Course.id.label("course_id"),
                Course.name.label("course_name"),
                Course.code.label("course_code"),
                Course.description.label("course_description"),
                Course.credits.label("course_credits"),
                CourseSession.id.label("course_session_id"),
                CourseSession.year_level.label("course_session_year_level"),
                CourseSession.classroom.label("course_session_classroom"),
                SessionModel.name.label("session_name"),
                SessionModel.code.label("session_code"),
                SessionModel.start_date.label("session_start_date"),
                SessionModel.end_date.label("session_end_date"),
                User.first_name.label("teacher_first_name"),
                User.last_name.label("teacher_last_name"),
                User.email.label("teacher_email"),
                Program.name.label("program_name"),
                ProgramLevel.name.label("program_level_name")
            )
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .join(Course, CourseProgramLevel.course_id == Course.id)
            .join(ProgramLevel, CourseProgramLevel.program_level_id == ProgramLevel.id)
            .join(Program, ProgramLevel.program_id == Program.id)
            .join(SessionModel, CourseSession.session_id == SessionModel.id)
            .join(Teacher, CourseSession.teacher_id == Teacher.id)
            .join(User, Teacher.user_id == User.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.year_level == year_level
            )
            .offset(skip)
            .limit(limit)
            .order_by(Grade.created_at.desc())
        )
        
        results = list(self.session.exec(statement).all())
        
        # Transformer en dictionnaire pour faciliter l'usage
        enriched_grades = []
        for row in results:
            grade = row[0]  # Premier élément est l'objet Grade
            enriched_grade = {
                # Informations de la note
                "id": grade.id,
                "score": grade.score,
                "is_passing": grade.is_passing,
                "graded_date": grade.graded_date,
                "graded_by": grade.graded_by,
                "comments": grade.comments,
                "is_published": grade.is_published,
                "created_at": grade.created_at,
                "updated_at": grade.updated_at,
                
                # Informations de l'évaluation
                "assessment_name": row.assessment_name,
                "assessment_type": row.assessment_type,
                "assessment_max_score": row.assessment_max_score,
                "assessment_weight": row.assessment_weight,
                "assessment_due_date": row.assessment_due_date,
                
                # Informations du cours
                "course_id": row.course_id,
                "course_name": row.course_name,
                "course_code": row.course_code,
                "course_description": row.course_description,
                "course_credits": row.course_credits,
                
                # Informations de la session du cours
                "course_session_id": row.course_session_id,
                "course_session_year_level": row.course_session_year_level,
                "course_session_classroom": row.course_session_classroom,
                
                # Informations de la session académique
                "session_name": row.session_name,
                "session_code": row.session_code,
                "session_start_date": row.session_start_date,
                "session_end_date": row.session_end_date,
                
                # Informations du professeur
                "teacher_name": f"{row.teacher_first_name} {row.teacher_last_name}" if row.teacher_first_name else None,
                "teacher_email": row.teacher_email,
                
                # Informations du programme
                "program_name": row.program_name,
                "program_level_name": row.program_level_name
            }
            enriched_grades.append(enriched_grade)
        
        return enriched_grades

    def get_by_student_and_session_with_course_info(
        self, student_id: uuid.UUID, session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[dict]:
        """Récupère les notes d'un étudiant pour une session avec infos complètes du cours."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        from app.models.course import Course
        from app.models.session import Session as SessionModel
        from app.models.program import Program
        from app.models.program_level import ProgramLevel
        from app.models.teacher import Teacher
        from app.models.user import User
        
        statement = (
            select(
                Grade,
                Assessment.name.label("assessment_name"),
                Assessment.assessment_type.label("assessment_type"),
                Assessment.max_score.label("assessment_max_score"),
                Assessment.weight.label("assessment_weight"),
                Assessment.due_date.label("assessment_due_date"),
                Course.id.label("course_id"),
                Course.name.label("course_name"),
                Course.code.label("course_code"),
                Course.description.label("course_description"),
                Course.credits.label("course_credits"),
                CourseSession.id.label("course_session_id"),
                CourseSession.year_level.label("course_session_year_level"),
                CourseSession.classroom.label("course_session_classroom"),
                SessionModel.name.label("session_name"),
                SessionModel.code.label("session_code"),
                SessionModel.start_date.label("session_start_date"),
                SessionModel.end_date.label("session_end_date"),
                User.first_name.label("teacher_first_name"),
                User.last_name.label("teacher_last_name"),
                User.email.label("teacher_email"),
                Program.name.label("program_name"),
                ProgramLevel.name.label("program_level_name")
            )
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .join(Course, CourseProgramLevel.course_id == Course.id)
            .join(ProgramLevel, CourseProgramLevel.program_level_id == ProgramLevel.id)
            .join(Program, ProgramLevel.program_id == Program.id)
            .join(SessionModel, CourseSession.session_id == SessionModel.id)
            .join(Teacher, CourseSession.teacher_id == Teacher.id)
            .join(User, Teacher.user_id == User.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.session_id == session_id
            )
            .offset(skip)
            .limit(limit)
            .order_by(Grade.created_at.desc())
        )
        
        results = list(self.session.exec(statement).all())
        
        # Transformer en dictionnaire (même logique que year_level)
        enriched_grades = []
        for row in results:
            grade = row[0]
            enriched_grade = {
                # Informations de la note
                "id": grade.id,
                "score": grade.score,
                "is_passing": grade.is_passing,
                "graded_date": grade.graded_date,
                "graded_by": grade.graded_by,
                "comments": grade.comments,
                "is_published": grade.is_published,
                "created_at": grade.created_at,
                "updated_at": grade.updated_at,
                
                # Informations de l'évaluation
                "assessment_name": row.assessment_name,
                "assessment_type": row.assessment_type,
                "assessment_max_score": row.assessment_max_score,
                "assessment_weight": row.assessment_weight,
                "assessment_due_date": row.assessment_due_date,
                
                # Informations du cours
                "course_id": row.course_id,
                "course_name": row.course_name,
                "course_code": row.course_code,
                "course_description": row.course_description,
                "course_credits": row.course_credits,
                
                # Informations de la session du cours
                "course_session_id": row.course_session_id,
                "course_session_year_level": row.course_session_year_level,
                "course_session_classroom": row.course_session_classroom,
                
                # Informations de la session académique
                "session_name": row.session_name,
                "session_code": row.session_code,
                "session_start_date": row.session_start_date,
                "session_end_date": row.session_end_date,
                
                # Informations du professeur
                "teacher_name": f"{row.teacher_first_name} {row.teacher_last_name}" if row.teacher_first_name else None,
                "teacher_email": row.teacher_email,
                
                # Informations du programme
                "program_name": row.program_name,
                "program_level_name": row.program_level_name
            }
            enriched_grades.append(enriched_grade)
        
        return enriched_grades

    def get_by_student_and_course_with_course_info(
        self, student_id: uuid.UUID, course_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[dict]:
        """Récupère les notes d'un étudiant pour un cours avec infos complètes."""
        # Même logique mais filtré par course_id au lieu de year_level ou session_id
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        from app.models.course_program_level import CourseProgramLevel
        from app.models.course import Course
        from app.models.session import Session as SessionModel
        from app.models.program import Program
        from app.models.program_level import ProgramLevel
        from app.models.teacher import Teacher
        from app.models.user import User
        
        statement = (
            select(
                Grade,
                Assessment.name.label("assessment_name"),
                Assessment.assessment_type.label("assessment_type"),
                Assessment.max_score.label("assessment_max_score"),
                Assessment.weight.label("assessment_weight"),
                Assessment.due_date.label("assessment_due_date"),
                Course.id.label("course_id"),
                Course.name.label("course_name"),
                Course.code.label("course_code"),
                Course.description.label("course_description"),
                Course.credits.label("course_credits"),
                CourseSession.id.label("course_session_id"),
                CourseSession.year_level.label("course_session_year_level"),
                CourseSession.classroom.label("course_session_classroom"),
                SessionModel.name.label("session_name"),
                SessionModel.code.label("session_code"),
                SessionModel.start_date.label("session_start_date"),
                SessionModel.end_date.label("session_end_date"),
                User.first_name.label("teacher_first_name"),
                User.last_name.label("teacher_last_name"),
                User.email.label("teacher_email"),
                Program.name.label("program_name"),
                ProgramLevel.name.label("program_level_name")
            )
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)
            .join(Course, CourseProgramLevel.course_id == Course.id)
            .join(ProgramLevel, CourseProgramLevel.program_level_id == ProgramLevel.id)
            .join(Program, ProgramLevel.program_id == Program.id)
            .join(SessionModel, CourseSession.session_id == SessionModel.id)
            .join(Teacher, CourseSession.teacher_id == Teacher.id)
            .join(User, Teacher.user_id == User.id)
            .where(
                Grade.student_id == student_id,
                CourseProgramLevel.course_id == course_id
            )
            .offset(skip)
            .limit(limit)
            .order_by(Grade.created_at.desc())
        )
        
        results = list(self.session.exec(statement).all())
        
        # Transformer en dictionnaire (même logique)
        enriched_grades = []
        for row in results:
            grade = row[0]
            enriched_grade = {
                # Informations de la note
                "id": grade.id,
                "score": grade.score,
                "is_passing": grade.is_passing,
                "graded_date": grade.graded_date,
                "graded_by": grade.graded_by,
                "comments": grade.comments,
                "is_published": grade.is_published,
                "created_at": grade.created_at,
                "updated_at": grade.updated_at,
                
                # Informations de l'évaluation
                "assessment_name": row.assessment_name,
                "assessment_type": row.assessment_type,
                "assessment_max_score": row.assessment_max_score,
                "assessment_weight": row.assessment_weight,
                "assessment_due_date": row.assessment_due_date,
                
                # Informations du cours
                "course_id": row.course_id,
                "course_name": row.course_name,
                "course_code": row.course_code,
                "course_description": row.course_description,
                "course_credits": row.course_credits,
                
                # Informations de la session du cours
                "course_session_id": row.course_session_id,
                "course_session_year_level": row.course_session_year_level,
                "course_session_classroom": row.course_session_classroom,
                
                # Informations de la session académique
                "session_name": row.session_name,
                "session_code": row.session_code,
                "session_start_date": row.session_start_date,
                "session_end_date": row.session_end_date,
                
                # Informations du professeur
                "teacher_name": f"{row.teacher_first_name} {row.teacher_last_name}" if row.teacher_first_name else None,
                "teacher_email": row.teacher_email,
                
                # Informations du programme
                "program_name": row.program_name,
                "program_level_name": row.program_level_name
            }
            enriched_grades.append(enriched_grade)
        
        return enriched_grades

    def get_year_level_statistics(
        self, student_id: uuid.UUID, year_level: int
    ) -> dict:
        """Calcule les statistiques pour un étudiant à un niveau d'année donné."""
        from app.models.assessment import Assessment
        from app.models.course_session import CourseSession
        
        # Récupérer toutes les notes avec poids pour ce niveau
        statement = (
            select(Grade, Assessment.weight)
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.year_level == year_level,
                Grade.is_published == True
            )
        )
        
        results = list(self.session.exec(statement).all())
        
        if not results:
            return {
                "total_courses": 0,
                "total_assessments": 0,
                "average_score": 0.0,
                "weighted_average": 0.0,
                "highest_score": 0.0,
                "lowest_score": 0.0,
                "gpa": 0.0,
                "passing_count": 0,
                "failing_count": 0
            }
        
        scores = [grade.score for grade, _ in results]
        total_score = sum(scores)
        total_weighted_score = 0.0
        total_weight = 0.0
        passing_count = 0
        
        for grade, weight in results:
            total_weighted_score += grade.score * weight
            total_weight += weight
            if grade.is_passing:
                passing_count += 1
        
        average = total_score / len(results)
        weighted_average = total_weighted_score / total_weight if total_weight > 0 else average
        
        # Compter les cours uniques via CourseSession
        unique_course_sessions = set()
        for grade, _ in results:
            # Récupérer l'assessment pour avoir le course_session_id
            assessment_statement = select(Assessment).where(Assessment.id == grade.assessment_id)
            assessment = self.session.exec(assessment_statement).first()
            if assessment:
                unique_course_sessions.add(assessment.course_session_id)
        
        return {
            "total_courses": len(unique_course_sessions),
            "total_assessments": len(results),
            "average_score": round(average, 2),
            "weighted_average": round(weighted_average, 2),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "gpa": round(weighted_average / 25, 2) if weighted_average > 0 else 0.0,  # Conversion simple
            "passing_count": passing_count,
            "failing_count": len(results) - passing_count
        }

    def get_assessment_statistics(self, assessment_id: uuid.UUID) -> dict:
        """Calcule les statistiques pour une évaluation."""
        statement = select(Grade).where(
            Grade.assessment_id == assessment_id,
            Grade.is_published == True
        )
        
        grades = list(self.session.exec(statement).all())
        
        if not grades:
            return {
                "count": 0,
                "average": 0.0,
                "highest": 0.0,
                "lowest": 0.0,
                "passing_count": 0,
                "failing_count": 0
            }
        
        scores = [g.score for g in grades]
        passing_count = sum(1 for g in grades if g.is_passing)
        
        return {
            "count": len(grades),
            "average": round(sum(scores) / len(scores), 2),
            "highest": max(scores),
            "lowest": min(scores),
            "passing_count": passing_count,
            "failing_count": len(grades) - passing_count
        }

    def get_student_grades_summary_by_level_native(
        self, student_id: uuid.UUID, year_level: int
    ) -> dict:
        """
        Récupère le résumé complet des notes d'un étudiant pour un niveau donné,
        agrégé par cours avec toutes les informations de l'étudiant.
        Utilise une requête native SQL pour optimiser les performances.
        """
        
        # Requête native SQL pour récupérer toutes les données nécessaires
        sql_query = """
        WITH student_data AS (
            -- Informations de l'étudiant
            SELECT 
                s.id as student_id,
                u.user_number as student_number,
                s.user_id,
                u.first_name,
                u.last_name,
                u.email,
                s.admission_date,
                s.status = 'active' as is_active,
                pl.name as program_level_name,
                p.name as program_name
            FROM student s
            JOIN public.user u ON s.user_id = u.id
            LEFT JOIN program_level pl ON s.program_level_id = pl.id
            LEFT JOIN program p ON pl.id = p.level_id
            WHERE s.id = :student_id
        ),
        course_grades AS (
            -- Notes avec informations des cours
            SELECT 
                c.id as course_id,
                c.name as course_name,
                c.code as course_code,
                c.credits as course_credits,
                c.description as course_description,
                
                -- Informations du professeur
                u_teacher.first_name || ' ' || u_teacher.last_name as teacher_name,
                u_teacher.email as teacher_email,
                
                -- Informations de la session
                sess.name as session_name,
                sess.start_date as session_start_date,
                sess.end_date as session_end_date,
                
                -- Informations du programme
                prog.name as program_name,
                prog.code as program_degree,
                
                -- Informations de la note et de l'évaluation
                g.id as grade_id,
                g.score,
                g.is_passing,
                g.graded_date,
                g.comments,
                
                a.name as assessment_name,
                a.assessment_type,
                a.weight as assessment_weight,
                a.max_score as assessment_max_score,
                a.due_date as assessment_due_date
                
            FROM grade g
            JOIN assessment a ON g.assessment_id = a.id
            JOIN course_session cs ON a.course_session_id = cs.id
            JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
            JOIN course c ON cpl.course_id = c.id
            JOIN program_level cpl_pl ON cpl.program_level_id = cpl_pl.id
            JOIN program prog ON cpl_pl.id = prog.level_id
            JOIN session sess ON cs.session_id = sess.id
            JOIN teacher t ON cs.teacher_id = t.id
            JOIN public.user u_teacher ON t.user_id = u_teacher.id
            
            WHERE g.student_id = :student_id 
              AND cpl.year_level = :year_level
            
            ORDER BY c.name, a.created_at
        )
        SELECT 
            -- Données de l'étudiant
            sd.student_id,
            sd.student_number,
            sd.user_id,
            sd.first_name,
            sd.last_name,
            sd.email,
            sd.admission_date,
            sd.is_active,
            sd.program_level_name,
            sd.program_name as student_program_name,
            
            -- Données du cours et des notes
            cg.*
            
        FROM student_data sd
        LEFT JOIN course_grades cg ON sd.student_id = :student_id
        
        ORDER BY cg.course_name, cg.assessment_name;
        """
        
        # Exécution de la requête native
        from sqlalchemy import text as sql_text
        
        result = self.session.execute(
            sql_text(sql_query),
            {
                "student_id": str(student_id),
                "year_level": year_level
            }
        ).fetchall()
        
        if not result:
            return None
        
        # Parse des résultats
        student_info = None
        courses_dict = {}
        
        for row in result:
            # Informations de l'étudiant (identiques pour toutes les lignes)
            if student_info is None:
                student_info = {
                    "id": row[0],  # student_id
                    "student_number": row[1],
                    "user_id": row[2],
                    "first_name": row[3],
                    "last_name": row[4],
                    "email": row[5],
                    "admission_date": row[6],
                    "is_active": row[7],
                    "program_level_name": row[8],
                    "program_name": row[9]  # student_program_name
                }
            
            # Si pas de cours (étudiant sans notes)
            if len(row) < 11 or row[10] is None:  # course_id
                continue
                
            course_id = row[10]  # course_id
            
            # Créer l'entrée du cours si elle n'existe pas
            if course_id not in courses_dict:
                courses_dict[course_id] = {
                    "course_info": {
                        "course_id": course_id,
                        "course_name": row[11],  # course_name
                        "course_code": row[12],  # course_code
                        "course_credits": row[13],  # course_credits
                        "course_description": row[14],  # course_description
                        "teacher_name": row[15],  # teacher_name
                        "teacher_email": row[16],  # teacher_email
                        "session_name": row[17],  # session_name
                        "session_start_date": row[18],  # session_start_date
                        "session_end_date": row[19],  # session_end_date
                        "program_name": row[20],  # program_name
                        "program_degree": row[21],  # program_degree
                    },
                    "grades": []
                }
            
            # Ajouter la note au cours
            if row[22]:  # grade_id
                grade_data = {
                    "id": row[22],  # grade_id
                    "score": row[23],  # score
                    "is_passing": row[24],  # is_passing
                    "graded_date": row[25],  # graded_date
                    "comments": row[26],  # comments
                    "assessment_name": row[27],  # assessment_name
                    "assessment_type": row[28],  # assessment_type
                    "assessment_weight": row[29],  # assessment_weight
                    "assessment_max_score": row[30],  # assessment_max_score
                    "assessment_due_date": row[31],  # assessment_due_date
                }
                courses_dict[course_id]["grades"].append(grade_data)
        
        # Calculer les statistiques pour chaque cours
        course_summaries = []
        total_credits = 0
        total_points_earned = 0.0
        total_points_possible = 0.0
        passing_courses = 0
        failing_courses = 0
        
        for course_data in courses_dict.values():
            course_info = course_data["course_info"]
            grades = course_data["grades"]
            
            # Calcul des statistiques du cours
            if grades:
                scores = [g["score"] for g in grades if g["score"] is not None]
                
                if scores:
                    avg_score = sum(scores) / len(scores)
                    highest_score = max(scores)
                    lowest_score = min(scores)
                    
                    # Calcul de la moyenne pondérée si poids disponibles
                    weighted_scores = []
                    total_weight = 0.0
                    for grade in grades:
                        if grade["score"] is not None and grade["assessment_weight"] is not None:
                            weighted_scores.append(grade["score"] * grade["assessment_weight"] / 100)
                            total_weight += grade["assessment_weight"]
                    
                    weighted_avg = sum(weighted_scores) / (total_weight / 100) if total_weight > 0 else avg_score
                    
                    # Déterminer si le cours est réussi (moyenne >= 60)
                    is_passing = weighted_avg >= 60 if weighted_avg else False
                    final_grade = self._calculate_letter_grade(weighted_avg) if weighted_avg else None
                    
                    if is_passing:
                        passing_courses += 1
                    else:
                        failing_courses += 1
                        
                else:
                    avg_score = None
                    highest_score = None
                    lowest_score = None
                    weighted_avg = None
                    is_passing = None
                    final_grade = None
                
                # Use assessment max scores for completion calculation
                max_scores = [g["assessment_max_score"] for g in grades if g["assessment_max_score"] is not None]
                points_possible = sum(max_scores) if max_scores else 0.0
                points_earned = sum(scores) if scores else 0.0
                completion_pct = (points_earned / points_possible * 100) if points_possible > 0 else 0.0
                
                total_points_earned += points_earned
                total_points_possible += points_possible
            else:
                avg_score = None
                highest_score = None  
                lowest_score = None
                weighted_avg = None
                is_passing = None
                final_grade = None
                points_earned = 0.0
                points_possible = 0.0
                completion_pct = 0.0
            
            statistics = {
                "total_grades": len(grades),
                "average_score": avg_score,
                "weighted_average": weighted_avg,
                "highest_score": highest_score,
                "lowest_score": lowest_score,
                "final_grade": final_grade,
                "total_points_earned": points_earned,
                "total_points_possible": points_possible,
                "completion_percentage": completion_pct,
                "is_passing_course": is_passing,
            }
            
            course_summary = {
                **course_info,
                "grades": grades,
                "course_statistics": statistics
            }
            course_summaries.append(course_summary)
            total_credits += course_info["course_credits"]
        
        # Calcul des statistiques du niveau
        total_grades = sum(len(course["grades"]) for course in course_summaries)
        overall_average = None
        gpa = None
        
        if course_summaries:
            # Moyenne générale pondérée par crédits
            weighted_sum = 0.0
            total_credit_weight = 0
            gpa_points = 0.0
            
            for course in course_summaries:
                course_avg = course["course_statistics"]["weighted_average"]
                if course_avg is not None:
                    credits = course["course_credits"]
                    weighted_sum += course_avg * credits
                    total_credit_weight += credits
                    
                    # Calcul GPA (A=4.0, B=3.0, etc.)
                    letter_grade = course["course_statistics"]["final_grade"]
                    gpa_points += self._letter_grade_to_gpa(letter_grade) * credits if letter_grade else 0
            
            if total_credit_weight > 0:
                overall_average = weighted_sum / total_credit_weight
                gpa = gpa_points / total_credit_weight
        
        completion_percentage = (total_points_earned / total_points_possible * 100) if total_points_possible > 0 else 0.0
        
        level_statistics = {
            "total_courses": len(course_summaries),
            "total_grades": total_grades,
            "overall_average": overall_average,
            "total_credits": total_credits,
            "credits_earned": total_credits if passing_courses > 0 else 0,  # Simplifié
            "gpa": gpa,
            "total_points_earned": total_points_earned,
            "total_points_possible": total_points_possible,
            "completion_percentage": completion_percentage,
            "passing_courses": passing_courses,
            "failing_courses": failing_courses,
        }
        
        return {
            "student_info": student_info,
            "year_level": year_level,
            "courses": course_summaries,
            "level_statistics": level_statistics,
            "total_courses": len(course_summaries),
            "generated_at": datetime.utcnow()
        }
    
    def _letter_grade_to_gpa(self, letter_grade: str) -> float:
        """Convertit une note lettre en points GPA."""
        grade_mapping = {
            "A+": 4.0, "A": 4.0, "A-": 3.7,
            "B+": 3.3, "B": 3.0, "B-": 2.7,
            "C+": 2.3, "C": 2.0, "C-": 1.7,
            "D+": 1.3, "D": 1.0, "D-": 0.7,
            "F": 0.0
        }
        return grade_mapping.get(letter_grade, 0.0)

    def get_student_grades_summary_by_session_native(
        self, student_id: uuid.UUID, session_id: uuid.UUID
    ) -> dict:
        """
        Récupère le résumé complet des notes d'un étudiant pour une session donnée,
        agrégé par cours avec toutes les informations de l'étudiant.
        """
        from sqlalchemy import text as sql_text
        
        sql_query = """
        WITH student_data AS (
            SELECT 
                s.id as student_id,
                u.user_number as student_number,
                s.user_id,
                u.first_name,
                u.last_name,
                u.email,
                s.admission_date,
                s.status = 'active' as is_active,
                pl.name as program_level_name,
                p.name as program_name
            FROM student s
            JOIN public.user u ON s.user_id = u.id
            LEFT JOIN program_level pl ON s.program_level_id = pl.id
            LEFT JOIN program p ON pl.id = p.level_id
            WHERE s.id = :student_id
        ),
        course_grades AS (
            SELECT 
                c.id as course_id,
                c.name as course_name,
                c.code as course_code,
                c.credits as course_credits,
                c.description as course_description,
                u_teacher.first_name || ' ' || u_teacher.last_name as teacher_name,
                u_teacher.email as teacher_email,
                sess.name as session_name,
                sess.start_date as session_start_date,
                sess.end_date as session_end_date,
                prog.name as program_name,
                prog.code as program_degree,
                g.id as grade_id,
                g.score,
                g.is_passing,
                g.graded_date,
                g.comments,
                a.name as assessment_name,
                a.assessment_type,
                a.weight as assessment_weight,
                a.max_score as assessment_max_score,
                a.due_date as assessment_due_date
            FROM grade g
            JOIN assessment a ON g.assessment_id = a.id
            JOIN course_session cs ON a.course_session_id = cs.id
            JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
            JOIN course c ON cpl.course_id = c.id
            JOIN program_level cpl_pl ON cpl.program_level_id = cpl_pl.id
            JOIN program prog ON cpl_pl.id = prog.level_id
            JOIN session sess ON cs.session_id = sess.id
            JOIN teacher t ON cs.teacher_id = t.id
            JOIN public.user u_teacher ON t.user_id = u_teacher.id
            WHERE g.student_id = :student_id 
              AND cs.session_id = :session_id
            ORDER BY c.name, a.created_at
        )
        SELECT 
            sd.student_id, sd.student_number, sd.user_id, sd.first_name, sd.last_name,
            sd.email, sd.admission_date, sd.is_active, 
            sd.program_level_name, sd.program_name as student_program_name,
            cg.*
        FROM student_data sd
        LEFT JOIN course_grades cg ON sd.student_id = :student_id
        ORDER BY cg.course_name, cg.assessment_name;
        """
        
        result = self.session.execute(
            sql_text(sql_query),
            {
                "student_id": str(student_id),
                "session_id": str(session_id)
            }
        ).fetchall()
        
        return self._parse_aggregated_result(result, {"session_id": session_id})

    def get_student_grades_summary_by_course_native(
        self, student_id: uuid.UUID, course_id: uuid.UUID
    ) -> dict:
        """
        Récupère le résumé complet des notes d'un étudiant pour un cours donné,
        avec toutes les informations de l'étudiant et statistiques du cours.
        """
        from sqlalchemy import text as sql_text
        
        sql_query = """
        WITH student_data AS (
            SELECT 
                s.id as student_id,
                s.student_number,
                s.user_id,
                u.first_name,
                u.last_name,
                u.email,
                s.admission_date,
                s.status = 'active' as is_active,
                pl.name as program_level_name,
                p.name as program_name
            FROM student s
            JOIN public.user u ON s.user_id = u.id
            LEFT JOIN program_level pl ON s.program_level_id = pl.id
            LEFT JOIN program p ON pl.id = p.level_id
            WHERE s.id = :student_id
        ),
        course_grades AS (
            SELECT 
                c.id as course_id,
                c.name as course_name,
                c.code as course_code,
                c.credits as course_credits,
                c.description as course_description,
                u_teacher.first_name || ' ' || u_teacher.last_name as teacher_name,
                u_teacher.email as teacher_email,
                sess.name as session_name,
                sess.start_date as session_start_date,
                sess.end_date as session_end_date,
                prog.name as program_name,
                prog.code as program_degree,
                g.id as grade_id,
                g.score,
                g.is_passing,
                g.graded_date,
                g.comments,
                a.name as assessment_name,
                a.assessment_type,
                a.weight as assessment_weight,
                a.max_score as assessment_max_score,
                a.due_date as assessment_due_date
            FROM grade g
            JOIN assessment a ON g.assessment_id = a.id
            JOIN course_session cs ON a.course_session_id = cs.id
            JOIN course_program_level cpl ON cs.course_program_level_id = cpl.id
            JOIN course c ON cpl.course_id = c.id
            JOIN program_level cpl_pl ON cpl.program_level_id = cpl_pl.id
            JOIN program prog ON cpl_pl.id = prog.level_id
            JOIN session sess ON cs.session_id = sess.id
            JOIN teacher t ON cs.teacher_id = t.id
            JOIN public.user u_teacher ON t.user_id = u_teacher.id
            WHERE g.student_id = :student_id 
              AND cpl.course_id = :course_id
            ORDER BY c.name, a.created_at
        )
        SELECT 
            sd.student_id, sd.student_number, sd.user_id, sd.first_name, sd.last_name,
            sd.email, sd.admission_date, sd.is_active, 
            sd.program_level_name, sd.program_name as student_program_name,
            cg.*
        FROM student_data sd
        LEFT JOIN course_grades cg ON sd.student_id = :student_id
        ORDER BY cg.course_name, cg.assessment_name;
        """
        
        result = self.session.execute(
            sql_text(sql_query),
            {
                "student_id": str(student_id),
                "course_id": str(course_id)
            }
        ).fetchall()
        
        return self._parse_aggregated_result(result, {"course_id": course_id})

    def _parse_aggregated_result(self, result, context: dict) -> dict:
        """
        Parse les résultats de requête SQL agrégée pour tous les endpoints.
        Méthode commune pour éviter la duplication de code.
        """
        if not result:
            return None
        
        student_info = None
        courses_dict = {}
        
        for row in result:
            # Informations de l'étudiant (identiques pour toutes les lignes)
            if student_info is None:
                student_info = {
                    "id": row[0],  # student_id
                    "student_number": row[1],
                    "user_id": row[2],
                    "first_name": row[3],
                    "last_name": row[4],
                    "email": row[5],
                    "admission_date": row[6],
                    "is_active": row[7],
                    "program_level_name": row[8],
                    "program_name": row[9]  # student_program_name
                }
            
            # Si pas de cours (étudiant sans notes)
            if len(row) < 11 or row[10] is None:  # course_id
                continue
                
            course_id = row[10]
            
            # Créer l'entrée du cours si elle n'existe pas
            if course_id not in courses_dict:
                courses_dict[course_id] = {
                    "course_info": {
                        "course_id": course_id,
                        "course_name": row[11],
                        "course_code": row[12],
                        "course_credits": row[13],
                        "course_description": row[14],
                        "teacher_name": row[15],
                        "teacher_email": row[16],
                        "session_name": row[17],
                        "session_start_date": row[18],
                        "session_end_date": row[19],
                        "program_name": row[20],
                        "program_degree": row[21],
                    },
                    "grades": []
                }
            
            # Ajouter la note au cours
            if row[22]:  # grade_id
                grade_data = {
                    "id": row[22],
                    "score": row[23],
                    "is_passing": row[24],
                    "graded_date": row[25],
                    "comments": row[26],
                    "assessment_name": row[27],
                    "assessment_type": row[28],
                    "assessment_weight": row[29],
                    "assessment_max_score": row[30],
                    "assessment_due_date": row[31],
                }
                courses_dict[course_id]["grades"].append(grade_data)
        
        # Calculer les statistiques (réutilise la logique existante)
        return self._calculate_aggregated_statistics(
            student_info, courses_dict, context
        )

    def _calculate_aggregated_statistics(self, student_info: dict, courses_dict: dict, context: dict) -> dict:
        """
        Calcule les statistiques pour les résultats agrégés.
        """
        course_summaries = []
        total_credits = 0
        total_points_earned = 0.0
        total_points_possible = 0.0
        passing_courses = 0
        failing_courses = 0
        
        for course_data in courses_dict.values():
            course_info = course_data["course_info"]
            grades = course_data["grades"]
            
            # Calcul des statistiques du cours (réutilise la logique existante)
            if grades:
                scores = [g["score"] for g in grades if g["score"] is not None]
                
                if scores:
                    avg_score = sum(scores) / len(scores)
                    highest_score = max(scores)
                    lowest_score = min(scores)
                    
                    # Calcul de la moyenne pondérée
                    weighted_scores = []
                    total_weight = 0.0
                    for grade in grades:
                        if grade["score"] is not None and grade["assessment_weight"] is not None:
                            weighted_scores.append(grade["score"] * grade["assessment_weight"] / 100)
                            total_weight += grade["assessment_weight"]
                    
                    weighted_avg = sum(weighted_scores) / (total_weight / 100) if total_weight > 0 else avg_score
                    is_passing = weighted_avg >= 60 if weighted_avg else False
                    final_grade = self._calculate_letter_grade(weighted_avg) if weighted_avg else None
                    
                    if is_passing:
                        passing_courses += 1
                    else:
                        failing_courses += 1
                        
                else:
                    avg_score = None
                    highest_score = None
                    lowest_score = None
                    weighted_avg = None
                    is_passing = None
                    final_grade = None
                
                # Use assessment max scores for completion calculation
                max_scores = [g["assessment_max_score"] for g in grades if g["assessment_max_score"] is not None]
                points_possible = sum(max_scores) if max_scores else 0.0
                points_earned = sum(scores) if scores else 0.0
                completion_pct = (points_earned / points_possible * 100) if points_possible > 0 else 0.0
                
                total_points_earned += points_earned
                total_points_possible += points_possible
            else:
                avg_score = None
                highest_score = None
                lowest_score = None
                weighted_avg = None
                is_passing = None
                final_grade = None
                points_earned = 0.0
                points_possible = 0.0
                completion_pct = 0.0
            
            statistics = {
                "total_grades": len(grades),
                "average_score": avg_score,
                "weighted_average": weighted_avg,
                "highest_score": highest_score,
                "lowest_score": lowest_score,
                "final_grade": final_grade,
                "total_points_earned": points_earned,
                "total_points_possible": points_possible,
                "completion_percentage": completion_pct,
                "is_passing_course": is_passing,
            }
            
            course_summary = {
                **course_info,
                "grades": grades,
                "course_statistics": statistics
            }
            course_summaries.append(course_summary)
            total_credits += course_info["course_credits"]
        
        # Calcul des statistiques globales
        total_grades = sum(len(course["grades"]) for course in course_summaries)
        overall_average = None
        gpa = None
        
        if course_summaries:
            weighted_sum = 0.0
            total_credit_weight = 0
            gpa_points = 0.0
            
            for course in course_summaries:
                course_avg = course["course_statistics"]["weighted_average"]
                if course_avg is not None:
                    credits = course["course_credits"]
                    weighted_sum += course_avg * credits
                    total_credit_weight += credits
                    
                    letter_grade = course["course_statistics"]["final_grade"]
                    gpa_points += self._letter_grade_to_gpa(letter_grade) * credits if letter_grade else 0
            
            if total_credit_weight > 0:
                overall_average = weighted_sum / total_credit_weight
                gpa = gpa_points / total_credit_weight
        
        completion_percentage = (total_points_earned / total_points_possible * 100) if total_points_possible > 0 else 0.0
        
        level_statistics = {
            "total_courses": len(course_summaries),
            "total_grades": total_grades,
            "overall_average": overall_average,
            "total_credits": total_credits,
            "credits_earned": total_credits if passing_courses > 0 else 0,
            "gpa": gpa,
            "total_points_earned": total_points_earned,
            "total_points_possible": total_points_possible,
            "completion_percentage": completion_percentage,
            "passing_courses": passing_courses,
            "failing_courses": failing_courses,
        }
        
        return {
            "student_info": student_info,
            "context": context,
            "courses": course_summaries,
            "level_statistics": level_statistics,
            "total_courses": len(course_summaries),
            "generated_at": datetime.utcnow()
        }

        