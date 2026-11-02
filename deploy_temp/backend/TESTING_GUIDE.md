# 🧪 Guide de Test - Endpoints Enrichis des Grades

## 🚀 Méthodes de Test

### 1. **Test avec FastAPI Docs (Swagger UI)**

#### Démarrer le serveur
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

#### Accéder à l'interface Swagger
```
http://localhost:8000/docs
```

#### Tester les endpoints enrichis
1. 🔐 **S'authentifier** d'abord via `/auth/login/access-token`
2. 📊 **Tester les 3 nouveaux endpoints** :
   - `GET /api/v1/grades/student/{student_id}/year-level/{year_level}/with-course-info`
   - `GET /api/v1/grades/student/{student_id}/session/{session_id}/with-course-info`
   - `GET /api/v1/grades/student/{student_id}/course/{course_id}/with-course-info`

---

### 2. **Test avec cURL**

#### A. Obtenir un token d'authentification
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=changethis"
```

#### B. Tester endpoint par année de niveau
```bash
curl -X GET "http://localhost:8000/api/v1/grades/student/550e8400-e29b-41d4-a716-446655440000/year-level/1/with-course-info" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### C. Tester endpoint par session
```bash
curl -X GET "http://localhost:8000/api/v1/grades/student/550e8400-e29b-41d4-a716-446655440000/session/660e8400-e29b-41d4-a716-446655440000/with-course-info" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### D. Tester endpoint par cours
```bash
curl -X GET "http://localhost:8000/api/v1/grades/student/550e8400-e29b-41d4-a716-446655440000/course/770e8400-e29b-41d4-a716-446655440000/with-course-info" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 3. **Test avec Postman**

#### Collection Postman à créer :

1. **Environment Variables**
   ```
   base_url: http://localhost:8000
   api_base: {{base_url}}/api/v1
   token: (à remplir après login)
   ```

2. **Request 1: Login**
   ```
   POST {{api_base}}/auth/login/access-token
   Body (form-data):
   - username: admin@example.com
   - password: changethis
   ```

3. **Request 2: Test Année de Niveau**
   ```
   GET {{api_base}}/grades/student/550e8400-e29b-41d4-a716-446655440000/year-level/1/with-course-info
   Headers:
   - Authorization: Bearer {{token}}
   ```

4. **Request 3: Test Session**
   ```
   GET {{api_base}}/grades/student/550e8400-e29b-41d4-a716-446655440000/session/660e8400-e29b-41d4-a716-446655440000/with-course-info
   Headers:
   - Authorization: Bearer {{token}}
   ```

5. **Request 4: Test Cours**
   ```
   GET {{api_base}}/grades/student/550e8400-e29b-41d4-a716-446655440000/course/770e8400-e29b-41d4-a716-446655440000/with-course-info
   Headers:
   - Authorization: Bearer {{token}}
   ```

---

### 4. **Test avec Python Requests**

#### Script de test automatisé
```python
import requests
import json
from pprint import pprint

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class GradeEndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        
    def login(self, email="admin@example.com", password="changethis"):
        """Authentification"""
        response = self.session.post(
            f"{API_BASE}/auth/login/access-token",
            data={"username": email, "password": password}
        )
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
            print("✅ Login successful!")
            return True
        else:
            print("❌ Login failed:", response.text)
            return False
    
    def test_enriched_endpoints(self):
        """Test tous les endpoints enrichis"""
        
        # IDs de test (à adapter selon vos données)
        student_id = "550e8400-e29b-41d4-a716-446655440000"
        session_id = "660e8400-e29b-41d4-a716-446655440000" 
        course_id = "770e8400-e29b-41d4-a716-446655440000"
        
        endpoints = [
            {
                "name": "Grades par année de niveau", 
                "url": f"{API_BASE}/grades/student/{student_id}/year-level/1/with-course-info"
            },
            {
                "name": "Grades par session",
                "url": f"{API_BASE}/grades/student/{student_id}/session/{session_id}/with-course-info"
            },
            {
                "name": "Grades par cours",
                "url": f"{API_BASE}/grades/student/{student_id}/course/{course_id}/with-course-info"
            }
        ]
        
        for endpoint in endpoints:
            print(f"\n🧪 Testing: {endpoint['name']}")
            print(f"📡 URL: {endpoint['url']}")
            
            response = self.session.get(endpoint['url'])
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success! Found {data['count']} grades")
                
                if data['data']:
                    print("📊 Sample enriched grade:")
                    sample = data['data'][0]
                    print(f"  - Course: {sample.get('course_name')} ({sample.get('course_code')})")
                    print(f"  - Teacher: {sample.get('teacher_name')}")
                    print(f"  - Session: {sample.get('session_name')}")
                    print(f"  - Program: {sample.get('program_name')}")
                    print(f"  - Score: {sample.get('score')}")
            else:
                print(f"❌ Failed: {response.status_code}")
                print(f"   Error: {response.text}")

# Utilisation
if __name__ == "__main__":
    tester = GradeEndpointTester()
    
    if tester.login():
        tester.test_enriched_endpoints()
```

