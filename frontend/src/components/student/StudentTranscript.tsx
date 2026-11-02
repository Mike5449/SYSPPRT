import {
  Box,
  Center,
  Flex,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { FiPrinter } from "react-icons/fi"

import { StudentsService } from "@/client"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulletinGradeDetail {
  score: number
  max_score: number
}

interface BulletinCourse {
  course_id: string
  course_code: string
  course_name: string
  teacher_name: string | null
  intra_grade: BulletinGradeDetail | null
  final_grade: BulletinGradeDetail | null
  weighted_avg_20: number | null // already in /20
  is_passing: boolean
}

interface BulletinSession {
  session_id: string
  session_name: string
  session_start_date: string | null
  session_end_date: string | null
  courses: BulletinCourse[]
  session_avg_20: number | null // already in /20
}

export interface BulletinData {
  student_name: string
  student_number: string
  program_name: string | null
  year_level: number
  sessions: BulletinSession[]
  year_avg_20: number | null // already in /20
  is_passing_year: boolean
  generated_at: string
}

export interface StudentTranscriptProps {
  studentNumber: string
  yearLevel: number
  sessionNumber?: number
  /** Masque le bouton imprimer individuel (mode impression groupée) */
  hidePrintButton?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNote20(score: number, maxScore: number): number {
  if (!maxScore) return 0
  return (score / maxScore) * 20
}

function mention(score20: number | null | undefined): string {
  if (score20 == null || isNaN(score20 as number)) return "—"
  if (score20 >= 16) return "Excellent"
  if (score20 >= 14) return "Très Bien"
  if (score20 >= 12) return "Bien"
  if (score20 >= 10) return "Passable"
  return "Insuffisant"
}

function mentionColor(score20: number | null | undefined): string {
  if (score20 == null) return "#6b7280"
  if (score20 >= 16) return "#1a6741"
  if (score20 >= 12) return "#1a4f8a"
  if (score20 >= 10) return "#8a6200"
  return "#c53030"
}

function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n as number)) return "—"
  return (n as number).toFixed(d)
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

// ─── Agrégation des notes → structure bulletin ────────────────────────────────

