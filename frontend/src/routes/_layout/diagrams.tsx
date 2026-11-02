import { Container, Heading, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import Mermaid from "../../components/Common/Mermaid"

export const Route = createFileRoute("/_layout/diagrams")({
  component: DiagramsPage,
})

function DiagramsPage() {
  const useCaseChart = `
graph TD
    subgraph "Système de Gestion Académique"
        UC_Auth(S'authentifier OTP)
        UC_Struct(Gérer la Structure)
        UC_Assign(Assigner Cours & Étudiants)
        UC_Eval(Créer Évaluations & Séances)
        UC_Grades(Saisir les Notes)
        UC_QR(Scanner Présence QR Code)
        UC_Consult(Consulter Bulletins & Résultats)
        UC_Calc(Calcul Automatique des Moyennes)
    end

    Admin[Administrateur]
    Teacher[Professeur]
    Student[Étudiant]
    Sys[Système]

    Admin --> UC_Auth
    Admin --> UC_Struct
    Admin --> UC_Assign
    Admin --> UC_Consult

    Teacher --> UC_Auth
    Teacher --> UC_Eval
    Teacher --> UC_Grades
    Teacher --> UC_Consult

    Student --> UC_Auth
    Student --> UC_QR
    Student --> UC_Consult

    UC_Grades -.-> UC_Calc
    UC_Calc --- Sys
  `

  const sequenceDiagrams = [
    {
      title: "1. Authentification Réussie (Nominal)",
      chart: `
sequenceDiagram
    actor User as Utilisateur
    participant Sys as Système
    participant Email as Serveur SMTP

    User->>Sys: Saisir Email + Mot de passe
    Sys->>Sys: Valider identifiants
    Sys->>Sys: Générer Code OTP (60s)
    Sys->>Email: Envoyer OTP par Email
    Sys-->>User: Demander Code OTP
    User->>Sys: Saisir Code OTP
    Sys->>Sys: Vérifier validité OTP
    Sys-->>User: Accès accordé & Token JWT
      `,
    },
    {
      title: "2. Authentification : Échec OTP (Alternatif)",
      chart: `
sequenceDiagram
    actor User as Utilisateur
    participant Sys as Système

    User->>Sys: Saisir Code OTP
    Note over Sys: Délai > 60s ou Code erroné
    Sys->>Sys: Invalider transaction
    Sys-->>User: Message "Code invalide ou expiré"
    User->>Sys: Demander un nouveau code
      `,
    },
    {
      title: "3. Création d'une Séance de Cours",
      chart: `
sequenceDiagram
    actor Prof as Professeur
    participant Sys as Système

    Prof->>Sys: Sélectionner Cours (Session active)
    Prof->>Sys: Cliquer "Créer Séance"
    Sys->>Sys: Enregistrer séance en BD
    Sys->>Sys: Générer QR Code dynamique
    Sys-->>Prof: Afficher QR Code à l'écran
      `,
    },
    {
      title: "4. Pointage de Présence (Étudiant)",
      chart: `
sequenceDiagram
    actor Stu as Étudiant
    participant UI as App Mobile
    participant Sys as Système

    Stu->>UI: Scanner le QR Code
    UI->>Sys: Envoyer ID Séance + Géo-localisation
    Sys->>Sys: Vérifier validité QR & Session
    Sys->>Sys: Enregistrer Pointage
    Sys-->>UI: Message "Présence Validée"
    UI-->>Stu: Feedback visuel (Vert)
      `,
    },
    {
      title: "5. Saisie des Notes d'Évaluation",
      chart: `
sequenceDiagram
    actor Prof as Professeur
    participant Sys as Système

    Prof->>Sys: Sélectionner Évaluation (ex: Intra)
    Prof->>Sys: Saisir les notes par étudiant
    Prof->>Sys: Cliquer "Enregistrer"
    Sys->>Sys: Sauvegarder notes en BD
    Sys->>Sys: Déclencher calcul des moyennes de session
    Sys-->>Prof: Confirmation de sauvegarde
      `,
    },
    {
      title: "6. Génération de Bulletin Académique",
      chart: `
sequenceDiagram
    actor User as Admin/Étudiant
    participant Sys as Système
    participant PDF as Moteur PDF

    User->>Sys: Demander Bulletin (Session X)
    Sys->>Sys: Récupérer Notes & Présences
    Sys->>Sys: Calculer moyennes finales
    Sys->>PDF: Générer document structuré
    PDF-->>Sys: Document prêt
    Sys-->>User: Télécharger Bulletin (PDF)
      `,
    },
  ]

  const communicationDiagrams = [
    {
      title: "1. Opération : vérifierOTP (Sécurité)",
      chart: `
graph TD
    User((Utilisateur)) -- "1: vérifierOTP(code)" --> AuthCtrl["AuthController"]
    AuthCtrl -- "2: findByEmail(email)" --> UserRepo["UserRepository"]
    AuthCtrl -- "3: validate(code)" --> OTPService["OTPService"]
    AuthCtrl -- "4: createToken(user)" --> JWTService["JWTProvider"]
    AuthCtrl -- "5: loginSuccess()" --> UserUI["LoginView"]
      `,
    },
    {
      title: "2. Opération : pointerPrésence (Pointage)",
      chart: `
graph TD
    Student((Étudiant)) -- "1: pointerPrésence(séanceId, code)" --> AttendCtrl["AttendanceController"]
    AttendCtrl -- "2: validateQR(code, séanceId)" --> QRService["QRService"]
    AttendCtrl -- "3: getActiveSession(séanceId)" --> SessionMgr["SessionManager"]
    AttendCtrl -- "4: record(student, session)" --> AttendRepo["AttendanceRepository"]
    AttendRepo -- "5: incrementCount()" --> StudentObj["Student"]
      `,
    },
    {
      title: "3. Opération : enregistrerNotes (Académique)",
      chart: `
graph TD
    Teacher((Professeur)) -- "1: enregistrerNotes(id, notes)" --> GradeCtrl["GradeController"]
    GradeCtrl -- "2: saveAll(notes)" --> GradeRepo["GradeRepository"]
    GradeCtrl -- "3: triggerRecalculate(sessionId)" --> EvalSvc["EvaluationService"]
    EvalSvc -- "4: updateGPA()" --> StudentObj["Student"]
      `,
    },
    {
      title: "4. Opération : générerBulletin (Reporting)",
      chart: `
graph TD
    Admin((Administrateur)) -- "1: générerBulletin(id)" --> ReportCtrl["ReportController"]
    ReportCtrl -- "2: getFullAcademicRecord(id)" --> DataAggregator["AcademicExpert"]
    ReportCtrl -- "3: format(data)" --> PDFEngine["PDFGenerator"]
      `,
    },
  ]

  return (
    <Container maxW="full" pb={10}>
      <VStack align="start" gap={8} py={4}>
        <VStack align="start" gap={2}>
          <Heading size="lg">Diagrammes du Système</Heading>
          <Text color="ui.secondary">
            Cette page présente les modélisations visuelles de l'architecture, des interactions et des flux de données du système.
          </Text>
        </VStack>

        <VStack
          align="stretch"
          w="full"
          p={6}
          border="1px solid"
          borderColor="ui.border"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <Heading size="md" mb={2}>Diagramme des Cas d'Utilisation</Heading>
          <Text fontSize="sm" color="ui.secondary" mb={4}>
            Ce diagramme illustre les interactions entre les acteurs (Administrateur, Professeur, Étudiant)
            et les fonctionnalités majeures du système de gestion académique.
          </Text>
          <Mermaid chart={useCaseChart} />
        </VStack>

        <Heading size="md" mt={4}>Diagrammes de Séquence Système (DSS)</Heading>
        <Text fontSize="sm" color="ui.secondary">
          Ces diagrammes illustrent la chronologie des échanges entre les acteurs et le système pour les flux critiques.
        </Text>

        {sequenceDiagrams.map((dss, index) => (
          <VStack
            key={index}
            align="stretch"
            w="full"
            p={6}
            border="1px solid"
            borderColor="ui.border"
            borderRadius="lg"
            bg="white"
            boxShadow="sm"
          >
            <Heading size="sm" mb={4}>{dss.title}</Heading>
            <Mermaid chart={dss.chart} />
          </VStack>
        ))}

        <Heading size="md" mt={4}>Diagrammes de Communication</Heading>
        <Text fontSize="sm" color="ui.secondary">
          Ces diagrammes modélisent l'architecture des objets et la collaboration entre les services pour les opérations complexes.
        </Text>

        {communicationDiagrams.map((diag, index) => (
          <VStack
            key={index}
            align="stretch"
            w="full"
            p={6}
            border="1px solid"
            borderColor="ui.border"
            borderRadius="lg"
            bg="white"
            boxShadow="sm"
          >
            <Heading size="sm" mb={4}>{diag.title}</Heading>
            <Mermaid chart={diag.chart} />
          </VStack>
        ))}

        <VStack
          align="stretch"
          w="full"
          p={6}
          border="1px solid"
          borderColor="ui.border"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <Heading size="md" mb={2}>Diagramme de Paquetage (Domaine)</Heading>
          <Text fontSize="sm" color="ui.secondary" mb={4}>
            Organisation logique des entités métier et des modèles de données.
          </Text>
          <Mermaid
            chart={`
graph LR
    subgraph Identity[Identité]
        User
        Role
        Profiles[Student/Teacher]
    end

    subgraph Org[Organisation]
        Univ
        Fac
        Dept
    end

    subgraph Academic[Académique]
        Prog
        Level
        Course
    end

    subgraph Ops[Opérations]
        Sess[Session]
        Exam[Assessment/Grade]
        Point[Attendance]
    end

    Identity -.-> Ops
    Org -.-> Academic
    Academic -.-> Ops
          `}
          />
        </VStack>

        <VStack
          align="stretch"
          w="full"
          p={6}
          border="1px solid"
          borderColor="ui.border"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <Heading size="md" mb={2}>Diagramme de Paquetage (Application)</Heading>
          <Text fontSize="sm" color="ui.secondary" mb={4}>
            Organisation modulaire de la couche application (contrôleurs API) par domaines fonctionnels.
          </Text>
          <Mermaid
            chart={`
graph TB
    subgraph "Couche Application (API Routers)"
        direction TB
        
        subgraph Security[Identité]
            User[UserController]
        end

        subgraph Academic[Profils]
            Student[StudentController]
        end

        subgraph Content[Contenu]
            Course[CourseController]
        end

        subgraph Ops[Résultats]
            Grade[GradeController]
        end

        User -.-> Student
        Course -.-> Grade
        Student -.-> Grade
    end
          `}
          />
        </VStack>

        <VStack
          align="stretch"
          w="full"
          p={6}
          border="1px solid"
          borderColor="ui.border"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <Heading size="md" mb={2}>Diagramme de Classes (Domaine)</Heading>
          <Text fontSize="sm" color="ui.secondary" mb={4}>
            Modélisation des entités métier et de leurs relations structurelles (User, Student, Course, etc.).
          </Text>
          <Mermaid
            chart={`
classDiagram
    class Department { +String name }
    class Faculty { +String name }
    class Program { +String name }
    class ProgramLevel { +String name }
    class Course { +String name }
    class CourseProgramLevel { +Int year_level }
    class Session { +String name }
    class CourseSession { +String classroom }
    class Teacher { +String specialization }
    class Student { +Float gpa }
    class AttendanceSession { +Date date }
    class Grade { +Float score }

    Department "1" -- "*" Faculty : contient
    Faculty "1" -- "*" Program : propose
    Program "1" -- "*" ProgramLevel : définit
    ProgramLevel "1" -- "*" CourseProgramLevel : offre
    Course "1" -- "*" CourseProgramLevel : est_référencé
    Session "1" -- "*" CourseSession : planifie
    CourseSession "*" -- "1" CourseProgramLevel : instancie
    CourseSession "*" -- "1" Teacher : enseigné_par
    CourseSession "1" -- "*" AttendanceSession : génère
    CourseSession "1" -- "*" Assessment : contient
    Assessment "1" -- "*" Grade : produit
    Student "1" -- "*" Grade : obtient
    Student "*" -- "1" ProgramLevel : inscrit
          `}
          />
        </VStack>

        <VStack
          align="stretch"
          w="full"
          p={6}
          border="1px solid"
          borderColor="ui.border"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <Heading size="md" mb={2}>Schéma Global de l'Architecture</Heading>
          <Text fontSize="sm" color="ui.secondary" mb={4}>
            Architecture SPA (React) communiquant avec une API REST (FastAPI) et une base de données PostgreSQL.
          </Text>
          <Mermaid
            chart={`
graph TD
    subgraph "Client Layer"
        Browser[Navigateur Web]
        Frontend[Frontend React/TypeScript]
    end

    subgraph "API Layer"
        Gateway[Nginx / Proxy]
        Backend[FastAPI / Python]
    end

    subgraph "Storage Layer"
        DB[(PostgreSQL)]
    end

    Browser <--> Frontend
    Frontend <--> Gateway
    Gateway <--> Backend
    Backend <--> DB
          `}
          />
        </VStack>

        <VStack
          align="stretch"
          w="full"
          p={6}
          border="1px solid"
          borderColor="ui.border"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <Heading size="md" mb={2}>Schéma Relationnel (Base de Données)</Heading>
          <Text fontSize="sm" color="ui.secondary" mb={4}>
            Modélisation des données montrant les relations entre la structure académique, les inscriptions et le suivi.
          </Text>
          <Mermaid
            chart={`
erDiagram
    USER ||--o{ USER_ROLE : possède
    ROLE ||--o{ USER_ROLE : contient
    ROLE ||--o{ PERMISSION : définit
    USER ||--o| USER_OTP : reçoit

    USER ||--o| STUDENT : est
    USER ||--o| TEACHER : est

    UNIVERSITY ||--o{ FACULTY : contient
    FACULTY ||--o{ DEPARTMENT : contient
    DEPARTMENT ||--o{ PROGRAM : propose
    PROGRAM ||--o{ PROGRAM_LEVEL : contient
    PROGRAM_LEVEL ||--o{ ENROLLMENT : accueille
    STUDENT ||--o{ ENROLLMENT : s_inscrit

    ACADEMIC_YEAR ||--o{ SESSION : contient
    SESSION ||--o{ COURSE_SESSION : planifie
    COURSE ||--o{ COURSE_SESSION : est_donne_dans
    TEACHER ||--o{ COURSE_SESSION : enseigne

    COURSE_SESSION ||--o{ ATTENDANCE_SESSION : génère
    ATTENDANCE_SESSION ||--o{ ATTENDANCE_RECORD : valide
    STUDENT ||--o{ ATTENDANCE_RECORD : marque

    COURSE_SESSION ||--o{ ASSESSMENT : définit
    ASSESSMENT ||--o{ GRADE : reçoit
    STUDENT ||--o{ GRADE : obtient
          `}
          />
        </VStack>
      </VStack>
    </Container >
  )
}
