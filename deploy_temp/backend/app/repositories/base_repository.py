import uuid
from typing import Generic, TypeVar, Type, Optional, List
from sqlmodel import Session, select

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """
    Classe de base pour tous les repositories.
    Fournit les opérations CRUD de base.
    """

    def __init__(self, model: Type[ModelType], session: Session):
        self.model = model
        self.session = session

    def get_by_id(self, id: uuid.UUID) -> Optional[ModelType]:
        """Récupère une entité par son ID (UUID)."""
        return self.session.get(self.model, id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Récupère toutes les entités avec pagination."""
        statement = select(self.model).offset(skip).limit(limit)
        return self.session.exec(statement).all()

    def get_by_filter(self, **filters) -> List[ModelType]:
        """Récupère les entités selon des filtres."""
        statement = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                statement = statement.where(getattr(self.model, key) == value)
        return self.session.exec(statement).all()

    def create(self, obj: ModelType) -> ModelType:
        """Crée une nouvelle entité."""
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        return obj

    def update(self, id: uuid.UUID, obj_data: dict) -> Optional[ModelType]:
        """Met à jour une entité existante."""
        db_obj = self.get_by_id(id)
        if not db_obj:
            return None
        
        for key, value in obj_data.items():
            if hasattr(db_obj, key) and value is not None:
                setattr(db_obj, key, value)
        
        self.session.add(db_obj)
        self.session.commit()
        self.session.refresh(db_obj)
        return db_obj

    def delete(self, id: uuid.UUID) -> bool:
        """Supprime une entité."""
        db_obj = self.get_by_id(id)
        if not db_obj:
            return False
        
        self.session.delete(db_obj)
        self.session.commit()
        return True

    def count(self) -> int:
        """Compte le nombre total d'entités."""
        statement = select(self.model)
        return len(self.session.exec(statement).all())

    def exists(self, id: uuid.UUID) -> bool:
        """Vérifie si une entité existe."""
        return self.get_by_id(id) is not None