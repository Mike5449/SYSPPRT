# GitHub Copilot Instructions - FastAPI University Management System

## Architecture Overview

This is a **FastAPI backend** for a university management system with a **3-layer architecture**:

```
API Routes (app/api/routes/) → Services (app/services/) → Repositories (app/repositories/) → Models (app/models/)
```

### Key Architectural Patterns

1. **Repository Pattern**: All database access goes through repositories inheriting from `BaseRepository` ([app/repositories/base_repository.py](app/repositories/base_repository.py))
2. **Service Layer**: Business logic lives in services inheriting from `BaseService` ([app/services/base_service.py](app/services/base_service.py))
3. **SQLModel**: Used for both ORM models (with `table=True`) and Pydantic schemas (validation/serialization)
4. **UUID Primary Keys**: All entities use `uuid.UUID` as primary keys, not integers

### Domain Model

Academic hierarchy: `University → Faculty → Department → Program → ProgramLevel → Course`
- Students enroll in `ProgramLevel` (e.g., "Computer Science - Year 1")
- Courses have sessions (`CourseSession`) with schedules
- Students get grades on assessments within course sessions
- Attendance tracking via `AttendanceSession` and `AttendanceRecord`

## Critical Development Patterns

### 1. Adding New Endpoints (Complete Workflow)

When adding a new entity (e.g., "Building"):

**Step 1: Model** (`app/models/building.py`)
```python
from sqlmodel import SQLModel, Field, Relationship
import uuid
from datetime import datetime

# Define base, then table model, then schemas (Create, Update, Public, etc.)
class BuildingBase(SQLModel):
    name: str = Field(max_length=255)
    # ... fields

class Building(BuildingBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class BuildingCreate(BuildingBase):
    pass

class BuildingPublic(BuildingBase):
    id: uuid.UUID
```

**Step 2: Register model** in `app/models/__init__.py` AND `app/core/db.py` (critical for SQLModel relationship resolution)

**Step 3: Repository** (`app/repositories/building_repository.py`)
```python
from app.repositories.base_repository import BaseRepository
from app.models.building import Building

class BuildingRepository(BaseRepository[Building]):
    def __init__(self, session):
        super().__init__(Building, session)
```

**Step 4: Service** (`app/services/building_service.py`)
```python
from app.services.base_service import BaseService
from app.repositories.building_repository import BuildingRepository

class BuildingService(BaseService[Building, BuildingRepository]):
    def __init__(self, session):
        repository = BuildingRepository(session)
        super().__init__(repository)
```

**Step 5: Route** (`app/api/routes/buildings.py`)
```python
from fastapi import APIRouter
from app.api.deps import SessionDep, CurrentUser
from app.services.building_service import BuildingService

router = APIRouter()

@router.get("/", response_model=BuildingsPublic)
def read_buildings(session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100):
    service = BuildingService(session)
    buildings = service.get_all(skip=skip, limit=limit)
    return BuildingsPublic(data=buildings, count=len(buildings))
```

**Step 6: Register route** in `app/api/main.py`:
```python
from app.api.routes import buildings
api_router.include_router(buildings.router, prefix="/buildings", tags=["buildings"])
```

### 2. Database Dependencies

**ALWAYS use these dependency injections**:
- `SessionDep`: Database session (from `app.api.deps`)
- `CurrentUser`: Authenticated user (from `app.api.deps`)

```python
def my_endpoint(session: SessionDep, current_user: CurrentUser):
    # session is auto-managed, no need to commit/rollback manually in routes
    # Repositories handle session.commit()
```

### 3. Schema Patterns

**Standard schema naming**:
- `{Model}Base`: Shared fields
- `{Model}`: SQLModel table (includes id, timestamps)
- `{Model}Create`: For POST requests
- `{Model}Update`: For PUT/PATCH (all fields optional)
- `{Model}Public`: For responses (excludes sensitive data)
- `{Model}sPublic`: Plural wrapper with `data: list` and `count: int`

Example from [app/models/student.py](app/models/student.py):
```python
class StudentsPublic(SQLModel):
    data: list[StudentPublic]
    count: int
```

