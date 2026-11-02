import logging
from sqlalchemy import create_engine, text
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_programs():
    # Use autocommit
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI), isolation_level="AUTOCOMMIT")
    
    with engine.connect() as connection:
        try:
            logger.info("Resetting Program and ProgramLevel data...")
            
            # Delete in order of dependency
            # Students depend on ProgramLevel
            # CourseProgramLevel depends on ProgramLevel
            # ProgramLevel depends on Program (now)
            
            # Start clean slate
            # Note: We need CASCADE to handle students etc.
            # But CASCADE might delete users if not careful? 
            # Student -> User is OneToOne usually? No, User exists independent.
            # Student depends on User.
            
            # Let's try TRUNCATE CASCADE if supported, or DELETE
            connection.execute(text("TRUNCATE TABLE program_level CASCADE"))
            connection.execute(text("TRUNCATE TABLE program CASCADE"))
            
            # Also truncate student? (Cascaded by program_level truncate usually)
            # But lets be safe.
            # connection.execute(text("TRUNCATE TABLE student CASCADE"))
            
            logger.info("Data reset successful!")
            
        except Exception as e:
            logger.error(f"Reset failed: {e}")
            raise

if __name__ == "__main__":
    reset_programs()
