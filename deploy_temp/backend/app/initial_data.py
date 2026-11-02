import logging



from datetime import date, datetime, time



import uuid



import random



import hashlib



from typing import List







from sqlmodel import Session, select







from app.core.config import settings



from app.core.db import engine, create_db_and_tables



# from app.core.security import get_password_hash  # Temporairement dsactiv



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



from app.models.session import Session as AcademicSession



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







logging.basicConfig(level=logging.INFO)



logger = logging.getLogger(__name__)











def simple_password_hash(password: str) -> str:



    """Simple password hash for initial data - NOT for production use."""



    return hashlib.sha256(password.encode()).hexdigest()











def get_password_hash(password: str) -> str:



    """Temporary password hash function to avoid bcrypt issues."""



    return simple_password_hash(password)











def init_users() -> List[User]:



    """Initialise les utilisateurs (garde l'utilisateur existant + ajoute 9 autres)."""



    with Session(engine) as session:



        users = []



        



        # Crer le premier superutilisateur (existant)



        statement = select(User).where(User.email == settings.FIRST_SUPERUSER)



        user = session.exec(statement).first()



        



        if not user:



            db_user = User(



                email=settings.FIRST_SUPERUSER,



                hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),



                first_name="Super",



                last_name="Admin",



                is_active=True,



                is_superuser=True,



            )



            session.add(db_user)



            session.commit()



            session.refresh(db_user)



            logger.info(f"First superuser created: {db_user.email}")



            users.append(db_user)



        else:



            logger.info(f"First superuser already exists: {user.email}")



            users.append(user)



        



        # Ajouter 9 utilisateurs additionnels



        additional_users_data = [



            {"email": "director@university.ht", "first_name": "Jean", "last_name": "Directeur", "is_superuser": False},



            {"email": "admin@university.ht", "first_name": "Marie", "last_name": "Administrateur", "is_superuser": False},



            {"email": "teacher1@university.ht", "first_name": "Pierre", "last_name": "Professeur", "is_superuser": False},



            {"email": "teacher2@university.ht", "first_name": "Claudette", "last_name": "Enseignant", "is_superuser": False},



            {"email": "student1@student.ht", "first_name": "Alex", "last_name": "tudiant", "is_superuser": False},



            {"email": "student2@student.ht", "first_name": "Sophie", "last_name": "tudiante", "is_superuser": False},



            {"email": "registrar@university.ht", "first_name": "Paul", "last_name": "Registraire", "is_superuser": False},



            {"email": "librarian@university.ht", "first_name": "Anne", "last_name": "Bibliothcaire", "is_superuser": False},



            {"email": "maintenance@university.ht", "first_name": "Jacques", "last_name": "Maintenance", "is_superuser": False},



        ]



        



        for user_data in additional_users_data:



            # Vrifier si l'utilisateur existe dj



            statement = select(User).where(User.email == user_data["email"])



            existing_user = session.exec(statement).first()



            



            if not existing_user:



                new_user = User(



                    email=user_data["email"],



                    hashed_password=get_password_hash("password123"),



                    first_name=user_data["first_name"],



                    last_name=user_data["last_name"],



                    is_active=True,



                    is_superuser=user_data["is_superuser"],



                )



                session.add(new_user)



                session.commit()



                session.refresh(new_user)



                users.append(new_user)



                logger.info(f"User created: {new_user.email}")



        



        return users











def init_items() -> List[Item]:



    """Initialise 10 items pour les utilisateurs."""



    with Session(engine) as session:



        # Rcuprer les utilisateurs existants depuis la base de donnes



        users = session.exec(select(User)).all()



        if not users:



            logger.warning("No users found for items initialization")



            return []



            



        items = []



        items_data = [



            {"title": "Ordinateur portable", "description": "Ordinateur portable pour les cours"},



            {"title": "Livres de programmation", "description": "Collection de livres sur la programmation"},



            {"title": "Tableau blanc", "description": "Tableau blanc pour la salle de classe"},



            {"title": "Projecteur", "description": "Projecteur pour les prsentations"},



            {"title": "Camra de surveillance", "description": "Camra pour la scurit du campus"},



            {"title": "Imprimante", "description": "Imprimante pour les documents administratifs"},



            {"title": "Scanner", "description": "Scanner pour numriser les documents"},



            {"title": "Serveur", "description": "Serveur pour hberger les applications"},



            {"title": "Switch rseau", "description": "Switch pour la connectivit rseau"},



            {"title": "Chaises de bureau", "description": "Chaises ergonomiques pour les bureaux"},



        ]



        



        for i, item_data in enumerate(items_data):



            owner = users[i % len(users)]  # Distribuer les items entre les utilisateurs



            item = Item(



                title=item_data["title"],



                description=item_data["description"],



                owner_id=owner.id



            )



            session.add(item)



            items.append(item)



        



        session.commit()



        for item in items:



            session.refresh(item)



        logger.info(f"Created {len(items)} items")



        return items











