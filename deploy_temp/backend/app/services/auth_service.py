import uuid
from typing import Optional, Any
from sqlmodel import Session
from app.core.security import get_password_hash, verify_password
from app.models.user import (
    User,
    UserCreate,
    UserUpdate,
    UserUpdateMe,
    UpdatePassword,
)
from app.repositories.user_repository import UserRepository
from app.services.base_service import BaseService
from datetime import timedelta
from app.core import security
from app.core.config import settings
from app.models.common import Token


class UserService(BaseService[User, UserRepository]):
    """Service pour la gestion des utilisateurs."""

    def __init__(self, session: Session):
        repository = UserRepository(session)
        super().__init__(repository)

    def create_user(self, user_create: UserCreate) -> User:
        """Crée un nouvel utilisateur avec mot de passe hashé."""
        from app.services.role_service import RoleService
        
        # Vérifier si l'email existe déjà
        if self.repository.email_exists(user_create.email):
            raise ValueError("Email already registered")

        # Créer l'utilisateur avec mot de passe hashé
        db_user = User.model_validate(
            user_create,
            update={
                "hashed_password": get_password_hash(user_create.password)
            },
        )
        created_user = self.repository.create(db_user)
        
        # Attribuer automatiquement le rôle ADMIN si c'est un superutilisateur
        if created_user.is_superuser:
            role_service = RoleService(self.repository.session)
            try:
                role_service.assign_role_to_user(created_user.id, "ADMIN")
            except ValueError:
                # Le rôle ADMIN n'existe pas, le créer
                role_service.get_or_create_role("ADMIN", "Administrateur", "Accès complet à toutes les fonctionnalités")
                role_service.assign_role_to_user(created_user.id, "ADMIN")
        
        return created_user

    def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authentifie un utilisateur."""
        user = self.repository.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def update_user(
        self, user_id: uuid.UUID, user_update: UserUpdate
    ) -> Optional[User]:
        """Met à jour un utilisateur."""
        db_user = self.repository.get_by_id(user_id)
        if not db_user:
            return None

        update_data = user_update.model_dump(exclude_unset=True)
        
        # Vérifier si l'email est déjà pris par un autre utilisateur
        if "email" in update_data:
            if self.repository.email_exists(update_data["email"], exclude_id=user_id):
                raise ValueError("Email already registered")
        
        # Si le mot de passe est mis à jour, le hasher
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(
                update_data.pop("password")
            )
        
        return self.repository.update(user_id, update_data)

    def update_user_me(
        self, user_id: uuid.UUID, user_update: UserUpdateMe
    ) -> Optional[User]:
        """Met à jour le profil de l'utilisateur connecté."""
        db_user = self.repository.get_by_id(user_id)
        if not db_user:
            return None

        update_data = user_update.model_dump(exclude_unset=True)
        
        # Vérifier si l'email est déjà pris
        if "email" in update_data:
            if self.repository.email_exists(update_data["email"], exclude_id=user_id):
                raise ValueError("Email already registered")
        
        return self.repository.update(user_id, update_data)

    def update_password(
        self, user_id: uuid.UUID, password_update: UpdatePassword
    ) -> bool:
        """Met à jour le mot de passe de l'utilisateur."""
        user = self.repository.get_by_id(user_id)
        if not user:
            return False
        
        # Vérifier l'ancien mot de passe
        if not verify_password(
            password_update.current_password, user.hashed_password
        ):
            raise ValueError("Incorrect password")
        
        # Mettre à jour avec le nouveau mot de passe
        update_data = {
            "hashed_password": get_password_hash(password_update.new_password)
        }
        self.repository.update(user_id, update_data)
        return True

    def get_by_email(self, email: str) -> Optional[User]:
        """Récupère un utilisateur par email."""
        return self.repository.get_by_email(email)

    def get_active_users(self, skip: int = 0, limit: int = 100):
        """Récupère les utilisateurs actifs."""
        return self.repository.get_active_users(skip, limit)

    def get_users_paginated(self, skip: int = 0, limit: int = 100):
        """Récupère les utilisateurs avec pagination."""
        return self.repository.get_users_paginated(skip, limit)


class AuthService:
    """Service pour la gestion de l'authentification."""

    def __init__(self, session: Session):
        self.session = session
        self.user_service = UserService(session)

    def login(self, email: str, password: str) -> Optional[Token]:
        """Authentifie un utilisateur et retourne un token."""
        user = self.user_service.authenticate(email=email, password=password)
        
        if not user:
            return None
        
        if not user.is_active:
            return None
        
        # Récupérer les rôles et permissions
        roles = [role.name for role in user.roles]
        permissions = set()
        for role in user.roles:
            for perm in role.permissions:
                permissions.add(perm.name)
        
        extra_claims = {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "roles": roles,
            "permissions": list(permissions)
        }
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            user.id, expires_delta=access_token_expires, extra_claims=extra_claims
        )
        
        return Token(access_token=access_token, token_type="bearer")

    def verify_user_active(self, user: User) -> bool:
        """Vérifie si un utilisateur est actif."""
        return user.is_active

    def verify_user_superuser(self, user: User) -> bool:
        """Vérifie si un utilisateur est superuser."""
        return user.is_superuser