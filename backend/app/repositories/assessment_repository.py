import uuid
from typing import Optional


from datetime import date
from sqlmodel import Session, select, func

from app.models.assessment import Assessment, AssessmentType
from app.models.course_session import CourseSession
from app.models.course_program_level import CourseProgramLevel
from app.models.course import Course
from app.models.session import Session as AcademicSession
from app.models.enrollment import Enrollment
from app.repositories.base_repository import BaseRepository


class AssessmentRepository(BaseRepository[Assessment]):
    """Repository pour la gestion des évaluations."""

    def __init__(self, session: Session):
        super().__init__(Assessment, session)

    def _apply_filters(
        self,
        statement,
        name: Optional[str] = None,
        assessment_type: Optional[str] = None,
        due_date: Optional[date] = None,
        course_session_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
        course_name: Optional[str] = None,
        year_level: Optional[int] = None,
        session_number: Optional[int] = None,
        student_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
    ):
        """Apply common filters, joining as needed."""
        needs_cs_join = any([teacher_id, course_name, year_level, session_number, student_id, program_level_id, session_id])

        if needs_cs_join:
            statement = statement.join(CourseSession, Assessment.course_session_id == CourseSession.id)

        if teacher_id:
            statement = statement.where(CourseSession.teacher_id == teacher_id)

        if year_level:
            statement = statement.where(CourseSession.year_level == year_level)

        if session_number or session_id:
            statement = statement.join(AcademicSession, CourseSession.session_id == AcademicSession.id)
            if session_number:
                statement = statement.where(AcademicSession.session_number == session_number)
            if session_id:
                statement = statement.where(AcademicSession.id == session_id)

        # course_name and program_level_id both need CourseProgramLevel — join once
        needs_cpl_join = course_name or program_level_id
        if needs_cpl_join:
            statement = statement.join(CourseProgramLevel, CourseSession.course_program_level_id == CourseProgramLevel.id)

        if program_level_id:
            statement = statement.where(CourseProgramLevel.program_level_id == program_level_id)

        if course_name:
            statement = statement.join(Course, CourseProgramLevel.course_id == Course.id)
            statement = statement.where(Course.name.ilike(f"%{course_name}%"))

        if student_id:
            statement = statement.join(Enrollment, CourseSession.id == Enrollment.course_session_id)
            statement = statement.where(Enrollment.student_id == student_id)

        if name:
            statement = statement.where(Assessment.name.ilike(f"%{name}%"))
        if assessment_type:
            statement = statement.where(Assessment.assessment_type == assessment_type)
        if due_date:
            statement = statement.where(Assessment.due_date == due_date)
        if course_session_id:
            statement = statement.where(Assessment.course_session_id == course_session_id)

        return statement

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        name: Optional[str] = None,
        assessment_type: Optional[str] = None,
        due_date: Optional[date] = None,
        course_session_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
        course_name: Optional[str] = None,
        year_level: Optional[int] = None,
        session_number: Optional[int] = None,
        student_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
    ) -> list[Assessment]:
        """Récupère toutes les évaluations avec filtrage."""
        statement = select(Assessment)
        statement = self._apply_filters(
            statement, name=name, assessment_type=assessment_type,
            due_date=due_date, course_session_id=course_session_id,
            teacher_id=teacher_id, course_name=course_name,
            year_level=year_level, session_number=session_number,
            student_id=student_id, program_level_id=program_level_id,
            session_id=session_id,
        )
        statement = statement.offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def count_assessments(
        self,
        name: Optional[str] = None,
        assessment_type: Optional[str] = None,
        due_date: Optional[date] = None,
        course_session_id: Optional[uuid.UUID] = None,
        teacher_id: Optional[uuid.UUID] = None,
        course_name: Optional[str] = None,
        year_level: Optional[int] = None,
        session_number: Optional[int] = None,
        student_id: Optional[uuid.UUID] = None,
        program_level_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
    ) -> int:
        """Compte les évaluations avec filtrage."""
        statement = select(func.count()).select_from(Assessment)
        statement = self._apply_filters(
            statement, name=name, assessment_type=assessment_type,
            due_date=due_date, course_session_id=course_session_id,
            teacher_id=teacher_id, course_name=course_name,
            year_level=year_level, session_number=session_number,
            student_id=student_id, program_level_id=program_level_id,
            session_id=session_id,
        )
        return self.session.exec(statement).one()

    def get_by_course_session(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère toutes les évaluations d'un cours-session."""
        statement = (
            select(Assessment)
            .where(Assessment.course_session_id == course_session_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_type(
        self, course_session_id: uuid.UUID, assessment_type: str,
        skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations par type."""
        statement = (
            select(Assessment)
            .where(
                Assessment.course_session_id == course_session_id,
                Assessment.assessment_type == assessment_type
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_published_assessments(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations publiées."""
        statement = (
            select(Assessment)
            .where(
                Assessment.course_session_id == course_session_id,
                Assessment.is_published == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_mandatory_assessments(
        self, course_session_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Assessment]:
        """Récupère les évaluations obligatoires."""
        statement = (
            select(Assessment)
            .where(
                Assessment.course_session_id == course_session_id,
                Assessment.is_mandatory == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def calculate_total_weight(self, course_session_id: uuid.UUID) -> float:
        """Calcule le poids total des évaluations."""
        from sqlmodel import func
        statement = select(func.sum(Assessment.weight)).where(
            Assessment.course_session_id == course_session_id
        )
        result = self.session.exec(statement).one()
        return result if result else 0.0

    def count_exam_type_assessments(
        self,
        course_session_id: uuid.UUID,
        exclude_id: Optional[uuid.UUID] = None,
    ) -> int:
        """Compte les évaluations de type examen pour une session de cours."""
        EXAM_TYPES = ["exam"]
        statement = (
            select(func.count())
            .select_from(Assessment)
            .where(
                Assessment.course_session_id == course_session_id,
                Assessment.assessment_type.in_(EXAM_TYPES),
            )
        )
        if exclude_id:
            statement = statement.where(Assessment.id != exclude_id)
        return self.session.exec(statement).one()