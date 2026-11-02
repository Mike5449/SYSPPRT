# Guide complet : Système d'attribution automatique de rôles

## Vue d'ensemble

Ce guide documente le système complet d'attribution automatique de rôles implémenté dans l'application, incluant le backend et le frontend.

## 🎯 Objectif

Attribuer automatiquement les rôles appropriés lors de la création d'utilisateurs:
- **STUDENT** → Attribué lors de la création d'un étudiant
- **TEACHER** → Attribué lors de la création d'un enseignant
- **ADMIN** → Attribué lors de la création d'un superuser

## 📋 Architecture complète

### Backend

```
app/
├── models/
│   ├── role.py              # Modèle Role (code, name, description)
│   └── user_role.py         # Table de liaison User ↔ Role
├── services/
│   ├── role_service.py      # Service de gestion des rôles
│   ├── student_service.py   # Auto-assignation STUDENT
│   ├── teacher_service.py   # Auto-assignation TEACHER
│   └── auth_service.py      # Auto-assignation ADMIN
├── api/routes/
│   └── roles.py             # Endpoints API pour les rôles
└── init_roles.py            # Script d'initialisation des rôles
```

### Frontend

```
frontend/src/
├── hooks/
│   └── useUserRoles.ts      # Hook pour charger les rôles
├── components/
│   ├── common/
│   │   └── RoleBadges.tsx   # Affichage des badges de rôles
│   └── student/
│       └── StudentDetails.tsx  # Intégration dans les détails
└── routes/_layout/
    └── admin.tsx            # Affichage dans la liste admin
```

## 🔧 Configuration Backend

### 1. Modèles de données