### 4. Foreign Key Relationships

**Always use UUID for foreign keys**:
```python
class Student(SQLModel, table=True):
    program_level_id: uuid.UUID = Field(foreign_key="program_level.id", index=True)
    # Relationship for ORM traversal
    program_level: "ProgramLevel" = Relationship(back_populates="students")
```

When adding relationships, update BOTH sides and import with `TYPE_CHECKING` to avoid circular imports:
```python
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.student import Student
```

## Development Workflow

### Running the Application

**Development (live reload)**:
```bash
fastapi run --reload app/main.py
# OR with uvicorn:
uvicorn app.main:app --reload --port 8000
```

**Docker Compose**:
```bash
docker compose watch  # Auto-rebuilds on changes
```

### Database Migrations

**Using Alembic** (configured in [alembic.ini](alembic.ini)):
```bash
# Create migration
alembic revision --autogenerate -m "Add building model"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

**⚠️ Important**: All models with `table=True` MUST be imported in [app/core/db.py](app/core/db.py#L26-L80) before running alembic, otherwise relationships will fail.

### Testing

**Run all tests**:
```bash
bash ./scripts/test.sh
# Runs: coverage run -m pytest tests/ && coverage report
```

Tests are in `tests/` with structure mirroring `app/` (see [tests/api/](tests/api/), [tests/crud/](tests/crud/)).

**Testing authenticated endpoints** (see [TESTING_GUIDE.md](TESTING_GUIDE.md#L1-L200)):
1. Use Swagger UI at `http://localhost:8000/docs`
2. Login via `/api/v1/login/access-token`
3. Use "Authorize" button with token

### Configuration

**Environment variables** (via [app/core/config.py](app/core/config.py)):
- Reads from `../.env` (parent directory)
- Key settings: `POSTGRES_SERVER`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `SECRET_KEY`
- CORS origins: `BACKEND_CORS_ORIGINS` (comma-separated)

### Code Quality

**Linting/Formatting** (configured in [pyproject.toml](pyproject.toml)):
```bash
ruff check .      # Lint
ruff format .     # Format
mypy .            # Type checking
```

## Project-Specific Conventions

1. **All IDs are UUIDs**: Never use `int` for entity IDs
2. **French comments**: Many comments/docstrings are in French (historic reasons)
3. **Custom OpenAPI ID**: Routes use first tag + name for operation IDs (see [app/main.py](app/main.py#L10-L14))
4. **Date vs DateTime**: Use `date` for academic dates (admission_date), `datetime` for timestamps
5. **Status enums as strings**: Define as class with string constants, not Python Enums (e.g., `StudentStatus.ACTIVE`)
6. **Session management**: FastAPI dependency injection handles session lifecycle - repositories just call `session.commit()`
7. **View models**: Some aggregated data uses database views (e.g., `student_grade_view`) with read-only repositories

## Common Gotchas

- **Importing models**: Import order matters! Base models before dependent ones in `__init__.py`
- **Relationship cycles**: Use `TYPE_CHECKING` and forward references (`"ModelName"`) to avoid circular imports
- **Alembic issues**: If migrations fail, check all models are imported in [app/core/db.py](app/core/db.py)
- **CORS errors**: Update `BACKEND_CORS_ORIGINS` in `.env` or add frontend URL to `FRONTEND_HOST`
- **UUID validation**: Accept `uuid.UUID` in route parameters, FastAPI handles string→UUID conversion

## Key Files Reference

- **Main app**: [app/main.py](app/main.py)
- **API router setup**: [app/api/main.py](app/api/main.py)
- **Dependencies**: [app/api/deps.py](app/api/deps.py) (SessionDep, CurrentUser)
- **Base patterns**: [app/repositories/base_repository.py](app/repositories/base_repository.py), [app/services/base_service.py](app/services/base_service.py)
- **Example route**: [app/api/routes/students.py](app/api/routes/students.py)
- **Database setup**: [app/core/db.py](app/core/db.py)
- **Testing guide**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
