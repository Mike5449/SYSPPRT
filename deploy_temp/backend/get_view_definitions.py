from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

views = [
    "v_student_attendance_complete",
    "v_student_courses_complete", 
    "v_student_assessments_complete"
]

with engine.connect() as conn:
    with open("views_utf8_fixed.sql", "w", encoding="utf-8") as f:
        for view_name in views:
            print(f"Processing {view_name}...")
            f.write(f"\n--- View: {view_name} ---\n")
            try:
                # Query pg_get_viewdef for exact definition
                result = conn.execute(text(f"SELECT pg_get_viewdef('{view_name}', true)"))
                definition = result.scalar()
                if definition:
                    f.write(f"CREATE OR REPLACE VIEW {view_name} AS\n")
                    f.write(definition)
                    f.write(";\n")
                else:
                    f.write(f"-- Definition not found for {view_name}\n")
            except Exception as e:
                f.write(f"-- Error fetching definition for {view_name}: {e}\n")