function buildBulletinData(
  grades: any[],
  studentName: string,
  studentNumber: string,
  yearLevel: number,
): BulletinData {
  // Grouper par session (course_session_id)
  const sessionMap = new Map<
    string,
    {
      session_id: string
      session_name: string
      session_start_date: string | null
      session_end_date: string | null
      courseMap: Map<string, any[]>
    }
  >()

  for (const g of grades) {
    // Grouper par session réelle : session_code + session_start_date
    // (course_session_id est l'ID d'inscription cours-session, unique par cours — NE PAS utiliser)
    const sessKey =
      (g.session_code || g.session_name || "session") +
      "|" +
      (g.session_start_date || "")
    if (!sessionMap.has(sessKey)) {
      sessionMap.set(sessKey, {
        session_id: sessKey,
        session_name: g.session_name || "Session",
        session_start_date: g.session_start_date || null,
        session_end_date: g.session_end_date || null,
        courseMap: new Map(),
      })
    }
    const sess = sessionMap.get(sessKey)!
    const courseKey = g.course_id || g.course_code || g.course_name
    if (!sess.courseMap.has(courseKey)) sess.courseMap.set(courseKey, [])
    sess.courseMap.get(courseKey)!.push(g)
  }

  // Construire les sessions avec leurs cours
  const sessions: BulletinSession[] = Array.from(sessionMap.values()).map(
    (sess) => {
      const courses: BulletinCourse[] = Array.from(
        sess.courseMap.values(),
      ).map((cGrades) => {
        const first = cGrades[0]
        const intraGrade =
          cGrades.find((g: any) => g.exam_type === "intra") ?? null
        const finalGrade =
          cGrades.find((g: any) => g.exam_type === "final") ?? null

        // Moyenne pondérée en /20 (même logique que grades.tsx)
        const totalWeight = cGrades.reduce(
          (acc: number, g: any) => acc + (g.assessment_weight ?? 0),
          0,
        )
        let weighted20: number | null = null
        if (totalWeight > 0) {
          const sum = cGrades.reduce(
            (acc: number, g: any) =>
              acc +
              toNote20(g.score, g.assessment_max_score) *
                (g.assessment_weight ?? 0),
            0,
          )
          weighted20 = sum / totalWeight
        } else if (cGrades.length > 0) {
          const sum = cGrades.reduce(
            (acc: number, g: any) =>
              acc + toNote20(g.score, g.assessment_max_score),
            0,
          )
          weighted20 = sum / cGrades.length
        }

        return {
          course_id: first.course_id,
          course_code: first.course_code,
          course_name: first.course_name,
          teacher_name: first.teacher_name ?? null,
          intra_grade: intraGrade
            ? {
                score: intraGrade.score,
                max_score: intraGrade.assessment_max_score,
              }
            : null,
          final_grade: finalGrade
            ? {
                score: finalGrade.score,
                max_score: finalGrade.assessment_max_score,
              }
            : null,
          weighted_avg_20: weighted20,
          is_passing: weighted20 != null ? weighted20 >= 10 : false,
        }
      })

      // Moyenne session en /20
      const valid = courses.filter((c) => c.weighted_avg_20 != null)
      const sessionAvg20 =
        valid.length > 0
          ? valid.reduce((acc, c) => acc + (c.weighted_avg_20 ?? 0), 0) /
            valid.length
          : null

      return {
        session_id: sess.session_id,
        session_name: sess.session_name,
        session_start_date: sess.session_start_date,
        session_end_date: sess.session_end_date,
        courses,
        session_avg_20: sessionAvg20,
      }
    },
  )

  // Moyenne annuelle en /20
  const validSessions = sessions.filter((s) => s.session_avg_20 != null)
  const yearAvg20 =
    validSessions.length > 0
      ? validSessions.reduce((acc, s) => acc + (s.session_avg_20 ?? 0), 0) /
        validSessions.length
      : null

  return {
    student_name: studentName,
    student_number: studentNumber,
    program_name: grades[0]?.program_name ?? null,
    year_level: yearLevel,
    sessions,
    year_avg_20: yearAvg20,
    is_passing_year: yearAvg20 != null ? yearAvg20 >= 10 : false,
    generated_at: new Date().toISOString(),
  }
}

// ─── Fetch (utilisé par le mode promotion dans transcript.tsx) ─────────────────

async function fetchStudentTranscript(
  studentNumber: string,
  yearLevel: number,
  sessionNumber?: number,
): Promise<BulletinData> {
  const [gradesResult, studentInfo] = await Promise.all([
    StudentsService.readStudentGradesByYearWithCourseInfo({
      studentNumber,
      yearLevel,
      sessionNumber,
      limit: 500,
    }),
    StudentsService.readStudentByNumber({ studentNumber }).catch(() => null),
  ])

  const grades = gradesResult.data || []
  const studentName = studentInfo?.user
    ? [studentInfo.user.first_name, studentInfo.user.last_name]
        .filter(Boolean)
        .join(" ") || studentNumber
    : studentNumber

  return buildBulletinData(grades, studentName, studentNumber, yearLevel)
}

// ─── Cell styles ──────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  border: "1px solid #1a3a5c",
  padding: "6px 10px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  backgroundColor: "#1a3a5c",
  color: "white",
  textAlign: "center",
  whiteSpace: "nowrap",
}

const TD: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "7px 10px",
  fontSize: "11px",
  color: "#1f2937",
  verticalAlign: "middle",
}

const TDc: React.CSSProperties = { ...TD, textAlign: "center" }

// ─── BulletinDoc (contenu pur du bulletin, sans bouton) ───────────────────────