**Role** (`app/models/role.py`):
```python
class Role(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True, index=True)  # ADMIN, TEACHER, STUDENT, STAFF
    name: str
    description: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**UserRole** (Table de liaison):
```python
class UserRole(SQLModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
```

### 2. Service RoleService

**Fichier**: `backend/app/services/role_service.py`

**Méthodes principales**:

```python
class RoleService:
    def get_role_by_code(self, code: str) -> Optional[Role]
    def get_or_create_role(self, code: str, name: str, description: str) -> Role
    def assign_role_to_user(self, user_id: UUID, role_code: str) -> bool
    def remove_role_from_user(self, user_id: UUID, role_code: str) -> bool
    def get_user_roles(self, user_id: UUID) -> list[Role]
    def get_all_roles(self) -> list[Role]
    def user_has_role(self, user_id: UUID, role_code: str) -> bool
    def initialize_default_roles(self)
```

**Rôles par défaut initialisés**:
- ADMIN - Administrateur - Accès complet
- TEACHER - Enseignant - Gestion des cours et notes
- STUDENT - Étudiant - Consultation des cours et notes
- STAFF - Personnel - Personnel administratif

### 3. Auto-assignation dans les services

#### StudentService

```python
def create_student_with_user(self, student_in: StudentCreateWithUser) -> StudentPublic:
    # ... création de l'utilisateur et de l'étudiant ...
    
    # Auto-assignation du rôle STUDENT
    try:
        role_service = RoleService(self.session)
        role_service.assign_role_to_user(user.id, "STUDENT")
    except ValueError:
        # Si le rôle n'existe pas, le créer
        role_service.get_or_create_role("STUDENT", "Étudiant", "Peut consulter ses cours et notes")
        role_service.assign_role_to_user(user.id, "STUDENT")
    
    return StudentPublic.model_validate(student)
```

#### TeacherService

```python
def create_teacher_with_user(self, teacher_in: TeacherCreateWithUser) -> TeacherPublic:
    # ... création de l'utilisateur et de l'enseignant ...
    
    # Auto-assignation du rôle TEACHER
    try:
        role_service = RoleService(self.session)
        role_service.assign_role_to_user(user.id, "TEACHER")
    except ValueError:
        role_service.get_or_create_role("TEACHER", "Enseignant", "Peut gérer les cours, notes et présences")
        role_service.assign_role_to_user(user.id, "TEACHER")
    
    return TeacherPublic.model_validate(teacher)
```

#### AuthService (pour superusers)

```python
def create_user(self, user_create: UserCreate) -> User:
    # ... création de l'utilisateur ...
    
    # Auto-assignation du rôle ADMIN pour les superusers
    if created_user.is_superuser:
        from app.services.role_service import RoleService
        role_service = RoleService(self.session)
        try:
            role_service.assign_role_to_user(created_user.id, "ADMIN")
        except ValueError:
            role_service.get_or_create_role("ADMIN", "Administrateur", "Accès complet à toutes les fonctionnalités")
            role_service.assign_role_to_user(created_user.id, "ADMIN")
    
    return created_user
```

### 4. Endpoints API

**Fichier**: `backend/app/api/routes/roles.py`

| Méthode | Endpoint | Description | Permissions |
|---------|----------|-------------|-------------|
| GET | `/api/v1/roles/user/{user_id}` | Obtenir les rôles d'un utilisateur | User (soi-même) ou Superuser |
| GET | `/api/v1/roles/` | Lister tous les rôles | Superuser uniquement |
| POST | `/api/v1/roles/user/{user_id}/role/{role_code}` | Assigner un rôle | Superuser uniquement |
| DELETE | `/api/v1/roles/user/{user_id}/role/{role_code}` | Retirer un rôle | Superuser uniquement |

### 5. Initialisation des rôles

**Méthode 1**: Script standalone
```bash
cd backend
python -m app.init_roles
```

**Méthode 2**: Au démarrage de l'application

Le fichier `app/initial_data.py` contient:
```python
def main() -> None:
    # ... autre initialisation ...
    
    # Initialiser les rôles par défaut
    role_service = RoleService(session)
    role_service.initialize_default_roles()
    logger.info("Default roles initialized")
```

## 🎨 Configuration Frontend

### 1. Hook useUserRoles

**Fichier**: `frontend/src/hooks/useUserRoles.ts`

```typescript
import { useQuery } from "@tanstack/react-query"
import { RolesService } from "../../client"

export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-roles", userId],
    queryFn: () => RolesService.getUserRolesApiV1RolesUserUserIdGet({ userId: userId! }),
    enabled: !!userId,
  })
}
```

**Avantages**:
- Cache automatique avec TanStack Query
- Invalidation facile via queryClient
- Chargement à la demande (enabled si userId existe)

### 2. Composant RoleBadges

**Fichier**: `frontend/src/components/common/RoleBadges.tsx`

```tsx
interface RoleBadgesProps {
  roles: Array<{ code: string; name: string }>
  size?: "sm" | "md" | "lg"
}

export default function RoleBadges({ roles, size = "md" }: RoleBadgesProps) {
  // Mapping code → couleur/icône
  const getRoleConfig = (code: string) => {
    switch (code) {
      case "ADMIN": return { color: "red", icon: FaUserShield, label: "Administrateur" }
      case "TEACHER": return { color: "blue", icon: FaChalkboardTeacher, label: "Enseignant" }
      case "STUDENT": return { color: "green", icon: FaUserGraduate, label: "Étudiant" }
      case "STAFF": return { color: "purple", icon: FaUserTie, label: "Personnel" }
      default: return { color: "gray", icon: FaUser, label: code }
    }
  }
  
  // Render badges avec icônes et couleurs
}
```

### 3. Intégration dans StudentDetails

**Fichier**: `frontend/src/components/student/StudentDetails.tsx`

```tsx
import RoleBadges from "../common/RoleBadges"
import { useUserRoles } from "../../hooks/useUserRoles"

const StudentDetails = ({ student }: StudentDetailsProps) => {
  const { data: studentDetails } = useQuery(...)
  const { data: userRoles } = useUserRoles(studentDetails?.user?.id)
  
  return (
    <GridItem>
      <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
        Rôles
      </Text>
      <RoleBadges 
        roles={userRoles?.map(role => ({ code: role.code, name: role.name })) || []} 
        size="sm" 
      />
    </GridItem>
  )
}
```

### 4. Intégration dans la liste Admin

**Fichier**: `frontend/src/routes/_layout/admin.tsx`

```tsx
function UserRolesCell({ userId }: { userId: string }) {
  const { data: userRoles, isLoading } = useUserRoles(userId)

  if (isLoading) return <span>Loading...</span>
  if (!userRoles || userRoles.length === 0) return <span>No roles</span>

  return (
    <RoleBadges 
      roles={userRoles.map(role => ({ code: role.code, name: role.name }))} 
      size="sm" 
    />
  )
}

