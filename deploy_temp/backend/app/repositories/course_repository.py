import uuid
from typing import Optional

from sqlmodel import Session, select, func

from app.models.course import Course, CourseWithSessionInfo
from app.models.course_program_level import CourseProgramLevel
from app.models.course_session import CourseSession
from app.models.session import Session as SessionModel
from app.models.teacher import Teacher
from app.models.user import User
from app.models.program_level import ProgramLevel
from app.repositories.base_repository import BaseRepository


class CourseRepository(BaseRepository[Course]):
    """Repository pour la gestion des cours."""

    def __init__(self, session: Session):
        super().__init__(Course, session)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        name: Optional[str] = None,
        code: Optional[str] = None,
        is_mandatory: Optional[bool] = None,
        is_active: Optional[bool] = None,
    ) -> list[Course]:
        """Récupère tous les cours avec filtrage."""
        statement = select(Course)
        
        if name:
            statement = statement.where(Course.name.ilike(f"%{name}%"))
        if code:
            statement = statement.where(Course.code.ilike(f"%{code}%"))
        if is_mandatory is not None:
            statement = statement.where(Course.is_mandatory == is_mandatory)
        if is_active is not None:
            statement = statement.where(Course.is_active == is_active)
            
        statement = statement.offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def count_courses(
        self,
        name: Optional[str] = None,
        code: Optional[str] = None,
        is_mandatory: Optional[bool] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        """Compte les cours avec filtrage."""
        statement = select(func.count()).select_from(Course)
        
        if name:
            statement = statement.where(Course.name.ilike(f"%{name}%"))
        if code:
            statement = statement.where(Course.code.ilike(f"%{code}%"))
        if is_mandatory is not None:
            statement = statement.where(Course.is_mandatory == is_mandatory)
        if is_active is not None:
            statement = statement.where(Course.is_active == is_active)
            
        return self.session.exec(statement).one()

    def get_by_code(self, code: str) -> Optional[Course]:
        """Récupère un cours par son code."""
        statement = select(Course).where(Course.code == code)
        return self.session.exec(statement).first()

    def get_by_program(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère tous les cours d'un programme."""
        statement = (
            select(Course)
            .where(Course.program_id == program_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_program_and_year(
        self, program_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours d'un programme pour une année spécifique."""
        statement = (
            select(Course)
            .where(
                Course.program_id == program_id,
                Course.year_level == year_level
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_mandatory_courses(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours obligatoires d'un programme."""
        statement = (
            select(Course)
            .where(
                Course.program_id == program_id,
                Course.is_mandatory == True
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_optional_courses(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours optionnels d'un programme."""
        statement = (
            select(Course)
            .where(
                Course.program_id == program_id,
                Course.is_mandatory == False
            )
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def code_exists(self, code: str, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Vérifie si un code de cours existe déjà."""
        statement = select(Course).where(Course.code == code)
        
        if exclude_id:
            statement = statement.where(Course.id != exclude_id)
        
        return self.session.exec(statement).first() is not None

    def get_active_courses(
        self, skip: int = 0, limit: int = 100
    ) -> list[Course]:
        """Récupère les cours actifs."""
        statement = (
            select(Course)
            .where(Course.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_courses_by_filters(
        self,
        program_level_id: uuid.UUID,
        academic_year_id: uuid.UUID,
        session_number: Optional[int] = None,
        year_level: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[Course]:
        """
        Récupère les cours selon plusieurs critères.
        """
        statement = (
            select(Course)
            .distinct()
            .join(CourseProgramLevel, Course.id == CourseProgramLevel.course_id)
            .join(CourseSession, CourseProgramLevel.id == CourseSession.course_program_level_id)
            .join(SessionModel, CourseSession.session_id == SessionModel.id)
            .where(
                CourseProgramLevel.program_level_id == program_level_id,
                SessionModel.academic_year_id == academic_year_id
            )
        )
        
        if session_number:
            statement = statement.where(SessionModel.session_number == session_number)

        if year_level:
            statement = statement.where(CourseProgramLevel.year_level == year_level)
            
        statement = statement.offset(skip).limit(limit)
        
        return list(self.session.exec(statement).all())

    def get_courses_by_filters_enriched(
        self,
        program_level_id: uuid.UUID,
        academic_year_id: uuid.UUID,
        session_number: Optional[int] = None,
        year_level: Optional[int] = None,
        teacher_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> list[CourseWithSessionInfo]:
        """
        Récupère les cours selon plusieurs critères avec informations enrichies
        (professeur, session, programme) depuis CourseSession.
        """
        statement = (
            select(
                Course,
                SessionModel.name.label("session_name"),
                SessionModel.start_date.label("session_start_date"),
                SessionModel.session_number.label("session_number"),
                func.concat(User.first_name, ' ', User.last_name).label("teacher_name"),
                User.email.label("teacher_email"),
                CourseSession.teacher_id.label("teacher_id"),
                ProgramLevel.name.label("program_level_name"),
                CourseSession.year_level.label("year_level"),
                CourseSession.intra_percentage.label("intra_percentage"),
                CourseSession.final_percentage.label("final_percentage"),
                CourseSession.participation_percentage.label("participation_percentage")
            )
            .distinct()
            .join(CourseProgramLevel, Course.id == CourseProgramLevel.course_id)
            .join(ProgramLevel, CourseProgramLevel.program_level_id == ProgramLevel.id)
            .join(CourseSession, CourseProgramLevel.id == CourseSession.course_program_level_id)
            .join(SessionModel, CourseSession.session_id == SessionModel.id)
            .join(Teacher, CourseSession.teacher_id == Teacher.id)
            .join(User, Teacher.user_id == User.id)
            .where(
                CourseProgramLevel.program_level_id == program_level_id,
                SessionModel.academic_year_id == academic_year_id,
                Course.is_active == True
            )
        )
        
        if session_number:
            statement = statement.where(SessionModel.session_number == session_number)

        if year_level:
            statement = statement.where(CourseSession.year_level == year_level)
        
        if teacher_id:
            statement = statement.where(CourseSession.teacher_id == teacher_id)
            
        statement = statement.offset(skip).limit(limit)
        
        results = self.session.exec(statement).all()
        
        # Transform results to CourseWithSessionInfo
        enriched_courses = []
        for row in results:
            course_data = row[0].__dict__.copy()
            
            # Extract year from start_date
            session_year = row[2].year if row[2] else None
            # Determine semester from session_number
            session_semester = f"Session {row[3]}" if row[3] else None
            
            course_data.update({
                "session_name": row[1],
                "session_year": session_year,
                "session_semester": session_semester,
                "session_number": row[3],
                "teacher_name": row[4],
                "teacher_email": row[5],
                "teacher_id": row[6],
                "program_level_name": row[7],
                "year_level": row[8],
                "intra_percentage": row[9],
                "final_percentage": row[10],
                "participation_percentage": row[11]
            })
            enriched_courses.append(CourseWithSessionInfo(**course_data))
        
        return enriched_courses