function BulletinDoc({
  transcript,
  yearLevel,
}: {
  transcript: BulletinData
  yearLevel: number
}) {
  const generated = fmtDate(transcript.generated_at)

  return (
    <Box
      className="bulletin-document"
      bg="white"
      border="2px solid #1a3a5c"
      p="28px"
      fontFamily="'Times New Roman', Times, serif"
    >
      {/* En-tête document */}
      <Box textAlign="center" mb={4} pb={3} borderBottom="2px solid #1a3a5c">
        <Text
          fontSize="10px"
          fontWeight="700"
          color="#6b7280"
          letterSpacing="0.2em"
          textTransform="uppercase"
          mb={0.5}
        >
          Institution Académique
        </Text>
        <Text
          fontSize="20px"
          fontWeight="900"
          color="#1a3a5c"
          letterSpacing="-0.01em"
          lineHeight="1.1"
        >
          Bulletin de Notes Officiel
        </Text>
        <Text fontSize="10px" color="#6b7280" mt={0.5} letterSpacing="0.08em">
          Année académique — Niveau {transcript.year_level}
        </Text>
      </Box>

      {/* Infos étudiant — hors tableau pour ne pas se répéter à l'impression */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0" }}>
        <tbody>
          <tr>
            <td
              style={{
                ...TD,
                width: "34%",
                backgroundColor: "#f8f9fb",
                borderColor: "#1a3a5c",
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>
                Nom complet
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#1a3a5c" }}>
                {transcript.student_name}
              </div>
            </td>
            <td
              style={{
                ...TDc,
                width: "33%",
                backgroundColor: "#f8f9fb",
                borderColor: "#1a3a5c",
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>
                Numéro d'étudiant
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#1a3a5c", fontFamily: "monospace" }}>
                {transcript.student_number}
              </div>
            </td>
            <td
              style={{
                ...TDc,
                width: "33%",
                backgroundColor: "#f8f9fb",
                borderColor: "#1a3a5c",
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>
                Programme
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#1a3a5c" }}>
                {transcript.program_name ?? "—"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tableau des cours */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          {/* En-têtes colonnes uniquement — se répète normalement à l'impression */}
          <tr>
            <th style={{ ...TH, width: "75px", textAlign: "left" }}>Code</th>
            <th style={{ ...TH, textAlign: "left" }}>Désignation du cours</th>
            <th style={{ ...TH, width: "75px" }}>Ex. Intra</th>
            <th style={{ ...TH, width: "75px" }}>Ex. Final</th>
            <th style={{ ...TH, width: "85px" }}>Moy. Pond.</th>
            <th style={{ ...TH, width: "105px" }}>Appréciation</th>
          </tr>
        </thead>

        <tbody>
          {transcript.sessions.map((session) => (
            <>
              {/* Séparateur de session */}
              <tr key={`sep-${session.session_id}`}>
                <td
                  colSpan={4}
                  style={{
                    ...TD,
                    backgroundColor: "#f0f4f9",
                    fontWeight: 900,
                    fontSize: "10px",
                    color: "#1a3a5c",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    borderLeft: "1px solid #1a3a5c",
                    borderTop: "1px solid #1a3a5c",
                    borderBottom: "1px solid #1a3a5c",
                  }}
                >
                  {session.session_name}
                  {session.session_start_date && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 400,
                        color: "#6b7280",
                        marginLeft: "8px",
                      }}
                    >
                      ({fmtDate(session.session_start_date)}
                      {session.session_end_date
                        ? ` – ${fmtDate(session.session_end_date)}`
                        : ""}
                      )
                    </span>
                  )}
                </td>
                <td
                  colSpan={2}
                  style={{
                    ...TDc,
                    backgroundColor: "#f0f4f9",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#1a3a5c",
                    borderTop: "1px solid #1a3a5c",
                    borderBottom: "1px solid #1a3a5c",
                    borderRight: "1px solid #1a3a5c",
                  }}
                >
                  <div
                    style={{
                      fontSize: "8px",
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Moy. session
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 900 }}>
                    {fmt(session.session_avg_20)} / 20
                  </div>
                </td>
              </tr>

              {/* Lignes des cours */}
              {session.courses.length === 0 ? (
                <tr key={`empty-${session.session_id}`}>
                  <td
                    colSpan={6}
                    style={{
                      ...TDc,
                      fontStyle: "italic",
                      color: "#9ca3af",
                      fontSize: "11px",
                    }}
                  >
                    Aucune inscription pour cette session.
                  </td>
                </tr>
              ) : (
                session.courses.map((course, idx) => {
                  const bg = idx % 2 === 0 ? "#ffffff" : "#f8f9fb"
                  const color = mentionColor(course.weighted_avg_20)
                  return (
                    <tr
                      key={course.course_id}
                      style={{ backgroundColor: bg }}
                    >
                      <td
                        style={{
                          ...TD,
                          fontFamily: "monospace",
                          fontWeight: 700,
                          color: "#1a3a5c",
                          fontSize: "10px",
                        }}
                      >
                        {course.course_code}
                      </td>
                      <td style={TD}>
                        <div style={{ fontWeight: 600, fontSize: "11px" }}>
                          {course.course_name}
                        </div>
                        {course.teacher_name && (
                          <div
                            style={{
                              fontSize: "9px",
                              color: "#9ca3af",
                              marginTop: "1px",
                            }}
                          >
                            {course.teacher_name}
                          </div>
                        )}
                      </td>
                      <td style={TDc}>
                        {course.intra_grade ? (
                          <>
                            <span style={{ fontWeight: 700 }}>
                              {toNote20(
                                course.intra_grade.score,
                                course.intra_grade.max_score,
                              ).toFixed(2)}
                            </span>
                            <span
                              style={{ fontSize: "9px", color: "#9ca3af" }}
                            >
                              {" "}
                              /20
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                      <td style={TDc}>
                        {course.final_grade ? (
                          <>
                            <span style={{ fontWeight: 700 }}>
                              {toNote20(
                                course.final_grade.score,
                                course.final_grade.max_score,
                              ).toFixed(2)}
                            </span>
                            <span
                              style={{ fontSize: "9px", color: "#9ca3af" }}
                            >
                              {" "}
                              /20
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          ...TDc,
                          fontWeight: 800,
                          fontSize: "13px",
                          color,
                        }}
                      >
                        {fmt(course.weighted_avg_20)}
                      </td>
                      <td
                        style={{
                          ...TDc,
                          fontWeight: 700,
                          fontSize: "10px",
                          color,
                        }}
                      >
                        {mention(course.weighted_avg_20)}
                      </td>
                    </tr>
                  )
                })
              )}
            </>
          ))}
        </tbody>

        {/* Résumé annuel */}
        <tfoot>
          <tr>
            <td
              colSpan={2}
              style={{ ...TD, backgroundColor: "white" }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "2px",
                }}
              >
                Moyenne annuelle
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 900,
                  color: "#1a3a5c",
                }}
              >
                {fmt(transcript.year_avg_20)}{" "}
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 400,
                    color: "#9ca3af",
                  }}
                >
                  / 20
                </span>
              </div>
            </td>
            <td
              colSpan={2}
              style={{ ...TDc, backgroundColor: "white" }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "2px",
                }}
              >
                Mention
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: mentionColor(transcript.year_avg_20),
                }}
              >
                {mention(transcript.year_avg_20)}
              </div>
            </td>
            <td
              colSpan={2}
              style={{
                ...TDc,
                backgroundColor: transcript.is_passing_year
                  ? "#f0fff4"
                  : "#fff5f5",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "2px",
                }}
              >
                Décision du jury
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 900,
                  color: transcript.is_passing_year ? "#1a6741" : "#c53030",
                }}
              >
                {transcript.is_passing_year ? "ADMIS(E)" : "AJOURNÉ(E)"}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Signatures */}
      <Flex gap={8} mt={8} pt={5} borderTop="1px solid #d1d5db">
        {[
          "Sceau de l'Institution",
          "Direction Académique",
          "Services aux Étudiants",
        ].map((label) => (
          <VStack key={label} flex="1" align="center" gap={1}>
            <Box h="45px" w="full" borderBottom="1px solid #9ca3af" />
            <Text
              fontSize="9px"
              fontWeight="700"
              color="#6b7280"
              textTransform="uppercase"
              letterSpacing="0.1em"
              textAlign="center"
            >
              {label}
            </Text>
          </VStack>
        ))}
      </Flex>

      {/* Pied de page */}
      <Box mt={5} pt={2.5} borderTop="2px solid #1a3a5c" textAlign="center">
        <Text fontSize="9px" color="#9ca3af" letterSpacing="0.04em">
          Document officiel généré le {generated}. Toute modification constitue
          un faux et usage de faux.
        </Text>
        <Text
          fontSize="9px"
          color="#d1d5db"
          mt={0.5}
          fontFamily="monospace"
        >
          REF : {transcript.student_number}-N{yearLevel}-
          {Date.now().toString(16).toUpperCase()}
        </Text>
      </Box>
    </Box>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

