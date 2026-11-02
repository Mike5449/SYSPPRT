from sqlmodel import Session, create_engine, select

from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# ✅ Importer TOUS les modèles pour que SQLModel les connaisse
from app.models.user import User  # noqa: F401
from app.models.item import Item  # noqa: F401
from app.models.university import University  # noqa: F401
from app.models.program_level import ProgramLevel  # noqa: F401
from app.models.department import Department  # noqa: F401
from app.models.faculty import Faculty  # noqa: F401
from app.models.program import Program  # noqa: F401
from app.models.academic_year import AcademicYear  # noqa: F401
from app.models.session import Session as AcademicSession  # noqa: F401
from app.models.course import Course  # noqa: F401
from app.models.course_session import CourseSession  # noqa: F401
from app.models.course_program_level import CourseProgramLevel  # noqa: F401
from app.models.student import Student  # noqa: F401
from app.models.teacher import Teacher  # noqa: F401
from app.models.enrollment import Enrollment  # noqa: F401
from app.models.schedule import Schedule  # noqa: F401
from app.models.attendance_session import AttendanceSession  # noqa: F401
from app.models.attendance_record import AttendanceRecord  # noqa: F401
from app.models.assessment import Assessment  # noqa: F401
from app.models.grade import Grade  # noqa: F401
from app.models.permission import Permission  # noqa: F401
from app.models.user_role import UserRole  # noqa: F401


def init_db() -> None:
    """
    Crée toutes les tables dans la base de données.
    """
    from sqlmodel import SQLModel
    
    # Importer tous les modèles pour s'assurer qu'ils sont enregistrés
    from app.models import (
        User, 
        Item, 
        University, 
        ProgramLevel,
        Department,
        Faculty,
        Program,
        AcademicYear,
        Session,
        Course,
        CourseSession,
        CourseProgramLevel,
        Student,
        Teacher,
        Enrollment,
        Schedule,
        AttendanceSession,
        AttendanceRecord,
        Assessment,
        Grade,
        Permission,
        UserRole,
    )  # noqa: F401
    
    SQLModel.metadata.create_all(engine)
