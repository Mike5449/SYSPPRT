import uuid
from datetime import datetime
from typing import Optional, List

from sqlmodel import Session

from app.models.student import Student, StudentCreate, StudentUpdate, StudentWithUserCreate
from app.models.user import UserCreate
from app.models.course import CoursePublic
from app.models.grade import GradesWithCourseInfo, GradeWithCourseInfo
from app.repositories.student_repository import StudentRepository
from app.services.base_service import BaseService
from app.services.auth_service import UserService
from app.services.role_service import RoleService


class StudentService(BaseService[Student, StudentRepository]):
    """Service pour la gestion des étudiants."""

    def __init__(self, session: Session):
        self.session = session
        repository = StudentRepository(session)
        super().__init__(repository)

    def create_student(self, student_create: StudentCreate) -> Student:
        """Crée un nouveau étudiant avec validations."""
        # Créer l'étudiant
        student = Student.model_validate(student_create)
        return self.repository.create(student)

    def create_student_with_user(self, student_with_user: StudentWithUserCreate) -> Student:
        """Crée un utilisateur et un étudiant dans la même opération."""
        user_service = UserService(self.session)
        role_service = RoleService(self.session)
        
        # 1. Validations préliminaires
        if user_service.get_by_email(student_with_user.email):
            raise ValueError(f"Email {student_with_user.email} already registered")
        
        if self.repository.exists_student_number(student_with_user.user_number):
            raise ValueError(f"User number {student_with_user.user_number} already exists")

        # 2. Création (utilisant une transaction manuelle pour "tout annuler" en cas d'erreur)
        # Note: BaseRepository.create() fait un commit(). Pour garantir "tout ou rien",
        # on peut soit supprimer l'un si l'autre échoue, soit utiliser des savepoints.
        try:
            # Créer l'utilisateur
            user_in = UserCreate(
                email=student_with_user.email,
                password=student_with_user.password,
                first_name=student_with_user.first_name,
                last_name=student_with_user.last_name,
                user_number=student_with_user.user_number,
                is_active=True,
                is_superuser=False
            )
            user = user_service.create_user(user_in)
            
            # Attribuer automatiquement le rôle STUDENT
            try:
                role_service.assign_role_to_user(user.id, "STUDENT")
            except ValueError:
                # Le rôle STUDENT n'existe pas, le créer
                role_service.get_or_create_role("STUDENT", "Étudiant", "Peut consulter ses cours et notes")
                role_service.assign_role_to_user(user.id, "STUDENT")
            
            # Créer l'étudiant
            student_in = StudentCreate(
                admission_date=student_with_user.admission_date,
                expected_graduation_date=student_with_user.expected_graduation_date,
                program_level_id=student_with_user.program_level_id,
                current_year_level=student_with_user.current_year_level,
                status=student_with_user.status,
                is_scholarship=student_with_user.is_scholarship,
                scholarship_type=student_with_user.scholarship_type,
                emergency_contact_name=student_with_user.emergency_contact_name,
                emergency_contact_phone=student_with_user.emergency_contact_phone,
                emergency_contact_relationship=student_with_user.emergency_contact_relationship,
                notes=student_with_user.notes,
                user_id=user.id
            )
            
            student = Student.model_validate(student_in)
            return self.repository.create(student)
            
        except Exception as e:
            # Rollback effectif car on l'a fait planter avant le commit final?
            # En fait BaseRepository fait des commits partiels.
            # Pour un vrai "rollback", on devrait supprimer l'utilisateur si la création de l'étudiant échoue.
            if 'user' in locals():
                self.session.delete(user)
                self.session.commit()
            raise e

    def update_student(
        self, student_id: uuid.UUID, student_update: StudentUpdate
    ) -> Optional[Student]:
        """Met à jour un étudiant avec validations."""
        student = self.repository.get_by_id(student_id)
        if not student:
            return None

        # Mettre à jour
        update_data = student_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        return self.repository.update(student_id, update_data)

    def get_by_user_id(self, user_id: uuid.UUID) -> Optional[Student]:
        """Récupère un étudiant par son user_id."""
        return self.repository.get_by_user_id(user_id)

    def get_by_student_number(self, student_number: str) -> Optional[Student]:
        """Récupère un étudiant par son numéro."""
        return self.repository.get_by_student_number(student_number)

    def get_by_program(
        self, program_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants d'un programme."""
        return self.repository.get_by_program(program_id, skip, limit)

    def get_active_students(
        self, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants actifs."""
        return self.repository.get_active_students(skip, limit)

    def get_by_year_level(
        self, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants par niveau d'année."""
        return self.repository.get_by_year_level(year_level, skip, limit)

    def get_by_program_level_and_year(
        self, program_level_id: uuid.UUID, year_level: int, skip: int = 0, limit: int = 100
    ) -> list[Student]:
        """Récupère les étudiants par program_level_id et year_level."""
        return self.repository.get_by_program_level_and_year(program_level_id, year_level, skip, limit)

    def update_gpa(self, student_id: uuid.UUID, new_gpa: float) -> Optional[Student]:
        """Met à jour le GPA d'un étudiant."""
        if new_gpa < 0.0 or new_gpa > 4.0:
            raise ValueError("GPA must be between 0.0 and 4.0")
        return self.repository.update_gpa(student_id, new_gpa)

    def get_theoretical_courses_by_year(
        self, student_number: str, year_level: int, session_number: Optional[int] = None
    ) -> list[CoursePublic]:
        """Récupère les cours théoriques d'un étudiant pour une année donnée."""
        return self.repository.get_theoretical_courses(student_number, year_level, session_number)

    def get_grades_by_year_with_course_info(
        self,
        student_number: str,
        year_level: int,
        session_number: Optional[int] = None,
        assessment_type: Optional[str] = None,
        assessment_query: Optional[str] = None,
        is_passing: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> GradesWithCourseInfo:
        """Récupère les notes d'un étudiant pour une année avec infos complètes du cours."""
        student = self.get_by_student_number(student_number)
        if not student:
            raise ValueError("Student not found")
            
        raw_results = self.repository.get_student_grades_by_year_with_course_info(
            student.id,
            year_level,
            session_number,
            assessment_type,
            assessment_query,
            is_passing,
            skip,
            limit
        )
        
        # Convertir en objets GradeWithCourseInfo
        grades = [GradeWithCourseInfo(**item) for item in raw_results]
        
        # Compter le total
        total_count = self.repository.count_student_grades_by_year(
            student.id,
            year_level,
            session_number,
            assessment_type,
            assessment_query,
            is_passing
        )
        
        return GradesWithCourseInfo(data=grades, count=total_count)