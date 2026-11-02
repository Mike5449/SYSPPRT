# ==================================================================================
# IMPORTS DES MODÈLES SQLMODEL - ORDRE OPTIMISÉ POUR ÉVITER LES DÉPENDANCES CIRCULAIRES
# ==================================================================================

# 🔧 Modèles communs (sans dépendances)
from app.models.common import (
    Message,
    NewPassword,
    Token,
    TokenPayload,
)

# 🏛️ Modèles de base organisationnelle (niveau 1 - indépendants)
from app.models.university import (
    University,
    UniversityBase,
    UniversityCreate,
    UniversityUpdate,
    UniversityPublic,
    UniversitiesPublic,
)
from app.models.program_level import (
    ProgramLevel,
    ProgramLevelBase,
    ProgramLevelCreate,
    ProgramLevelUpdate,
    ProgramLevelPublic,
    ProgramLevelPublicWithDetails,
    ProgramLevelsPublic,
)
from app.models.permission import (
    Permission,
    PermissionBase,
    PermissionCreate,
    PermissionUpdate,
    PermissionPublic,
    PermissionsPublic,
)

# 👤 Modèles utilisateurs (niveau 1 - base)
from app.models.user import (
    User,
    UserBase,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
    UpdatePassword,
)
from app.models.user_otp import (
    UserOTP,
    UserOTPBase,
)

from app.models.item import (
    Item,
    ItemBase,
    ItemCreate,
    ItemPublic,
    ItemsPublic,
    ItemUpdate,
)

# 🔐 Modèles de rôles (niveau 2 - dépendent de permission et user)
from app.models.role import (
    Role,
    RoleBase,
    RoleCreate,
    RoleUpdate,
    RolePublic,
    RolePublicWithPermissions,
    RolesPublic,
    RolePermission,
)
from app.models.user_role import (
    UserRole,
    UserRoleBase,
    UserRoleCreate,
    UserRoleUpdate,
    UserRolePublic,
    UserRolesPublic,
)

# 🏢 Structure organisationnelle (niveau 2 - dépendent d'university)
from app.models.department import (
    Department,
    DepartmentBase,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentPublic,
    DepartmentPublicWithFaculties,
    DepartmentsPublic,
)
from app.models.faculty import (
    Faculty,
    FacultyBase,
    FacultyCreate,
    FacultyUpdate,
    FacultyPublic,
    FacultyPublicWithDepartment,
    FacultyPublicWithPrograms,
    FacultiesPublic,
)

# 📚 Programmes académiques (niveau 3 - dépendent de faculty et program_level)
from app.models.program import (
    Program,
    ProgramBase,
    ProgramCreate,
    ProgramUpdate,
    ProgramPublic,
    ProgramPublicWithDetails,
    ProgramsPublic,
)

# 📅 Années et sessions académiques (niveau 3 - dépendent d'university)
from app.models.academic_year import (
    AcademicYear,
    AcademicYearBase,
    AcademicYearCreate,
    AcademicYearUpdate,
    AcademicYearPublic,
    AcademicYearPublicWithSessions,
    AcademicYearsPublic,
)
from app.models.session import (
    Session,
    SessionBase,
    SessionCreate,
    SessionUpdate,
    SessionPublic,
    SessionsPublic,
)

# 📖 Modèles de cours (niveau 4 - dépendent de program)
from app.models.course import (
    Course,
    CourseBase,
    CourseCreate,
    CourseUpdate,
    CoursePublic,
    CoursesPublic,
)
from app.models.course_program_level import (
    CourseProgramLevel,
    CourseProgramLevelBase,
    CourseProgramLevelCreate,
    CourseProgramLevelUpdate,
    CourseProgramLevelPublic,
    CourseProgramLevelPublicWithDetails,
    CoursesProgramLevelsPublic,
)

# 👨‍🎓👨‍🏫 Modèles utilisateurs spécialisés (niveau 4 - dépendent de user)
from app.models.student import (
    Student,
    StudentBase,
    StudentCreate,
    StudentUpdate,
    StudentPublic,
    StudentPublicWithUser,
    StudentPublicWithDetails,
    StudentsPublic,
    StudentsPublicWithDetails,
    StudentStatus,
)
from app.models.teacher import (
    Teacher,
    TeacherBase,
    TeacherCreate,
    TeacherUpdate,
    TeacherPublic,
    TeacherPublicWithUser,
    TeacherPublicWithDetails,
    TeachersPublic,
    TeacherStatus,
)

