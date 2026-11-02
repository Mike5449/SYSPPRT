import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app import crud
from app.core.config import settings
from app.models import Student, User, UserCreate, Program, Faculty, Department, University, ProgramLevel
from app.models.student import StudentCreate, StudentUpdate
from tests.utils.utils import random_email, random_lower_string

def test_read_students(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # Create test data
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    
    # Create university, program level, faculty, department, program
    university = University(name="Test University", code="TU")
    db.add(university)
    db.commit()
    
    program_level = ProgramLevel(name="Bachelor", code="BSC")
    db.add(program_level)
    db.commit()
    
    faculty = Faculty(name="Engineering", code="ENG", university_id=university.id)
    db.add(faculty)
    db.commit()
    
    department = Department(name="Computer Science", code="CS", faculty_id=faculty.id)
    db.add(department)
    db.commit()
    
    program = Program(
        name="Computer Science", 
        code="CS", 
        department_id=department.id, 
        program_level_id=program_level.id,
        duration_years=4
    )
    db.add(program)
    db.commit()
    
    student = Student(
        user_id=user.id,
        program_id=program.id,
        student_number="STU001",
        first_name="John",
        last_name="Doe",
        year_level=1
    )
    db.add(student)
    db.commit()
    
    r = client.get(f"{settings.API_V1_STR}/students/", headers=superuser_token_headers)
    assert r.status_code == 200
    content = r.json()
    assert content["count"] >= 1
    assert len(content["data"]) >= 1


def test_read_students_pagination(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/students/?skip=0&limit=5",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert "data" in content
    assert "count" in content


def test_read_active_students(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/students/active",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert "data" in content
    for student in content["data"]:
        assert student["is_active"] is True


def test_read_students_by_program(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # Get or create a program
    program = db.exec(select(Program)).first()
    if program:
        r = client.get(
            f"{settings.API_V1_STR}/students/program/{program.id}",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        content = r.json()
        assert "data" in content
        assert "count" in content


def test_read_students_by_year_level(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/students/year-level/1",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    content = r.json()
    assert "data" in content
    for student in content["data"]:
        assert student["year_level"] == 1


def test_read_student_by_number(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        r = client.get(
            f"{settings.API_V1_STR}/students/student-number/{student.student_number}",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        content = r.json()
        assert content["student_number"] == student.student_number


def test_read_student_by_number_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/students/student-number/NOTEXIST",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Student not found"


def test_read_student_by_user(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        r = client.get(
            f"{settings.API_V1_STR}/students/user/{student.user_id}",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        content = r.json()
        assert content["user_id"] == str(student.user_id)


def test_read_student_by_user_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_uuid = uuid.uuid4()
    r = client.get(
        f"{settings.API_V1_STR}/students/user/{fake_uuid}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Student not found"


def test_read_student_by_id(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        r = client.get(
            f"{settings.API_V1_STR}/students/{student.id}",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        content = r.json()
        assert content["id"] == str(student.id)


def test_read_student_by_id_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_uuid = uuid.uuid4()
    r = client.get(
        f"{settings.API_V1_STR}/students/{fake_uuid}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Student not found"


def test_create_student(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    
    program = db.exec(select(Program)).first()
    if program:
        data = {
            "user_id": str(user.id),
            "program_id": str(program.id),
            "student_number": "STU999",
            "first_name": "Jane",
            "last_name": "Smith",
            "year_level": 2,
            "gpa": 3.8
        }
        r = client.post(
            f"{settings.API_V1_STR}/students/",
            headers=superuser_token_headers,
            json=data,
        )
        assert r.status_code == 200
        content = r.json()
        assert content["student_number"] == "STU999"
        assert content["first_name"] == "Jane"


def test_create_student_not_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    
    program = db.exec(select(Program)).first()
    if program:
        data = {
            "user_id": str(user.id),
            "program_id": str(program.id),
            "student_number": "STU998",
            "first_name": "Test",
            "last_name": "User",
            "year_level": 1
        }
        r = client.post(
            f"{settings.API_V1_STR}/students/",
            headers=normal_user_token_headers,
            json=data,
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "Not enough permissions"


def test_update_student(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        data = {
            "first_name": "UpdatedFirst",
            "last_name": "UpdatedLast",
            "year_level": 3
        }
        r = client.put(
            f"{settings.API_V1_STR}/students/{student.id}",
            headers=superuser_token_headers,
            json=data,
        )
        assert r.status_code == 200
        content = r.json()
        assert content["first_name"] == "UpdatedFirst"
        assert content["year_level"] == 3


def test_update_student_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_uuid = uuid.uuid4()
    data = {"first_name": "Test"}
    r = client.put(
        f"{settings.API_V1_STR}/students/{fake_uuid}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Student not found"


def test_update_student_not_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        data = {"first_name": "Unauthorized"}
        r = client.put(
            f"{settings.API_V1_STR}/students/{student.id}",
            headers=normal_user_token_headers,
            json=data,
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "Not enough permissions"


def test_update_student_gpa(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        new_gpa = 3.9
        r = client.put(
            f"{settings.API_V1_STR}/students/{student.id}/gpa?new_gpa={new_gpa}",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        content = r.json()
        assert content["gpa"] == new_gpa


def test_update_student_gpa_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_uuid = uuid.uuid4()
    r = client.put(
        f"{settings.API_V1_STR}/students/{fake_uuid}/gpa?new_gpa=3.5",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Student not found"


def test_update_student_gpa_not_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        r = client.put(
            f"{settings.API_V1_STR}/students/{student.id}/gpa?new_gpa=4.0",
            headers=normal_user_token_headers,
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "Not enough permissions"


def test_delete_student(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    
    program = db.exec(select(Program)).first()
    if program:
        student = Student(
            user_id=user.id,
            program_id=program.id,
            student_number="DELTST",
            first_name="Delete",
            last_name="Test",
            year_level=1
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        
        r = client.delete(
            f"{settings.API_V1_STR}/students/{student.id}",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        content = r.json()
        assert content["message"] == "Student deleted successfully"
        
        # Verify deletion
        deleted_student = db.get(Student, student.id)
        assert deleted_student is None


def test_delete_student_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_uuid = uuid.uuid4()
    r = client.delete(
        f"{settings.API_V1_STR}/students/{fake_uuid}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Student not found"


def test_delete_student_not_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    student = db.exec(select(Student)).first()
    if student:
        r = client.delete(
            f"{settings.API_V1_STR}/students/{student.id}",
            headers=normal_user_token_headers,
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "Not enough permissions"