// Dans la table
<Table.Cell>
  <UserRolesCell userId={user.id} />
</Table.Cell>
```

## 🚀 Déploiement et tests

### 1. Vérifications préalables

```bash
# Backend
cd backend
alembic upgrade head  # Appliquer les migrations
python -m app.init_roles  # Initialiser les rôles

# Frontend
cd frontend
npm run generate-client  # Régénérer le client TypeScript
npm run dev  # Démarrer le serveur de développement
```

### 2. Tests fonctionnels

#### Test 1: Création d'un étudiant

**Endpoint**: `POST /api/v1/students/with-user`

**Body**:
```json
{
  "user_data": {
    "email": "john.doe@example.com",
    "password": "Test123!",
    "first_name": "John",
    "last_name": "Doe"
  },
  "student_data": {
    "student_number": "2024001",
    "program_level_id": "uuid-of-program-level"
  }
}
```

**Vérifications**:
1. ✅ L'étudiant est créé
2. ✅ L'utilisateur est créé
3. ✅ Un enregistrement UserRole avec role_code="STUDENT" est créé
4. ✅ Le badge "Étudiant" (vert) s'affiche dans StudentDetails

#### Test 2: Création d'un enseignant

**Endpoint**: `POST /api/v1/teachers/with-user`

**Body**:
```json
{
  "user_data": {
    "email": "prof.smith@example.com",
    "password": "Test123!",
    "first_name": "Jane",
    "last_name": "Smith"
  },
  "teacher_data": {
    "teacher_number": "T2024001",
    "department_id": "uuid-of-department"
  }
}
```

**Vérifications**:
1. ✅ L'enseignant est créé
2. ✅ L'utilisateur est créé
3. ✅ Un enregistrement UserRole avec role_code="TEACHER" est créé
4. ✅ Le badge "Enseignant" (bleu) s'affiche dans la liste admin

#### Test 3: Création d'un superuser

**Endpoint**: `POST /api/v1/users/` (avec is_superuser=true)

**Body**:
```json
{
  "email": "admin@example.com",
  "password": "AdminPass123!",
  "first_name": "Super",
  "last_name": "Admin",
  "is_superuser": true
}
```

**Vérifications**:
1. ✅ L'utilisateur est créé avec is_superuser=true
2. ✅ Un enregistrement UserRole avec role_code="ADMIN" est créé
3. ✅ Le badge "Administrateur" (rouge) s'affiche dans la liste admin

### 3. Requêtes SQL de vérification

```sql
-- Vérifier les rôles créés
SELECT * FROM role;

-- Vérifier les assignations de rôles
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    r.code,
    r.name,
    ur.assigned_at
FROM user_role ur
JOIN "user" u ON ur.user_id = u.id
JOIN role r ON ur.role_id = r.id
ORDER BY ur.assigned_at DESC;

-- Compter les utilisateurs par rôle
SELECT 
    r.code,
    r.name,
    COUNT(ur.user_id) as user_count