# 🎯 Sessions de cours (niveau 5 - dépendent de course, session, teacher)
from app.models.course_session import (
    CourseSession,
    CourseSessionBase,
    CourseSessionCreate,
    CourseSessionUpdate,
    CourseSessionPublic,
    CourseSessionPublicWithDetails,
    CourseSessionPublicWithSchedules,
    CourseSessionsPublic,
)

# 📝 Inscriptions (niveau 5 - dépendent de student et course_session)
from app.models.enrollment import (
    Enrollment,
    EnrollmentBase,
    EnrollmentCreate,
    EnrollmentUpdate,
    EnrollmentPublic,
    EnrollmentPublicWithDetails,
    EnrollmentsPublic,
    EnrollmentStatus,
)

# 📅 Planification (niveau 6 - dépendent de course_session)
from app.models.schedule import (
    Schedule,
    ScheduleBase,
    ScheduleCreate,
    ScheduleUpdate,
    SchedulePublic,
    SchedulePublicWithDetails,
    SchedulesPublic,
)
from app.models.attendance_session import (
    AttendanceSession,
    AttendanceSessionBase,
    AttendanceSessionCreate,
    AttendanceSessionUpdate,
    AttendanceSessionPublic,
    AttendanceSessionPublicWithDetails,
    AttendanceSessionsPublic,
)

# 📝 Évaluations (niveau 6 - dépendent de course_session)
from app.models.assessment import (
    Assessment,
    AssessmentBase,
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentPublic,
    AssessmentPublicWithDetails,
    AssessmentsPublic,
    AssessmentType,
)

# 👥 Enregistrement présences (niveau 7 - dépendent d'attendance_session et student)
from app.models.attendance_record import (
    AttendanceRecord,
    AttendanceRecordBase,
    AttendanceRecordCreate,
    AttendanceRecordUpdate,
    AttendanceRecordPublic,
    AttendanceRecordPublicWithDetails,
    AttendanceRecordsPublic,
    AttendanceStatus,
    AttendanceStatistics,
)

# 📊 Notes et évaluations finales (niveau 7 - dépendent d'assessment et enrollment)
from app.models.grade import (
    Grade,
    GradeBase,
    GradeCreate,
    GradeUpdate,
    GradePublic,
    GradePublicWithDetails,
    GradesPublic,
    GradeStatistics,
    StudentTranscript,
)

# 📋 Vue complète des notes étudiants (niveau 8 - vue de base de données)
from app.models.student_grade_view import (
    StudentGradeComplete,
    StudentGradeCompleteBase,
    StudentGradeCompletePublic,
    StudentGradeCompleteWithCalculations,
    StudentGradeCompletesPublic,
    StudentGradeViewFilters,
    StudentGradeViewSummary,
)
from app.models.student_attendance_view import (
    StudentAttendanceComplete,
    StudentAttendanceCompleteBase,
    StudentAttendanceCompletePublic,
    StudentAttendanceCompleteWithCalculations,
    StudentAttendanceCompletesPublic,
    StudentAttendanceViewFilters,
    StudentAttendanceStatistics,
    StudentAttendanceViewSummary,
    AttendanceReport,
    AttendanceAlerts,
    CourseAttendanceSummary,
    AttendanceGroupBy,
)
from app.models.student_courses_view import (
    StudentCoursesComplete,
    StudentCoursesCompleteBase,
    StudentCoursesCompletePublic,
    StudentCoursesCompleteWithAnalytics,
    StudentCoursesCompletesPublic,
    StudentCoursesViewFilters,
    StudentCoursesStatistics,
    StudentCoursesViewSummary,
    CoursePerformanceReport,
    TeacherCoursesOverview,
    AcademicAlert,
    AcademicAlerts,
    StudentProgressTracker,
    CourseComparisonAnalysis,
    AcademicYearSummary,
    ProgramPerformanceAnalysis,
)
from app.models.student_assessments_view import (
    StudentAssessmentsComplete,
    StudentAssessmentsCompleteBase,
    StudentAssessmentsCompletePublic,
    StudentAssessmentsCompleteWithAnalytics,
    StudentAssessmentsCompletesPublic,
    StudentAssessmentsViewFilters,
    AssessmentStatistics,
    StudentAssessmentsViewSummary,
    AssessmentPerformanceReport,
    TeacherAssessmentsOverview,
    AssessmentAlerts,
    AssessmentProgressTracker,
    AssessmentComparison,
    CourseAssessmentAnalysis,
    AssessmentWorkloadAnalysis,
    AssessmentGradingEfficiency,
    AssessmentCalendar,
)