def init_universities(session: Session) -> List[University]:



    """Initialise 10 universits."""



    universities = []



    universities_data = [



        {"name": "Universit d'tat d'Hati", "code": "UEH", "country": "Haiti", "city": "Port-au-Prince", "established_year": 1944},



        {"name": "Universit Quisqueya", "code": "UNIQ", "country": "Haiti", "city": "Port-au-Prince", "established_year": 1988},



        {"name": "Universit Notre Dame d'Hati", "code": "UNDH", "country": "Haiti", "city": "Port-au-Prince", "established_year": 1995},



        {"name": "Universit Adventiste d'Hati", "code": "UNAH", "country": "Haiti", "city": "Diquini", "established_year": 1989},



        {"name": "Universit des Carabes", "code": "UC", "country": "Haiti", "city": "Port-au-Prince", "established_year": 2000},



        {"name": "Universit Lumire", "code": "UL", "country": "Haiti", "city": "Cap-Hatien", "established_year": 2005},



        {"name": "Institut Universitaire du Sud", "code": "IUS", "country": "Haiti", "city": "Cayes", "established_year": 1998},



        {"name": "Universit Publique du Nord", "code": "UPN", "country": "Haiti", "city": "Cap-Hatien", "established_year": 1979},



        {"name": "Universit Chrtienne du Nord", "code": "UCNH", "country": "Haiti", "city": "Limbe", "established_year": 2003},



        {"name": "Universit de la Fondation Dr Aristide", "code": "UNIFA", "country": "Haiti", "city": "Tabarre", "established_year": 2001},



    ]



    



    for univ_data in universities_data:



        # Vrifier si l'universit existe dj



        statement = select(University).where(University.code == univ_data["code"])



        existing = session.exec(statement).first()



        



        if not existing:



            university = University(**univ_data)



            session.add(university)



            universities.append(university)



    



    session.commit()



    for university in universities:



        session.refresh(university)



    logger.info(f"Created {len(universities)} universities")



    return universities











def init_program_levels(session: Session, programs: List[Program]) -> List[ProgramLevel]:



    """Initialise les niveaux de programme lis aux programmes."""



    levels = []



    



    # Pour chaque programme, crer des niveaux appropris



    # Licence/BAC -> L1, L2, L3, L4



    # Matrise -> M1, M2



    # Doctorat -> D1, D2, D3



    # Certificat/DESS -> Anne Unique



    



    for program in programs:



        prog_levels = []



        if "Licence" in program.name or "Baccalaurat" in program.name:



            prog_levels = [



                {"name": "Anne 1", "code": f"{program.code}-L1", "typical_duration_years": 1},



                {"name": "Anne 2", "code": f"{program.code}-L2", "typical_duration_years": 1},



                {"name": "Anne 3", "code": f"{program.code}-L3", "typical_duration_years": 1},



                {"name": "Anne 4", "code": f"{program.code}-L4", "typical_duration_years": 1},



            ]



        elif "Matrise" in program.name:



            prog_levels = [



                {"name": "Anne 1", "code": f"{program.code}-M1", "typical_duration_years": 1},



                {"name": "Anne 2", "code": f"{program.code}-M2", "typical_duration_years": 1},



            ]



        elif "Doctorat" in program.name:



             prog_levels = [



                {"name": "Doctorat", "code": f"{program.code}-DOC", "typical_duration_years": 4},



            ]



        else:



            prog_levels = [



                {"name": "Session Unique", "code": f"{program.code}-U", "typical_duration_years": 1},



            ]



            



        for level_data in prog_levels:



            statement = select(ProgramLevel).where(ProgramLevel.code == level_data["code"])



            existing = session.exec(statement).first()



            



            if not existing:



                level = ProgramLevel(



                    name=level_data["name"],



                    code=level_data["code"],



                    typical_duration_years=level_data["typical_duration_years"],



                    description=f"Niveau {level_data['name']} pour {program.name}",



                    program_id=program.id



                )



                session.add(level)



                levels.append(level)



                



    session.commit()



    for level in levels:



        session.refresh(level)



    logger.info(f"Created {len(levels)} program levels")



    return levels











def init_permissions(session: Session) -> List[Permission]:



    """Initialise 10 permissions systme."""



    permissions = []



    permissions_data = [



        {"name": "create_user", "code": "USER_CREATE", "description": "Crer des utilisateurs", "resource": "users", "action": "create"},



        {"name": "edit_user", "code": "USER_EDIT", "description": "Modifier des utilisateurs", "resource": "users", "action": "update"},



        {"name": "delete_user", "code": "USER_DELETE", "description": "Supprimer des utilisateurs", "resource": "users", "action": "delete"},



        {"name": "view_users", "code": "USER_VIEW", "description": "Voir les utilisateurs", "resource": "users", "action": "read"},



        {"name": "manage_courses", "code": "COURSE_MANAGE", "description": "Grer les cours", "resource": "courses", "action": "manage"},



        {"name": "manage_students", "code": "STUDENT_MANAGE", "description": "Grer les tudiants", "resource": "students", "action": "manage"},



        {"name": "manage_grades", "code": "GRADE_MANAGE", "description": "Grer les notes", "resource": "grades", "action": "manage"},



        {"name": "view_reports", "code": "REPORT_VIEW", "description": "Voir les rapports", "resource": "reports", "action": "read"},



        {"name": "system_admin", "code": "SYSTEM_ADMIN", "description": "Administration systme", "resource": "system", "action": "manage"},



        {"name": "financial_access", "code": "FINANCE_ACCESS", "description": "Accs aux donnes financires", "resource": "finance", "action": "read"},



    ]



    



    for perm_data in permissions_data:



        statement = select(Permission).where(Permission.name == perm_data["name"])



        existing = session.exec(statement).first()



        



        if not existing:



            permission = Permission(**perm_data)



            session.add(permission)



            permissions.append(permission)



    



    session.commit()



    for permission in permissions:



        session.refresh(permission)



    logger.info(f"Created {len(permissions)} permissions")



    return permissions