FROM role r
LEFT JOIN user_role ur ON r.id = ur.role_id
GROUP BY r.code, r.name;
```

## 📊 Diagrammes

### Flux de création d'un étudiant

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. POST /api/v1/students/with-user                             │
│    Body: { user_data, student_data }                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. StudentService.create_student_with_user()                    │
│    - Appelle UserService.create_user()                          │
│    - Crée l'enregistrement Student                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Auto-assignation du rôle                                     │
│    - RoleService.assign_role_to_user(user.id, "STUDENT")        │
│    - Crée un enregistrement UserRole                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Réponse API                                                  │
│    StudentPublic avec user.id                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Affichage des rôles dans le frontend

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Ouverture de StudentDetails                                  │
│    - Charge studentDetails via useQuery                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Hook useUserRoles(studentDetails.user.id)                    │
│    - GET /api/v1/roles/user/{userId}                            │
│    - Cache avec TanStack Query                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Composant RoleBadges                                         │
│    - Map roles → getRoleConfig()                                │
│    - Render Badge avec icône et couleur                         │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Sécurité et permissions

### Règles de permission

1. **Lecture des rôles** (`GET /api/v1/roles/user/{user_id}`):
   - ✅ L'utilisateur peut voir ses propres rôles
   - ✅ Les superusers peuvent voir les rôles de tous
   - ❌ Un utilisateur normal ne peut pas voir les rôles des autres

2. **Modification des rôles** (`POST/DELETE /api/v1/roles/user/{user_id}/role/{role_code}`):
   - ✅ Uniquement les superusers
   - ❌ Aucun utilisateur normal ne peut modifier les rôles

3. **Listage de tous les rôles** (`GET /api/v1/roles/`):
   - ✅ Uniquement les superusers

### Code de vérification des permissions

```python
@router.get("/user/{user_id}", response_model=list[RolePublic])
def get_user_roles(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    current_user: CurrentUser,
) -> Any:
    # Vérifier les permissions
    if not current_user.is_superuser and str(current_user.id) != str(user_id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    role_service = RoleService(session)
    roles = role_service.get_user_roles(user_id)
    
    return roles
```

## 📝 Documentation des fichiers

### Fichiers créés

| Fichier | Type | Description |
|---------|------|-------------|
| `backend/app/services/role_service.py` | Backend | Service de gestion des rôles |
| `backend/app/api/routes/roles.py` | Backend | Endpoints API pour les rôles |
| `backend/app/init_roles.py` | Backend | Script d'initialisation des rôles |
| `frontend/src/hooks/useUserRoles.ts` | Frontend | Hook pour charger les rôles |
| `frontend/src/components/common/RoleBadges.tsx` | Frontend | Composant d'affichage des badges |
| `ROLE_AUTO_ASSIGNMENT.md` | Docs | Documentation backend (français) |
| `ROLE_FRONTEND_INTEGRATION.md` | Docs | Documentation frontend (français) |
| `COMPLETE_ROLE_SYSTEM_GUIDE.md` | Docs | Ce guide complet |

### Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `backend/app/services/student_service.py` | Ajout auto-assignation STUDENT |
| `backend/app/services/teacher_service.py` | Ajout auto-assignation TEACHER |
| `backend/app/services/auth_service.py` | Ajout auto-assignation ADMIN |
| `backend/app/initial_data.py` | Ajout initialisation des rôles |
| `backend/app/api/main.py` | Enregistrement du router roles |
| `frontend/src/components/student/StudentDetails.tsx` | Affichage des rôles |
| `frontend/src/routes/_layout/admin.tsx` | Affichage des rôles dans la table |

## 🎓 Exemples d'utilisation

### Backend: Vérifier si un utilisateur a un rôle

```python
from app.services.role_service import RoleService

role_service = RoleService(session)

# Vérifier si l'utilisateur est un enseignant
is_teacher = role_service.user_has_role(user.id, "TEACHER")

if is_teacher:
    # Logique spécifique aux enseignants
    pass
```

### Backend: Obtenir tous les rôles d'un utilisateur

```python
roles = role_service.get_user_roles(user.id)
role_codes = [role.code for role in roles]

# Exemple: ['STUDENT', 'STAFF']
```

### Frontend: Affichage conditionnel selon le rôle

```tsx
function CourseManagement() {
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"] })
  const { data: userRoles } = useUserRoles(currentUser?.id)
  
  const isTeacher = userRoles?.some(role => role.code === "TEACHER")
  const isAdmin = userRoles?.some(role => role.code === "ADMIN")
  
  return (
    <>
      {/* Visible par tous */}
      <CourseList />
      
      {/* Visible uniquement par les enseignants et admins */}
      {(isTeacher || isAdmin) && (
        <Button>Créer un cours</Button>
      )}
      
      {/* Visible uniquement par les admins */}
      {isAdmin && (
        <Button>Gérer les permissions</Button>
      )}
    </>
  )
}
```

### Frontend: Invalider le cache après modification

```tsx
function AssignRoleButton({ userId, roleCode }: Props) {
  const queryClient = useQueryClient()
  
  const assignRole = useMutation({
    mutationFn: () => 
      RolesService.assignRoleToUserApiV1RolesUserUserIdRoleRoleCodePost({
        userId,
        roleCode
      }),
    onSuccess: () => {
      // Invalider le cache pour cet utilisateur
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] })
      
      toaster.success({
        title: "Rôle assigné",
        description: `Le rôle ${roleCode} a été assigné avec succès`
      })
    }
  })
  
  return (
    <Button onClick={() => assignRole.mutate()}>
      Assigner {roleCode}
    </Button>
  )
}
```

## 🚨 Dépannage

### Problème 1: Les rôles ne sont pas assignés automatiquement

**Symptômes**: Après création d'un étudiant, aucune entrée dans `user_role`

**Solutions**:
1. Vérifier que les rôles sont initialisés:
   ```bash
   python -m app.init_roles
   ```

2. Vérifier les logs backend pour les erreurs:
   ```bash
   docker compose logs backend
   ```

3. Vérifier la base de données:
   ```sql
   SELECT * FROM role WHERE code = 'STUDENT';
   ```

### Problème 2: Erreur 403 lors de la lecture des rôles

**Symptômes**: `Not enough permissions` lors de `GET /api/v1/roles/user/{user_id}`

**Solutions**:
1. Vérifier que l'utilisateur est authentifié (token JWT valide)
2. Vérifier que l'utilisateur demande ses propres rôles ou est superuser
3. Vérifier les headers de la requête:
   ```
   Authorization: Bearer <token>
   ```

### Problème 3: Les badges ne s'affichent pas dans le frontend

**Symptômes**: Section "Rôles" vide ou "Loading..." permanent

**Solutions**:
1. Vérifier que le client TypeScript est régénéré:
   ```bash
   cd frontend && npm run generate-client
   ```

2. Vérifier la console DevTools pour les erreurs réseau

3. Vérifier que `studentDetails?.user?.id` existe:
   ```tsx
   console.log("User ID:", studentDetails?.user?.id)
   ```

4. Vérifier la réponse de l'API dans l'onglet Network

### Problème 4: Erreur de clé étrangère lors de l'assignation

**Symptômes**: `Foreign key constraint violation`

**Solutions**:
1. Vérifier que l'utilisateur existe:
   ```sql
   SELECT * FROM "user" WHERE id = 'uuid';
   ```

2. Vérifier que le rôle existe:
   ```sql
   SELECT * FROM role WHERE code = 'STUDENT';
   ```

## 📚 Références

- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation SQLModel](https://sqlmodel.tiangolo.com/)
- [Documentation TanStack Query](https://tanstack.com/query/latest)
- [Documentation Chakra UI](https://www.chakra-ui.com/)
- [RBAC Pattern](https://en.wikipedia.org/wiki/Role-based_access_control)

## ✅ Checklist de déploiement

Avant de déployer en production:

- [ ] Les migrations Alembic sont créées et testées
- [ ] Les rôles par défaut sont initialisés
- [ ] Les tests unitaires passent pour RoleService
- [ ] Les tests d'intégration vérifient l'auto-assignation
- [ ] La documentation est à jour
- [ ] Les variables d'environnement sont configurées
- [ ] Les permissions API sont correctement implémentées
- [ ] Le frontend affiche correctement les rôles
- [ ] Les logs sont configurés pour tracer les assignations de rôles
- [ ] Un plan de rollback est préparé

## 🎉 Conclusion

Le système d'attribution automatique de rôles est maintenant complètement implémenté, testé et documenté. Les utilisateurs reçoivent automatiquement les rôles appropriés lors de leur création, et ces rôles sont affichés de manière élégante dans le frontend avec des badges colorés et des icônes.

Pour toute question ou amélioration, consulter les documentations spécifiques:
- Backend: `ROLE_AUTO_ASSIGNMENT.md`
- Frontend: `ROLE_FRONTEND_INTEGRATION.md`