# ==================================================================================
# RECONSTRUCTION DES MODÈLES PYDANTIC - RÉSOLUTION DES FORWARD REFERENCES
# ==================================================================================
# IMPORTANT: L'ordre est crucial pour éviter les dépendances circulaires
# Les modèles doivent être reconstruits dans l'ordre inverse des dépendances

# 🔧 SANS `from __future__ import annotations`, model_rebuild() EST NÉCESSAIRE
# pour résoudre les forward references après que toutes les classes soient définies

# 🏛️ NIVEAU 2: Modèles organisationnels de base
# University et ProgramLevel (modèles de base sans dépendances complexes)
# Department et Faculty ont des relations, donc seront reconstruits plus tard

# 👤 NIVEAU 3: Modèles utilisateurs de base
# User et Item ont des relations simples
# Role et UserRole ont des relations

# 🏢 NIVEAU 4: Structure organisationnelle avec relations
DepartmentPublicWithFaculties.model_rebuild()
FacultyPublicWithDepartment.model_rebuild()
FacultyPublicWithPrograms.model_rebuild()

# 📚 NIVEAU 5: Programmes académiques
ProgramPublicWithDetails.model_rebuild()
ProgramLevelPublicWithDetails.model_rebuild()

# 📅 NIVEAU 6: Années et sessions académiques
AcademicYearPublicWithSessions.model_rebuild()

# 📖 NIVEAU 7: Cours et relations cours-niveau
CourseProgramLevelPublicWithDetails.model_rebuild()
CoursesProgramLevelsPublic.model_rebuild()

# 👨‍🎓👨‍🏫 NIVEAU 8: Utilisateurs spécialisés avec relations
StudentPublic.model_rebuild()
StudentPublicWithUser.model_rebuild()
StudentPublicWithDetails.model_rebuild()
StudentsPublic.model_rebuild()
StudentsPublicWithDetails.model_rebuild()
TeacherPublic.model_rebuild()
TeacherPublicWithUser.model_rebuild()
TeacherPublicWithDetails.model_rebuild()

# 🎯 NIVEAU 9: Sessions de cours avec toutes les relations
CourseSessionPublicWithDetails.model_rebuild()
CourseSessionPublicWithSchedules.model_rebuild()

# 📝 NIVEAU 10: Inscriptions et planification
EnrollmentPublicWithDetails.model_rebuild()
SchedulePublicWithDetails.model_rebuild()

# 📊 NIVEAU 11: Évaluations et présences
AttendanceSessionPublicWithDetails.model_rebuild()
AssessmentPublicWithDetails.model_rebuild()

# 👥📊 NIVEAU 12: Enregistrements complexes (plus haut niveau de dépendance)
AttendanceRecordPublicWithDetails.model_rebuild()
GradePublicWithDetails.model_rebuild()
StudentTranscript.model_rebuild()

# 🔐 NIVEAU FINAL: Modèles avec permissions (si applicable)
RolePublicWithPermissions.model_rebuild()




# ==================================================================================
# LISTE COMPLÈTE DES MODÈLES TABLES POUR ALEMBIC/SQLMODEL
# ==================================================================================
# Cette liste est utilisée par db.py et les migrations Alembic
# Ordre: modèles indépendants → modèles avec dépendances