def init_roles(session: Session) -> List[Role]:



    """Initialise 10 rles utilisateur."""



    # Rcuprer les permissions existantes depuis la base de donnes



    permissions = session.exec(select(Permission)).all()



    



    roles = []



    roles_data = [



        {"name": "Super Admin", "code": "SUPER_ADMIN", "description": "Administrateur super utilisateur"},



        {"name": "Admin", "code": "ADMIN", "description": "Administrateur"},



        {"name": "Director", "code": "DIRECTOR", "description": "Directeur d'universit"},



        {"name": "Teacher", "code": "TEACHER", "description": "Enseignant"},



        {"name": "Student", "code": "STUDENT", "description": "tudiant"},



        {"name": "Registrar", "code": "REGISTRAR", "description": "Registraire"},



        {"name": "Librarian", "code": "LIBRARIAN", "description": "Bibliothcaire"},



        {"name": "IT Support", "code": "IT_SUPPORT", "description": "Support informatique"},



        {"name": "Financial Officer", "code": "FINANCE_OFFICER", "description": "Responsable financier"},



        {"name": "Guest", "code": "GUEST", "description": "Invit/Visiteur"},



    ]



    



    for role_data in roles_data:



        statement = select(Role).where(Role.name == role_data["name"])



        existing = session.exec(statement).first()



        



        if not existing:



            role = Role(**role_data)



            session.add(role)



            roles.append(role)



    



    session.commit()



    for role in roles:



        session.refresh(role)



    



    # Assigner des permissions aux rles



    if permissions and roles:



        # Super Admin obtient toutes les permissions



        super_admin = next((r for r in roles if r.name == "Super Admin"), None)



        if super_admin:



            for permission in permissions:



                role_perm = RolePermission(role_id=super_admin.id, permission_id=permission.id)



                session.add(role_perm)



        



        session.commit()



    



    logger.info(f"Created {len(roles)} roles")



    return roles











def init_departments() -> List[Department]:



    """Initialise 10 dpartements."""



    with Session(engine) as session:



        # Rcuprer les universits existantes depuis la base de donnes



        universities = session.exec(select(University)).all()



        if not universities:



            logger.warning("No universities found for departments initialization")



            return []



            



        departments = []



        departments_data = [



            {"name": "Sciences et Technologies", "code": "ST", "description": "Dpartement des Sciences et Technologies"},



            {"name": "Sciences Humaines", "code": "SH", "description": "Dpartement des Sciences Humaines"},



            {"name": "Sciences conomiques", "code": "SE", "description": "Dpartement des Sciences conomiques"},



            {"name": "Mdecine", "code": "MED", "description": "Dpartement de Mdecine"},



            {"name": "Droit", "code": "DROIT", "description": "Dpartement de Droit"},



            {"name": "Ingnierie", "code": "ING", "description": "Dpartement d'Ingnierie"},



            {"name": "Arts et Lettres", "code": "AL", "description": "Dpartement des Arts et Lettres"},



            {"name": "Agriculture", "code": "AGR", "description": "Dpartement d'Agriculture"},



            {"name": "Sciences de l'ducation", "code": "SEDU", "description": "Dpartement des Sciences de l'ducation"},



            {"name": "Sciences Sociales", "code": "SS", "description": "Dpartement des Sciences Sociales"},



        ]



        



        for i, dept_data in enumerate(departments_data):



            university = universities[i % len(universities)] if universities else None



            if university:



                department = Department(



                    name=dept_data["name"],



                    code=dept_data["code"],



                    description=dept_data["description"],



                    university_id=university.id



                )



                session.add(department)



                departments.append(department)



        



        session.commit()



        for dept in departments:



            session.refresh(dept)



        logger.info(f"Created {len(departments)} departments")



        return departments











def init_faculties(departments: List[Department]) -> List[Faculty]:



    """Initialise 10 facults."""



    with Session(engine) as session:



        faculties = []



        faculties_data = [



            {"name": "Facult d'Informatique", "code": "INFO", "description": "Facult d'Informatique et Technologies"},



            {"name": "Facult de Mathmatiques", "code": "MATH", "description": "Facult de Mathmatiques"},



            {"name": "Facult de Physique", "code": "PHYS", "description": "Facult de Physique"},



            {"name": "Facult de Chimie", "code": "CHIM", "description": "Facult de Chimie"},



            {"name": "Facult de Biologie", "code": "BIO", "description": "Facult de Biologie"},



            {"name": "Facult d'conomie", "code": "ECO", "description": "Facult d'conomie"},



            {"name": "Facult de Gestion", "code": "GEST", "description": "Facult de Gestion"},



            {"name": "Facult de Droit", "code": "DROIT", "description": "Facult de Droit"},



            {"name": "Facult de Mdecine", "code": "MED", "description": "Facult de Mdecine"},



            {"name": "Facult d'Arts", "code": "ARTS", "description": "Facult des Arts"},



        ]



        



        for i, fac_data in enumerate(faculties_data):



            department = departments[i % len(departments)] if departments else None



            if department:



                faculty = Faculty(



                    name=fac_data["name"],



                    code=fac_data["code"],



                    description=fac_data["description"],



                    department_id=department.id



                )



                session.add(faculty)



                faculties.append(faculty)



        



        session.commit()



        for faculty in faculties:



            session.refresh(faculty)



        logger.info(f"Created {len(faculties)} faculties")



        return faculties











