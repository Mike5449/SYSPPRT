"""Script final pour crer 10 enregistrements dans TOUTES les 25 tables."""

import logging
import random
from datetime import date, datetime, time
import uuid
import hashlib
from typing import List
from enum import Enum

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine, create_db_and_tables

# Import de tous les modles ncessaires
from app.models.user import User
from app.models.item import Item
from app.models.university import University
from app.models.program_level import ProgramLevel
from app.models.permission import Permission
from app.models.role import Role, RolePermission
from app.models.user_role import UserRole
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.program import Program
from app.models.academic_year import AcademicYear
from app.models.session import Session as SessionModel
from app.models.course import Course
from app.models.course_program_level import CourseProgramLevel
from app.models.student import Student, StudentStatus
from app.models.teacher import Teacher, TeacherStatus
from app.models.course_session import CourseSession
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.schedule import Schedule
from app.models.attendance_session import AttendanceSession
from app.models.assessment import Assessment
from app.models.attendance_record import AttendanceRecord, AttendanceStatus
from app.models.grade import Grade

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def simple_password_hash(password: str) -> str:
    """Hash simple pour viter les problmes bcrypt."""
    return hashlib.sha256(password.encode()).hexdigest()


def get_letter_grade(score: float, max_score: float) -> str:
    """Convertir un score en note littrale."""
    percentage = (score / max_score) * 100
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"


def get_grade_points(score: float, max_score: float) -> float:
    """Convertir un score en points GPA (0-4)."""
    percentage = (score / max_score) * 100
    if percentage >= 90:
        return 4.0
    elif percentage >= 80:
        return 3.0
    elif percentage >= 70:
        return 2.0
    elif percentage >= 60:
        return 1.0
    else:
        return 0.0


