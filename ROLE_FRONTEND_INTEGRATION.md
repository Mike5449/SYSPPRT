# Frontend Role Display Integration

## Vue d'ensemble

Cette documentation décrit l'intégration de l'affichage des rôles utilisateurs dans le frontend de l'application.

## Architecture

### 1. Hook personnalisé: useUserRoles

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

**Caractéristiques**:
- Utilise TanStack Query pour le caching et la gestion de l'état
- Désactivé automatiquement si userId est undefined
- Clé de cache unique par utilisateur: `["user-roles", userId]`
- Invalidation automatique via queryClient

### 2. Composant RoleBadges

**Fichier**: `frontend/src/components/common/RoleBadges.tsx`

Composant réutilisable pour afficher les rôles sous forme de badges colorés avec icônes.

**Props**:
```typescript
interface RoleBadgesProps {
  roles: Array<{ code: string; name: string }>
  size?: "sm" | "md" | "lg"
}
```

**Mapping des rôles**:
| Code | Couleur | Icône | Label Français |
|------|---------|-------|----------------|
| ADMIN | Rouge | FaUserShield | Administrateur |
| TEACHER | Bleu | FaChalkboardTeacher | Enseignant |
| STUDENT | Vert | FaUserGraduate | Étudiant |
| STAFF | Violet | FaUserTie | Personnel |

**Utilisation**:
```tsx
<RoleBadges 
  roles={[
    { code: "STUDENT", name: "Étudiant" },
    { code: "TEACHER", name: "Enseignant" }
  ]} 
  size="sm" 
/>
```

## Intégrations réalisées

### 1. Détails de l'étudiant (StudentDetails.tsx)

**Emplacement**: Section "Informations personnelles"

**Modifications**:
```tsx
// Import
import RoleBadges from "../common/RoleBadges"
import { useUserRoles } from "../../hooks/useUserRoles"

// Hook dans le composant
const { data: userRoles } = useUserRoles(studentDetails?.user?.id)

// Affichage dans le Grid
{studentDetails.user && (
  <GridItem>
    <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
      Rôles
    </Text>
    <RoleBadges 
      roles={userRoles?.map(role => ({ code: role.code, name: role.name })) || []} 
      size="sm" 
    />
  </GridItem>
)}
```

**Comportement**:
- Les rôles s'affichent uniquement si l'utilisateur existe
- Chargement asynchrone après l'ouverture du dialog
- Affichage des badges avec icônes et couleurs

### 2. Administration des utilisateurs (admin.tsx)

**Emplacement**: Colonne "Role" dans la table des utilisateurs