__all__ = [
    # 🔧 Modèles communs
    "Message", "NewPassword", "Token", "TokenPayload",
    
    # 🏛️ Modèles de base organisationnelle
    "University", "UniversityBase", "UniversityCreate", "UniversityUpdate", "UniversityPublic", "UniversitiesPublic",
    "ProgramLevel", "ProgramLevelBase", "ProgramLevelCreate", "ProgramLevelUpdate", "ProgramLevelPublic", "ProgramLevelsPublic",
    "Permission", "PermissionBase", "PermissionCreate", "PermissionUpdate", "PermissionPublic", "PermissionsPublic",
    
    # 👤 Modèles utilisateurs
    "User", "UserBase", "UserCreate", "UserPublic", "UserRegister", "UsersPublic", "UserUpdate", "UserUpdateMe", "UpdatePassword",
    "Item", "ItemBase", "ItemCreate", "ItemPublic", "ItemsPublic", "ItemUpdate",
    
    # 🔐 Modèles de rôles
    "Role", "RoleBase", "RoleCreate", "RoleUpdate", "RolePublic", "RolePublicWithPermissions", "RolesPublic", "RolePermission",
    "UserRole", "UserRoleBase", "UserRoleCreate", "UserRoleUpdate", "UserRolePublic", "UserRolesPublic",
    
    # 🏢 Structure organisationnelle
    "Department", "DepartmentBase", "DepartmentCreate", "DepartmentUpdate", "DepartmentPublic", "DepartmentPublicWithFaculties", "DepartmentsPublic",
    "Faculty", "FacultyBase", "FacultyCreate", "FacultyUpdate", "FacultyPublic", "FacultyPublicWithDepartment", "FacultyPublicWithPrograms", "FacultiesPublic",
    
    # 📚 Programmes académiques
    "Program", "ProgramBase", "ProgramCreate", "ProgramUpdate", "ProgramPublic", "ProgramPublicWithDetails", "ProgramsPublic",
    
    # 📅 Années et sessions académiques
    "AcademicYear", "AcademicYearBase", "AcademicYearCreate", "AcademicYearUpdate", "AcademicYearPublic", "AcademicYearPublicWithSessions", "AcademicYearsPublic",
    "Session", "SessionBase", "SessionCreate", "SessionUpdate", "SessionPublic", "SessionsPublic",
    
    # 📖 Modèles de cours
    "Course", "CourseBase", "CourseCreate", "CourseUpdate", "CoursePublic", "CoursesPublic",
    "CourseProgramLevel", "CourseProgramLevelBase", "CourseProgramLevelCreate", "CourseProgramLevelUpdate", "CourseProgramLevelPublic", "CourseProgramLevelPublicWithDetails", "CoursesProgramLevelsPublic",
    
    # 👨‍🎓👨‍🏫 Utilisateurs spécialisés
    "Student", "StudentBase", "StudentCreate", "StudentUpdate", "StudentPublic", "StudentPublicWithUser", "StudentPublicWithDetails", "StudentsPublic", "StudentStatus",
    "Teacher", "TeacherBase", "TeacherCreate", "TeacherUpdate", "TeacherPublic", "TeacherPublicWithUser", "TeachersPublic", "TeacherStatus",
    
    # 🎯 Sessions de cours
    "CourseSession", "CourseSessionBase", "CourseSessionCreate", "CourseSessionUpdate", "CourseSessionPublic", "CourseSessionPublicWithDetails", "CourseSessionPublicWithSchedules", "CourseSessionsPublic",
    
    # 📝 Inscriptions
    "Enrollment", "EnrollmentBase", "EnrollmentCreate", "EnrollmentUpdate", "EnrollmentPublic", "EnrollmentPublicWithDetails", "EnrollmentsPublic", "EnrollmentStatus",
    
    # 📅 Planification
    "Schedule", "ScheduleBase", "ScheduleCreate", "ScheduleUpdate", "SchedulePublic", "SchedulePublicWithDetails", "SchedulesPublic",
    "AttendanceSession", "AttendanceSessionBase", "AttendanceSessionCreate", "AttendanceSessionUpdate", "AttendanceSessionPublic", "AttendanceSessionPublicWithDetails", "AttendanceSessionsPublic",
    
    # 📝 Évaluations
    "Assessment", "AssessmentBase", "AssessmentCreate", "AssessmentUpdate", "AssessmentPublic", "AssessmentPublicWithDetails", "AssessmentsPublic", "AssessmentType",
    
    # 👥 Enregistrement présences
    "AttendanceRecord", "AttendanceRecordBase", "AttendanceRecordCreate", "AttendanceRecordUpdate", "AttendanceRecordPublic", "AttendanceRecordPublicWithDetails", "AttendanceRecordsPublic", "AttendanceStatus", "AttendanceStatistics",
    
    # 📊 Notes et évaluations finales
    "Grade", "GradeBase", "GradeCreate", "GradeUpdate", "GradePublic", "GradePublicWithDetails", "GradesPublic", "GradeStatistics", "StudentTranscript",
    
    # 📋 Vue complète des notes étudiants
    "StudentGradeComplete", "StudentGradeCompleteBase", "StudentGradeCompletePublic", "StudentGradeCompleteWithCalculations", 
    "StudentGradeCompletesPublic", "StudentGradeViewFilters", "StudentGradeViewSummary",
    
    # 📋 Vue complète des présences étudiants
    "StudentAttendanceComplete", "StudentAttendanceCompleteBase", "StudentAttendanceCompletePublic", "StudentAttendanceCompleteWithCalculations",
    "StudentAttendanceCompletesPublic", "StudentAttendanceViewFilters", "StudentAttendanceStatistics", "StudentAttendanceViewSummary",
    "AttendanceReport", "AttendanceAlerts", "CourseAttendanceSummary", "AttendanceGroupBy",
    
    # 📋 Vue complète des cours étudiants
    "StudentCoursesComplete", "StudentCoursesCompleteBase", "StudentCoursesCompletePublic", "StudentCoursesCompleteWithAnalytics",
    "StudentCoursesCompletesPublic", "StudentCoursesViewFilters", "StudentCoursesStatistics", "StudentCoursesViewSummary",
    "CoursePerformanceReport", "TeacherCoursesOverview", "AcademicAlert", "AcademicAlerts", "StudentProgressTracker",
    "CourseComparisonAnalysis", "AcademicYearSummary", "ProgramPerformanceAnalysis",
    
    # 📋 Vue complète des évaluations étudiants
    "StudentAssessmentsComplete", "StudentAssessmentsCompleteBase", "StudentAssessmentsCompletePublic", "StudentAssessmentsCompleteWithAnalytics",
    "StudentAssessmentsCompletesPublic", "StudentAssessmentsViewFilters", "AssessmentStatistics", "StudentAssessmentsViewSummary",
    "AssessmentPerformanceReport", "TeacherAssessmentsOverview", "AssessmentAlerts", "AssessmentProgressTracker",
    "AssessmentComparison", "CourseAssessmentAnalysis", "AssessmentWorkloadAnalysis", "AssessmentGradingEfficiency",
    "AssessmentCalendar",
    "UserOTP", "UserOTPBase",
]

