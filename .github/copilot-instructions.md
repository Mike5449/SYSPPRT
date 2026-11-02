# Full-Stack FastAPI + React Academic Management System

## Architecture Overview

This is a **full-stack academic management system** with a FastAPI backend and React frontend, designed around academic entities like universities, students, courses, and assessments.

**Key Architecture:**
- **Backend**: FastAPI + SQLModel + PostgreSQL with modular service/repository pattern
- **Frontend**: React + TypeScript + TanStack Router/Query + Chakra UI v3
- **Client Generation**: Auto-generated TypeScript client from OpenAPI schema (`frontend/src/client/`)
- **Docker**: Full containerized development and production environment
- **Database Access**: Adminer UI available at http://localhost:8080 in development
- **Authentication**: JWT tokens with role-based access (ADMIN, TEACHER, STUDENT roles)
- **Dependency Injection**: FastAPI Depends pattern with `SessionDep`, `CurrentUser` (see `backend/app/api/deps.py`)

## Critical Environment Setup

### CORS and Network Configuration (CRITICAL for Multi-Device Access)
The project supports multi-device testing. Key configuration points:

**`.env` file** (root directory):
```bash
FRONTEND_HOST=http://192.168.x.x:5173  # Your network IP
BACKEND_CORS_ORIGINS="http://localhost,http://localhost:5173,http://192.168.x.x,http://192.168.x.x:5173"
VITE_API_URL=http://192.168.x.x:8000  # Backend network address
```

**`frontend/vite.config.ts`**:
```typescript
server: {
  host: "0.0.0.0",  // Listen on all network interfaces
  port: 5173,
}
```

**`frontend/package.json`**:
```json
"dev": "vite --host"  // Ensure network access
```

⚠️ **Critical**: After changing IPs, restart both frontend and backend services. Test with `ipconfig` (Windows) to find your current IP.

## Critical Development Patterns

### 1. Entity-Driven Architecture
The system is organized around academic entities in `backend/app/models/`:
```
student.py, teacher.py, course.py, assessment.py, grade.py, etc.
```
Each entity follows a consistent pattern:
- `EntityBase` (shared properties) → `EntityCreate`/`EntityUpdate` → `Entity` (SQLModel table)
- Corresponding service, repository, and API route files
- Auto-generated TypeScript types and client methods

### 2. UI Form Modernization Pattern (CRITICAL)
**All forms MUST follow this exact pattern** established in components like `AddStudent.tsx`:

```tsx
// 1. Professional Grid Layout with Sections
<Grid gap={6}>
  <GridItem>
    <Text mb={4} fontSize="xs" fontWeight="600" color="fg.emphasized">
      Section Name
    </Text>
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4}>
      {/* Form fields */}
    </Grid>
  </GridItem>
</Grid>

// 2. Consistent Typography
fontSize="xs", fontWeight="500/600"
color="fg.emphasized" (headers), "fg.muted" (descriptions), "fg.default" (content)

// 3. Simplified Checkbox Pattern
import { Checkbox } from "../ui/checkbox"
<Checkbox checked={value} onCheckedChange={(checked) => setValue("field", !!checked)}>
  Label Text
</Checkbox>

// 4. Styled Select Elements (NOT Chakra Select)
<select
  style={{
    width: "100%", padding: "8px 12px", fontSize: "12px", fontWeight: "500",
    border: "1px solid", borderColor: "var(--chakra-colors-border-default)",
    borderRadius: "6px", backgroundColor: "var(--chakra-colors-bg-default)",
    color: "var(--chakra-colors-fg-default)"
  }}
>
```

### 3. Page Layout Pattern (Like assessment.tsx)
**All list pages MUST have this structure:**

```tsx
// 1. Professional Header with Statistics
function EntityHeader() {
  const { data } = useQuery(/* ... */)
  const totalItems = data?.count ?? 0
  const activeItems = data?.data?.filter(/* condition */)?.length ?? 0
  
  return (
    <Box borderBottom="1px solid" borderColor="border.subtle" pb={6} mb={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading fontSize="lg" fontWeight="600" color="fg.emphasized">Title</Heading>
          <Text fontSize="xs" color="fg.muted">Description</Text>
        </Box>
        <HStack gap={3}>
          <IconButton onClick={handleRefresh}><FiRefreshCw /></IconButton>
          <AddEntity />
        </HStack>
      </Flex>
      {/* Statistics badges */}
    </Box>
  )
}

// 2. Modern Table with Scrolling
<Box borderRadius="lg" border="1px solid" borderColor="border.subtle" overflow="hidden">
  <Table.Root size="md" variant="outline">
    <Table.Header bg="bg.subtle" position="sticky" top={0} zIndex={1}>
      {/* Headers with consistent typography */}
    </Table.Header>
  </Table.Root>
  <Box maxH="450px" overflowY="auto">
    {/* Scrollable table body */}
  </Box>
</Box>
```

