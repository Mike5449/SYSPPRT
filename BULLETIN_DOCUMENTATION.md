# Système de Bulletin Académique - Documentation

## Vue d'ensemble

Le système de bulletin académique permet de générer et consulter des relevés de notes complets pour les étudiants, organisés par année et session académique.

## Architecture

### Backend (FastAPI)

#### Endpoint API
```
GET /api/v1/students/student-number/{student_number}/transcript/{year_level}
```

**Paramètres:**
- `student_number` (path): Numéro d'identification de l'étudiant
- `year_level` (path): Niveau d'année (1, 2, 3, 4, 5)
- `session_number` (query, optional): Numéro de session (1 ou 2) pour filtrer

**Réponse:** `YearTranscript` avec structure complète des notes

**Permissions:** Superutilisateur ou étudiant consultant son propre bulletin

#### Modèles de données (backend/app/models/transcript.py)

1. **GradeDetail** - Détail d'une note individuelle
   - `exam_type`: Type d'examen (INTRA, FINAL, REGULAR)
   - `score`: Note obtenue
   - `max_score`: Note maximale
   - `assessment_name`: Nom de l'évaluation
   - `graded_date`: Date de notation

2. **CourseGrade** - Note de cours avec calcul pondéré
   - `course_id`, `course_code`, `course_name`
   - `teacher_name`: Nom du professeur
   - `intra_grade`: Note d'examen intra (optionnel)
   - `final_grade`: Note d'examen final (optionnel)
   - `participation_grades`: Liste des notes de participation
   - `participation_average`: Moyenne des participations
   - `intra_percentage`, `final_percentage`, `participation_percentage`: Pondérations
   - `weighted_score`: Note finale pondérée
   - `letter_grade`: Note alphabétique (A+, A, B+, etc.)
   - `is_passing`: Réussite du cours (>= 50%)
   - `course_credits`: Nombre de crédits

3. **SessionTranscript** - Bulletin d'une session
   - `session_id`, `session_name`
   - `session_number`: Numéro de session (1 ou 2)
   - `session_start_date`, `session_end_date`
   - `courses`: Liste des `CourseGrade`
   - `total_credits`: Total des crédits de la session
   - `earned_credits`: Crédits obtenus (cours réussis)
   - `session_average`: Moyenne pondérée de la session
   - `session_gpa`: GPA de la session (échelle 4.0)

4. **YearTranscript** - Bulletin annuel complet
   - `student_id`, `student_name`, `student_number`
   - `program_name`: Nom du programme d'études
   - `year_level`: Niveau d'année
   - `sessions`: Liste des `SessionTranscript`
   - `total_credits`: Total des crédits de l'année
   - `earned_credits`: Crédits obtenus dans l'année
   - `year_average`: Moyenne annuelle pondérée
   - `year_gpa`: GPA annuel (échelle 4.0)
   - `is_passing_year`: Année réussie
   - `generated_at`: Date de génération du bulletin

#### Service (backend/app/services/transcript_service.py)

**TranscriptService** - Service de génération de bulletins

##### Méthodes principales:

1. **`generate_year_transcript(student_number, year_level, session_number?)`**
   - Point d'entrée principal
   - Génère le bulletin complet pour une année
   - Peut filtrer par numéro de session

2. **`_generate_session_transcript(student, session, year_level)`**
   - Génère le bulletin d'une session spécifique
   - Effectue les jointures complexes pour récupérer toutes les données
   - Groupe les notes par type d'examen

3. **`_calculate_weighted_score(intra_grade, final_grade, participation_grades, course_session)`**
   - Calcule la note finale pondérée
   - **Avec pondérations configurées:**
     - Score intra normalisé × `intra_percentage`
     - Score final normalisé × `final_percentage`
     - Moyenne participation × `participation_percentage`
   - **Sans pondérations:** Moyenne simple de toutes les notes
   - Retourne: `(weighted_score, participation_average)`

4. **`_score_to_letter(score)`**
   - Conversion en note alphabétique:
     - 90+ → A+
     - 85-89 → A
     - 80-84 → A-
     - 77-79 → B+
     - 73-76 → B
     - 70-72 → B-
     - 67-69 → C+
     - 63-66 → C
     - 60-62 → C-
     - 55-59 → D+
     - 50-54 → D
     - <50 → F

5. **`_calculate_gpa(average)`**
   - Conversion en GPA (échelle 4.0)
   - Échelle: 4.0 (A+) à 0.0 (F)

##### Logique de calcul:

**Moyenne de session:**
```python
session_average = Σ(course_weighted_score × course_credits) / Σ(course_credits)
```

**Moyenne annuelle:**
```python
year_average = Σ(session_average × session_credits) / Σ(session_credits)
```

**Crédits obtenus:**
- Un cours est réussi si `weighted_score >= 50%`
- Crédits obtenus = somme des crédits des cours réussis

### Frontend (React + TypeScript)

#### Composants créés:

1. **`StudentTranscript.tsx`** - Composant d'affichage du bulletin
   - **Props:** 
     - `studentNumber`: Numéro de l'étudiant
     - `yearLevel`: Année académique
     - `sessionNumber?`: Session optionnelle

   - **Fonctionnalités:**
     - Affichage hiérarchique (Année → Sessions → Cours → Notes)
     - En-tête avec informations étudiant et statistiques annuelles
     - Badge de statut (Année réussie/échouée)
     - Pour chaque session:
       * En-tête de session avec dates et statistiques
       * Tableau des cours avec colonnes:
         - Code et nom du cours
         - Note intra (avec %)
         - Note finale (avec %)
         - Participation moyenne (avec %)
         - Note finale pondérée
         - Note alphabétique
         - Crédits
         - Statut (Réussi/Échoué)
       * Résumé de session (crédits, taux de réussite)
     - Boutons d'impression et téléchargement
     - Styles d'impression CSS (`@media print`)

