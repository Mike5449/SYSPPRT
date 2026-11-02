import logging
import random
from datetime import date, datetime, time
import uuid
from typing import List

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine, create_db_and_tables
from app.core.security import get_password_hash
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
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.course_session import CourseSession
from app.models.enrollment import Enrollment
from app.models.schedule import Schedule
from app.models.attendance_session import AttendanceSession
from app.models.assessment import Assessment
from app.models.attendance_record import AttendanceRecord
from app.models.grade import Grade

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_all_initial_data() -> None:
    """Create all initial data in a single session to avoid DetachedInstanceError."""
    logger.info("Starting complete database initialization...")
    
    # Create tables
    logger.info("Creating database tables...")
    create_db_and_tables()
    logger.info(" Tables created successfully")
    
    # Use single session for all operations
    with Session(engine) as session:
        logger.info(" Creating initial data in single session...")
        
        # 1. Users (no dependencies)
        logger.info(" Creating users...")
        users = []
        users_data = [
            {"email": "admin@example.com", "full_name": "Admin Super", "is_superuser": True},
            {"email": "marie.dupont@example.com", "full_name": "Marie Dupont", "is_superuser": False},
            {"email": "jean.martin@example.com", "full_name": "Jean Martin", "is_superuser": False},
            {"email": "sophie.bernard@example.com", "full_name": "Sophie Bernard", "is_superuser": False},
            {"email": "pierre.michel@example.com", "full_name": "Pierre Michel", "is_superuser": False},
            {"email": "lucie.robert@example.com", "full_name": "Lucie Robert", "is_superuser": False},
            {"email": "thomas.petit@example.com", "full_name": "Thomas Petit", "is_superuser": False},
            {"email": "claire.roux@example.com", "full_name": "Claire Roux", "is_superuser": False},
            {"email": "nicolas.moreau@example.com", "full_name": "Nicolas Moreau", "is_superuser": False},
            {"email": "julie.fournier@example.com", "full_name": "Julie Fournier", "is_superuser": False},
        ]
        
        for user_data in users_data:
            user_data["hashed_password"] = get_password_hash("password123")
            user = User(**user_data)
            session.add(user)
            users.append(user)
        session.flush()  # Get IDs
        logger.info(f" Created {len(users)} users")
        
        # 2. Items (depends on users)
        logger.info(" Creating items...")
        items = []
        items_data = [
            "Ordinateur portable", "Livres de programmation", "Tableau blanc", 
            "Projecteur", "Camra de surveillance", "Imprimante", "Scanner", 
            "Serveur", "Switch rseau", "Chaises de bureau"
        ]
        
        for i, title in enumerate(items_data):
            owner = users[i % len(users)]
            item = Item(
                title=title,
                description=f"Description pour {title}",
                owner_id=owner.id
            )
            session.add(item)
            items.append(item)
        session.flush()
        logger.info(f" Created {len(items)} items")
        
        # 3. Universities (no dependencies)
        logger.info(" Creating universities...")
        universities = []
        universities_data = [
            {"name": "Universit d'tat d'Hati", "code": "UEH", "country": "Haiti", "city": "Port-au-Prince"},
            {"name": "Universit Quisqueya", "code": "UNIQ", "country": "Haiti", "city": "Port-au-Prince"},
            {"name": "Universit Notre Dame d'Hati", "code": "UNDH", "country": "Haiti", "city": "Port-au-Prince"},
            {"name": "Universit Adventiste d'Hati", "code": "UNAH", "country": "Haiti", "city": "Diquini"},
            {"name": "Universit des Carabes", "code": "UC", "country": "Haiti", "city": "Port-au-Prince"},
            {"name": "Universit Lumire", "code": "UL", "country": "Haiti", "city": "Cap-Hatien"},
            {"name": "Institut Universitaire du Sud", "code": "IUS", "country": "Haiti", "city": "Cayes"},
            {"name": "Universit Publique du Nord", "code": "UPN", "country": "Haiti", "city": "Cap-Hatien"},
            {"name": "Universit Chrtienne du Nord", "code": "UCNH", "country": "Haiti", "city": "Limbe"},
            {"name": "Universit Royale d'Hati", "code": "URH", "country": "Haiti", "city": "Ption-Ville"},
        ]
        
        for univ_data in universities_data:
            univ_data.update({
                "established_year": random.randint(1980, 2020),
                "address": f"Adresse {univ_data['name']}, {univ_data['city']}",
                "phone": f"+509 {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
                "email": f"contact@{univ_data['code'].lower()}.edu.ht",
                "website": f"https://www.{univ_data['code'].lower()}.edu.ht",
                "is_active": True,
            })
            university = University(**univ_data)
            session.add(university)
            universities.append(university)
        session.flush()
        logger.info(f" Created {len(universities)} universities")
        
        
        # 5. Permissions (no dependencies)
        logger.info(" Creating permissions...")
        permissions = []
        permissions_data = [
            "read", "write", "delete", "admin", "manage_users", 
            "manage_courses", "manage_students", "view_reports", 
            "manage_grades", "manage_attendance"
        ]
        
        for perm_name in permissions_data:
            permission = Permission(
                name=perm_name,
                description=f"Permission to {perm_name.replace('_', ' ')}",
                is_active=True
            )
            session.add(permission)
            permissions.append(permission)
        session.flush()
        logger.info(f" Created {len(permissions)} permissions")
        
        # 6. Roles (depends on permissions)
        logger.info(" Creating roles...")
        roles = []
        roles_data = ["super_admin", "admin", "teacher", "student", "staff", 
                     "coordinator", "director", "secretary", "manager", "guest"]
        
        for role_name in roles_data:
            role = Role(
                name=role_name,
                description=f"Role for {role_name.replace('_', ' ')}",
                is_active=True
            )
            session.add(role)
            roles.append(role)
        session.flush()
        
        # Assign permissions to roles
        role_permissions = []
        for i, role in enumerate(roles):
            # Each role gets 2-5 random permissions
            num_perms = random.randint(2, min(5, len(permissions)))
            selected_perms = random.sample(permissions, num_perms)
            for perm in selected_perms:
                rp = RolePermission(role_id=role.id, permission_id=perm.id)
                session.add(rp)
                role_permissions.append(rp)
        session.flush()
        logger.info(f" Created {len(roles)} roles with {len(role_permissions)} permissions")
        
        # Commit everything created so far
        session.commit()
        logger.info(" First phase committed successfully")
        
        # Continue with dependent entities...
        logger.info(" Creating departments...")
        departments = []
        dept_names = ["Informatique", "Mathmatiques", "Sciences", "Lettres", 
                     "conomie", "Droit", "Mdecine", "Ingnierie", "Arts", "Gestion"]
        
        for i, dept_name in enumerate(dept_names):
            university = universities[i % len(universities)]
            dept = Department(
                name=dept_name,
                code=f"DEPT{i+1:03d}",
                description=f"Dpartement de {dept_name}",
                university_id=university.id,
                is_active=True
            )
            session.add(dept)
            departments.append(dept)
        session.flush()
        logger.info(f" Created {len(departments)} departments")
        
        logger.info(" Creating faculties...")
        faculties = []
        faculty_names = ["Sciences Exactes", "Sciences Humaines", "Sciences Appliques", 
                        "Lettres et Langues", "Sciences conomiques", "Droit et Sciences Politiques",
                        "Mdecine", "Sciences de l'Ingnieur", "Beaux-Arts", "Sciences de Gestion"]
        
        for i, faculty_name in enumerate(faculty_names):
            department = departments[i % len(departments)]
            faculty = Faculty(
                name=faculty_name,
                code=f"FAC{i+1:03d}",
                description=f"Facult de {faculty_name}",
                department_id=department.id,
                is_active=True
            )
            session.add(faculty)
            faculties.append(faculty)
        session.flush()
        logger.info(f" Created {len(faculties)} faculties")
        
        logger.info(" Creating programs...")
        programs = []
        program_names = ["Informatique Gnrale", "Mathmatiques Appliques", "Sciences Physiques",
                        "Littrature Franaise", "conomie et Gestion", "Droit des Affaires",
                        "Mdecine Gnrale", "Gnie Civil", "Arts Plastiques", "Management"]
        
        for i, program_name in enumerate(program_names):
            faculty = faculties[i % len(faculties)]
            program = Program(
                name=program_name,
                code=f"PROG{i+1:03d}",
                description=f"Programme de {program_name}",
                faculty_id=faculty.id,
                duration_years=random.randint(3, 5),
                degree_type=random.choice(["License", "Master", "Doctorat"]),
                is_active=True
            )
            session.add(program)
            programs.append(program)
        session.flush()
        logger.info(f" Created {len(programs)} programs")

        # Program Levels (depends on Programs)
        logger.info(" Creating program levels...")
        program_levels = []
        for program in programs:
            # Create levels based on degree type if available, otherwise default set
            # Simple approach: L1-L3 for all for simplicity in this script, or adapt based on program name
            levels_config = [
                ("Niveau 1", "L1"), ("Niveau 2", "L2"), ("Niveau 3", "L3")
            ]
            for i, (name_suffix, code_suffix) in enumerate(levels_config):
                level = ProgramLevel(
                    name=f"{program.name} - {name_suffix}",
                    code=f"{program.code}-{code_suffix}",
                    description=f"{name_suffix} for {program.name}",
                    program_id=program.id,
                    is_active=True
                )
                session.add(level)
                program_levels.append(level)
        session.flush()
        logger.info(f" Created {len(program_levels)} program levels")
        
        logger.info(" Creating academic years...")
        academic_years = []
        for i in range(10):
            year = 2020 + i
            academic_year = AcademicYear(
                name=f"Anne Acadmique {year}-{year+1}",
                start_date=date(year, 9, 1),
                end_date=date(year+1, 6, 30),
                is_current=i == 4,  # 2024-2025 is current
                is_active=True
            )
            session.add(academic_year)
            academic_years.append(academic_year)
        session.flush()
        logger.info(f" Created {len(academic_years)} academic years")
        
        logger.info(" Creating sessions...")
        sessions = []
        session_names = ["Automne", "Hiver", "Printemps", "t", "Session Intensive",
                        "Session Rattrapage", "Session Spciale", "Session Continue",
                        "Session Acclre", "Session Normale"]
        
        for i, session_name in enumerate(session_names):
            academic_year = academic_years[i % len(academic_years)]
            session_obj = SessionModel(
                name=session_name,
                code=f"SESS{i+1:03d}",
                start_date=date(2024, 1 + (i % 12), 1),
                end_date=date(2024, 3 + (i % 10), 30),
                academic_year_id=academic_year.id,
                is_active=True
            )
            session.add(session_obj)
            sessions.append(session_obj)
        session.flush()
        logger.info(f" Created {len(sessions)} sessions")
        
        logger.info(" Creating courses...")
        courses = []
        course_names = ["Algorithmique", "Base de Donnes", "Rseaux Informatiques",
                       "Programmation Web", "Intelligence Artificielle", "Scurit Informatique",
                       "Analyse Mathmatique", "Algbre Linaire", "Statistiques", "Physique Quantique"]
        
        for i, course_name in enumerate(course_names):
            course = Course(
                name=course_name,
                code=f"COURS{i+1:03d}",
                description=f"Cours de {course_name}",
                credits=random.randint(3, 6),
                hours_per_week=random.randint(2, 4),
                is_mandatory=random.choice([True, False]),
                is_active=True
            )
            session.add(course)
            courses.append(course)
        session.flush()
        logger.info(f" Created {len(courses)} courses")
        
        logger.info(" Creating course program levels...")
        course_program_levels = []
        for i in range(10):
            course = courses[i % len(courses)]
            program = programs[i % len(programs)]
            program_level = program_levels[i % len(program_levels)]
            
            cpl = CourseProgramLevel(
                course_id=course.id,
                program_id=program_level.program_id,
                program_level_id=program_level.id,
                is_mandatory=random.choice([True, False]),
                semester=random.randint(1, 6),
                is_active=True
            )
            session.add(cpl)
            course_program_levels.append(cpl)
        session.flush()
        logger.info(f" Created {len(course_program_levels)} course program levels")
        
        logger.info(" Creating students...")
        students = []
        first_names = ["Marie", "Jean", "Sophie", "Pierre", "Lucie", "Thomas", "Claire", "Nicolas", "Julie", "Alexandre"]
        last_names = ["Dupont", "Martin", "Bernard", "Michel", "Robert", "Petit", "Roux", "Moreau", "Fournier", "Dubois"]
        
        for i in range(10):
            first_name = first_names[i]
            last_name = last_names[i]
            university = universities[i % len(universities)]
            program = programs[i % len(programs)]
            program_level = program_levels[i % len(program_levels)]
            
            student = Student(
                student_number=f"STU{i+1:06d}",
                first_name=first_name,
                last_name=last_name,
                email=f"{first_name.lower()}.{last_name.lower()}@student.edu",
                phone=f"+509 {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
                date_of_birth=date(1995 + random.randint(0, 8), random.randint(1, 12), random.randint(1, 28)),
                address=f"Adresse {i+1}, Port-au-Prince",
                university_id=university.id,
                program_id=program_level.program_id,
                program_level_id=program_level.id,
                enrollment_year=random.randint(2020, 2024),
                is_active=True
            )
            session.add(student)
            students.append(student)
        session.flush()
        logger.info(f" Created {len(students)} students")
        
        logger.info(" Creating teachers...")
        teachers = []
        teacher_names = [
            ("Dr. Paul", "Lefebvre"), ("Prof. Anne", "Girard"), ("Dr. Marc", "Blanc"),
            ("Prof. Sylvie", "Rousseau"), ("Dr. Philippe", "Morel"), ("Prof. Catherine", "Simon"),
            ("Dr. Franois", "Laurent"), ("Prof. Isabelle", "Leroy"), ("Dr. Antoine", "Mercier"),
            ("Prof. Nathalie", "Durand")
        ]
        
        for i, (first_name, last_name) in enumerate(teacher_names):
            university = universities[i % len(universities)]
            department = departments[i % len(departments)]
            
            teacher = Teacher(
                employee_number=f"TEACH{i+1:05d}",
                first_name=first_name,
                last_name=last_name,
                email=f"{first_name.lower()}.{last_name.lower()}@university.edu",
                phone=f"+509 {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
                specialization=course_names[i],
                hire_date=date(2010 + random.randint(0, 14), random.randint(1, 12), random.randint(1, 28)),
                university_id=university.id,
                department_id=department.id,
                is_active=True
            )
            session.add(teacher)
            teachers.append(teacher)
        session.flush()
        logger.info(f" Created {len(teachers)} teachers")
        
        # Final commit
        session.commit()
        logger.info(" All initial data created successfully!")
        
        # Summary
        logger.info("="*60)
        logger.info(" SUMMARY OF CREATED DATA:")
        logger.info(f"    Users: {len(users)}")
        logger.info(f"    Items: {len(items)}")
        logger.info(f"    Universities: {len(universities)}")
        logger.info(f"    Program Levels: {len(program_levels)}")
        logger.info(f"    Permissions: {len(permissions)}")
        logger.info(f"    Roles: {len(roles)}")
        logger.info(f"    Departments: {len(departments)}")
        logger.info(f"    Faculties: {len(faculties)}")
        logger.info(f"    Programs: {len(programs)}")
        logger.info(f"    Academic Years: {len(academic_years)}")
        logger.info(f"    Sessions: {len(sessions)}")
        logger.info(f"    Courses: {len(courses)}")
        logger.info(f"    Course Program Levels: {len(course_program_levels)}")
        logger.info(f"    Students: {len(students)}")
        logger.info(f"    Teachers: {len(teachers)}")
        logger.info("="*60)


if __name__ == "__main__":
    create_all_initial_data()