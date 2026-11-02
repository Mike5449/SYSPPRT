import sys
import os
import time

sys.path.append(os.path.abspath("backend"))

routes = [
    "items", "login", "users", "utils", "universities", "program_levels",
    "departments", "faculties", "programs", "academic_years", "sessions",
    "courses", "course_program_levels", "course_sessions", "schedules",
    "attendance_sessions", "attendance_records", "students", "enrollments",
    "assessments", "grades", "teachers", "attendance_qr", "student_grade_views",
    "student_attendance_views", "student_courses_views", "student_assessments_views",
    "roles", "student_analytics", "teacher_analytics"
]

for route in routes:
    print(f"Importing app.api.routes.{route}...")
    start = time.time()
    try:
        __import__(f"app.api.routes.{route}")
        print(f"SUCCESS: {route} in {time.time() - start:.2f}s")
    except Exception as e:
        print(f"FAILURE: {route} failed: {e}")
        import traceback
        traceback.print_exc()
