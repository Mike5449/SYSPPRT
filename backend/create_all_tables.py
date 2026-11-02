#!/usr/bin/env python3
"""
Script de création manuelle des tables
Alternative à Alembic en cas de problème d'environnement
"""

import os
import sys

# Forcer le bon répertoire
project_root = r"C:\Users\DELL\OneDrive\Desktop\full-stack-fastapi-template\backend"
os.chdir(project_root)
sys.path.insert(0, project_root)

print(f"📁 Répertoire de travail: {os.getcwd()}")
print(f"🐍 Python path: {sys.path[0]}")

try:
    # Import de tous les modèles
    from sqlmodel import SQLModel, create_engine
    from app.core.config import settings
    
    # Import des modèles (ceci va les enregistrer dans SQLModel.metadata)
    from app.models import (
        User, Item, University, ProgramLevel, Permission, Role, RolePermission,
        UserRole, Department, Faculty, Program, AcademicYear, Session, Course,
        CourseProgramLevel, Student, Teacher, CourseSession, Enrollment,
        Schedule, AttendanceSession, Assessment, AttendanceRecord, Grade
    )
    
    print("✅ Tous les modèles importés avec succès")
    
    # Créer l'engine
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI), echo=True)
    
    # Créer toutes les tables
    print("\n=== Création des tables ===")
    SQLModel.metadata.create_all(engine)
    
    # Lister les tables créées
    tables = list(SQLModel.metadata.tables.keys())
    print(f"\n✅ {len(tables)} tables créées avec succès:")
    for table in sorted(tables):
        print(f"   📋 {table}")
        
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