def init_academic_years(universities: List[University]) -> List[AcademicYear]:



    """Initialise 10 annes acadmiques."""



    with Session(engine) as session:



        years = []



        years_data = [



            {"name": "2020-2021", "code": "2020-21", "start_date": date(2020, 9, 1), "end_date": date(2021, 6, 30), "is_current": False},



            {"name": "2021-2022", "code": "2021-22", "start_date": date(2021, 9, 1), "end_date": date(2022, 6, 30), "is_current": False},



            {"name": "2022-2023", "code": "2022-23", "start_date": date(2022, 9, 1), "end_date": date(2023, 6, 30), "is_current": False},



            {"name": "2023-2024", "code": "2023-24", "start_date": date(2023, 9, 1), "end_date": date(2024, 6, 30), "is_current": False},



            {"name": "2024-2025", "code": "2024-25", "start_date": date(2024, 9, 1), "end_date": date(2025, 6, 30), "is_current": True},



            {"name": "2025-2026", "code": "2025-26", "start_date": date(2025, 9, 1), "end_date": date(2026, 6, 30), "is_current": False},



            {"name": "2026-2027", "code": "2026-27", "start_date": date(2026, 9, 1), "end_date": date(2027, 6, 30), "is_current": False},



            {"name": "2027-2028", "code": "2027-28", "start_date": date(2027, 9, 1), "end_date": date(2028, 6, 30), "is_current": False},



            {"name": "2028-2029", "code": "2028-29", "start_date": date(2028, 9, 1), "end_date": date(2029, 6, 30), "is_current": False},



            {"name": "2029-2030", "code": "2029-30", "start_date": date(2029, 9, 1), "end_date": date(2030, 6, 30), "is_current": False},



        ]



        



        for i, year_data in enumerate(years_data):



            university = universities[i % len(universities)] if universities else None



            if university:



                academic_year = AcademicYear(



                    name=year_data["name"],



                    code=year_data["code"],



                    start_date=year_data["start_date"],



                    end_date=year_data["end_date"],



                    is_current=year_data["is_current"],



                    university_id=university.id,



                    description=f"Anne acadmique {year_data['name']}"



                )



                session.add(academic_year)



                years.append(academic_year)



        



        session.commit()



        for year in years:



            session.refresh(year)



        logger.info(f"Created {len(years)} academic years")



        return years











def init_sessions(academic_years: List[AcademicYear]) -> List[AcademicSession]:



    """Initialise 10+ sessions acadmiques (2 par anne)."""



    with Session(engine) as session:



        sessions = []



        



        for i, academic_year in enumerate(academic_years[:5]):  # 5 annes = 10 sessions



            # Session 1



            session_1 = AcademicSession(



                name=f"Session 1 {academic_year.name}",



                code=f"S1-{academic_year.code}",



                session_number=1,



                start_date=academic_year.start_date,



                end_date=date(academic_year.start_date.year + (1 if academic_year.start_date.month < 6 else 0), 1, 31),



                academic_year_id=academic_year.id,



                description=f"Premire session de {academic_year.name}"



            )



            



            # Session 2



            session_2 = AcademicSession(



                name=f"Session 2 {academic_year.name}",



                code=f"S2-{academic_year.code}",



                session_number=2,



                start_date=date(academic_year.start_date.year + (1 if academic_year.start_date.month < 6 else 0), 2, 1),



                end_date=academic_year.end_date,



                academic_year_id=academic_year.id,



                description=f"Deuxime session de {academic_year.name}"



            )



            



            session.add(session_1)



            session.add(session_2)



            sessions.extend([session_1, session_2])



        



        session.commit()



        for sess in sessions:



            session.refresh(sess)



        logger.info(f"Created {len(sessions)} academic sessions")



        return sessions











def init_programs(faculties: List[Faculty]) -> List[Program]:



    """Initialise 10 programmes d'tudes."""



    with Session(engine) as session:



        programs = []



        programs_data = [



            {"name": "Licence en Informatique", "code": "LIC-INFO", "duration_years": 4, "credits_required": 120},



            {"name": "Matrise en Informatique", "code": "MAIT-INFO", "duration_years": 2, "credits_required": 60},



            {"name": "Licence en Mathmatiques", "code": "LIC-MATH", "duration_years": 4, "credits_required": 120},



            {"name": "Licence en conomie", "code": "LIC-ECO", "duration_years": 4, "credits_required": 120},



            {"name": "Doctorat en Informatique", "code": "DOCT-INFO", "duration_years": 4, "credits_required": 180},



            {"name": "Licence en Biologie", "code": "LIC-BIO", "duration_years": 4, "credits_required": 120},



            {"name": "Matrise en Gestion", "code": "MAIT-GEST", "duration_years": 2, "credits_required": 60},



            {"name": "Licence en Droit", "code": "LIC-DROIT", "duration_years": 4, "credits_required": 120},



            {"name": "Certificat en Programmation", "code": "CERT-PROG", "duration_years": 1, "credits_required": 30},



            {"name": "DESS en Cyberscurit", "code": "DESS-CYBER", "duration_years": 1, "credits_required": 45},



        ]



        



        for i, prog_data in enumerate(programs_data):



            faculty = faculties[i % len(faculties)] if faculties else None



            



            if faculty:



                program = Program(



                    name=prog_data["name"],



                    code=prog_data["code"],



                    duration_years=prog_data["duration_years"],



                    credits_required=prog_data["credits_required"],



                    faculty_id=faculty.id,



                    description=f"Programme {prog_data['name']}"



                )



                session.add(program)



                programs.append(program)



        



        session.commit()



        for program in programs:



            session.refresh(program)



        logger.info(f"Created {len(programs)} programs")



        return programs


# This function should be added to initial_data.py after init_programs

