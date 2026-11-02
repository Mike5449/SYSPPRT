import uuid
from typing import Optional

from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload

from app.models.student import Student, StudentStatus
from app.models.course import Course
from app.models.course_session import CourseSession
from app.models.session import Session
from app.models.course_program_level import CourseProgramLevel
from app.models.program_level import ProgramLevel
from app.models.program import Program
from app.models.faculty import Faculty
from app.models.grade import Grade
from app.models.assessment import Assessment
from app.models.teacher import Teacher
from app.models.user import User
from app.repositories.base_repository import BaseRepository


class StudentRepository(BaseRepository[Student]):
    """Repository pour la gestion des étudiants."""

    def __init__(self, session: Session):
        super().__init__(Student, session)

    def get_all(self, skip: int = 0, limit: int = 100):
        """Récupère tous les étudiants avec user, program_level, program, faculty et department."""
        statement = (
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .offset(skip)
            .limit(limit)
        )
        return self.session.exec(statement).all()

    def get_by_id(self, id: uuid.UUID) -> Optional[Student]:
        """Récupère un étudiant par son ID avec toutes les relations."""
        statement = (
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.program_level)
                    .selectinload(ProgramLevel.program)
                    .selectinload(Program.faculty)
                    .selectinload(Faculty.department)
            )
            .where(Student.id == id)
        )
        return self.session.exec(statement).first()

    def get_by_user_id(self, user_id: uuid.UUID) -> Optional[Student]:
        """Récupère un étudiant par son user_id avec toutes les relations."""
        statement = (
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.program_level)
                    .selectinload(ProgramLevel.program)
            )
            .where(Student.user_id == user_id)
        )
        return self.session.exec(statement).first()

    def get_by_student_number(self, student_number: str) -> Optional[Student]:
        """Récupère un étudiant par son numéro d'étudiant (stocké dans User.user_number)."""
        statement = (
            select(Student)
            .join(User, Student.user_id == User.id)
            .where(User.user_number == student_number)
            .options(selectinload(Student.user))
        )
        return self.session.exec(statement).first()

    def get_by_program(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère tous les étudiants d'un programme."""
        statement = (
            select(Student)
            .where(Student.program_id == program_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_status(
        self, status: str, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants par statut."""
        statement = (
            select(Student)
            .where(Student.status == status)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_active_students(
        self, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants actifs."""
        return self.get_by_status(StudentStatus.ACTIVE, skip, limit)

    def get_by_year_level(
        self, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants par niveau d'année."""
        statement = (
            select(Student)
            .where(Student.current_year_level == year_level)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_program_level_and_year(
        self, program_level_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants par program_level_id et year_level."""
        statement = (
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.program_level)
            )
            .where(Student.program_level_id == program_level_id)
            .where(Student.current_year_level == year_level)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def exists_student_number(
        self, student_number: str, exclude_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Vérifie si un numéro d'étudiant (user_number) existe déjà."""
        statement = (
            select(User)
            .where(User.user_number == student_number)
        )
        
        # Si exclude_id est fourni, on exclut l'utilisateur qui y est lié
        if exclude_id:
            # On cherche l'utilisateur lié à cet étudiant
            subquery = select(Student.user_id).where(Student.id == exclude_id)
            user_id_to_exclude = self.session.exec(subquery).first()
            if user_id_to_exclude:
                statement = statement.where(User.id != user_id_to_exclude)
        
        return self.session.exec(statement).first() is not None

    def update_gpa(self, student_id: uuid.UUID, new_gpa: float) -> Optional[Student]:
        """Met à jour le GPA d'un étudiant."""
        student = self.get_by_id(student_id)
        if student:
            student.gpa = new_gpa
            self.session.add(student)
            self.session.commit()
            self.session.refresh(student)
        return student

    def get_theoretical_courses(
        self, student_number: str, year_level: int, session_number: Optional[int] = None
    ) -> list[Course]:
        """
        Récupère les cours théoriques d'un étudiant pour une année donnée
        en se basant sur son programme.
        Optionnellement filtré par numéro de session (1 ou 2).
        """
        statement = (
            select(Course)
            .distinct()
            .join(CourseProgramLevel, Course.id == CourseProgramLevel.course_id)
            .join(ProgramLevel, CourseProgramLevel.program_level_id == ProgramLevel.id)
            .join(Student, Student.program_level_id == ProgramLevel.id)
            .join(User, Student.user_id == User.id)
            .where(User.user_number == student_number)
            .where(CourseProgramLevel.year_level == year_level)
        )
        
        if session_number:
            statement = (
                statement
                .join(CourseSession, CourseProgramLevel.id == CourseSession.course_program_level_id)
                .join(Session, CourseSession.session_id == Session.id)
                .where(Session.session_number == session_number)
                .where(Session.is_active == True)
            )
            
        return list(self.session.exec(statement).all())

    def get_student_grades_by_year_with_course_info(
        self,
        student_id: uuid.UUID,
        year_level: int,
        session_number: Optional[int] = None,
        assessment_type: Optional[str] = None,
        assessment_query: Optional[str] = None,
        is_passing: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[dict]:
        """Récupère les notes d'un étudiant pour une année avec infos complètes du cours."""
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
                Session.name.label("session_name"),
                Session.code.label("session_code"),
                Session.start_date.label("session_start_date"),
                Session.end_date.label("session_end_date"),
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
            .join(Session, CourseSession.session_id == Session.id)
            .join(Teacher, CourseSession.teacher_id == Teacher.id)
            .join(User, Teacher.user_id == User.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.year_level == year_level
            )
        )

        if session_number:
            statement = statement.where(Session.session_number == session_number)

        if assessment_type:
            statement = statement.where(Assessment.assessment_type == assessment_type)
        
        if assessment_query:
            statement = statement.where(Assessment.name.ilike(f"%{assessment_query}%"))
        
        if is_passing is not None:
            statement = statement.where(Grade.is_passing == is_passing)
            
        statement = (
            statement
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

    def count_student_grades_by_year(
        self,
        student_id: uuid.UUID,
        year_level: int,
        session_number: Optional[int] = None,
        assessment_type: Optional[str] = None,
        assessment_query: Optional[str] = None,
        is_passing: Optional[bool] = None,
    ) -> int:
        """Compte les notes d'un étudiant pour une année spécifique."""
        statement = (
            select(func.count(Grade.id))
            .join(Assessment, Grade.assessment_id == Assessment.id)
            .join(CourseSession, Assessment.course_session_id == CourseSession.id)
            .where(
                Grade.student_id == student_id,
                CourseSession.year_level == year_level
            )
        )
        
        if session_number:
            statement = statement.join(Session, CourseSession.session_id == Session.id).where(Session.session_number == session_number)

        if assessment_type:
            statement = statement.where(Assessment.assessment_type == assessment_type)
        
        if assessment_query:
            statement = statement.where(Assessment.name.ilike(f"%{assessment_query}%"))
        
        if is_passing is not None:
            statement = statement.where(Grade.is_passing == is_passing)
            
        return self.session.exec(statement).one()