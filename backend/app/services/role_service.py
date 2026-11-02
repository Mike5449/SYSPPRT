"""
Service pour la gestion des rôles et permissions.
"""
import uuid
from typing import Optional

from sqlmodel import Session, select

from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole


class RoleService:
    """Service pour gérer les rôles et leur attribution aux utilisateurs."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_role_by_code(self, code: str) -> Optional[Role]:
        """Récupère un rôle par son code."""
        statement = select(Role).where(Role.code == code, Role.is_active == True)
        return self.session.exec(statement).first()
    
    def get_or_create_role(self, code: str, name: str, description: str = "") -> Role:
        """Récupère un rôle existant ou le crée s'il n'existe pas."""
        role = self.get_role_by_code(code)
        
        if not role:
            role = Role(
                code=code,
                name=name,
                description=description,
                is_active=True
            )
            self.session.add(role)
            self.session.commit()
            self.session.refresh(role)
        
        return role
    
    def assign_role_to_user(self, user_id: uuid.UUID, role_code: str) -> bool:
        """
        Assigne un rôle à un utilisateur.
        
        Args:
            user_id: ID de l'utilisateur
            role_code: Code du rôle (ex: "STUDENT", "TEACHER", "ADMIN")
        
        Returns:
            True si le rôle a été assigné, False si déjà existant
        """
        # Vérifier si le rôle existe
        role = self.get_role_by_code(role_code)
        if not role:
            raise ValueError(f"Role with code '{role_code}' not found")
        
        # Vérifier si l'utilisateur a déjà ce rôle
        existing = self.session.exec(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role_id == role.id
            )
        ).first()
        
        if existing:
            return False  # Déjà assigné
        
        # Créer l'association
        user_role = UserRole(
            user_id=user_id,
            role_id=role.id
        )
        self.session.add(user_role)
        self.session.commit()
        
        return True
    
    def remove_role_from_user(self, user_id: uuid.UUID, role_code: str) -> bool:
        """Retire un rôle d'un utilisateur."""
        role = self.get_role_by_code(role_code)
        if not role:
            return False
        
        user_role = self.session.exec(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role_id == role.id
            )
        ).first()
        
        if user_role:
            self.session.delete(user_role)
            self.session.commit()
            return True
        
        return False
    
    def get_user_roles(self, user_id: uuid.UUID) -> list[Role]:
        """Récupère tous les rôles d'un utilisateur."""
        statement = (
            select(Role)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id, Role.is_active == True)
        )
        return list(self.session.exec(statement).all())
    
    def get_all_roles(self) -> list[Role]:
        """Récupère tous les rôles disponibles."""
        statement = select(Role).where(Role.is_active == True)
        return list(self.session.exec(statement).all())
    
    def user_has_role(self, user_id: uuid.UUID, role_code: str) -> bool:
        """Vérifie si un utilisateur a un rôle spécifique."""
        role = self.get_role_by_code(role_code)
        if not role:
            return False
        
        exists = self.session.exec(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role_id == role.id
            )
        ).first()
        
        return exists is not None
    
    def initialize_default_roles(self):
        """Crée les rôles par défaut s'ils n'existent pas."""
        default_roles = [
            ("ADMIN", "Administrateur", "Accès complet à toutes les fonctionnalités"),
            ("TEACHER", "Enseignant", "Peut gérer les cours, notes et présences"),
            ("STUDENT", "Étudiant", "Peut consulter ses cours et notes"),
            ("STAFF", "Personnel", "Personnel administratif"),
        ]
        
        for code, name, description in default_roles:
            self.get_or_create_role(code, name, description)