def init_program_levels(session: Session, programs: List[Program]) -> List[ProgramLevel]:
    """Initialize program levels with proper program_id references."""
    program_levels = []
    
    # Define program levels data
    levels_data = [
        {"name": "Licence", "code": "LIC", "typical_duration_years": 4, "description": "Niveau Licence"},
        {"name": "Maitrise", "code": "MAIT", "typical_duration_years": 2, "description": "Niveau Maitrise"},
        {"name": "Doctorat", "code": "DOCT", "typical_duration_years": 4, "description": "Niveau Doctorat"},
        {"name": "Certificat", "code": "CERT", "typical_duration_years": 1, "description": "Niveau Certificat"},
        {"name": "DESS", "code": "DESS", "typical_duration_years": 1, "description": "Diplome d'etudes superieures specialisees"},
    ]
    
    # Create program levels and associate them with programs
    for i, level_data in enumerate(levels_data):
        # Cycle through programs to assign each level to a program
        program = programs[i % len(programs)] if programs else None
        
        if program:
            program_level = ProgramLevel(
                name=level_data["name"],
                code=level_data["code"],
                typical_duration_years=level_data["typical_duration_years"],
                description=level_data["description"],
                program_id=program.id  # NEW: Set the program_id
            )
            session.add(program_level)
            program_levels.append(program_level)
    
    session.commit()
    for level in program_levels:
        session.refresh(level)
    
    logger.info(f"Created {len(program_levels)} program levels")
    return program_levels










def init_courses() -> List[Course]:



    """Initialise 10 cours."""



    with Session(engine) as session:



        courses = []



        courses_data = [



            {"name": "Introduction  la Programmation", "code": "INF-101", "credits": 3, "prerequisites": None},



            {"name": "Structures de Donnes", "code": "INF-201", "credits": 4, "prerequisites": "INF-101"},



            {"name": "Algorithmique Avance", "code": "INF-301", "credits": 4, "prerequisites": "INF-201"},



            {"name": "Intelligence Artificielle", "code": "INF-401", "credits": 4, "prerequisites": "INF-301"},



            {"name": "Mathmatiques Discrtes", "code": "MATH-101", "credits": 3, "prerequisites": None},



            {"name": "Calcul Diffrentiel", "code": "MATH-201", "credits": 4, "prerequisites": "MATH-101"},



            {"name": "Statistiques", "code": "MATH-301", "credits": 3, "prerequisites": "MATH-201"},



            {"name": "Base de Donnes", "code": "INF-202", "credits": 3, "prerequisites": "INF-101"},



            {"name": "Rseaux Informatiques", "code": "INF-302", "credits": 4, "prerequisites": "INF-201"},



            {"name": "Scurit Informatique", "code": "INF-402", "credits": 4, "prerequisites": "INF-302"},



        ]



        



        for course_data in courses_data:



            course = Course(



                name=course_data["name"],



                code=course_data["code"],



                credits=course_data["credits"],



                prerequisites=course_data["prerequisites"],



                description=f"Cours: {course_data['name']}",



                is_mandatory=True,



                hours_per_week=3,



                is_active=True



            )



            session.add(course)



            courses.append(course)



        



        session.commit()



        for course in courses:



            session.refresh(course)



        logger.info(f"Created {len(courses)} courses")



        return courses











def init_course_program_levels(courses: List[Course], levels: List[ProgramLevel]) -> List[CourseProgramLevel]:



    """Initialise les associations cours-niveau de programme."""



    with Session(engine) as session:



        course_levels = []



        



        # Mapper les cours aux niveaux appropris



        course_level_mapping = [



            {"course_code": "INF-101", "level_code": "LIC", "year_level": 1},



            {"course_code": "INF-201", "level_code": "LIC", "year_level": 2},



            {"course_code": "INF-301", "level_code": "LIC", "year_level": 3},



            {"course_code": "INF-401", "level_code": "LIC", "year_level": 4},



            {"course_code": "MATH-101", "level_code": "LIC", "year_level": 1},



            {"course_code": "MATH-201", "level_code": "MAIT", "year_level": 1},



            {"course_code": "MATH-301", "level_code": "MAIT", "year_level": 2},



            {"course_code": "INF-202", "level_code": "LIC", "year_level": 2},



            {"course_code": "INF-302", "level_code": "LIC", "year_level": 3},



            {"course_code": "INF-402", "level_code": "LIC", "year_level": 4},



        ]



        



        for mapping in course_level_mapping:



            course = next((c for c in courses if c.code == mapping["course_code"]), None)



            level = next((l for l in levels if l.code == mapping["level_code"]), None)



            



            if course and level:



                course_level = CourseProgramLevel(



                    course_id=course.id,



                    program_level_id=level.id,



                    year_level=mapping["year_level"],



                    is_active=True



                )



                session.add(course_level)



                course_levels.append(course_level)



        



        session.commit()



        for cl in course_levels:



            session.refresh(cl)



        logger.info(f"Created {len(course_levels)} course-program level associations")



        return course_levels











def init_teachers(users: List[User]) -> List[Teacher]:



    """Initialise 10 enseignants."""



    with Session(engine) as session:



        teachers = []



        teacher_users = [u for u in users if 'teacher' in u.email.lower() or 'professeur' in u.first_name.lower()]



        



        # Si pas assez d'utilisateurs "teacher", utiliser d'autres utilisateurs



        if len(teacher_users) < 10:



            teacher_users = users[:10]



        



        for i, user in enumerate(teacher_users[:10]):



            teacher = Teacher(



                employee_number=f"TEA{2024000 + i + 1:05d}",



                hire_date=date(2020 + i % 5, 9, 1),



                department="Dpartement " + ["Informatique", "Mathmatiques", "Sciences", "conomie", "Droit"][i % 5],



                status="active",



                user_id=user.id



            )



            session.add(teacher)



            teachers.append(teacher)



        



        session.commit()



        for teacher in teachers:



            session.refresh(teacher)



        logger.info(f"Created {len(teachers)} teachers")



        return teachers