### 4. State Management Conventions
- **TanStack Query**: All server state via `useQuery`/`useMutation`
- **Query Keys**: Consistent pattern `["entity_type", { page, filters }]`
- **Form State**: React Hook Form for all forms
- **Navigation**: TanStack Router with search params for pagination

### 5. Backend Service Pattern
```python
# Each entity has consistent file structure:
app/
  models/entity.py       # SQLModel definitions
  services/entity.py     # Business logic
  repositories/entity.py # Database operations  
  api/routes/entity.py   # FastAPI endpoints
  schemas/entity.py      # Pydantic models
```

## Development Workflow

### Windows-Specific Backend Startup (CRITICAL)
**On Windows, the backend MUST be started from the `backend/` directory:**

```powershell
# ✅ CORRECT: Navigate to backend directory first
cd c:\path\to\project\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ❌ WRONG: Running from project root will fail with import errors
cd c:\path\to\project
python -m uvicorn app.main:app --reload  # ImportError!
```

**Why**: Python module resolution on Windows requires `app/` to be directly visible in the current directory.

**Alternative with uv (recommended)**:
```powershell
cd backend
uv run fastapi dev app/main.py  # Auto-handles virtual environment
```

### Docker Compose Development (Recommended)
```bash
docker compose watch  # Start all services with live reload
docker compose logs backend  # Check specific service logs
docker compose stop frontend  # Stop individual service
docker compose exec backend bash  # Access backend container shell
```

Services available:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Adminer (DB UI): http://localhost:8080
- Traefik UI: http://localhost:8090

### Frontend Development (Local)
```bash
cd frontend
npm run dev  # Starts Vite dev server with network access
npm run generate-client  # CRITICAL: Run after ANY backend model/API changes
npm run lint  # Biome linter
```

### Backend Development (Local on Windows)
```powershell
cd backend  # CRITICAL: Must be in backend directory
# Activate virtual environment
if (Test-Path .venv\Scripts\Activate.ps1) { .\.venv\Scripts\Activate.ps1 }
# Install dependencies (using uv - faster than pip)
uv sync
# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Or use uv directly (recommended)
uv run fastapi dev app/main.py
```

### Data Initialization & Scripts
**Initialize database with roles and default data:**
```bash
cd backend
# Initialize default roles (ADMIN, TEACHER, STUDENT, STAFF)
python init_roles.py

# Initialize with simple test data
python initial_data_simple.py

# Initialize with complete academic data
python complete_init.py
```

**Utility Scripts** (in `backend/`):
- `check_all_tables.py` - Verify database table creation
- `verify_data.py` - Check data integrity
- `assign_roles_to_existing_users.py` - Migrate existing users to role system
- `export_openapi.py` - Generate OpenAPI spec for client generation

### Client Regeneration (CRITICAL)
After ANY backend model/API changes:
```bash
cd frontend && npm run generate-client
```
This updates `src/client/` with new TypeScript types and service methods. **The frontend will break without this step**.

## Key File Locations

- **UI Components**: `frontend/src/components/ui/` (Chakra UI wrappers)
- **Form Components**: `frontend/src/components/{entity}/Add{Entity}.tsx`
- **Route Pages**: `frontend/src/routes/_layout/{entity}.tsx`
- **API Client**: `frontend/src/client/` (auto-generated - DO NOT edit manually)
- **Models**: `backend/app/models/` (SQLModel entities)
- **Services**: `backend/app/services/` (business logic)
- **Repositories**: `backend/app/repositories/` (database operations)
- **API Routes**: `backend/app/api/routes/` (FastAPI endpoints)
- **Schemas**: `backend/app/schemas/` (Pydantic request/response models)
- **Dependencies**: `backend/app/api/deps.py` (FastAPI dependency injection)

## Database Migrations (CRITICAL)

### Alembic Migration Workflow
```bash
cd backend
alembic revision --autogenerate -m "description"  # Generate migration
alembic upgrade head  # Apply migration
alembic downgrade -1  # Rollback one migration
```

### PostgreSQL View Dependencies (CRITICAL)
**Alembic autogenerate does NOT detect view dependencies**. When dropping columns referenced by views:

```python
def upgrade():
    # MUST drop dependent views first with CASCADE
    op.execute('DROP VIEW IF EXISTS v_student_grades_complete CASCADE')
    
    # Then drop columns/constraints
    op.drop_column('table_name', 'column_name')
    
    # Optionally recreate view without the dropped column
```

