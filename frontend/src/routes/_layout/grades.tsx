import {
  Box,
  Container,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { type ReactNode, useEffect, useState } from "react"
import {
  FiAward,
  FiBookOpen,
  FiChevronDown,
  FiClock,
  FiHash,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"

import { StudentsService } from "@/client"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"

export const Route = createFileRoute("/_layout/grades")({
  component: Grades,
})

// ─── Palette — original blue identity kept ──────────────────────────────────
const C = {
  ink: "#1A202C",
  inkMute: "#4A5568",
  faint: "#A0AEC0",
  line: "#E2E8F0",
  paper: "#F7FAFC",
  brand: "#2b6cb0",
  brandDeep: "#2c5282",
  headerGrad: "linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)",
}
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNote20(score: number, maxScore: number): number {
  if (!maxScore) return 0
  return (score / maxScore) * 20
}

function weightedAvg(grades: any[]): number {
  if (!grades.length) return 0
  const totalWeight = grades.reduce(
    (acc: number, g: any) => acc + (g.assessment_weight ?? 0),
    0,
  )
  if (totalWeight === 0) {
    return (
      grades.reduce(
        (acc: number, g: any) =>
          acc + toNote20(g.score, g.assessment_max_score),
        0,
      ) / grades.length
    )
  }
  const weighted = grades.reduce(
    (acc: number, g: any) =>
      acc +
      toNote20(g.score, g.assessment_max_score) * (g.assessment_weight ?? 0),
    0,
  )
  return weighted / totalWeight
}

function fmtNote(n: number): string {
  return isNaN(n) || !isFinite(n) ? "—" : n.toFixed(2)
}

function noteColor(note20: number): string {
  if (note20 >= 16) return "#1a6741"
  if (note20 >= 12) return "#1a4f8a"
  if (note20 >= 10) return "#8a6200"
  return "#c53030"
}

function noteLabel(note20: number): string {
  if (note20 >= 16) return "Excellent"
  if (note20 >= 14) return "Très bien"
  if (note20 >= 12) return "Bien"
  if (note20 >= 10) return "Passable"
  return "Insuffisant"
}

// ─── Note gauge — signature ─────────────────────────────────────────────────
//  A 0–20 rail with a filled portion at the grade's position, coloured by band.
//  Makes "how far from passing / from excellent" legible at a glance and
//  comparable row-to-row. The exact note stays above it.
function NoteGauge({ note20 }: { note20: number }) {
  if (isNaN(note20) || !isFinite(note20)) return null
  const pct = Math.max(2, Math.min(100, (note20 / 20) * 100))
  return (
    <Box
      w="66px"
      h="4px"
      mx="auto"
      mt="6px"
      bg={C.line}
      borderRadius="2px"
      position="relative"
      title={`${fmtNote(note20)} / 20`}
    >
      <Box
        h="100%"
        w={`${pct}%`}
        bg={noteColor(note20)}
        borderRadius="2px"
        transition="width 0.3s ease"
      />
      {/* passing mark at 10/20 */}
      <Box
        position="absolute"
        top="-1px"
        left="50%"
        w="1px"
        h="6px"
        bg={C.faint}
        opacity={0.6}
      />
    </Box>
  )
}

const TYPE_LABELS: Record<string, string> = {
  exam: "Exam",
  quiz: "Quiz",
  devoir: "Devoir",
  project: "Projet",
  presentation: "Présentation",
  lab: "Labo",
  homework: "HW",
  test: "Test",
  participation: "Participation",
}

// ─── A labelled input in the filter card ────────────────────────────────────
function InputField({
  icon,
  label,
  width,
  children,
}: {
  icon: any
  label: string
  width: string
  children: ReactNode
}) {
  return (
    <HStack
      gap="9px"
      px="11px"
      py="6px"
      borderRadius="4px"
      border="1px solid"
      borderColor={C.line}
      bg="white"
      transition="border-color 0.15s"
      _focusWithin={{ borderColor: C.brand }}
    >
      <Icon as={icon} color={C.brand} boxSize={3.5} flexShrink={0} />
      <Box minW={0} w={width}>
        <Text
          fontSize="9px"
          fontWeight="700"
          letterSpacing="0.6px"
          textTransform="uppercase"
          color={C.faint}
          lineHeight="1"
        >
          {label}
        </Text>
        {children}
      </Box>
    </HStack>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Grades() {
  const { user: currentUser } = useAuth()
  const { data: userRoles } = useUserRoles(currentUser?.id)
  const isStudent = (userRoles || []).some(
    (r: any) => r.role?.name?.toLowerCase() === "student",
  )

  const [studentNumber, setStudentNumber] = useState("")
  const [yearLevel, setYearLevel] = useState("")
  const [sessionNumber, setSessionNumber] = useState("")

  const { data: studentData } = useQuery({
    queryKey: ["student_by_user", currentUser?.id],
    queryFn: () =>
      StudentsService.readStudentByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && !currentUser.is_superuser,
    retry: false,
  })

  useEffect(() => {
    if (studentData) {
      if (studentData.user?.user_number && !studentNumber)
        setStudentNumber(studentData.user.user_number)
      if (studentData.current_year_level && !yearLevel)
        setYearLevel(studentData.current_year_level.toString())
    }
  }, [studentData]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ["grades", studentNumber, yearLevel, sessionNumber],
    queryFn: () =>
      StudentsService.readStudentGradesByYearWithCourseInfo({
        studentNumber,
        yearLevel: parseInt(yearLevel, 10),
        sessionNumber: sessionNumber ? parseInt(sessionNumber, 10) : undefined,
      }),
    enabled: !!studentNumber && !!yearLevel,
    retry: false,
  })

  const grades: any[] = data?.data ?? []

  // Group by session
  const sessions: Record<string, any[]> = {}
  for (const g of grades) {
    const key = g.session_name || "Sans session"
    if (!sessions[key]) sessions[key] = []
    sessions[key].push(g)
  }

  const overallAvg = weightedAvg(grades)
  const passed = grades.filter((g) => g.is_passing).length

  const queryClient = useQueryClient()

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <Flex
          justify="space-between"
          align="flex-start"
          mb={5}
          gap={4}
          wrap="wrap"
        >
          <Flex gap={4} align="stretch">
            <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
            <Box>
              <Text
                fontFamily={MONO}
                fontSize="10.5px"
                fontWeight="700"
                letterSpacing="2px"
                color={C.brand}
                mb="6px"
              >
                RELEVÉ DE NOTES
              </Text>
              <Text
                fontSize={{ base: "22px", md: "26px" }}
                fontWeight="800"
                color={C.ink}
                letterSpacing="-0.6px"
                lineHeight="1.05"
              >
                {isStudent ? "Mes notes" : "Tableau des notes"}
              </Text>
              <Text color={C.inkMute} fontSize="13.5px" mt="6px">
                {grades.length > 0
                  ? `${grades.length} note${grades.length !== 1 ? "s" : ""} · moyenne ${fmtNote(overallAvg)} / 20.`
                  : "Consulter et suivre les notes par étudiant et session."}
              </Text>
            </Box>
          </Flex>

          <IconButton
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["grades"] })
            }
            aria-label="Rafraîchir"
            borderColor={C.line}
            color={C.inkMute}
            borderRadius="4px"
            _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}
          >
            <FiRefreshCw />
          </IconButton>
        </Flex>

        {/* ── Filter card (right-aligned controls) ────────────────────── */}
        <Flex
          bg="white"
          borderRadius="6px"
          border="1px solid"
          borderColor={C.line}
          boxShadow="0 1px 2px rgba(20,34,30,0.04)"
          p="12px"
          gap="10px"
          align="center"
          wrap="wrap"
          mb={6}
        >
          <Text
            fontSize="9px"
            fontWeight="800"
            letterSpacing="0.8px"
            textTransform="uppercase"
            color={C.faint}
            pl="3px"
            pr="2px"
          >
            Filtres
          </Text>

          <Box flex="1" minW="8px" />

          {!isStudent && (
            <InputField icon={FiHash} label="N° Étudiant" width="120px">
              <Input
                border="none"
                bg="transparent"
                p={0}
                h="auto"
                placeholder="—"
                fontSize="13px"
                fontWeight="600"
                color={C.ink}
                fontFamily={MONO}
                outline="none"
                _placeholder={{ color: C.faint, fontFamily: "body" }}
                _focus={{ outline: "none", boxShadow: "none" }}
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
              />
            </InputField>
          )}

          <InputField icon={FiSearch} label="Année" width="56px">
            <Input
              border="none"
              bg="transparent"
              p={0}
              h="auto"
              type="number"
              placeholder="—"
              fontSize="13px"
              fontWeight="600"
              color={C.ink}
              fontFamily={MONO}
              outline="none"
              _placeholder={{ color: C.faint, fontFamily: "body" }}
              _focus={{ outline: "none", boxShadow: "none" }}
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
            />
          </InputField>

          <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
            <MenuTrigger asChild>
              <HStack
                cursor="pointer"
                gap="9px"
                px="11px"
                py="7px"
                borderRadius="4px"
                border="1px solid"
                borderColor={C.line}
                bg="white"
                transition="border-color 0.15s, background 0.15s"
                _hover={{ borderColor: C.brand, bg: C.paper }}
              >
                <Icon as={FiClock} color={C.brand} boxSize={3.5} flexShrink={0} />
                <Box minW={0}>
                  <Text
                    fontSize="9px"
                    fontWeight="700"
                    letterSpacing="0.6px"
                    textTransform="uppercase"
                    color={C.faint}
                    lineHeight="1"
                  >
                    Session
                  </Text>
                  <Text
                    fontSize="13px"
                    fontWeight="600"
                    color={C.ink}
                    lineHeight="1.3"
                  >
                    {sessionNumber === "1"
                      ? "Session 1"
                      : sessionNumber === "2"
                        ? "Session 2"
                        : "Toutes"}
                  </Text>
                </Box>
                <Icon
                  as={FiChevronDown}
                  boxSize={3}
                  color={C.faint}
                  flexShrink={0}
                />
              </HStack>
            </MenuTrigger>
            <MenuContent
              minW="140px"
              bg="white"
              borderRadius="6px"
              border="1px solid"
              borderColor={C.line}
              p="4px"
              zIndex={1500}
            >
              <MenuItem
                value=""
                fontSize="13px"
                borderRadius="6px"
                onClick={() => setSessionNumber("")}
              >
                Toutes
              </MenuItem>
              <MenuItem
                value="1"
                fontSize="13px"
                borderRadius="6px"
                onClick={() => setSessionNumber("1")}
              >
                Session 1
              </MenuItem>
              <MenuItem
                value="2"
                fontSize="13px"
                borderRadius="6px"
                onClick={() => setSessionNumber("2")}
              >
                Session 2
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </Flex>

        {/* ── Content ── */}
        {isLoading ? (
          <Flex justify="center" align="center" py={16}>
            <Text color={C.faint} fontSize="13px">
              Chargement…
            </Text>
          </Flex>
        ) : !studentNumber || !yearLevel ? (
          <Flex direction="column" align="center" justify="center" py={16} gap={3}>
            <Flex
              w="48px"
              h="48px"
              bg={C.paper}
              border="1px solid"
              borderColor={C.line}
              borderRadius="6px"
              align="center"
              justify="center"
            >
              <Icon as={FiBookOpen} color={C.faint} fontSize="20px" />
            </Flex>
            <Text color={C.faint} fontSize="13px">
              Sélectionnez un étudiant et un niveau pour afficher les notes.
            </Text>
          </Flex>
        ) : grades.length === 0 ? (
          <Flex direction="column" align="center" justify="center" py={16} gap={3}>
            <Flex
              w="48px"
              h="48px"
              bg={C.paper}
              border="1px solid"
              borderColor={C.line}
              borderRadius="6px"
              align="center"
              justify="center"
            >
              <Icon as={FiAward} color={C.faint} fontSize="20px" />
            </Flex>
            <Text color={C.faint} fontSize="13px">
              Aucune note enregistrée pour cette sélection.
            </Text>
          </Flex>
        ) : (
          <VStack align="stretch" gap={5}>
            {Object.entries(sessions).map(([sessionName, sessionGrades]) => {
              const sessionAvg = weightedAvg(sessionGrades)

              return (
                <Box
                  key={sessionName}
                  border="1px solid"
                  borderColor={C.line}
                  borderRadius="6px"
                  overflow="hidden"
                  bg="white"
                  boxShadow="0 1px 3px rgba(20,34,30,0.05)"
                >
                  {/* Session header */}
                  <Flex
                    px={5}
                    py={2.5}
                    bg={C.paper}
                    borderBottom="1px solid"
                    borderColor={C.line}
                    align="center"
                    justify="space-between"
                  >
                    <HStack gap={2}>
                      <Box w="3px" h="14px" bg={C.brand} borderRadius="2px" />
                      <Text
                        fontSize="11px"
                        fontWeight="700"
                        color={C.inkMute}
                        textTransform="uppercase"
                        letterSpacing="0.08em"
                      >
                        {sessionName}
                      </Text>
                    </HStack>
                    <Text fontSize="11px" fontWeight="700" color={C.brand}>
                      Moyenne session : {fmtNote(sessionAvg)} / 20
                    </Text>
                  </Flex>

                  {/* Table */}
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row background={C.headerGrad} borderBottom="1px solid" borderColor="whiteAlpha.300">
                        <Table.ColumnHeader px={5} py={2.5} fontSize="10px" fontWeight="700" color="white" letterSpacing="0.1em" textTransform="uppercase" minW="200px">
                          Cours
                        </Table.ColumnHeader>
                        <Table.ColumnHeader px={4} py={2.5} fontSize="10px" fontWeight="700" color="white" letterSpacing="0.1em" textTransform="uppercase" w="90px">
                          Code
                        </Table.ColumnHeader>
                        <Table.ColumnHeader px={4} py={2.5} fontSize="10px" fontWeight="700" color="white" letterSpacing="0.1em" textTransform="uppercase">
                          Évaluation
                        </Table.ColumnHeader>
                        <Table.ColumnHeader px={4} py={2.5} fontSize="10px" fontWeight="700" color="white" letterSpacing="0.1em" textTransform="uppercase" w="90px">
                          Type
                        </Table.ColumnHeader>
                        <Table.ColumnHeader px={4} py={2.5} fontSize="10px" fontWeight="700" color="white" letterSpacing="0.1em" textTransform="uppercase" w="110px" textAlign="center">
                          Note / 20
                        </Table.ColumnHeader>
                        <Table.ColumnHeader px={4} py={2.5} fontSize="10px" fontWeight="700" color="white" letterSpacing="0.1em" textTransform="uppercase" w="120px" textAlign="center">
                          Appréciation
                        </Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      {sessionGrades.map((grade: any, idx: number) => {
                        const note20 = toNote20(grade.score, grade.assessment_max_score)
                        const color = noteColor(note20)
                        const typeKey = grade.assessment_type?.toLowerCase() ?? ""

                        return (
                          <Table.Row
                            key={grade.id ?? idx}
                            borderBottom="1px solid"
                            borderColor={C.line}
                            _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                            transition="background 0.1s"
                          >
                            {/* Cours */}
                            <Table.Cell px={5} py={3} minW="200px">
                              <Text fontSize="xs" fontWeight="700" color={C.ink}>
                                {grade.course_name}
                              </Text>
                            </Table.Cell>

                            {/* Code */}
                            <Table.Cell px={4} py={3} w="90px">
                              <Box
                                as="span"
                                display="inline-block"
                                fontSize="10px"
                                fontFamily={MONO}
                                fontWeight="700"
                                color={C.brandDeep}
                                bg={C.paper}
                                border="1px solid"
                                borderColor={C.line}
                                px={1.5}
                                py={0.5}
                                borderRadius="3px"
                              >
                                {grade.course_code || "—"}
                              </Box>
                            </Table.Cell>

                            {/* Évaluation */}
                            <Table.Cell px={4} py={3}>
                              <Text fontSize="xs" color={C.inkMute} fontWeight="600">
                                {grade.assessment_name}
                              </Text>
                              {grade.assessment_due_date && (
                                <Text fontSize="10px" color={C.faint} mt={0.5}>
                                  Dû le{" "}
                                  {new Date(grade.assessment_due_date).toLocaleDateString(
                                    "fr-FR",
                                    { day: "2-digit", month: "short", year: "numeric" },
                                  )}
                                </Text>
                              )}
                            </Table.Cell>

                            {/* Type */}
                            <Table.Cell px={4} py={3} w="90px">
                              <Text fontSize="11px" color={C.inkMute}>
                                {TYPE_LABELS[typeKey] ?? grade.assessment_type ?? "—"}
                              </Text>
                            </Table.Cell>

                            {/* Note /20 + gauge (signature) */}
                            <Table.Cell px={4} py={3} w="110px" textAlign="center">
                              <Text
                                fontSize="sm"
                                fontWeight="800"
                                color={color}
                                fontFamily={MONO}
                                letterSpacing="-0.01em"
                              >
                                {fmtNote(note20)}
                              </Text>
                              <Text fontSize="10px" color={C.faint} fontFamily={MONO}>
                                {grade.score}&thinsp;/&thinsp;{grade.assessment_max_score}
                              </Text>
                              <NoteGauge note20={note20} />
                            </Table.Cell>

                            {/* Appréciation */}
                            <Table.Cell px={4} py={3} w="120px" textAlign="center">
                              <Text
                                fontSize="10px"
                                fontWeight="700"
                                color={color}
                                letterSpacing="0.02em"
                              >
                                {noteLabel(note20)}
                              </Text>
                            </Table.Cell>
                          </Table.Row>
                        )
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )
            })}

            {/* ─ Summary footer ─ */}
            <Box
              border="1px solid"
              borderColor={C.line}
              borderRadius="6px"
              px={5}
              py={4}
              bg="white"
              boxShadow="0 1px 3px rgba(20,34,30,0.05)"
            >
              <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                {/* Legend */}
                <HStack gap={4} fontSize="10px" color={C.inkMute} wrap="wrap">
                  {[
                    { color: "#1a6741", label: "Excellent ≥ 16" },
                    { color: "#1a4f8a", label: "Bien ≥ 12" },
                    { color: "#8a6200", label: "Passable ≥ 10" },
                    { color: "#c53030", label: "Insuffisant < 10" },
                  ].map((item) => (
                    <HStack key={item.label} gap={1.5}>
                      <Box
                        w="7px"
                        h="7px"
                        borderRadius="2px"
                        bg={item.color}
                        flexShrink={0}
                      />
                      <Text>{item.label}</Text>
                    </HStack>
                  ))}
                </HStack>

                {/* Overall stats */}
                <HStack gap={0} align="stretch">
                  <VStack gap={0} align="center" px={5}>
                    <Text fontSize="10px" fontWeight="600" color={C.faint} textTransform="uppercase" letterSpacing="wide">
                      Validées
                    </Text>
                    <Text fontSize="lg" fontWeight="800" color={C.inkMute} fontFamily={MONO}>
                      {passed}
                      <Text as="span" fontSize="xs" fontWeight="400" color={C.faint}>
                        {" "}/ {grades.length}
                      </Text>
                    </Text>
                  </VStack>

                  <Box w="1px" bg={C.line} />

                  <VStack gap={0} align="center" px={5}>
                    <Text fontSize="10px" fontWeight="600" color={C.faint} textTransform="uppercase" letterSpacing="wide">
                      Moy. générale
                    </Text>
                    <Text fontSize="lg" fontWeight="800" color={noteColor(overallAvg)} fontFamily={MONO} letterSpacing="-0.02em">
                      {fmtNote(overallAvg)}
                      <Text as="span" fontSize="xs" fontWeight="400" color={C.faint}>
                        {" "}/ 20
                      </Text>
                    </Text>
                  </VStack>

                  <Box w="1px" bg={C.line} />

                  <VStack gap={0} align="center" px={5}>
                    <Text fontSize="10px" fontWeight="600" color={C.faint} textTransform="uppercase" letterSpacing="wide">
                      Mention
                    </Text>
                    <Text fontSize="sm" fontWeight="700" color={noteColor(overallAvg)}>
                      {noteLabel(overallAvg)}
                    </Text>
                  </VStack>
                </HStack>
              </Flex>
            </Box>
          </VStack>
        )}
      </Container>
    </Box>
  )
}