def create_complete_initial_data() -> None:
    """Crer 10 enregistrements pour chaque table du systme acadmique."""
    logger.info("Starting complete initialization (24 tables x 10 records)")
    
    create_db_and_tables()
    logger.info("Tables created")
    
    with Session(engine) as session:
        
        # =================== NIVEAU 1: Modles indpendants ===================
        
        # 1. Universities (indpendant)
        logger.info("[1/24] Creating Universities...")
        universities = []
        for i in range(10):
            university = University(
                name=f"Universit {i+1}",
                code=f"UNI{i+1:03d}",
                country="Haiti",
                city=["Port-au-Prince", "Cap-Hatien", "Gonaves", "Saint-Marc", "Jacmel", "Jrmie", "Cayes", "Fort-de-France", "Ptionville", "Carrefour"][i],
                address=f"{i+1} Avenue de l'Universit",
                established_year=1980 + i*4,
                phone=f"+509 {2800+i*10} {3000+i*10}",
                email=f"contact@uni{i+1}.edu.ht",
                website=f"https://uni{i+1}.edu.ht",
                is_active=True
            )
            session.add(university)
            universities.append(university)
        session.flush()
        logger.info(f" Cr {len(universities)} universits")
        
        
        # 3. Users (indpendant)
        logger.info(" [3/25] Creating Users...")
        users = []
        for i in range(10):
            user = User(
                email=f"user{i+1}@example.com",
                full_name=f"Utilisateur {i+1}",
                hashed_password=simple_password_hash("password123"),
                is_active=True,
                is_superuser=(i == 0)
            )
            session.add(user)
            users.append(user)
        session.flush()
        logger.info(f"Created {len(users)} users")
        
        # 4. Permissions (indpendant)
        logger.info("[4/25] Creating Permissions...")
        permissions = []
        permissions_data = [
            {"name": "read", "code": "READ", "resource": "all", "action": "read"},
            {"name": "write", "code": "WRITE", "resource": "all", "action": "write"},
            {"name": "delete", "code": "DELETE", "resource": "all", "action": "delete"},
            {"name": "admin", "code": "ADMIN", "resource": "system", "action": "manage"},
            {"name": "manage_users", "code": "MANAGE_USERS", "resource": "users", "action": "manage"},
            {"name": "manage_courses", "code": "MANAGE_COURSES", "resource": "courses", "action": "manage"},
            {"name": "manage_students", "code": "MANAGE_STUDENTS", "resource": "students", "action": "manage"},
            {"name": "view_reports", "code": "VIEW_REPORTS", "resource": "reports", "action": "read"},
            {"name": "manage_grades", "code": "MANAGE_GRADES", "resource": "grades", "action": "manage"},
            {"name": "manage_attendance", "code": "MANAGE_ATTENDANCE", "resource": "attendance", "action": "manage"},
        ]
        for i, perm_data in enumerate(permissions_data):
            permission = Permission(
                name=perm_data["name"],
                code=perm_data["code"],
                description=f"Permission pour {perm_data['name'].replace('_', ' ')}",
                resource=perm_data["resource"],
                action=perm_data["action"],
                is_active=True
            )
            session.add(permission)
            permissions.append(permission)
        session.flush()
        logger.info(f"Created {len(permissions)} permissions")
        
        # 5. Academic Years (indpendant)
        logger.info("[5/25] Creating Academic Years...")
        academic_years = []
        for i in range(10):
            year = 2015 + i
            academic_year = AcademicYear(
                name=f"Anne Acadmique {year}-{year+1}",
                code=f"AY{year}-{str(year+1)[2:]}",  # "AY2015-16", "AY2016-17", etc.
                start_date=date(year, 9, 1),
                end_date=date(year+1, 6, 30),
                is_current=(i == 9),  # 2024-2025 is current
                is_active=True,
                description=f"Anne acadmique {year}-{year+1} - description complte"
            )
            session.add(academic_year)
            academic_years.append(academic_year)
        session.flush()
        logger.info(f"Created {len(academic_years)} academic years")
        
        # 6. Courses (indpendant)
        logger.info("[6/25] Creating Courses...")
        courses = []
        course_names = ["Algorithmique", "Base de Donnes", "Rseaux Informatiques", "Programmation Web", "Intelligence Artificielle", "Scurit Informatique", "Analyse Mathmatique", "Algbre Linaire", "Statistiques", "Physique Quantique"]
        for i, course_name in enumerate(course_names):
            course = Course(
                name=course_name,
                code=f"COURS{i+1:03d}",
                description=f"Cours de {course_name} - description complte",
                credits=random.randint(3, 6),
                hours_per_week=random.randint(2, 5),
                is_mandatory=random.choice([True, False]),
                prerequisites=f"Prrequis pour {course_name}" if i > 2 else None,
                syllabus=f"Programme dtaill du cours {course_name}",
                is_active=True
            )
            session.add(course)
            courses.append(course)
        session.flush()
        logger.info(f"Created {len(courses)} courses")
        
        # =================== NIVEAU 2: Modles avec 1 dpendance ===================
        
        # 7. Items (dpend de Users)
        logger.info("[7/25] Creating Items...")
        items = []
        item_names = ["Ordinateur portable", "Livres", "Tableau blanc", "Projecteur", "Camra", "Imprimante", "Scanner", "Serveur", "Switch rseau", "Chaises bureau"]
        for i, item_name in enumerate(item_names):
            owner = users[i % len(users)]
            item = Item(
                title=item_name,
                description=f"Description dtaille de {item_name}",
                owner_id=owner.id
            )
            session.add(item)
            items.append(item)
        session.flush()
        logger.info(f"Created {len(items)} items")
        
        # 8. Roles (dpend de Permissions)
        logger.info("[8/25] Creating Roles...")
        roles = []
        roles_data = [
            ("super_admin", "SUPER_ADMIN", "Rle super administrateur systme"),
            ("admin", "ADMIN", "Rle administrateur"),
            ("teacher", "TEACHER", "Rle enseignant/professeur"),
            ("student", "STUDENT", "Rle tudiant"),
            ("staff", "STAFF", "Rle personnel administratif"),
            ("coordinator", "COORDINATOR", "Rle coordinateur pdagogique"),
            ("director", "DIRECTOR", "Rle directeur d'tablissement"),
            ("secretary", "SECRETARY", "Rle secrtaire"),
            ("manager", "MANAGER", "Rle gestionnaire"),
            ("guest", "GUEST", "Rle invit/visiteur"),
        ]
        for i, (role_name, role_code, description) in enumerate(roles_data):
            role = Role(
                name=role_name,
                code=role_code,
                description=description,
                is_active=True
            )
            session.add(role)
            roles.append(role)
        session.flush()
        logger.info(f"Created {len(roles)} roles")
        
        # 9. Departments (dpend de Universities)
        logger.info("[9/25] Creating Departments...")
        departments = []
        dept_names = ["Informatique", "Mathmatiques", "Sciences", "Lettres", "conomie", "Droit", "Mdecine", "Ingnierie", "Arts", "Gestion"]
        for i, dept_name in enumerate(dept_names):
            department = Department(
                name=dept_name,
                code=f"DEPT{i+1:03d}",
                description=f"Dpartement de {dept_name} - description complte",
                head_of_department=f"Chef {dept_name}",
                email=f"{dept_name.lower()}@dept{i+1}.edu.ht",
                phone=f"+509 {3000+i*10} {4000+i*10}",
                office_location=f"Btiment {dept_name}",
                is_active=True
            )
            session.add(department)
            departments.append(department)
        session.flush()
        logger.info(f"Created {len(departments)} departments")
        
        # 10. Sessions (dpend de Academic Years)
        logger.info("[10/25] Creating Sessions...")
        sessions = []
        session_data = [
            ("Session Automne", "AUT", 1), ("Session Hiver", "HIV", 2), ("Session Printemps", "PRI", 1),
            ("Session t", "ETE", 2), ("Session Intensive", "INT", 1), ("Session Rattrapage", "RAT", 2),
            ("Session Spciale", "SPE", 1), ("Session Continue", "CON", 2), ("Session Acclre", "ACC", 1),
            ("Session Normale", "NOR", 2)
        ]
        for i, (session_name, code_suffix, session_number) in enumerate(session_data):
            academic_year = academic_years[i % len(academic_years)]
            session_obj = SessionModel(
                name=session_name,
                code=f"{code_suffix}-{2024+i}",
                session_number=session_number,
                start_date=date(2024, 1 + (i % 12), 1),
                end_date=date(2024, 3 + (i % 10), 28),
                academic_year_id=academic_year.id,
                is_active=True,
                description=f"Description de la {session_name} - session {session_number}"
            )
            session.add(session_obj)
            sessions.append(session_obj)
        session.flush()
        logger.info(f"Created {len(sessions)} sessions")
        
        # =================== NIVEAU 3: Modles avec 2+ dpendances ===================
        
        # 11. Role Permissions (dpend de Roles + Permissions)
        logger.info("[11/25] Creating Role Permissions...")
        role_permissions = []
        for i in range(10):
            role = roles[i % len(roles)]
            permission = permissions[i % len(permissions)]
            rp = RolePermission(
                role_id=role.id,
                permission_id=permission.id
            )
            session.add(rp)
            role_permissions.append(rp)
        session.flush()
        logger.info(f"Created {len(role_permissions)} role permissions")
        
        # 12. User Roles (dpend de Users + Roles)
        logger.info("[12/25] Creating User Roles...")
        user_roles = []
        for i in range(10):
            user = users[i % len(users)]
            role = roles[i % len(roles)]
            ur = UserRole(
                user_id=user.id,
                role_id=role.id,
                assigned_by=users[0].id,
                assigned_at=datetime.utcnow(),
                is_active=True
            )
            session.add(ur)
            user_roles.append(ur)
        session.flush()
        logger.info(f"Created {len(user_roles)} user roles")
        
        # 13. Faculties (dpend de Departments)
        logger.info("[13/25] Creating Faculties...")
        faculties = []
        faculty_names = ["Sciences Exactes", "Sciences Humaines", "Sciences Appliques", "Lettres et Langues", "Sciences conomiques", "Droit et Sciences Politiques", "Mdecine", "Sciences de l'Ingnieur", "Beaux-Arts", "Sciences de Gestion"]
        for i, faculty_name in enumerate(faculty_names):
            department = departments[i % len(departments)]
            faculty = Faculty(
                name=faculty_name,
                code=f"FAC{i+1:03d}",
                description=f"Facult de {faculty_name}",
                dean_name=f"Doyen {faculty_name}",
                email=f"doyen.{faculty_name.lower().replace(' ', '.')}@uni.edu.ht",
                phone=f"+509 {4000+i*10} {5000+i*10}",
                office_location=f"Bureau Doyen {faculty_name}",
                established_year=1995 + i,
                department_id=department.id,
                is_active=True
            )
            session.add(faculty)
            faculties.append(faculty)
        session.flush()
        logger.info(f"Created {len(faculties)} faculties")
        
        # 14. Programs (dpend de Faculties)
        logger.info("[14/25] Creating Programs...")
        programs = []
        program_names = ["Informatique Gnrale", "Mathmatiques Appliques", "Sciences Physiques", "Littrature Franaise", "conomie et Gestion", "Droit des Affaires", "Mdecine Gnrale", "Gnie Civil", "Arts Plastiques", "Management"]
        for i, program_name in enumerate(program_names):
            faculty = faculties[i % len(faculties)]
            program = Program(
                name=program_name,
                code=f"PROG{i+1:03d}",
                description=f"Programme de {program_name} - description complte",
                faculty_id=faculty.id,
                credits_required=180 + i * 10,  # 180, 190, 200, etc.
                tuition_fee=5000.0 + i * 500,  # Frais de scolarit
                language="French",
                admission_requirements=f"Exigences d'admission pour {program_name}",
                career_prospects=f"Perspectives de carrire en {program_name}",
                is_active=True
            )
            session.add(program)
            programs.append(program)
        session.flush()
        session.flush()
        logger.info(f"Created {len(programs)} programs")

        # 14b. Program Levels (dpend de Programs) - Former step 2
        logger.info("[14b/25] Creating Program Levels...")
        program_levels = []
        # Assign levels to programs
        for i, program in enumerate(programs):
            # Create 3 levels per program for example
            for level_num in range(1, 4):
                 program_level = ProgramLevel(
                    name=f"Niveau {level_num} - {program.name}",
                    code=f"{program.code}-L{level_num}",
                    description=f"Niveau {level_num} pour {program.name}",
                    is_active=True,
                    program_id=program.id
                )
                 session.add(program_level)
                 program_levels.append(program_level)
        session.flush()
        logger.info(f"Created {len(program_levels)} program levels")
        
        # 15. Course Program Levels (dpend de Courses + Programs + Program Levels)
        logger.info("[15/25] Creating Course Program Levels...")
        course_program_levels = []
        for i in range(10):
            course = courses[i % len(courses)]
            program_level = program_levels[i % len(program_levels)]
            cpl = CourseProgramLevel(
                year_level=random.randint(1, 4),  #  Champ requis ajout
                course_id=course.id,
                program_level_id=program_level.id,
                is_active=True
            )
            session.add(cpl)
            course_program_levels.append(cpl)
        session.flush()
        logger.info(f"Created {len(course_program_levels)} course program levels")
        
        # 16. Students (dpend de Users + Program Levels)
        logger.info("[16/25] Creating Students...")
        students = []
        for i in range(10):
            user = users[i % len(users)]  # Associer  un User existant
            program_level = program_levels[i % len(program_levels)]
            student = Student(
                student_number=f"STU{2024}{i+1:05d}",
                admission_date=date(2020 + (i % 5), 9, 1),
                expected_graduation_date=date(2024 + (i % 3), 6, 30),
                status=StudentStatus.ACTIVE,
                gpa=round(2.5 + random.random() * 1.5, 2),  # GPA entre 2.5 et 4.0
                total_credits_earned=random.randint(0, 120),
                current_year_level=random.randint(1, 4),
                is_scholarship=random.choice([True, False]),
                scholarship_type=f"Bourse {i+1}" if random.choice([True, False]) else None,
                emergency_contact_name=f"Contact Urgence {i+1}",
                emergency_contact_phone=f"+509 {7000+i*10} {8000+i*10}",
                emergency_contact_relationship=random.choice(["Parent", "Conjoint", "Frre/Sur", "Ami"]),
                notes=f"Notes tudiant {i+1}",
                user_id=user.id,  #  Champ requis ajout
                program_level_id=program_level.id
            )
            session.add(student)
            students.append(student)
        session.flush()
        logger.info(f"Created {len(students)} students")
        
        # 17. Teachers (dpend de Users)
        logger.info("[17/25] Creating Teachers...")
        teachers = []
        for i in range(10):
            # Crer de nouveaux users pour les enseignants (on ne peut pas rutiliser les mmes)
            teacher_user = User(
                email=f"teacher{i+1}@university.edu",
                full_name=f"Professeur {i+1}",
                hashed_password=simple_password_hash("password123"),
                is_active=True,
                is_superuser=False
            )
            session.add(teacher_user)
            session.flush()  # Pour obtenir l'ID
            
            teacher = Teacher(
                employee_number=f"TEACH{2024}{i+1:04d}",
                hire_date=date(2010 + i, (i % 12) + 1, (i % 28) + 1),
                status=TeacherStatus.ACTIVE,
                specialization=courses[i % len(courses)].name,
                office_location=f"Bureau {i+1}, Btiment Enseignants",
                phone_extension=f"ext{1000+i}",
                research_interests=f"Recherche en {courses[i % len(courses)].name}",
                academic_rank=random.choice(["Professor", "Associate Professor", "Assistant Professor"]),
                max_course_load=random.randint(3, 6),
                user_id=teacher_user.id  #  Champ requis ajout
            )
            session.add(teacher)
            teachers.append(teacher)
        session.flush()
        logger.info(f"Created {len(teachers)} teachers")
        
        # =================== NIVEAU 4: Modles avec 3+ dpendances ===================
        
        # 18. Course Sessions (dpend de Course Program Levels + Sessions + Teachers)
        logger.info("[18/25] Creating Course Sessions...")
        course_sessions = []
        for i in range(10):
            course_program_level = course_program_levels[i % len(course_program_levels)]
            session_obj = sessions[i % len(sessions)]
            teacher = teachers[i % len(teachers)]
            course_session = CourseSession(
                classroom=f"Salle {100 + i + 1}",
                max_students=25 + (i % 4) * 5,  # 25, 30, 35, 40
                year_level=random.randint(1, 4),
                schedule_info=f"Lundi/Mercredi {8 + (i % 6)}h-{9 + (i % 6)}h",
                is_active=True,
                course_program_level_id=course_program_level.id,
                session_id=session_obj.id,
                teacher_id=teacher.id
            )
            session.add(course_session)
            course_sessions.append(course_session)
        session.flush()
        logger.info(f"Created {len(course_sessions)} course sessions")
        
        # 19. Enrollments (dpend de Students + Course Sessions)
        logger.info("[19/25] Creating Enrollments...")
        enrollments = []
        for i in range(10):
            student = students[i % len(students)]
            course_session = course_sessions[i % len(course_sessions)]
            enrollment = Enrollment(
                enrollment_date=date(2024, 1 + (i % 6), 1 + (i % 10)),
                status=EnrollmentStatus.ENROLLED,
                grade_points=0.0,
                credits_earned=0,
                is_audit=random.choice([True, False]),
                notes=f"Notes d'inscription pour tudiant {student.student_number}",
                student_id=student.id,
                course_session_id=course_session.id,
                is_active=True
            )
            session.add(enrollment)
            enrollments.append(enrollment)
        session.flush()
        logger.info(f"Created {len(enrollments)} enrollments")
        
        # 20. Schedules (dpend de Course Sessions)
        logger.info("[20/25] Creating Schedules...")
        schedules = []
        for i in range(10):
            course_session = course_sessions[i % len(course_sessions)]
            schedule = Schedule(
                day_of_week=i % 7,  #  0=Lundi, 1=Mardi, ..., 6=Dimanche
                start_time=time(8 + (i % 6), 0),
                end_time=time(10 + (i % 4), 0),
                room=f"Salle {100 + i}",  #  Champ correct
                building=f"Btiment {(i % 3) + 1}",  #  Champ correct
                notes=f"Notes horaire {i+1}",
                course_session_id=course_session.id,
                is_active=True
            )
            session.add(schedule)
            schedules.append(schedule)
        session.flush()
        logger.info(f"Created {len(schedules)} schedules")
        
        # 21. Attendance Sessions (dpend de Course Sessions)
        logger.info("[21/25] Creating Attendance Sessions...")
        attendance_sessions = []
        for i in range(10):
            schedule = schedules[i % len(schedules)]
            session_date_base = date(2024, 1 + (i % 12), 1 + (i % 28))
            start_time = datetime.combine(session_date_base, datetime.min.time().replace(hour=8 + (i % 10), minute=(i % 4) * 15))
            end_time = datetime.combine(session_date_base, datetime.min.time().replace(hour=start_time.hour + 1 + (i % 3), minute=start_time.minute))
            
            attendance_session = AttendanceSession(
                session_date=session_date_base,
                start_time=start_time,
                end_time=end_time,
                actual_room=f"Salle {i+1}",
                actual_building=f"Btiment {chr(65 + (i % 5))}",  # A, B, C, D, E
                topic=f"Sujet {i+1} - Introduction aux concepts",
                description=f"Description dtaille de la session {i+1}",
                is_cancelled=False,
                attendance_taken=random.choice([True, False]),
                total_students=random.randint(15, 50),
                present_students=random.randint(10, 45),
                absent_students=random.randint(0, 10),
                late_students=random.randint(0, 5),
                schedule_id=schedule.id
            )
            session.add(attendance_session)
            attendance_sessions.append(attendance_session)
        session.flush()
        logger.info(f"Created {len(attendance_sessions)} attendance sessions")
        
        # 22. Assessments (dpend de Course Sessions)
        logger.info("[22/25] Creating Assessments...")
        assessments = []
        assessment_types = ["assignment", "quiz", "midterm", "final", "project", "presentation", "lab", "participation"]
        for i in range(10):
            course_session = course_sessions[i % len(course_sessions)]
            assessment = Assessment(
                name=f"valuation {i+1}",
                description=f"Description dtaille de l'valuation {i+1}",
                assessment_type=assessment_types[i % len(assessment_types)],
                max_score=random.choice([20.0, 50.0, 100.0]),
                weight=round(random.uniform(0.1, 0.4), 2),  # Entre 10% et 40%
                due_date=date(2024, 3 + (i % 8), 1 + (i % 20)),
                assessment_date=date(2024, 3 + (i % 8), 1 + (i % 20)),
                duration_minutes=random.randint(60, 180),
                is_mandatory=random.choice([True, False]),
                passing_score=random.choice([10.0, 12.0, 15.0, 20.0]),
                instructions=f"Instructions pour l'valuation {i+1}",
                is_published=random.choice([True, False]),
                course_session_id=course_session.id
            )
            session.add(assessment)
            assessments.append(assessment)
        session.flush()
        logger.info(f"Created {len(assessments)} assessments")
        
        # =================== NIVEAU 5: Modles finaux ===================
        
        # 23. Attendance Records (dpend de Attendance Sessions + Students)
        logger.info("[23/25] Creating Attendance Records...")
        attendance_records = []
        attendance_statuses = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED]
        for i in range(10):
            attendance_session = attendance_sessions[i % len(attendance_sessions)]
            student = students[i % len(students)]
            attendance_record = AttendanceRecord(
                status=attendance_statuses[i % len(attendance_statuses)],
                arrival_time=datetime.combine(attendance_session.session_date, datetime.min.time().replace(hour=8 + (i % 3), minute=i % 60)) if attendance_statuses[i % len(attendance_statuses)] in [AttendanceStatus.PRESENT, AttendanceStatus.LATE] else None,
                notes=f"Notes prsence tudiant {student.student_number}",
                is_excused=attendance_statuses[i % len(attendance_statuses)] == AttendanceStatus.EXCUSED,
                excuse_document=f"justificatif_{i+1}.pdf" if attendance_statuses[i % len(attendance_statuses)] == AttendanceStatus.EXCUSED else None,
                attendance_session_id=attendance_session.id,
                student_id=student.user_id  # Utilise user_id au lieu de student.id
            )
            session.add(attendance_record)
            attendance_records.append(attendance_record)
        session.flush()
        logger.info(f"Created {len(attendance_records)} attendance records")
        
        # 24. Grades (dpend de Assessments + Enrollments)
        logger.info("[24/25] Creating Grades...")
        grades = []
        for i in range(10):
            assessment = assessments[i % len(assessments)]
            enrollment = enrollments[i % len(enrollments)]
            student = students[i % len(students)]
            teacher = teachers[i % len(teachers)]
            
            score = round(random.uniform(10.0, assessment.max_score), 2)
            grade = Grade(
                score=score,
                letter_grade=get_letter_grade(score, assessment.max_score),
                grade_points=get_grade_points(score, assessment.max_score),
                is_passing=score >= (assessment.passing_score or assessment.max_score * 0.6),
                graded_date=date.today(),
                graded_by=f"Professeur {teacher.employee_number}",
                comments=f"Commentaire pour l'valuation {assessment.name}",
                is_published=random.choice([True, False]),
                student_id=student.id,
                enrollment_id=enrollment.id,
                assessment_id=assessment.id
            )
            session.add(grade)
            grades.append(grade)
        session.flush()
        logger.info(f"Created {len(grades)} grades")
        
        # COMMIT FINAL
        session.commit()
        logger.info("Data committed successfully!")
        
        # Summary
        logger.info("="*70)
        logger.info("COMPLETE SUMMARY - 24 TABLES x 10 RECORDS")
        logger.info("="*70)
        logger.info(f"   [1] Universities: {len(universities)}")
        logger.info(f"   [2] Program Levels: {len(program_levels)}")
        logger.info(f"   [3] Users: {len(users)}")
        logger.info(f"   [4] Permissions: {len(permissions)}")
        logger.info(f"   [5] Academic Years: {len(academic_years)}")
        logger.info(f"   [6] Courses: {len(courses)}")
        logger.info(f"   [7] Items: {len(items)}")
        logger.info(f"   [8] Roles: {len(roles)}")
        logger.info(f"   [9] Departments: {len(departments)}")
        logger.info(f"   [10] Sessions: {len(sessions)}")
        logger.info(f"   [11] Role Permissions: {len(role_permissions)}")
        logger.info(f"   [12] User Roles: {len(user_roles)}")
        logger.info(f"   [13] Faculties: {len(faculties)}")
        logger.info(f"   [14] Programs: {len(programs)}")
        logger.info(f"   [15] Course Program Levels: {len(course_program_levels)}")
        logger.info(f"   [16] Students: {len(students)}")
        logger.info(f"   [17] Teachers: {len(teachers)}")
        logger.info(f"   [18] Course Sessions: {len(course_sessions)}")
        logger.info(f"   [19] Enrollments: {len(enrollments)}")
        logger.info(f"   [20] Schedules: {len(schedules)}")
        logger.info(f"   [21] Attendance Sessions: {len(attendance_sessions)}")
        logger.info(f"   [22] Assessments: {len(assessments)}")
        logger.info(f"   [23] Attendance Records: {len(attendance_records)}")
        logger.info(f"   [24] Grades: {len(grades)}")
        logger.info("="*70)
        logger.info(f"TOTAL: {24} tables with 10 records each = 240 records")
        logger.info("COMPLETE INITIALIZATION SUCCESSFUL!")
        logger.info("="*70)


if __name__ == "__main__":
    create_complete_initial_data()