**Example**: See `backend/app/alembic/versions/ef63c9862730_remove_enrollment_id_from_grade.py`

### Model Changes Requiring Manual Intervention
- **View dependencies**: Must manually add `DROP VIEW ... CASCADE` before column drops
- **Foreign key removals**: Remove relationships from BOTH models (e.g., Grade/Enrollment)
- **Join condition changes**: Update repository queries when FK relationships change

## Backend Critical Patterns

### Service/Repository Pattern (Strict Separation)
```python
# Repository: Pure database operations (NO business logic)
class EntityRepository(BaseRepository[Entity]):
    def __init__(self, session: Session):
        super().__init__(model=Entity, session=session)
    
    def get_with_relations(self, id: UUID) -> Entity | None:
        # Complex joins, filters, raw SQL
        statement = select(Entity).join(RelatedEntity).where(Entity.id == id)
        return self.session.exec(statement).first()

# Service: Business logic, validation, orchestration
class EntityService(BaseService[Entity, EntityRepository]):
    def __init__(self, session: Session):
        repository = EntityRepository(session)
        super().__init__(repository)
    
    def process_entity(self, id: UUID) -> EntityPublic:
        entity = self.repository.get_with_relations(id)
        # Validation, transformations, calling other services
        return EntityPublic.model_validate(entity)
```

**Key files**: `backend/app/services/base_service.py`, `backend/app/repositories/base_repository.py`

### API Route Pattern with Dependency Injection
```python
from app.api.deps import CurrentUser, SessionDep

@router.get("/{entity_id}", response_model=EntityPublic)
def read_entity(
    entity_id: uuid.UUID,
    session: SessionDep,  # ✅ Auto-injected database session
    current_user: CurrentUser  # ✅ Auto-injected authenticated user
) -> EntityPublic:
    service = EntityService(session)
    entity = service.get_by_id(entity_id)
    if not entity:
        raise HTTPException(404, "Entity not found")
    
    # Role-based access control
    if not current_user.is_superuser:
        # Check ownership or permissions
        if entity.owner_id != current_user.id:
            raise HTTPException(403, "Not authorized")
    
    return entity
```

**Key patterns**:
- `SessionDep`: Database session dependency
- `CurrentUser`: Authenticated user dependency
- `current_user.is_superuser`: Admin role check
- Services initialized per request with session

### Complex Joins Pattern (CRITICAL for Academic Relationships)
When joining through multiple tables, **always verify join conditions**:

```python
# CORRECT: Join Program via ProgramLevel.program_id
.join(ProgramLevel, CourseProgramLevel.program_level_id == ProgramLevel.id)
.join(Program, ProgramLevel.program_id == Program.id)  # ✅ Correct FK

# WRONG (common mistake):
.join(Program, ProgramLevel.id == Program.level_id)  # ❌ Wrong column
```

**Real example**: `backend/app/repositories/student_repository.py:196` - Fixed this exact issue

### Enum Pattern for Database Fields
Always use `str, Enum` for database enums (not plain Enum):

```python
from enum import Enum

class ExamType(str, Enum):
    """Type d'examen pour les notes."""
    INTRA = "intra"
    FINAL = "final"
    REGULAR = "regular"

class EntityBase(SQLModel):
    exam_type: ExamType = Field(default=ExamType.REGULAR)
```

**Why**: SQLModel/Pydantic serializes string enums correctly to JSON/database strings

### Role-Based Access Control Pattern
```python
# In services/role_service.py
class RoleService:
    def assign_role_to_user(self, user_id: UUID, role_code: str) -> None:
        """Auto-assign roles during user creation"""
        pass
    
    def user_has_role(self, user_id: UUID, role_code: str) -> bool:
        """Check if user has specific role"""
        pass

# Auto-assignment in service methods
class StudentService(BaseService[Student, StudentRepository]):
    def create_student_with_user(self, data: StudentWithUserCreate) -> Student:
        # 1. Create user
        user = user_service.create(user_data)
        # 2. Auto-assign STUDENT role
        role_service.assign_role_to_user(user.id, "STUDENT")
        # 3. Create student record
        return self.repository.create(student_data)
```

**Key files**: `backend/app/services/role_service.py`, `backend/init_roles.py`, `COMPLETE_ROLE_SYSTEM_GUIDE.md`

## Frontend Critical Patterns

### Nested Object Display Pattern
For entities with deep nested relationships (e.g., `CourseSessionPublicWithDetails`):