const StudentTranscript = ({
  studentNumber,
  yearLevel,
  sessionNumber,
  hidePrintButton = false,
}: StudentTranscriptProps) => {
  // Même API que grades.tsx → même liste de cours
  const { data: gradesData, isLoading: gradesLoading } = useQuery({
    queryKey: ["bulletin-grades", studentNumber, yearLevel, sessionNumber],
    queryFn: () =>
      StudentsService.readStudentGradesByYearWithCourseInfo({
        studentNumber,
        yearLevel,
        sessionNumber,
        limit: 500,
      }),
    enabled: !!studentNumber && !!yearLevel,
    retry: false,
  })

  // Info étudiant pour le nom affiché dans l'en-tête du bulletin
  const { data: studentInfo, isLoading: studentLoading } = useQuery({
    queryKey: ["student-info-bulletin", studentNumber],
    queryFn: () => StudentsService.readStudentByNumber({ studentNumber }),
    enabled: !!studentNumber,
    retry: false,
  })

  const isLoading = gradesLoading || studentLoading

  if (isLoading) {
    return (
      <Center py={12}>
        <VStack gap={3}>
          <Spinner size="md" color="blue.500" />
          <Text color="gray.400" fontSize="sm">
            Génération du bulletin...
          </Text>
        </VStack>
      </Center>
    )
  }

  const grades = gradesData?.data || []

  if (grades.length === 0) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        py={14}
        gap={2}
        bg="#f8f9fb"
        borderRadius="8px"
        border="1px solid #e2e6ec"
      >
        <Text fontWeight="600" color="gray.500" fontSize="sm">
          Aucune note disponible pour cette sélection.
        </Text>
        <Text fontSize="xs" color="gray.400">
          Vérifiez l'année et la session sélectionnées.
        </Text>
      </Flex>
    )
  }

  const studentName = studentInfo?.user
    ? [studentInfo.user.first_name, studentInfo.user.last_name]
        .filter(Boolean)
        .join(" ") || studentNumber
    : studentNumber

  const bulletinData = buildBulletinData(
    grades,
    studentName,
    studentNumber,
    yearLevel,
  )

  return (
    <Box>
      {/* Bouton imprimer individuel */}
      {!hidePrintButton && (
        <Flex justify="flex-end" mb={3} className="no-print">
          <Box
            as="button"
            onClick={() => window.print()}
            display="flex"
            alignItems="center"
            gap="6px"
            px="14px"
            py="7px"
            fontSize="12px"
            fontWeight="600"
            color="#1a3a5c"
            bg="white"
            border="1px solid #d1d5db"
            borderRadius="6px"
            cursor="pointer"
          >
            <FiPrinter size={13} />
            Imprimer
          </Box>
        </Flex>
      )}

      <BulletinDoc transcript={bulletinData} yearLevel={yearLevel} />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .bulletin-document {
            border: 2px solid #1a3a5c !important;
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </Box>
  )
}

export default StudentTranscript
export { BulletinDoc, fetchStudentTranscript }