---

### 5. **Vérification des Données**

#### Réponse Attendue (Format JSON)
```json
{
  "data": [
    {
      "id": "uuid-de-la-note",
      "score": 85.5,
      "grade_letter": "B+",
      "points": 17.1,
      "is_passing": true,
      
      "course_name": "Algorithmes et Structures de Données",
      "course_code": "INFO-301", 
      "course_credits": 6,
      "course_description": "Introduction aux algorithmes...",
      
      "teacher_name": "Dr. Marie Dupont",
      "teacher_email": "marie.dupont@university.edu",
      
      "session_name": "Automne 2024",
      "session_year": 2024,
      "session_semester": "Automne",
      
      "program_name": "Informatique", 
      "program_degree": "Licence",
      
      "assessment_name": "Examen Final",
      "assessment_type": "Examen",
      "assessment_weight": 40.0
    }
  ],
  "count": 1
}
```

#### Points à Vérifier ✅
- ✅ **Données de base** : score, grade_letter, points, is_passing
- ✅ **Informations cours** : name, code, credits, description  
- ✅ **Informations professeur** : teacher_name, teacher_email
- ✅ **Informations session** : session_name, session_year, session_semester
- ✅ **Informations programme** : program_name, program_degree
- ✅ **Informations évaluation** : assessment_name, assessment_type, assessment_weight

---

### 6. **Tests d'Erreurs**

#### A. Test avec Student ID invalide
```bash
curl -X GET "http://localhost:8000/api/v1/grades/student/invalid-uuid/year-level/1/with-course-info" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Attendu: 422 Validation Error
```

#### B. Test avec année invalide
```bash
curl -X GET "http://localhost:8000/api/v1/grades/student/550e8400-e29b-41d4-a716-446655440000/year-level/20/with-course-info" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Attendu: 400 Bad Request (year level must be 1-15)
```

#### C. Test sans authentification
```bash
curl -X GET "http://localhost:8000/api/v1/grades/student/550e8400-e29b-41d4-a716-446655440000/year-level/1/with-course-info"
# Attendu: 401 Unauthorized
```

#### D. Test avec un autre étudiant (non autorisé)
```bash
# Connecté en tant qu'étudiant A, essayer d'accéder aux notes de l'étudiant B
# Attendu: 403 Forbidden
```

---

### 7. **Tests de Performance**

#### A. Test avec pagination
```bash
curl -X GET "http://localhost:8000/api/v1/grades/student/550e8400-e29b-41d4-a716-446655440000/year-level/1/with-course-info?skip=0&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### B. Test de temps de réponse
```python
import time

start_time = time.time()
response = requests.get(endpoint_url, headers=headers)
end_time = time.time()

print(f"⏱️  Response time: {end_time - start_time:.2f} seconds")
```

---

## 🎯 Checklist de Test

### Fonctionnalité ✅
- [ ] Endpoint année de niveau retourne données enrichies
- [ ] Endpoint session retourne données enrichies  
- [ ] Endpoint cours retourne données enrichies
- [ ] Toutes les informations de cours sont présentes
- [ ] Pagination fonctionne (skip/limit)
- [ ] Count est correct

### Sécurité ✅
- [ ] Authentification requise
- [ ] Étudiant ne voit que ses notes
- [ ] Admin voit toutes les notes
- [ ] Validation des paramètres

### Performance ✅
- [ ] Temps de réponse acceptable (< 500ms)
- [ ] Jointures SQL optimisées  
- [ ] Pagination efficace

### Erreurs ✅
- [ ] 401 sans token
- [ ] 403 accès non autorisé
- [ ] 400 paramètres invalides
- [ ] 404 ressource non trouvée
- [ ] 422 validation échouée

---

## 🚀 Commandes Rapides

### Démarrer et tester
```bash
# Terminal 1: Démarrer le serveur
cd backend
uvicorn app.main:app --reload

# Terminal 2: Test rapide
curl -X GET "http://localhost:8000/docs"
```

### Test complet avec les données d'exemple
```bash
# 1. Créer les données de test
python complete_init.py

# 2. Tester les endpoints
python test_enriched_endpoints.py
```

**Vos endpoints enrichis sont maintenant prêts à être testés ! 🎉**