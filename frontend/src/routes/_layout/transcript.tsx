import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import {
  FiBookOpen,
  FiGrid,
  FiPrinter,
  FiSearch,
  FiUser,
} from "react-icons/fi"

import { ProgramLevelsService, StudentsService } from "@/client"
import StudentTranscript, {
  BulletinDoc,
  fetchStudentTranscript,
} from "@/components/student/StudentTranscript"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"

export const Route = createFileRoute("/_layout/transcript")({
  component: TranscriptPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sel = (w = "auto"): React.CSSProperties => ({
  height: "36px",
  padding: "0 10px",
  fontSize: "13px",
  fontWeight: "500",
  borderRadius: "6px",
  border: "1px solid #E2E8F0",
  backgroundColor: "white",
  color: "#374151",
  outline: "none",
  fontFamily: "inherit",
  cursor: "pointer",
  width: w,
})

const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

// ─── Page ─────────────────────────────────────────────────────────────────────

function TranscriptPage() {
  const { user: currentUser } = useAuth()
  const { data: userRoles } = useUserRoles(currentUser?.id)

  const isAdmin = currentUser?.is_superuser ?? false
  const rolesReady = !!userRoles
  const isStudent =
    !isAdmin &&
    (userRoles || []).some(
      (r: any) => (r.code || "").toUpperCase() === "STUDENT",
    )

  // ── Student self-data ──────────────────────────────────────────────────────
  const { data: studentData } = useQuery({
    queryKey: ["student_by_user", currentUser?.id],
    queryFn: () =>
      StudentsService.readStudentByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && !isAdmin,
  })

  // ── Student filters ────────────────────────────────────────────────────────
  const [sYearLevel, setSYearLevel] = useState(1)
  const [sSession, setSSession] = useState<number | undefined>(undefined)
  const studentNumber = studentData?.user?.user_number ?? ""
  const maxYearLevel =
    (studentData as any)?.program_level?.typical_duration ?? 5

  useEffect(() => {
    if (studentData?.current_year_level) setSYearLevel(studentData.current_year_level)
  }, [studentData])

  // ── Admin mode tabs ────────────────────────────────────────────────────────
  type AdminMode = "individual" | "promotion"
  const [adminMode, setAdminMode] = useState<AdminMode>("individual")

  // ── Admin — Individual mode ────────────────────────────────────────────────
  const [indStudentNumber, setIndStudentNumber] = useState("")
  const [indYearLevel, setIndYearLevel] = useState(1)
  const [indSession, setIndSession] = useState<number | undefined>(undefined)
  const [showIndividual, setShowIndividual] = useState(false)

  // ── Admin — Promotion mode ─────────────────────────────────────────────────
  const [promoProgLevel, setPromoProgLevel] = useState("")
  const [promoYearLevel, setPromoYearLevel] = useState(1)
  const [promoSession, setPromoSession] = useState<number | undefined>(undefined)
  const [promoGenerated, setPromoGenerated] = useState(false)

  // Program levels list
  const { data: programLevelsData } = useQuery({
    queryKey: ["program_levels_all"],
    queryFn: () => ProgramLevelsService.readProgramLevels({ limit: 200 }),
    enabled: !isStudent,
  })

  const selectedPL = (programLevelsData?.data ?? []).find(
    (pl: any) => pl.id === promoProgLevel,
  )
  const promoMaxYear = (selectedPL as any)?.typical_duration ?? 5

  // Students for promotion
  const {
    data: promoStudentsData,
    isLoading: promoLoading,
  } = useQuery({
    queryKey: ["students_by_pl_year", promoProgLevel, promoYearLevel],
    queryFn: () =>
      StudentsService.readStudentsByProgramLevelAndYear({
        programLevelId: promoProgLevel,
        yearLevel: promoYearLevel,
      }),
    enabled: !isStudent && promoGenerated && !!promoProgLevel,
  })

  const promoStudents = promoStudentsData?.data ?? []

  // Fetch transcripts for all promo students
  const {
    data: promoTranscripts,
    isLoading: promoTranscriptsLoading,
  } = useQuery({
    queryKey: ["promo_transcripts", promoProgLevel, promoYearLevel, promoSession, promoStudents.map((s: any) => s.user?.user_number).join(",")],
    queryFn: async () => {
      const results = await Promise.allSettled(
        promoStudents
          .filter((s: any) => s.user?.user_number)
          .map((s: any) =>
            fetchStudentTranscript(s.user.user_number, promoYearLevel, promoSession),
          ),
      )
      return results.map((r, i) => ({
        student: promoStudents[i],
        transcript: r.status === "fulfilled" ? r.value : null,
        error: r.status === "rejected" ? (r.reason as Error).message : null,
      }))
    },
    enabled: !isStudent && promoGenerated && promoStudents.length > 0,
  })

  const handlePrintAll = () => window.print()

  // ── Render ─────────────────────────────────────────────────────────────────

  // Attendre que les rôles soient chargés avant d'afficher quoi que ce soit
  if (!isAdmin && !rolesReady) {
    return (
      <Box bg="#f2f4f7" minH="100vh" py={8}>
        <Container maxW="900px">
          <Flex justify="center" align="center" py={20}>
            <Spinner size="md" color="blue.500" />
          </Flex>
        </Container>
      </Box>
    )
  }

  // === STUDENT VIEW ===
  if (isStudent) {
    return (
      <Box bg="#f2f4f7" minH="100vh" py={8}>
        <Container maxW="900px">
          {/* Header */}
          <Flex justify="space-between" align="center" mb={5} className="no-print">
            <Flex gap="14px" align="stretch">
              <Box w="3px" borderRadius="full" bg="#2563a8" flexShrink={0} />
              <Box>
                <Text
                  fontFamily={MONO}
                  fontSize="10px"
                  fontWeight="700"
                  letterSpacing="2px"
                  color="#2563a8"
                  mb="5px"
                >
                  BULLETIN OFFICIEL
                </Text>
                <Heading
                  fontSize={{ base: "21px", md: "25px" }}
                  fontWeight="800"
                  color="#1a3a5c"
                  letterSpacing="-0.5px"
                  lineHeight="1.05"
                >
                  Mon bulletin
                </Heading>
                <Text fontSize="13px" color="gray.500" mt="5px">
                  Relevé de notes officiel
                </Text>
              </Box>
            </Flex>
            <Box
              as="button"
              onClick={() => window.print()}
              display="flex"
              alignItems="center"
              gap="6px"
              px="14px"
              py="8px"
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

          {/* Filtres étudiant */}
          <Box
            className="no-print"
            bg="white"
            borderRadius="6px"
            border="1px solid #E2E8F0"
            px={6}
            py={4}
            mb={5}
            boxShadow="0 2px 8px rgba(0,0,0,0.04)"
          >
            <Flex gap={4} wrap="wrap" align="center">
              <Box>
                <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                  Année d'étude
                </Text>
                <select
                  style={sel("140px")}
                  value={sYearLevel}
                  onChange={(e) => setSYearLevel(Number(e.target.value))}
                >
                  {Array.from({ length: maxYearLevel }, (_, i) => i + 1).map((y) => (
                    <option key={y} value={y}>Niveau {y}</option>
                  ))}
                </select>
              </Box>

              <Box>
                <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                  Session
                </Text>
                <select
                  style={sel("140px")}
                  value={sSession ?? ""}
                  onChange={(e) => setSSession(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Toutes</option>
                  <option value={1}>Session 1</option>
                  <option value={2}>Session 2</option>
                </select>
              </Box>

              {studentData && (
                <Box ml="auto" textAlign="right">
                  <Text fontSize="10px" color="#9ca3af">
                    {[studentData.user?.first_name, studentData.user?.last_name].filter(Boolean).join(" ") || ""}
                  </Text>
                  <Text fontSize="10px" fontFamily="mono" color="#2563a8" fontWeight="700">
                    #{studentNumber}
                  </Text>
                </Box>
              )}
            </Flex>
          </Box>

          {/* Bulletin */}
          <div className="print-area">
            {studentNumber ? (
              <StudentTranscript
                studentNumber={studentNumber}
                yearLevel={sYearLevel}
                sessionNumber={sSession}
                hidePrintButton
              />
            ) : (
              <Center py={12}>
                <Spinner size="sm" color="blue.500" />
              </Center>
            )}
          </div>
        </Container>
      </Box>
    )
  }

  // === ADMIN VIEW ===
  return (
    <Box bg="#f2f4f7" minH="100vh" py={8}>
      <Container maxW="920px">

        {/* Header */}
        <Flex justify="space-between" align="center" mb={5} className="no-print">
          <Flex gap="14px" align="stretch">
            <Box w="3px" borderRadius="full" bg="#2563a8" flexShrink={0} />
            <Box>
              <Text
                fontFamily={MONO}
                fontSize="10px"
                fontWeight="700"
                letterSpacing="2px"
                color="#2563a8"
                mb="5px"
              >
                GÉNÉRATION DE BULLETINS
              </Text>
              <Heading
                fontSize={{ base: "21px", md: "25px" }}
                fontWeight="800"
                color="#1a3a5c"
                letterSpacing="-0.5px"
                lineHeight="1.05"
              >
                Bulletins académiques
              </Heading>
              <Text fontSize="13px" color="gray.500" mt="5px">
                Génération individuelle ou par promotion
              </Text>
            </Box>
          </Flex>
          {promoGenerated && adminMode === "promotion" && (promoTranscripts ?? []).length > 0 && (
            <Box
              as="button"
              onClick={handlePrintAll}
              display="flex"
              alignItems="center"
              gap="6px"
              px="14px"
              py="8px"
              fontSize="12px"
              fontWeight="600"
              color="white"
              borderRadius="6px"
              cursor="pointer"
              style={{ background: "linear-gradient(135deg, #1a3a5c, #2563a8)" }}
            >
              <FiPrinter size={13} />
              Imprimer tous ({promoTranscripts?.filter(r => r.transcript).length})
            </Box>
          )}
          {showIndividual && adminMode === "individual" && (
            <Box
              as="button"
              onClick={() => window.print()}
              display="flex"
              alignItems="center"
              gap="6px"
              px="14px"
              py="8px"
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
          )}
        </Flex>

        {/* Mode tabs */}
        <HStack
          gap={0}
          mb={5}
          bg="white"
          borderRadius="8px"
          border="1px solid #e2e6ec"
          p={1}
          w="fit-content"
          className="no-print"
        >
          {([
            { key: "individual", label: "Étudiant individuel", icon: FiUser },
            { key: "promotion", label: "Par promotion", icon: FiGrid },
          ] as const).map((tab) => (
            <Box
              key={tab.key}
              as="button"
              onClick={() => {
                setAdminMode(tab.key)
                setShowIndividual(false)
                setPromoGenerated(false)
              }}
              display="flex"
              alignItems="center"
              gap="6px"
              px="14px"
              py="7px"
              fontSize="12px"
              fontWeight="600"
              borderRadius="6px"
              cursor="pointer"
              transition="all 0.15s"
              bg={adminMode === tab.key ? "#1a3a5c" : "transparent"}
              color={adminMode === tab.key ? "white" : "#6b7280"}
              border="none"
            >
              <Icon as={tab.icon} fontSize="12px" />
              {tab.label}
            </Box>
          ))}
        </HStack>

        {/* ── Mode individuel ── */}
        {adminMode === "individual" && (
          <>
            <Box
              className="no-print"
              bg="white"
              borderRadius="6px"
              border="1px solid #E2E8F0"
              px={6}
              py={5}
              mb={5}
              boxShadow="0 2px 8px rgba(0,0,0,0.04)"
            >
              <Flex gap={3} wrap="wrap" align="flex-end">
                <Box>
                  <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                    N° Étudiant
                  </Text>
                  <Input
                    h="36px"
                    fontSize="sm"
                    borderRadius="6px"
                    borderColor="gray.200"
                    placeholder="Ex: 2024-001"
                    value={indStudentNumber}
                    onChange={(e) => { setIndStudentNumber(e.target.value); setShowIndividual(false) }}
                    onKeyDown={(e) => e.key === "Enter" && indStudentNumber.trim() && setShowIndividual(true)}
                    w="170px"
                    fontWeight="500"
                  />
                </Box>

                <Box>
                  <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                    Année d'étude
                  </Text>
                  <select style={sel("140px")} value={indYearLevel} onChange={(e) => { setIndYearLevel(Number(e.target.value)); setShowIndividual(false) }}>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>Niveau {y}</option>
                    ))}
                  </select>
                </Box>

                <Box>
                  <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                    Session
                  </Text>
                  <select
                    style={sel("140px")}
                    value={indSession ?? ""}
                    onChange={(e) => { setIndSession(e.target.value ? Number(e.target.value) : undefined); setShowIndividual(false) }}
                  >
                    <option value="">Toutes</option>
                    <option value={1}>Session 1</option>
                    <option value={2}>Session 2</option>
                  </select>
                </Box>

                <Button
                  h="36px"
                  px={5}
                  fontSize="sm"
                  fontWeight="600"
                  borderRadius="6px"
                  disabled={!indStudentNumber.trim()}
                  onClick={() => setShowIndividual(true)}
                  style={{ background: "linear-gradient(135deg, #1a3a5c, #2563a8)", color: "white" }}
                >
                  <FiSearch />
                  Générer
                </Button>

                {showIndividual && (
                  <Box
                    as="button"
                    onClick={() => { setShowIndividual(false); setIndStudentNumber("") }}
                    display="flex"
                    alignItems="center"
                    gap="6px"
                    px="12px"
                    py="8px"
                    fontSize="12px"
                    fontWeight="600"
                    color="#6b7280"
                    bg="transparent"
                    border="1px solid #d1d5db"
                    borderRadius="6px"
                    cursor="pointer"
                  >
                    ← Réinitialiser
                  </Box>
                )}
              </Flex>
            </Box>

            {showIndividual && indStudentNumber.trim() ? (
              <div className="print-area">
                <StudentTranscript
                  studentNumber={indStudentNumber}
                  yearLevel={indYearLevel}
                  sessionNumber={indSession}
                  hidePrintButton
                />
              </div>
            ) : !showIndividual && (
              <Flex direction="column" align="center" justify="center" py={14} gap={3} bg="white" borderRadius="10px" border="1px dashed #d1d5db">
                <Flex w="48px" h="48px" bg="#eef2f7" borderRadius="full" align="center" justify="center">
                  <Icon as={FiUser} color="#9baec8" fontSize="20px" />
                </Flex>
                <VStack gap={0.5}>
                  <Text fontWeight="600" color="gray.600" fontSize="sm">Saisir un numéro étudiant</Text>
                  <Text fontSize="xs" color="gray.400" textAlign="center">Entrez le numéro et cliquez sur Générer.</Text>
                </VStack>
              </Flex>
            )}
          </>
        )}

        {/* ── Mode promotion ── */}
        {adminMode === "promotion" && (
          <>
            <Box
              className="no-print"
              bg="white"
              borderRadius="6px"
              border="1px solid #E2E8F0"
              px={6}
              py={5}
              mb={5}
              boxShadow="0 2px 8px rgba(0,0,0,0.04)"
            >
              <Flex gap={3} wrap="wrap" align="flex-end">
                <Box>
                  <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                    Niveau de programme
                  </Text>
                  <select
                    style={sel("200px")}
                    value={promoProgLevel}
                    onChange={(e) => { setPromoProgLevel(e.target.value); setPromoGenerated(false) }}
                  >
                    <option value="">Sélectionner...</option>
                    {(programLevelsData?.data ?? []).map((pl: any) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.program?.name ? `${pl.program.name} — ` : ""}{pl.name}
                      </option>
                    ))}
                  </select>
                </Box>

                <Box>
                  <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                    Année d'étude
                  </Text>
                  <select
                    style={sel("140px")}
                    value={promoYearLevel}
                    onChange={(e) => { setPromoYearLevel(Number(e.target.value)); setPromoGenerated(false) }}
                  >
                    {Array.from({ length: promoMaxYear }, (_, i) => i + 1).map((y) => (
                      <option key={y} value={y}>Niveau {y}</option>
                    ))}
                  </select>
                </Box>

                <Box>
                  <Text fontSize="10px" fontWeight="600" color="#6b7280" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                    Session
                  </Text>
                  <select
                    style={sel("140px")}
                    value={promoSession ?? ""}
                    onChange={(e) => { setPromoSession(e.target.value ? Number(e.target.value) : undefined); setPromoGenerated(false) }}
                  >
                    <option value="">Toutes</option>
                    <option value={1}>Session 1</option>
                    <option value={2}>Session 2</option>
                  </select>
                </Box>

                <Button
                  h="36px"
                  px={5}
                  fontSize="sm"
                  fontWeight="600"
                  borderRadius="6px"
                  disabled={!promoProgLevel}
                  onClick={() => setPromoGenerated(true)}
                  style={{ background: "linear-gradient(135deg, #1a3a5c, #2563a8)", color: "white" }}
                >
                  <FiSearch />
                  Générer la promotion
                </Button>

                {promoGenerated && (
                  <Box
                    as="button"
                    onClick={() => { setPromoGenerated(false); setPromoProgLevel("") }}
                    display="flex"
                    alignItems="center"
                    gap="6px"
                    px="12px"
                    py="8px"
                    fontSize="12px"
                    fontWeight="600"
                    color="#6b7280"
                    bg="transparent"
                    border="1px solid #d1d5db"
                    borderRadius="6px"
                    cursor="pointer"
                  >
                    ← Réinitialiser
                  </Box>
                )}
              </Flex>
            </Box>

            {/* Résultats promotion */}
            {!promoGenerated ? (
              <Flex direction="column" align="center" justify="center" py={14} gap={3} bg="white" borderRadius="10px" border="1px dashed #d1d5db">
                <Flex w="48px" h="48px" bg="#eef2f7" borderRadius="full" align="center" justify="center">
                  <Icon as={FiGrid} color="#9baec8" fontSize="20px" />
                </Flex>
                <VStack gap={0.5}>
                  <Text fontWeight="600" color="gray.600" fontSize="sm">Sélectionner une promotion</Text>
                  <Text fontSize="xs" color="gray.400" textAlign="center">Choisissez le programme, l'année et cliquez sur Générer.</Text>
                </VStack>
              </Flex>
            ) : promoLoading || promoTranscriptsLoading ? (
              <Flex direction="column" align="center" justify="center" py={14} gap={3}>
                <Spinner size="md" color="blue.500" />
                <Text color="gray.400" fontSize="sm">
                  Génération des bulletins en cours...
                  {promoStudents.length > 0 && ` (${promoStudents.length} étudiant(s))`}
                </Text>
              </Flex>
            ) : promoStudents.length === 0 ? (
              <Flex direction="column" align="center" justify="center" py={14} gap={3} bg="white" borderRadius="10px" border="1px solid #e2e6ec">
                <Flex w="48px" h="48px" bg="#eef2f7" borderRadius="full" align="center" justify="center">
                  <Icon as={FiBookOpen} color="#9baec8" fontSize="20px" />
                </Flex>
                <Text color="gray.400" fontSize="sm">Aucun étudiant trouvé pour cette sélection.</Text>
              </Flex>
            ) : (
              <VStack gap={0} align="stretch">
                {/* Barre info */}
                <Flex
                  className="no-print"
                  align="center"
                  justify="space-between"
                  bg="white"
                  border="1px solid #e2e6ec"
                  borderRadius="8px"
                  px={5}
                  py={3}
                  mb={4}
                >
                  <HStack gap={2}>
                    <Badge colorPalette="blue" variant="surface" borderRadius="4px" px={2}>
                      {promoStudents.length} étudiant(s)
                    </Badge>
                    <Text fontSize="xs" color="#6b7280">
                      {selectedPL?.name} — Niveau {promoYearLevel}
                      {promoSession ? ` — Session ${promoSession}` : " — Toutes sessions"}
                    </Text>
                  </HStack>
                  <Text fontSize="10px" color="#9ca3af">
                    {(promoTranscripts ?? []).filter(r => r.transcript).length} bulletin(s) générés
                  </Text>
                </Flex>

                {/* Bulletins */}
                <div className="print-area">
                  {(promoTranscripts ?? []).map((result, idx) => (
                    <div
                      key={result.student?.id ?? idx}
                      style={{ pageBreakAfter: idx < (promoTranscripts ?? []).length - 1 ? "always" : "auto" }}
                    >
                      {result.transcript ? (
                        <div style={{ marginBottom: idx < (promoTranscripts ?? []).length - 1 ? "32px" : 0 }}>
                          <BulletinDoc
                            transcript={result.transcript}
                            yearLevel={promoYearLevel}
                          />
                        </div>
                      ) : (
                        <Flex
                          className="no-print"
                          gap={3}
                          p={4}
                          bg="red.50"
                          borderRadius="8px"
                          border="1px solid"
                          borderColor="red.100"
                          align="center"
                          mb={4}
                        >
                          <Text fontSize="xs" color="red.500">
                            <strong>{[result.student?.user?.first_name, result.student?.user?.last_name].filter(Boolean).join(" ") || "Étudiant"}</strong> — {result.error ?? "Erreur inconnue"}
                          </Text>
                        </Flex>
                      )}
                    </div>
                  ))}
                </div>
              </VStack>
            )}
          </>
        )}

        {/* CSS impression globale */}
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

      </Container>
    </Box>
  )
}
