import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ajouter le répertoire parent au Python path pour s'assurer que 'app' peut être importé
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)  # Remonte au niveau 'backend'
backend_dir = os.path.dirname(parent_dir)  # Remonte au niveau 'backend' racine

# S'assurer que le bon répertoire backend est dans le path en premier
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if parent_dir in sys.path:
    sys.path.remove(parent_dir)

print(f"Current dir: {current_dir}")
print(f"Parent dir: {parent_dir}")
print(f"Backend dir: {backend_dir}")
print(f"Python path (first 3): {sys.path[:3]}")

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)

# Import de façon plus robuste
target_metadata = None

try:
    print("Tentative d'import des modèles...")
    
    # Import SQLModel
    from sqlmodel import SQLModel
    print("SQLModel importé")
    
    # Import des configurations
    from app.core.config import settings
    print("Settings importé")
    
    # Import des modèles de base (obligatoires)
    try:
        # Test d'import du package models
        import app.models
        print(f"Package app.models importé depuis: {app.models.__file__}")
        
        from app.models import User, Item
        print("User et Item importés")
    except ImportError as e:
        print(f"Erreur import User/Item: {e}")
        # Essayer une approche alternative
        try:
            sys.path.insert(0, os.path.join(backend_dir, 'app'))
            from models import User, Item
            print("User et Item importés (méthode alternative)")
        except ImportError as e2:
            print(f"Erreur alternative: {e2}")
            raise e
    
    # Import des autres modèles (optionnel)
    models_imported = []
    try:
        from app.models import (
            University, ProgramLevel, Permission, Role, RolePermission,
            UserRole, Department, Faculty, Program, AcademicYear, Session,
            Course, CourseProgramLevel, Student, Teacher, CourseSession,
            Enrollment, Schedule, AttendanceSession, Assessment,
            AttendanceRecord, Grade
        )
        models_imported = [
            "University", "ProgramLevel", "Permission", "Role", "RolePermission",
            "UserRole", "Department", "Faculty", "Program", "AcademicYear", 
            "Session", "Course", "CourseProgramLevel", "Student", "Teacher", 
            "CourseSession", "Enrollment", "Schedule", "AttendanceSession", 
            "Assessment", "AttendanceRecord", "Grade"
        ]
        print(f"{len(models_imported)} modèles additionnels importés")
    except ImportError as e:
        print(f"Certains modèles n'ont pas pu être importés: {e}")
        print("   Continuing with basic models only...")
    
    # Configuration des metadata
    target_metadata = SQLModel.metadata
    print(f"Metadata configuré - {len(target_metadata.tables)} tables détectées")
    
    if len(target_metadata.tables) == 0:
        print("Aucune table détectée dans les metadata!")
    else:
        print(f"   Tables: {list(target_metadata.tables.keys())[:5]}...")

except Exception as e:
    print(f"Erreur critique lors de l'import: {e}")
    print(f"   Python path: {sys.path[:2]}")
    print(f"   Current dir: {current_dir}")
    print(f"   Parent dir: {parent_dir}")
    # En cas d'erreur, on met metadata à None
    target_metadata = None
    raise


def get_url():
    return str(settings.SQLALCHEMY_DATABASE_URI)


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url, 
        target_metadata=target_metadata, 
        literal_binds=True, 
        compare_type=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata, 
            compare_type=True
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()