**Modifications**:
```tsx
// Import
import RoleBadges from "@/components/common/RoleBadges"
import { useUserRoles } from "@/hooks/useUserRoles"

// Nouveau composant UserRolesCell
function UserRolesCell({ userId }: { userId: string }) {
  const { data: userRoles, isLoading } = useUserRoles(userId)

  if (isLoading) {
    return <span>Loading...</span>
  }

  if (!userRoles || userRoles.length === 0) {
    return <span>No roles</span>
  }

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

**Comportement**:
- Remplace l'affichage basique "Superuser/User"
- Affiche tous les rôles assignés à l'utilisateur
- Message "No roles" si aucun rôle assigné
- État de chargement géré individuellement par ligne

## API Endpoints utilisés

### GET /api/v1/roles/user/{user_id}

**Authentification**: Token JWT requis

**Permissions**: 
- Utilisateurs: peuvent voir leurs propres rôles
- Superusers: peuvent voir les rôles de tous les utilisateurs

**Réponse**:
```json
[
  {
    "id": "uuid",
    "code": "STUDENT",
    "name": "Étudiant",
    "description": "Peut consulter ses cours et notes",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

## Invalidation du cache

Pour rafraîchir les rôles après une modification:

```typescript
// Dans un composant
const queryClient = useQueryClient()

// Après l'assignation/retrait d'un rôle
queryClient.invalidateQueries({ queryKey: ["user-roles", userId] })

// Ou invalider tous les rôles
queryClient.invalidateQueries({ queryKey: ["user-roles"] })
```

## Futures améliorations possibles

### 1. Interface de gestion des rôles (Admin UI)

**Composant suggéré**: `ManageUserRoles.tsx`

Fonctionnalités:
- Afficher tous les rôles disponibles
- Cocher/décocher pour assigner/retirer des rôles
- Utiliser les endpoints POST/DELETE `/api/v1/roles/user/{user_id}/role/{role_code}`

```tsx
function ManageUserRoles({ userId }: { userId: string }) {
  const { data: userRoles } = useUserRoles(userId)
  const { data: allRoles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: () => RolesService.getAllRolesApiV1RolesGet()
  })

  const assignRole = useMutation({
    mutationFn: (roleCode: string) => 
      RolesService.assignRoleToUserApiV1RolesUserUserIdRoleRoleCodePost({
        userId,
        roleCode
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] })
    }
  })

  const removeRole = useMutation({
    mutationFn: (roleCode: string) => 
      RolesService.removeRoleFromUserApiV1RolesUserUserIdRoleRoleCodeDelete({
        userId,
        roleCode
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] })
    }
  })

  // Render checkboxes for each role...
}
```

### 2. Affichage des rôles dans le profil utilisateur

**Fichier**: `frontend/src/routes/_layout/settings.tsx`

Ajouter une section "Mes rôles" dans les paramètres utilisateur avec:
- Liste des rôles actuels
- Permissions associées (si disponibles)
- Date d'assignation (nécessite modification du modèle backend)

### 3. Filtre par rôle dans les listes

**Fichier**: `frontend/src/routes/_layout/admin.tsx`

Ajouter un sélecteur de rôle pour filtrer les utilisateurs:
```tsx
const [selectedRole, setSelectedRole] = useState<string | null>(null)

// Modifier la query pour inclure le filtre
queryFn: () =>
  UsersService.readUsers({ 
    skip: (page - 1) * PER_PAGE, 
    limit: PER_PAGE,
    role: selectedRole  // Nécessite modification backend
  })
```

### 4. Indicateurs visuels conditionnels

Afficher/masquer des éléments UI selon les rôles:

```tsx
const { data: currentUserRoles } = useUserRoles(currentUser?.id)
const isTeacher = currentUserRoles?.some(role => role.code === "TEACHER")

{isTeacher && (
  <Button>Gérer mes cours</Button>
)}
```

## Tests recommandés

### 1. Test du hook useUserRoles

```typescript
describe("useUserRoles", () => {
  it("should fetch user roles when userId is provided", async () => {
    // Test implementation
  })

  it("should not fetch when userId is undefined", () => {
    // Test implementation
  })
})
```

### 2. Test du composant RoleBadges

```typescript
describe("RoleBadges", () => {
  it("should render badges for each role", () => {
    // Test implementation
  })

  it("should display correct color for each role code", () => {
    // Test implementation
  })

  it("should handle empty roles array", () => {
    // Test implementation
  })
})
```

### 3. Test d'intégration

```typescript
describe("StudentDetails with roles", () => {
  it("should display student roles in details dialog", async () => {
    // Test implementation
  })
})
```

## Dépannage

### Problème: Les rôles ne s'affichent pas

**Vérifications**:
1. Le backend est-il démarré et accessible?
2. L'utilisateur est-il authentifié? (Token JWT valide)
3. Les rôles ont-ils été initialisés? (Exécuter `python -m app.init_roles`)
4. Les rôles sont-ils assignés à l'utilisateur? (Vérifier table `user_role`)

**Console DevTools**:
```javascript
// Vérifier la requête
// Devrait afficher GET /api/v1/roles/user/{userId}
```

### Problème: Erreur 403 Forbidden

**Cause**: L'utilisateur essaie de voir les rôles d'un autre utilisateur sans être superuser.

**Solution**: Vérifier la logique de permissions dans `backend/app/api/routes/roles.py`

### Problème: Les badges s'affichent mais sans couleur

**Cause**: Composant RoleBadges utilise un code de rôle non reconnu.

**Solution**: Ajouter le mapping dans `getRoleConfig()` du composant RoleBadges.

## Résumé des fichiers modifiés/créés

### Backend
- ✅ `backend/app/api/routes/roles.py` (CRÉÉ) - Endpoints pour la gestion des rôles
- ✅ `backend/app/api/main.py` (MODIFIÉ) - Enregistrement du router roles
- ✅ `backend/app/services/role_service.py` (MODIFIÉ) - Ajout de `get_all_roles()`

### Frontend
- ✅ `frontend/src/hooks/useUserRoles.ts` (CRÉÉ) - Hook pour charger les rôles
- ✅ `frontend/src/components/common/RoleBadges.tsx` (CRÉÉ) - Composant d'affichage
- ✅ `frontend/src/components/student/StudentDetails.tsx` (MODIFIÉ) - Intégration des rôles
- ✅ `frontend/src/routes/_layout/admin.tsx` (MODIFIÉ) - Affichage dans la table admin
- ✅ `frontend/src/client/` (REGÉNÉRÉ) - Types et services TypeScript

## Prochaines étapes

1. **Tester l'intégration**: Créer un étudiant et vérifier que le badge "Étudiant" s'affiche
2. **Documenter les permissions**: Lier les rôles aux permissions spécifiques
3. **Créer l'UI de gestion**: Interface admin pour assigner/retirer des rôles manuellement
4. **Ajouter des logs**: Tracer les assignations de rôles dans l'historique utilisateur
