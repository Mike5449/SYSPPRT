from enum import Enum

class UserRoleEnum(str, Enum):
    SUPER_ADMIN = "super_admin"
    STUDENT = "etudiant"
    TEACHER = "professeur"
    SECRETARY = "secretaire"
