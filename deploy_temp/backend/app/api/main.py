from fastapi import APIRouter

from app.api.routes import (
    items,
    login,
    users,
    utils,
    universities,
    program_levels,
    departments,
    faculties,
    programs,
    academic_years,
    sessions,
    courses,
    course_program_levels,
    course_sessions,
    schedules,
    attendance_sessions,
    attendance_records,
    students,
    enrollments,
    assessments,
    grades,
    teachers,  # Ajouté ici
    attendance_qr,
    student_grade_views,
    student_attendance_views,
    student_courses_views,
    student_assessments_views,
    roles,  # Ajout pour la gestion des rôles
    student_analytics,
    teacher_analytics,
)

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(utils.router, prefix="/utils", tags=["utils"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(universities.router, prefix="/universities", tags=["universities"])
api_router.include_router(program_levels.router, prefix="/program-levels", tags=["program-levels"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(faculties.router, prefix="/faculties", tags=["faculties"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(academic_years.router, prefix="/academic-years", tags=["academic-years"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(course_program_levels.router, prefix="/course-program-levels", tags=["course-program-levels"])
api_router.include_router(course_sessions.router, prefix="/course-sessions", tags=["course-sessions"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(attendance_sessions.router, prefix="/attendance-sessions", tags=["attendance-sessions"])
api_router.include_router(attendance_records.router, prefix="/attendance-records", tags=["attendance-records"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(enrollments.router, prefix="/enrollments", tags=["enrollments"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
api_router.include_router(grades.router, prefix="/grades", tags=["grades"])
api_router.include_router(teachers.router, prefix="/teachers", tags=["teachers"])  # Ajouté ici
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])  # Ajout pour la gestion des rôles
api_router.include_router(attendance_qr.router, prefix="/attendance-qr", tags=["attendance-qr"])
api_router.include_router(student_grade_views.router, prefix="/student-grade-views", tags=["student-grade-views"])
api_router.include_router(student_attendance_views.router, prefix="/student-attendance-views", tags=["student-attendance-views"])
api_router.include_router(student_courses_views.router, prefix="/student-courses-views", tags=["student-courses-views"])
api_router.include_router(student_assessments_views.router, prefix="/student-assessments-views", tags=["student-assessments-views"])
api_router.include_router(student_analytics.router, prefix="/student-analytics", tags=["student-analytics"])
api_router.include_router(teacher_analytics.router, prefix="/teacher-analytics", tags=["teacher-analytics"])
