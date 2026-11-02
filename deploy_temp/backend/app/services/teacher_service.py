import uuid
from typing import List, Optional
from sqlmodel import Session
from app.models.teacher import Teacher, TeacherCreate, TeacherUpdate, TeacherWithUserCreate
from app.models.user import UserCreate
from app.repositories.teacher_repository import TeacherRepository
from app.services.auth_service import UserService
from app.services.role_service import RoleService

class TeacherService:
    @staticmethod
    def get_teacher(session: Session, teacher_id: uuid.UUID) -> Optional[Teacher]:
        return TeacherRepository.get_by_id(session, teacher_id)

    @staticmethod
    def get_teachers(session: Session, skip: int = 0, limit: int = 100) -> List[Teacher]:
        return TeacherRepository.get_all(session, skip=skip, limit=limit)

    @staticmethod
    def get_by_user_id(session: Session, user_id: uuid.UUID) -> Optional[Teacher]:
        return TeacherRepository.get_by_user_id(session, user_id)

    @staticmethod
    def get_by_id(session: Session, teacher_id: uuid.UUID) -> Optional[Teacher]:
        return TeacherRepository.get_by_id(session, teacher_id)

    @staticmethod
    def get_by_user_number(session: Session, user_number: str) -> Optional[Teacher]:
        """Récupère un professeur par son numéro d'utilisateur."""
        return TeacherRepository.get_by_user_number(session, user_number)

    @staticmethod
    def get_active_teachers(session: Session, skip: int = 0, limit: int = 100) -> List[Teacher]:
        # Pour l'instant, retourne tous les teachers actifs (is_active=True sur le user)
        # TODO: ajouter filter sur user.is_active dans le repository si nécessaire
        return TeacherRepository.get_all(session, skip=skip, limit=limit)

    @staticmethod
    def get_by_department(session: Session, department_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[Teacher]:
        from sqlmodel import select
        statement = select(Teacher).where(Teacher.department_id == department_id).offset(skip).limit(limit)
        return list(session.exec(statement))

    @staticmethod
    def create_teacher(session: Session, teacher_in: TeacherCreate) -> Teacher:
        return TeacherRepository.create(session, teacher_in)

    @staticmethod
    def create_teacher_with_user(session: Session, teacher_with_user: TeacherWithUserCreate) -> Teacher:
        """Crée un utilisateur et un professeur dans la même opération."""
        user_service = UserService(session)
        role_service = RoleService(session)
        repository = TeacherRepository()
        
        # 1. Validations préliminaires
        if user_service.get_by_email(teacher_with_user.email):
            raise ValueError(f"Email {teacher_with_user.email} already registered")
        
        if repository.exists_user_number(session, teacher_with_user.user_number):
            raise ValueError(f"User number {teacher_with_user.user_number} already exists")

        # 2. Création
        try:
            # Créer l'utilisateur
            user_in = UserCreate(
                email=teacher_with_user.email,
                password=teacher_with_user.password,
                first_name=teacher_with_user.first_name,
                last_name=teacher_with_user.last_name,
                user_number=teacher_with_user.user_number,
                is_active=True,
                is_superuser=False
            )
            user = user_service.create_user(user_in)
            
            # Attribuer automatiquement le rôle TEACHER
            try:
                role_service.assign_role_to_user(user.id, "TEACHER")
            except ValueError:
                # Le rôle TEACHER n'existe pas, le créer
                role_service.get_or_create_role("TEACHER", "Enseignant", "Peut gérer les cours, notes et présences")
                role_service.assign_role_to_user(user.id, "TEACHER")
            
            # Créer le professeur
            teacher_in = TeacherCreate(
                hire_date=teacher_with_user.hire_date,
                specialization=teacher_with_user.specialization,
                academic_rank=teacher_with_user.academic_rank,
                user_id=user.id
            )
            
            return repository.create(session, teacher_in)
            
        except Exception as e:
            if 'user' in locals():
                session.delete(user)
                session.commit()
            raise e

    @staticmethod
    def update_teacher(session: Session, teacher_id: uuid.UUID, teacher_in: TeacherUpdate) -> Optional[Teacher]:
        return TeacherRepository.update(session, teacher_id, teacher_in)

    @staticmethod
    def delete_teacher(session: Session, teacher_id: uuid.UUID) -> bool:
        return TeacherRepository.delete(session, teacher_id)