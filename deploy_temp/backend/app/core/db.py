from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models import User, UserCreate

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# ==================================================================================
# IMPORT DE TOUS LES MODLES SQLMODEL POUR L'ENREGISTREMENT DES TABLES
# ==================================================================================
# IMPORTANT: Tous les modles SQLModel avec table=True doivent tre imports
# AVANT l'initialisation de la DB pour que SQLModel puisse crer les relations
# correctement. Ceci vite les erreurs de foreign key et de relationships.
# 
# Rfrence: https://github.com/fastapi/full-stack-fastapi-template/issues/28

#  Import optimis depuis app.models avec ordre des dpendances respect
from app.models import SQLMODEL_TABLE_MODELS  # noqa: F401

# Alternative: Import direct de tous les modles table
# Cette approche garantit que TOUS les modles sont enregistrs mme si
# la liste SQLMODEL_TABLE_MODELS tait incomplte
from app.models import (  # noqa: F401
    # Modles de base
    User,
    Item,
    
    # Structure organisationnelle
    University,
    Department,
    Faculty,
    ProgramLevel,
    Program,
    
    # Systme de permissions
    Permission,
    Role,
    RolePermission,
    UserRole,
    
    # Systme acadmique
    AcademicYear,
    Session,
    Course,
    CourseProgramLevel,
    CourseSession,
    
    # Utilisateurs spcialiss
    Student,
    Teacher,
    
    # Inscriptions et planification
    Enrollment,
    Schedule,
    
    # Prsence et valuations
    AttendanceSession,
    AttendanceRecord,
    Assessment,
    Grade,
)


def create_db_and_tables() -> None:
    """
    Cre la base de donnes et toutes les tables.
      UTILIS PAR initial_data.py et pour le dveloppement
    """
    from sqlmodel import SQLModel
    
    print("Creation de toutes les tables...")
    print(f"{len(SQLMODEL_TABLE_MODELS)} modeles SQLModel detectes")
    
    # Afficher la liste des modles qui vont crer des tables
    for i, model in enumerate(SQLMODEL_TABLE_MODELS, 1):
        table_name = getattr(model, '__tablename__', 'UNKNOWN')
        print(f"  {i:2d}. {model.__name__}  {table_name}")
    
    # Crer toutes les tables
    SQLModel.metadata.create_all(engine)
    print("Toutes les tables ont t cres")


def init_db(session: Session) -> None:
    # ==================================================================================
    # INITIALISATION DE LA BASE DE DONNES
    # ==================================================================================
    # 
    # MTHODE 1: Tables cres avec Alembic migrations (RECOMMAND)
    # Les tables sont cres via les migrations Alembic, ce qui permet un meilleur
    # contrle de la structure de la DB et des changements de schma.
    #
    # MTHODE 2: Cration directe des tables (DVELOPPEMENT UNIQUEMENT)
    # Dcommentez les lignes ci-dessous pour crer les tables directement
    # via SQLModel.metadata.create_all(). Utile pour le dveloppement rapide.
    
    #   DVELOPPEMENT UNIQUEMENT - Tables cres automatiquement
    from sqlmodel import SQLModel
    
    # Forcer la cration de TOUTES les tables directement
    print("Creation forcee de toutes les tables via SQLModel...")
    SQLModel.metadata.create_all(engine)
    
    # Vrification
    created_tables = list(SQLModel.metadata.tables.keys())
    print(f"{len(created_tables)} tables creees: {', '.join(sorted(created_tables))}")
    
    if len(created_tables) < 10:
        print(" Peu de tables cres - vrifiez les imports des modles")
    else:
        print("Succs probable!")
    
    # ==================================================================================
    # CRATION DE L'UTILISATEUR SUPER ADMIN PAR DFAUT
    # ==================================================================================
    
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        from app.core.security import get_password_hash
        
        user = User(
            email=settings.FIRST_SUPERUSER,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            is_superuser=True,
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"Premier superuser cree: {user.email}")


def get_db_tables_info() -> dict:
    """
    Fonction utilitaire pour obtenir des informations sur les tables.
    Utile pour le debugging et la vrification.
    """
    from sqlmodel import SQLModel
    
    tables_info = {
        "expected_tables": len(SQLMODEL_TABLE_MODELS),
        "registered_tables": len(SQLModel.metadata.tables),
        "table_names": list(SQLModel.metadata.tables.keys()),
        "models_with_tables": [
            model.__tablename__ for model in SQLMODEL_TABLE_MODELS 
            if hasattr(model, '__tablename__')
        ]
    }
    
    return tables_info


def create_tables_force() -> None:
    """
    Force la cration de toutes les tables.
      UTILISEZ UNIQUEMENT EN DVELOPPEMENT!
    """
    from sqlmodel import SQLModel
    
    print("Creation forcee de toutes les tables...")
    print(f"{len(SQLMODEL_TABLE_MODELS)} modeles a creer")
    
    # Crer toutes les tables
    SQLModel.metadata.create_all(engine)
    
    # Vrification
    info = get_db_tables_info()
    print(f"{info['registered_tables']} tables enregistrees dans SQLModel")
    print(f" Tables: {', '.join(info['table_names'])}")
    
    return info