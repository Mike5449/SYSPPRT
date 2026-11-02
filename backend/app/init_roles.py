"""
Script pour initialiser les rôles par défaut dans la base de données.
"""
from sqlmodel import Session

from app.core.db import engine
from app.services.role_service import RoleService


def init_roles() -> None:
    """Initialise les rôles par défaut."""
    with Session(engine) as session:
        role_service = RoleService(session)
        
        print("🔧 Initialisation des rôles par défaut...")
        
        # Créer les rôles par défaut
        role_service.initialize_default_roles()
        
        print("✅ Rôles initialisés avec succès!")
        print("   - ADMIN: Administrateur")
        print("   - TEACHER: Enseignant")
        print("   - STUDENT: Étudiant")
        print("   - STAFF: Personnel")


if __name__ == "__main__":
    print("Initialisation des rôles...")
    init_roles()
    print("Terminé!")