def init_students(users: List[User], programs: List[Program]) -> List[Student]:



    """Initialise 10 tudiants."""



    with Session(engine) as session:



        students = []



        student_users = [u for u in users if 'student' in u.email.lower() or 'tudiant' in u.first_name.lower()]



        



        # Si pas assez d'utilisateurs "student", utiliser d'autres utilisateurs



        if len(student_users) < 10:



            student_users = users[:10]



        



        for i, user in enumerate(student_users[:10]):



            program = programs[i % len(programs)] if programs else None



            



            if program:



                student = Student(



                    student_number=f"STU{2024000 + i + 1:05d}",



                    admission_date=date(2024 - i % 4, 9, 1),



                    status="active",



                    current_year_level=min(4, (i % 4) + 1),



                    user_id=user.id,



                    program_id=program.id



                )



                session.add(student)



                students.append(student)



        



        session.commit()



        for student in students:



            session.refresh(student)



        logger.info(f"Created {len(students)} students")



        return students











def init_course_sessions(course_program_levels: List[CourseProgramLevel], sessions: List[AcademicSession], teachers: List[Teacher]) -> List[CourseSession]:



    """Initialise 10 sessions de cours."""



    with Session(engine) as session:



        course_sessions = []



        



        for i in range(10):



            # Cycle through available course_program_levels if we have fewer than 10



            course_program_level_index = i % len(course_program_levels)



            course_program_level = course_program_levels[course_program_level_index]



            



            academic_session = sessions[i % len(sessions)] if sessions else None



            teacher = teachers[i % len(teachers)] if teachers else None



            



            if academic_session and teacher:



                course_session = CourseSession(



                    course_program_level_id=course_program_level.id,



                    session_id=academic_session.id,



                    teacher_id=teacher.id,



                    classroom=f"Salle {100 + i + 1}",



                    max_students=30 + (i % 3) * 10,  # 30, 40, ou 50 tudiants



                    year_level=random.randint(1, 3),



                    is_active=True



                )



                session.add(course_session)



                course_sessions.append(course_session)



        



        session.commit()



        for cs in course_sessions:



            session.refresh(cs)



        logger.info(f"Created {len(course_sessions)} course sessions")



        return course_sessions











def init_enrollments(students: List[Student], course_sessions: List[CourseSession]) -> List[Enrollment]:



    """Initialise 10 inscriptions."""



    with Session(engine) as session:



        enrollments = []



        



        for i, course_session in enumerate(course_sessions[:10]):



            student = students[i % len(students)] if students else None



            



            if student:



                enrollment = Enrollment(



                    student_id=student.id,



                    course_session_id=course_session.id,



                    enrollment_date=date(2024, 8, 15),



                    status="enrolled",



                    is_active=True



                )



                session.add(enrollment)



                enrollments.append(enrollment)



        



        session.commit()



        for enrollment in enrollments:



            session.refresh(enrollment)



        logger.info(f"Created {len(enrollments)} enrollments")



        return enrollments











def init_schedules(course_sessions: List[CourseSession]) -> List[Schedule]:



    """Initialise 10 horaires de cours."""



    with Session(engine) as session:



        schedules = []



        



        days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]



        



        for i, course_session in enumerate(course_sessions[:10]):



            schedule = Schedule(



                course_session_id=course_session.id,



                day_of_week=days[i % 5],



                start_time=time(8 + i % 8, 0),  # 8h  15h



                end_time=time(9 + i % 8, 30),   # 9h30  16h30



                classroom=f"Salle {100 + i + 1}",



                is_active=True



            )



            session.add(schedule)



            schedules.append(schedule)



        



        session.commit()



        for schedule in schedules:



            session.refresh(schedule)



        logger.info(f"Created {len(schedules)} schedules")



        return schedules











def init_attendance_sessions(course_sessions: List[CourseSession]) -> List[AttendanceSession]:



    """Initialise 10 sessions de prsence."""



    with Session(engine) as session:



        attendance_sessions = []



        



        for i, course_session in enumerate(course_sessions[:10]):



            attendance_session = AttendanceSession(



                course_session_id=course_session.id,



                date=date(2024, 9, 1 + i),



                start_time=time(8 + i % 6, 0),



                end_time=time(9 + i % 6, 30),



                topic=f"Leon {i + 1}: Introduction au chapitre {i + 1}",



                is_mandatory=True



            )



            session.add(attendance_session)



            attendance_sessions.append(attendance_session)



        



        session.commit()



        for att_session in attendance_sessions:



            session.refresh(att_session)



        logger.info(f"Created {len(attendance_sessions)} attendance sessions")



        return attendance_sessions











def init_assessments(course_sessions: List[CourseSession]) -> List[Assessment]:



    """Initialise 10 valuations."""



    with Session(engine) as session:



        assessments = []



        



        assessment_types = ["exam", "assignment", "quiz", "project", "presentation"]



        



        for i, course_session in enumerate(course_sessions[:10]):



            assessment = Assessment(



                course_session_id=course_session.id,



                title=f"valuation {i + 1}",



                type=assessment_types[i % len(assessment_types)],



                total_points=100 if i % 2 == 0 else 50,



                weight_percentage=20 + (i % 3) * 10,  # 20%, 30% ou 40%



                due_date=date(2024, 10, 1 + i * 3),



                description=f"Description de l'valuation {i + 1}"



            )



            session.add(assessment)



            assessments.append(assessment)



        



        session.commit()



        for assessment in assessments:



            session.refresh(assessment)



        logger.info(f"Created {len(assessments)} assessments")



        return assessments











