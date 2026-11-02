# Attribution Automatique des Rôles - Documentation

## ✅ Implémentation terminée

### 📁 Fichiers créés/modifiés

1. **`backend/app/services/role_service.py`** (NOUVEAU)
   - Service complet pour la gestion des rôles
   - Méthodes principales:
     - `get_role_by_code(code)`: Récupère un rôle par son code
     - `get_or_create_role(code, name, description)`: Crée ou récupère un rôle
     - `assign_role_to_user(user_id, role_code)`: Assigne un rôle à un utilisateur
     - `remove_role_from_user(user_id, role_code)`: Retire un rôle
     - `get_user_roles(user_id)`: Liste les rôles d'un utilisateur
     - `user_has_role(user_id, role_code)`: Vérifie si un user a un rôle
     - `initialize_default_roles()`: Crée les 4 rôles par défaut

2. **`backend/app/services/student_service.py`** (MODIFIÉ)
   - ✅ Attribution automatique du rôle **STUDENT** lors de la création
   - Méthode `create_student_with_user()`:
     ```python
     # Crée l'utilisateur
     user = user_service.create_user(user_in)
     
     # ✨ Attribution automatique du rôle STUDENT
     role_service.assign_role_to_user(user.id, "STUDENT")
     
     # Crée le profil étudiant
     student = self.repository.create(student)
     ```

3. **`backend/app/services/teacher_service.py`** (MODIFIÉ)
   - ✅ Attribution automatique du rôle **TEACHER** lors de la création
   - Méthode `create_teacher_with_user()`:
     ```python
     # Crée l'utilisateur
     user = user_service.create_user(user_in)
     
     # ✨ Attribution automatique du rôle TEACHER
     role_service.assign_role_to_user(user.id, "TEACHER")
     
     # Crée le profil enseignant
     teacher = repository.create(session, teacher_in)
     ```

4. **`backend/app/services/auth_service.py`** (MODIFIÉ)
   - ✅ Attribution automatique du rôle **ADMIN** pour les superutilisateurs
   - Méthode `create_user()`:
     ```python
     # Crée l'utilisateur
     created_user = self.repository.create(db_user)
     
     # ✨ Si superutilisateur → rôle ADMIN automatique
     if created_user.is_superuser:
         role_service.assign_role_to_user(created_user.id, "ADMIN")
     ```

5. **`backend/app/init_roles.py`** (NOUVEAU)
   - Script standalone pour initialiser les rôles
   - Usage: `python -m app.init_roles`

6. **`backend/app/initial_data.py`** (MODIFIÉ)
   - Ajout de l'initialisation des rôles au démarrage
   - Les 4 rôles par défaut sont créés avant toute autre donnée

---

## 🎯 Rôles par défaut créés

| Code      | Nom            | Description                              | Assigné à        |
|-----------|----------------|------------------------------------------|------------------|
| `ADMIN`   | Administrateur | Accès complet à toutes les fonctionnalités | Superutilisateurs |
| `TEACHER` | Enseignant     | Peut gérer les cours, notes et présences | Enseignants      |
| `STUDENT` | Étudiant       | Peut consulter ses cours et notes        | Étudiants        |
| `STAFF`   | Personnel      | Personnel administratif                  | (Manuel)         |

---

## 🔄 Flux d'attribution automatique

### Scénario 1: Création d'un étudiant

```
POST /api/v1/students/with-user
{
  "email": "student@school.com",
  "password": "securepass",
  "student_number": "STU001",
  ...
}

┌─────────────────────────────────────┐
│ 1. Créer User                       │
│    email: student@school.com        │
│    is_superuser: false              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Assigner rôle STUDENT            │
│    UserRole(user_id, role_id)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Créer Student                    │
│    student_number: STU001           │
│    user_id: [user.id]               │
└─────────────────────────────────────┘

✅ Résultat:
- User créé avec email
- Rôle STUDENT assigné automatiquement
- Profil Student lié à User
```

### Scénario 2: Création d'un enseignant

```
POST /api/v1/teachers/with-user
{
  "email": "teacher@school.com",
  "password": "securepass",
  "employee_number": "EMP001",
  ...
}

┌─────────────────────────────────────┐
│ 1. Créer User                       │
│    email: teacher@school.com        │
│    is_superuser: false              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Assigner rôle TEACHER            │
│    UserRole(user_id, role_id)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Créer Teacher                    │
│    employee_number: EMP001          │
│    user_id: [user.id]               │
└─────────────────────────────────────┘

✅ Résultat:
- User créé avec email
- Rôle TEACHER assigné automatiquement
- Profil Teacher lié à User
```

