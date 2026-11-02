import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

def list_cols():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return
    engine = create_engine(db_url)
    inspector = inspect(engine)
    print("Columns:", [c['name'] for c in inspector.get_columns('course_session')])

if __name__ == "__main__":
    list_cols()