def init_attendance_records(attendance_sessions: List[AttendanceSession], students: List[Student]) -> List[AttendanceRecord]:



    """Initialise 10 enregistrements de prsence."""



    with Session(engine) as session:



        attendance_records = []



        



        statuses = ["present", "absent", "late", "excused"]



        



        for i, attendance_session in enumerate(attendance_sessions[:10]):



            student = students[i % len(students)] if students else None



            



            if student:



                attendance_record = AttendanceRecord(



                    attendance_session_id=attendance_session.id,



                    student_id=student.id,



                    status=statuses[i % len(statuses)],



                    arrival_time=time(8 + i % 6, 5 + i % 15) if i % 4 != 1 else None,  # Absent = pas d'heure d'arrive



                    notes=f"Notes pour {student.student_number}" if i % 3 == 0 else None



                )



                session.add(attendance_record)



                attendance_records.append(attendance_record)



        



        session.commit()



        for record in attendance_records:



            session.refresh(record)



        logger.info(f"Created {len(attendance_records)} attendance records")



        return attendance_records











def init_grades(assessments: List[Assessment], enrollments: List[Enrollment]) -> List[Grade]:



    """Initialise 10 notes."""



    with Session(engine) as session:



        grades = []



        



        for i, assessment in enumerate(assessments[:10]):



            enrollment = enrollments[i % len(enrollments)] if enrollments else None



            



            if enrollment:



                # Notes variables : entre 60% et 95% de la note totale



                score_percentage = 60 + (i * 7) % 35  # 60, 67, 74, 81, 88, 95, etc.



                points_earned = (assessment.total_points * score_percentage) / 100



                



                grade = Grade(



                    assessment_id=assessment.id,



                    enrollment_id=enrollment.id,



                    points_earned=points_earned,



                    submission_date=date(2024, 10, 5 + i),



                    graded_date=date(2024, 10, 10 + i),



                    feedback=f"Bon travail! Note: {score_percentage}%" if score_percentage >= 80 else "Peut mieux faire."



                )



                session.add(grade)



                grades.append(grade)



        



        session.commit()



        for grade in grades:



            session.refresh(grade)



        logger.info(f"Created {len(grades)} grades")



        return grades











def init_user_roles(users: List[User], roles: List[Role]) -> List[UserRole]:



    """Initialise les associations utilisateur-rle."""



    with Session(engine) as session:



        user_roles = []



        



        # Assigner des rles aux utilisateurs



        role_assignments = {



            "admin@example.com": "Super Admin",



            "director@university.ht": "Director", 



            "admin@university.ht": "Admin",



            "teacher1@university.ht": "Teacher",



            "teacher2@university.ht": "Teacher",



            "student1@student.ht": "Student",



            "student2@student.ht": "Student",



            "registrar@university.ht": "Registrar",



            "librarian@university.ht": "Librarian",



            "maintenance@university.ht": "IT Support"



        }



        



        for user in users:



            role_name = role_assignments.get(user.email, "Guest")



            role = next((r for r in roles if r.name == role_name), None)



            



            if role:



                user_role = UserRole(user_id=user.id, role_id=role.id)



                session.add(user_role)



                user_roles.append(user_role)



        



        session.commit()



        logger.info(f"Created {len(user_roles)} user-role assignments")



        return user_roles











def init_course_program_levels(courses: List[Course], levels: List[ProgramLevel]) -> List[CourseProgramLevel]:



    """Initialise les associations cours-niveau."""



    with Session(engine) as session:



        course_levels = []



        



        for i, course in enumerate(courses[:10]):



            level = levels[i % len(levels)] if levels else None



            



            if level:



                course_level = CourseProgramLevel(



                    course_id=course.id,



                    program_level_id=level.id,



                    is_required=i % 2 == 0,  # 50% requis, 50% optionnel



                    semester=1 + (i % 2),    # Semestre 1 ou 2



                    prerequisites=f"Prrequis pour {course.name}" if i % 3 == 0 else None



                )



                session.add(course_level)



                course_levels.append(course_level)



        



        session.commit()



        for cl in course_levels:



            session.refresh(cl)



        logger.info(f"Created {len(course_levels)} course-program level associations")



        return course_levels











from app.core.security import get_password_hash