2. **`transcript.tsx`** - Page dédiée aux bulletins
   - **Route:** `/transcript`
   - **Fonctionnalités:**
     - Formulaire de recherche:
       * Champ de saisie du numéro d'étudiant
       * Sélecteur d'année (1-5)
       * Sélecteur de session (Toutes/1/2)
       * Bouton de recherche
     - Affichage du composant `StudentTranscript` après recherche
     - État vide avec message d'instructions
     - Bouton de réinitialisation

3. **`StudentTranscriptDialog.tsx`** - Dialog modal pour bulletin
   - **Props:**
     - `studentNumber`: Numéro de l'étudiant
     - `studentName`: Nom de l'étudiant

   - **Fonctionnalités:**
     - Bouton déclencheur "Voir le bulletin"
     - Modal responsive avec filtres intégrés:
       * Sélecteur d'année
       * Sélecteur de session
     - Zone de contenu scrollable
     - Intégré dans `StudentDetails.tsx` (footer du dialog)

#### Navigation

Ajout dans le menu latéral (`SidebarItems.tsx`):
- **Groupe:** "Étudiants & Cours"
- **Icône:** `FiFileText`
- **Label:** "Bulletins"
- **Route:** `/transcript`

## Exemples d'utilisation

### API Backend

#### Bulletin d'une année complète
```bash
GET /api/v1/students/student-number/2345dfgh/transcript/1
```

#### Bulletin d'une session spécifique
```bash
GET /api/v1/students/student-number/2345dfgh/transcript/1?session_number=1
```

### Frontend

#### Dans la page dédiée
1. Naviguer vers "Bulletins" dans le menu
2. Entrer le numéro d'étudiant
3. Sélectionner l'année et optionnellement la session
4. Cliquer sur "Rechercher"

#### Depuis les détails d'un étudiant
1. Ouvrir les détails d'un étudiant
2. Cliquer sur "Voir le bulletin" dans le footer
3. Sélectionner l'année et session dans le modal
4. Consulter le bulletin dans le modal scrollable

## Calculs et algorithmes

### Score pondéré avec pourcentages configurés

Exemple avec:
- `intra_percentage = 30%`
- `final_percentage = 40%`
- `participation_percentage = 30%`

Si l'étudiant a:
- Intra: 80/100 (80%)
- Final: 90/100 (90%)
- Participations: 85%, 90%, 95% (moyenne = 90%)

**Calcul:**
```
weighted_score = (80 × 0.30) + (90 × 0.40) + (90 × 0.30)
               = 24 + 36 + 27
               = 87%
```

### Score sans pondération

Si les pourcentages ne sont pas configurés:
```
weighted_score = (80 + 90 + 85 + 90 + 95) / 5 = 88%
```

### Moyenne de session pondérée

Si session avec 3 cours:
- Cours A: 87% (3 crédits)
- Cours B: 75% (4 crédits)
- Cours C: 92% (3 crédits)

```
session_average = (87×3 + 75×4 + 92×3) / (3+4+3)
                = (261 + 300 + 276) / 10
                = 837 / 10
                = 83.7%
```

## Configuration requise

### Variables d'environnement
Aucune configuration spécifique requise - utilise la configuration existante du système.

### Permissions
- **Superutilisateur:** Accès à tous les bulletins
- **Étudiant:** Accès uniquement à son propre bulletin (vérifié via `student.user_id == current_user.id`)

## Migration et déploiement

### Fichiers modifiés:
- ✅ Backend: Ajout de transcript.py, transcript_service.py, modification de students.py
- ✅ Frontend: Ajout de 3 composants, modification de SidebarItems.tsx
- ✅ Aucune migration de base de données requise
- ✅ Génération du client TypeScript effectuée

### Commandes de déploiement:
```bash
# Régénérer le client TypeScript
cd frontend
npm run generate-client

# Redémarrer le backend (si nécessaire)
cd ../backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Redémarrer le frontend (si nécessaire)
cd ../frontend
npm run dev
```

## Tests recommandés

### Backend
```bash
cd backend
pytest app/tests/api/test_students.py::test_read_transcript
```

### Frontend
- Recherche d'un bulletin existant
- Filtrage par session
- Affichage avec et sans pondérations
- Test d'impression
- Ouverture depuis StudentDetails
- Permissions (accès refusé pour bulletin d'un autre étudiant)

## Maintenance

### Ajout de nouveaux types d'examens
Modifier `ExamType` dans `backend/app/models/grade.py` et `TranscriptService._calculate_weighted_score()`

### Modification des échelles de notes
Modifier `_score_to_letter()` et `_calculate_gpa()` dans `TranscriptService`

### Ajout de statistiques
Étendre les modèles `SessionTranscript` ou `YearTranscript` dans `transcript.py`

## Dépendances

### Backend
- SQLModel (queries complexes avec jointures)
- FastAPI (endpoint REST)
- Pydantic (validation des schémas)

### Frontend
- TanStack Query (gestion du cache et requêtes)
- Chakra UI v3 (composants UI)
- React Router (navigation)

## Points d'attention

1. **Performances:** Les requêtes effectuent plusieurs jointures complexes - surveiller les performances avec de gros volumes
2. **Cache:** TanStack Query cache les résultats - penser à invalider le cache après modification de notes
3. **Permissions:** Le service vérifie les permissions - ne pas contourner pour respecter la sécurité
4. **Pondérations manquantes:** Le système gère gracieusement l'absence de pondérations (moyenne simple)
5. **Notes multiples:** La participation supporte plusieurs notes (liste), intra et final sont uniques par défaut
