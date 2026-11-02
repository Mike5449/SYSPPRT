import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import select, Session

from app.models.teacher import Teacher, TeacherCreate, TeacherUpdate
from app.models.user import User

if TYPE_CHECKING:
    from app.models.course_session import CourseSession

class TeacherRepository:
    @staticmethod
    def get_by_id(session: Session, teacher_id: uuid.UUID) -> Optional[Teacher]:
        statement = select(Teacher).where(Teacher.id == teacher_id)
        return session.exec(statement).first()

    @staticmethod
    def get_all(session: Session, skip: int = 0, limit: int = 100) -> List[Teacher]:
        statement = select(Teacher).offset(skip).limit(limit)
        return list(session.exec(statement))

    @staticmethod
    def get_by_user_number(session: Session, user_number: str) -> Optional[Teacher]:
        """Récupère un professeur par son numéro d'utilisateur."""
        statement = (
            select(Teacher)
            .join(User, Teacher.user_id == User.id)
            .where(User.user_number == user_number)
        )
        return session.exec(statement).first()

    @staticmethod
    def get_by_user_id(session: Session, user_id: uuid.UUID) -> Optional[Teacher]:
        statement = select(Teacher).where(Teacher.user_id == user_id)
        return session.exec(statement).first()

    @staticmethod
    def exists_user_number(session: Session, user_number: str, exclude_id: Optional[uuid.UUID] = None) -> bool:
        """Vérifie si un numéro d'utilisateur existe déjà pour un professeur."""
        statement = select(User).where(User.user_number == user_number)
        if exclude_id:
            # On cherche l'utilisateur lié à ce professeur
            subquery = select(Teacher.user_id).where(Teacher.id == exclude_id)
            user_id_to_exclude = session.exec(subquery).first()
            if user_id_to_exclude:
                statement = statement.where(User.id != user_id_to_exclude)
        return session.exec(statement).first() is not None

    @staticmethod
    def create(session: Session, teacher_in: TeacherCreate) -> Teacher:
        teacher = Teacher.model_validate(teacher_in)
        session.add(teacher)
        session.commit()
        session.refresh(teacher)
        return teacher

    @staticmethod
    def update(session: Session, teacher_id: uuid.UUID, teacher_in: TeacherUpdate) -> Optional[Teacher]:
        teacher = TeacherRepository.get_by_id(session, teacher_id)
        if not teacher:
            return None
        teacher_data = teacher_in.model_dump(exclude_unset=True)
        for key, value in teacher_data.items():
            setattr(teacher, key, value)
        session.add(teacher)
        session.commit()
        session.refresh(teacher)
        return teacher

    @staticmethod
    def delete(session: Session, teacher_id: uuid.UUID) -> bool:
        teacher = TeacherRepository.get_by_id(session, teacher_id)
        if not teacher:
            return False
        session.delete(teacher)
        session.commit()
        return True