# 📊 Nouveau Endpoint Proposé - Agrégé par Cours

## 🎯 Endpoint Agrégé par Cours

### URL Proposé
```
GET /api/v1/grades/student/{id}/year-level/{level}/courses-summary
```

### Structure de Réponse
```json
{
  "data": [
    {
      "course_id": "uuid",
      "course_name": "Mathématiques",
      "course_code": "INFO-101",
      "course_credits": 4,
      "course_description": "Introduction aux mathématiques...",
      "teacher_name": "Dr. Sophie Laurent",
      "teacher_email": "sophie.laurent@university.edu",
      "session_name": "Automne 2024",
      "program_name": "Informatique",
      
      "grades": [
        {
          "id": "grade-uuid-1",
          "score": 85.0,
          "grade_letter": "B+",
          "assessment_name": "Examen Partiel",
          "assessment_type": "Examen",
          "assessment_weight": 30.0
        },
        {
          "id": "grade-uuid-2", 
          "score": 92.0,
          "grade_letter": "A-",
          "assessment_name": "Examen Final",
          "assessment_type": "Examen", 
          "assessment_weight": 50.0
        },
        {
          "id": "grade-uuid-3",
          "score": 78.0,
          "grade_letter": "B",
          "assessment_name": "Devoir Maison",
          "assessment_type": "Devoir",
          "assessment_weight": 20.0
        }
      ],
      
      "course_statistics": {
        "total_grades": 3,
        "average_score": 85.0,
        "weighted_average": 87.2,
        "highest_score": 92.0,
        "lowest_score": 78.0,
        "final_grade": "B+",
        "total_points_earned": 261.0,
        "total_points_possible": 300.0,
        "completion_percentage": 87.0
      }
    },
    {
      "course_id": "uuid",
      "course_name": "Programmation", 
      "course_code": "INFO-102",
      "course_credits": 6,
      "teacher_name": "Dr. Martin Dubois",
      "session_name": "Automne 2024",
      "program_name": "Informatique",
      
      "grades": [
        {
          "id": "grade-uuid-4",
          "score": 88.0,
          "grade_letter": "A-",
          "assessment_name": "TP1",
          "assessment_type": "Travaux Pratiques"
        },
        {
          "id": "grade-uuid-5",
          "score": 95.0, 
          "grade_letter": "A",
          "assessment_name": "Projet Final",
          "assessment_type": "Projet"
        }
      ],
      
      "course_statistics": {
        "total_grades": 2,
        "average_score": 91.5,
        "highest_score": 95.0,
        "lowest_score": 88.0,
        "final_grade": "A-"
      }
    }
  ],
  "count": 2,
  "level_statistics": {
    "total_courses": 2,
    "total_grades": 5,
    "overall_average": 87.6,
    "total_credits": 10,
    "gpa": 3.4
  }
}
```

## 🏗️ Implémentation

### 1. Nouveau Modèle (grades.py)
```python
class CourseGradeSummary(SQLModel):
    course_id: uuid.UUID
    course_name: str
    course_code: str
    course_credits: int
    course_description: str | None
    teacher_name: str
    teacher_email: str | None
    session_name: str
    program_name: str
    
    grades: list[GradeWithAssessment]
    course_statistics: CourseStatistics

class GradeWithAssessment(SQLModel):
    id: uuid.UUID
    score: float | None
    grade_letter: str | None
    assessment_name: str
    assessment_type: str | None
    assessment_weight: float | None

class CourseStatistics(SQLModel):
    total_grades: int
    average_score: float | None
    weighted_average: float | None
    highest_score: float | None
    lowest_score: float | None
    final_grade: str | None
    total_points_earned: float | None
    total_points_possible: float | None
    completion_percentage: float | None

class CourseGradeSummaryResponse(SQLModel):
    data: list[CourseGradeSummary]
    count: int
    level_statistics: LevelStatistics

class LevelStatistics(SQLModel):
    total_courses: int
    total_grades: int
    overall_average: float | None
    total_credits: int
    gpa: float | None
```

### 2. Repository Method
```python
def get_courses_summary_by_year_level(
    self, student_id: uuid.UUID, year_level: int
) -> CourseGradeSummaryResponse:
    """Récupère résumé des cours avec toutes les notes groupées par cours."""
    
    # Requête pour récupérer toutes les données
    statement = (
        select(
            Course.id.label("course_id"),
            Course.name.label("course_name"),
            Course.code.label("course_code"),
            Course.credits.label("course_credits"),
            Course.description.label("course_description"),
            User.full_name.label("teacher_name"),
            User.email.label("teacher_email"),
            SessionModel.name.label("session_name"),
            Program.name.label("program_name"),
            Grade.id.label("grade_id"),
            Grade.score,
            Grade.grade_letter,
            Assessment.name.label("assessment_name"),
            Assessment.assessment_type,
            Assessment.weight.label("assessment_weight"),
            Assessment.max_score.label("assessment_max_score")
        )
        # ... jointures ...
        .where(
            Grade.student_id == student_id,
            CourseSession.year_level == year_level
        )
        .order_by(Course.name, Assessment.created_at)
    )
    
    results = list(self.session.exec(statement).all())
    
    # Grouper par cours
    courses_dict = {}
    for row in results:
        course_id = row.course_id
        
        if course_id not in courses_dict:
            courses_dict[course_id] = {
                "course_info": {
                    "course_id": course_id,
                    "course_name": row.course_name,
                    "course_code": row.course_code,
                    # ... autres infos du cours
                },
                "grades": []
            }
        
        # Ajouter la note à ce cours
        courses_dict[course_id]["grades"].append({
            "id": row.grade_id,
            "score": row.score,
            "grade_letter": row.grade_letter,
            "assessment_name": row.assessment_name,
            # ...
        })
    
    # Calculer statistiques pour chaque cours
    course_summaries = []
    for course_data in courses_dict.values():
        grades = course_data["grades"]
        
        # Calculs statistiques
        scores = [g["score"] for g in grades if g["score"] is not None]
        statistics = {
            "total_grades": len(grades),
            "average_score": sum(scores) / len(scores) if scores else None,
            "highest_score": max(scores) if scores else None,
            "lowest_score": min(scores) if scores else None,
            # ... autres calculs
        }
        
        course_summary = CourseGradeSummary(
            **course_data["course_info"],
            grades=grades,
            course_statistics=statistics
        )
        course_summaries.append(course_summary)
    
    return CourseGradeSummaryResponse(
        data=course_summaries,
        count=len(course_summaries),
        level_statistics=self._calculate_level_statistics(course_summaries)
    )
```

## 🎯 Comparaison des Approches

### Endpoint Détaillé (Actuel)
✅ **Idéal pour :**
- Vue détaillée de toutes les évaluations
- Export de données complètes
- Tableaux de bord détaillés

### Endpoint Agrégé (Proposé)
✅ **Idéal pour :**
- Vue d'ensemble par cours  
- Bulletins de notes
- Calculs de moyennes par cours
- Interfaces utilisateur simplifiées

## 💡 Recommandation

**Garder les DEUX approches** :

1. **`/with-course-info`** → Vue détaillée (actuel)
2. **`/courses-summary`** → Vue agrégée (nouveau)

Cela donne aux développeurs frontend le **choix** selon leurs besoins !