#!/usr/bin/env python3
"""
Script pour créer les tables manuellement sans Alembic
Utilisé en cas de problème avec les migrations
"""

import asyncio
import os
import sys

# Ajouter le répertoire courant au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel, create_engine
from app.core.config import settings
from app.models import *  # Import tous les modèles

async def create_tables():
    """Créer toutes les tables manuellement"""
    print("=== Création manuelle des tables ===")
    
    try:
        # Créer l'engine
        engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI), echo=True)
        print("✅ Engine créé avec succès")
        
        # Créer toutes les tables
        SQLModel.metadata.create_all(engine)
        print("✅ Toutes les tables créées avec succès")
        
        # Afficher les tables créées
        tables = list(SQLModel.metadata.tables.keys())
        print(f"📊 {len(tables)} tables créées:")
        for table in sorted(tables):
            print(f"   - {table}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la création des tables: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_tables())