def main() -> None:



    """Initialise toutes les donnes de dmarrage avec scurit approprie."""



    logger.info("Starting initial data creation...")



    



    # Crer toutes les tables



    logger.info("Creating database tables...")



    create_db_and_tables()



    



    # Utiliser une seule session pour toutes les oprations



    with Session(engine) as session:

        # 0. Initialiser les rôles par défaut
        logger.info("Initializing default roles...")
        from app.services.role_service import RoleService
        role_service = RoleService(session)
        role_service.initialize_default_roles()
        logger.info("✅ Default roles initialized")

        # 1. Initialiser les permissions



        logger.info("Initializing permissions...")



        permissions = init_permissions(session)



        



        # 2. Initialiser les rles



        logger.info("Initializing roles...")



        roles = init_roles(session)



        



        # 3. Initialiser les utilisateurs



        logger.info("Initializing users...")



        users = []



        users_data = [



            {"email": "admin@example.com", "first_name": "Admin", "last_name": "Super", "is_superuser": True, "hashed_password": get_password_hash("changethis")},



            {"email": "marie.dupont@example.com", "first_name": "Marie", "last_name": "Dupont", "is_superuser": False, "hashed_password": get_password_hash("password123")},



            {"email": "jean.martin@example.com", "first_name": "Jean", "last_name": "Martin", "is_superuser": False, "hashed_password": get_password_hash("password123")},



        ]



        



        for user_data in users_data:



            statement = select(User).where(User.email == user_data["email"])



            existing = session.exec(statement).first()



            



            if not existing:



                user = User(**user_data, is_active=True)



                session.add(user)



                users.append(user)



            else:



                # Update password just in case it was sha256



                existing.hashed_password = user_data["hashed_password"]



                session.add(existing)



                users.append(existing)



                



        session.commit()



        for user in users:



            session.refresh(user)



        



        # 4. Assigner des rles de base



        logger.info("Assigning roles to users...")



        super_admin_role = next((r for r in roles if r.name == "Super Admin"), None)



        admin_user = next((u for u in users if u.email == "admin@example.com"), None)



        



        if admin_user and super_admin_role:



            statement = select(UserRole).where(UserRole.user_id == admin_user.id, UserRole.role_id == super_admin_role.id)



            existing_link = session.exec(statement).first()



            if not existing_link:



                link = UserRole(user_id=admin_user.id, role_id=super_admin_role.id)



                session.add(link)



                session.commit()







        # 5. Initialiser les universits et niveaux de programme (essentiels pour le test tudiant)
        
        logger.info("Initializing departments...")
        departments = init_departments()
        
        logger.info("Initializing faculties...")
        faculties = init_faculties(departments)
        
        logger.info("Initializing programs...")
        programs = init_programs(faculties)
        
        logger.info("Initializing program levels...")
        program_levels = init_program_levels(session, programs)
        
        logger.info("Database initialization completed successfully!")











def main_old() -> None:



    """Fonction principale d'initialisation avec 10 enregistrements par table."""



    logger.info("Creating initial data with 10 records per table")



    



    # Crer toutes les tables



    logger.info("Creating database tables...")



    create_db_and_tables()



    



    # Initialisation dans l'ordre des dpendances



    logger.info("Initializing users...")



    users = init_users()



    



    logger.info("Initializing items...")



    items = init_items()



    



    logger.info("Initializing universities...")



    universities = init_universities()



    



    logger.info("Initializing program levels...")



    levels = init_program_levels()



    



    logger.info("Initializing permissions...")



    permissions = init_permissions()



    



    logger.info("Initializing roles...")



    roles = init_roles()



    



    logger.info("Initializing departments...")



    departments = init_departments()



    



    logger.info("Initializing faculties...")



    faculties = init_faculties(departments)



    



    logger.info("Initializing academic years...")



    academic_years = init_academic_years(universities)



    



    logger.info("Initializing sessions...")



    sessions = init_sessions(academic_years)



    



    logger.info("Initializing programs...")



    programs = init_programs(faculties)



    



    logger.info("Initializing program levels...")



    levels = init_program_levels(session, programs)



    



    logger.info("Initializing courses...")



    courses = init_courses()



    



    logger.info("Initializing teachers...")



    teachers = init_teachers(users)



    



    logger.info("Initializing students...")



    students = init_students(users, programs)



    



    logger.info("Initializing course program levels...")



    course_levels = init_course_program_levels(courses, levels)



    



    logger.info("Initializing course sessions...")



    course_sessions = init_course_sessions(course_levels, sessions, teachers)



    



    logger.info("Initializing enrollments...")



    enrollments = init_enrollments(students, course_sessions)



    



    logger.info("Initializing schedules...")



    schedules = init_schedules(course_sessions)



    



    logger.info("Initializing attendance sessions...")



    attendance_sessions = init_attendance_sessions(course_sessions)



    



    logger.info("Initializing assessments...")



    assessments = init_assessments(course_sessions)



    



    logger.info("Initializing attendance records...")



    attendance_records = init_attendance_records(attendance_sessions, students)



    



    logger.info("Initializing grades...")



    grades = init_grades(assessments, enrollments)



    



    logger.info("Initializing user roles...")



    user_roles = init_user_roles(users, roles)



    



    # Rsum final



    logger.info("\n" + "="*80)



    logger.info("ALL INITIAL DATA CREATED SUCCESSFULLY!")



    logger.info("="*80)



    logger.info(f"Summary of created records:")



    logger.info(f"   Users: {len(users)}")



    logger.info(f"   Items: {len(items)}")



    logger.info(f"   Universities: {len(universities)}")



    logger.info(f"   Program Levels: {len(levels)}")



    logger.info(f"   Permissions: {len(permissions)}")



    logger.info(f"   Roles: {len(roles)}")



    logger.info(f"   Departments: {len(departments)}")



    logger.info(f"   Faculties: {len(faculties)}")



    logger.info(f"   Academic Years: {len(academic_years)}")



    logger.info(f"   Sessions: {len(sessions)}")



    logger.info(f"   Programs: {len(programs)}")



    logger.info(f"   Courses: {len(courses)}")



    logger.info(f"   Teachers: {len(teachers)}")



    logger.info(f"   Students: {len(students)}")



    logger.info(f"   Course Sessions: {len(course_sessions)}")



    logger.info(f"   Enrollments: {len(enrollments)}")



    logger.info(f"   Schedules: {len(schedules)}")



    logger.info(f"   Attendance Sessions: {len(attendance_sessions)}")



    logger.info(f"   Assessments: {len(assessments)}")



    logger.info(f"   Attendance Records: {len(attendance_records)}")



    logger.info(f"   Grades: {len(grades)}")



    logger.info(f"   User Roles: {len(user_roles)}")



    logger.info(f"   Course Levels: {len(course_levels)}")



    logger.info("="*80)











if __name__ == "__main__":



    main()