### Scénario 3: Création d'un administrateur

```
POST /api/v1/users/
{
  "email": "admin@school.com",
  "password": "securepass",
  "is_superuser": true,  ← Important!
  ...
}

┌─────────────────────────────────────┐
│ 1. Créer User                       │
│    email: admin@school.com          │
│    is_superuser: true               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Détection is_superuser = true   │
│    → Assigner rôle ADMIN            │
│    UserRole(user_id, role_id)       │
└─────────────────────────────────────┘

✅ Résultat:
- User créé avec is_superuser=true
- Rôle ADMIN assigné automatiquement
- Pas de profil Student/Teacher
```

---

## 🛠️ Utilisation du RoleService

### Vérifier les rôles d'un utilisateur

```python
from app.services.role_service import RoleService

role_service = RoleService(session)

# Récupérer tous les rôles d'un utilisateur
user_roles = role_service.get_user_roles(user_id)
# Retourne: [Role(code="STUDENT", name="Étudiant")]

# Vérifier un rôle spécifique
has_teacher_role = role_service.user_has_role(user_id, "TEACHER")
# Retourne: True/False
```

### Assigner/Retirer des rôles manuellement

```python
# Assigner un rôle supplémentaire
role_service.assign_role_to_user(user_id, "STAFF")

# Retirer un rôle
role_service.remove_role_from_user(user_id, "STUDENT")
```

### Créer un nouveau rôle personnalisé

```python
role = role_service.get_or_create_role(
    code="DEAN",
    name="Doyen",
    description="Responsable de la faculté"
)
```

---

## ⚠️ Points importants

1. **Les rôles sont créés automatiquement si absents**
   - Si le rôle n'existe pas lors de l'attribution, il est créé avec `get_or_create_role()`
   - Évite les erreurs si les rôles n'ont pas été initialisés

2. **Un utilisateur peut avoir plusieurs rôles**
   - Architecture Many-to-Many via `UserRole`
   - Exemple: Un utilisateur peut être TEACHER + ADMIN

3. **Les rôles ne sont PAS supprimés automatiquement**
   - Si un Teacher est supprimé, son rôle TEACHER reste dans UserRole
   - À gérer manuellement si besoin de nettoyage

4. **Le rôle STAFF n'est pas auto-assigné**
   - Doit être attribué manuellement via l'API admin

---

## 🚀 Initialisation au démarrage

Les rôles sont initialisés automatiquement lors de:

1. **Exécution de `initial_data.py`**
   ```bash
   cd backend
   python -m app.initial_data
   ```

2. **Ou via script dédié**
   ```bash
   cd backend
   python -m app.init_roles
   ```

Les 4 rôles (ADMIN, TEACHER, STUDENT, STAFF) sont créés s'ils n'existent pas.

---

## 📊 Structure de la base de données

```
┌─────────┐         ┌──────────┐         ┌──────┐
│  User   │◄───────►│ UserRole │◄───────►│ Role │
└─────────┘         └──────────┘         └──────┘
    │                   (table)              │
    │                                        │
    ▼                                        ▼
┌─────────┐                          ┌────────────────┐
│ Student │                          │ RolePermission │
│ Teacher │                          └────────────────┘
└─────────┘                                  │
                                             ▼
                                      ┌────────────┐
                                      │ Permission │
                                      └────────────┘
```

---

## ✅ Tests recommandés

1. **Créer un étudiant** → Vérifier que le rôle STUDENT est assigné
2. **Créer un enseignant** → Vérifier que le rôle TEACHER est assigné
3. **Créer un superutilisateur** → Vérifier que le rôle ADMIN est assigné
4. **Lister les rôles d'un utilisateur** → API `GET /users/{id}/roles`
5. **Assigner un rôle manuellement** → API `POST /users/{id}/roles/{code}`

---

## 🎉 Résultat

Désormais, **chaque utilisateur reçoit automatiquement son rôle approprié** lors de sa création:
- ✅ **Étudiants** → Rôle STUDENT
- ✅ **Enseignants** → Rôle TEACHER  
- ✅ **Administrateurs** → Rôle ADMIN

Plus besoin d'attribution manuelle!