# ==================================================================================
# MODÈLES SQLMODEL AVEC TABLE=TRUE (pour db.py et Alembic)
# ==================================================================================
# Ces modèles représentent les tables dans la base de données
SQLMODEL_TABLE_MODELS = [
    User,                    # Utilisateurs de base
    Item,                    # Items liés aux utilisateurs
    University,              # Universités
    ProgramLevel,            # Niveaux de programme (Licence, Master, etc.)
    Permission,              # Permissions système
    Role,                    # Rôles utilisateur
    RolePermission,          # Association role-permission
    UserRole,                # Association user-role
    Department,              # Départements d'université
    Faculty,                 # Facultés dans les départements
    Program,                 # Programmes d'études
    AcademicYear,           # Années académiques
    Session,                # Sessions académiques (semestres)
    Course,                 # Cours
    CourseProgramLevel,     # Association cours-niveau
    Student,                # Étudiants
    Teacher,                # Enseignants
    CourseSession,          # Sessions de cours spécifiques
    Enrollment,             # Inscriptions étudiant-cours
    Schedule,               # Horaires des cours
    AttendanceSession,      # Sessions de présence
    Assessment,             # Évaluations/examens
    AttendanceRecord,       # Enregistrements de présence
    Grade,                  # Notes des étudiants
    UserOTP,                # OTP pour authentification
]