"""Script de test pour initialiser toutes les données étape par étape."""

import logging
import random
from datetime import date, datetime, time
import uuid
import hashlib
from typing import List

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine, create_db_and_tables

# Import seulement les modèles de base au début
from app.models.user import User
from app.models.item import Item
from app.models.university import University
from app.models.program_level import ProgramLevel

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def simple_password_hash(password: str) -> str:
    """Simple password hash for testing."""
    return hashlib.sha256(password.encode()).hexdigest()


def create_basic_data() -> None:
    """Créer les données de base (User, Item, University, ProgramLevel)."""
    logger.info("🚀 Starting basic data initialization...")
    
    create_db_and_tables()
    logger.info("✅ Tables created")
    
    with Session(engine) as session:
        # 1. Users
        logger.info("👤 Creating users...")
        users = []
        for i in range(10):
            user = User(
                email=f"user{i+1}@example.com",
                full_name=f"User {i+1}",
                hashed_password=simple_password_hash("password123"),
                is_active=True,
                is_superuser=(i == 0)
            )
            session.add(user)
            users.append(user)
        session.flush()
        logger.info(f"✅ Created {len(users)} users")
        
        # 2. Items
        logger.info("📦 Creating items...")
        items = []
        for i in range(10):
            owner = users[i % len(users)]
            item = Item(
                title=f"Item {i+1}",
                description=f"Description for item {i+1}",
                owner_id=owner.id
            )
            session.add(item)
            items.append(item)
        session.flush()
        logger.info(f"✅ Created {len(items)} items")
        
        # 3. Universities
        logger.info("🏛️ Creating universities...")
        universities = []
        for i in range(10):
            university = University(
                name=f"Université {i+1}",
                code=f"UNI{i+1:03d}",
                country="Haiti",
                city=f"Ville {i+1}",
                address=f"Adresse {i+1}",
                established_year=2000 + i,
                phone=f"+509 {1000+i} {2000+i}",
                email=f"contact@uni{i+1}.edu.ht",
                website=f"https://uni{i+1}.edu.ht",
                is_active=True
            )
            session.add(university)
            universities.append(university)
        session.flush()
        logger.info(f"✅ Created {len(universities)} universities")
        
        # 4. Program Levels
        logger.info("🎓 Creating program levels...")
        levels = []
        level_names = ["L1", "L2", "L3", "M1", "M2", "DUT1", "DUT2", "BTS1", "BTS2", "DOC"]
        for i, name in enumerate(level_names):
            level = ProgramLevel(
                name=f"Niveau {name}",
                code=name,
                level_number=i+1,
                description=f"Description du niveau {name}",
                is_active=True
            )
            session.add(level)
            levels.append(level)
        session.flush()
        logger.info(f"✅ Created {len(levels)} program levels")
        
        # Commit tout
        session.commit()
        logger.info("💾 All basic data committed successfully!")
        
        # Résumé
        logger.info("="*50)
        logger.info("📊 BASIC DATA CREATED:")
        logger.info(f"   👤 Users: {len(users)}")
        logger.info(f"   📦 Items: {len(items)}")
        logger.info(f"   🏛️ Universities: {len(universities)}")
        logger.info(f"   🎓 Program Levels: {len(levels)}")
        logger.info("="*50)


if __name__ == "__main__":
    create_basic_data()