```tsx
// ✅ Use direct props from nested API responses
function EntityDetails({ entity }: { entity: EntityPublicWithDetails }) {
  return (
    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
      <GridItem>
        <Text fontSize="xs" fontWeight="600" color="fg.emphasized">Section</Text>
        {/* Access nested: entity.course_session.course_program_level.course.name */}
      </GridItem>
    </Grid>
  )
}
```

**Examples**: `CourseSessionDetails.tsx`, `AssessmentDetails.tsx`

### Atomic Transaction Pattern (Wizard Forms)
For multi-step forms creating related entities with rollback on error:

```tsx
const createWithRollback = async () => {
  try {
    const parent = await createParent({ requestBody: step1Data })
    try {
      await createChild({ requestBody: { ...step2Data, parent_id: parent.id } })
      showSuccess()
    } catch (childError) {
      await deleteParent({ id: parent.id })  // Rollback
      throw childError
    }
  } catch (error) {
    showError()
  }
}
```

**Example**: `AddCourseSessionWithProgram.tsx` - 2-step wizard with atomic transaction

### Select Dropdowns Instead of UUID Inputs (UX Pattern)
```tsx
// ❌ BAD: Manual UUID input
<Input placeholder="Enter program_level_id UUID" />

// ✅ GOOD: Select with loaded options
const { data: programLevels } = useQuery({
  queryKey: ["program_levels"],
  queryFn: () => ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 })
})

<select {...register("program_level_id")}>
  {programLevels?.data.map(pl => (
    <option key={pl.id} value={pl.id}>{pl.name}</option>
  ))}
</select>
```

## Common Gotchas

1. **Windows Backend Startup**: Must `cd backend` before running uvicorn (Python module resolution)
2. **Chakra UI v3**: Use semantic color tokens (`fg.emphasized`) not old colors (`gray.600`)
3. **Form Dialogs**: Always use `size={{ base: "xs", md: "lg" }}` for responsive sizing
4. **Checkbox Components**: Use simplified `Checkbox` from ui/checkbox, NOT `CheckboxComponent.Root`
5. **Select Elements**: Use styled HTML `<select>` instead of Chakra Select component
6. **Typography**: Consistently use `fontSize="xs"` and `fontWeight="500/600"`
7. **Academic Entities**: Follow established relationships (Student→User, Course→Program, etc.)
8. **Alembic Autogenerate**: Does NOT detect PostgreSQL view dependencies - must handle manually
9. **Model Relationships**: When removing FK, update BOTH models (parent and child)
10. **Repository Joins**: Always verify join conditions match actual FK columns
11. **Client Regeneration**: Must run after EVERY backend model change or frontend breaks
12. **Dependency Injection**: Services take session as constructor parameter: `EntityService(session)`
13. **Role Auto-Assignment**: STUDENT/TEACHER/ADMIN roles auto-assigned on user creation
14. **Network Configuration**: Update `.env` CORS settings and Vite config for multi-device access

## Testing & Quality
- **Backend**: Pytest with SQLModel test fixtures (`backend/tests/`)
- **Frontend**: Playwright for E2E testing (`frontend/e2e/`)
- **Linting**: Biome for frontend (`npm run lint`), ruff for backend
- **Type Safety**: Full TypeScript coverage with auto-generated client types
- **API Testing**: Interactive docs at http://localhost:8000/docs (Swagger UI)
- **Test Scripts**: `backend/test_*.py` files for specific endpoint testing

## Project-Specific Documentation
- **`COMPLETE_ROLE_SYSTEM_GUIDE.md`**: Comprehensive guide to role-based access control
- **`ROLE_AUTO_ASSIGNMENT.md`**: How roles are auto-assigned during user creation
- **`AGGREGATED_ENDPOINT_SHOWCASE.md`**: Advanced aggregated endpoints with native SQL
- **`JOINTURE_FIXES.md`**: Critical fixes for SQL join patterns in repositories
- **`BULLETIN_DOCUMENTATION.md`**: Student bulletin/transcript generation system
- **`development.md`**: Local development setup with Docker Compose
- **`deployment.md`**: Production deployment instructions

## Additional Tips
- **API Documentation**: Always available at `/docs` endpoint - use for testing
- **Database Inspection**: Use Adminer at http://localhost:8080 (user: postgres, db: app)
- **Traefik Dashboard**: Monitor routing at http://localhost:8090 in development
- **Query Performance**: Check `backend/AGGREGATED_ENDPOINT_SHOWCASE.md` for optimized native SQL patterns
- **Error Debugging**: Check Docker logs with `docker compose logs backend` or `docker compose logs frontend`
- **Schema Changes**: After ANY model change: 1) Create migration, 2) Apply migration, 3) Regenerate frontend client