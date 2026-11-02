import {
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiActivity,
  FiAlertCircle,
  FiCalendar,
  FiChevronDown,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"

import {
  CoursesService,
  ProgramLevelsService,
  StudentsService,
} from "@/client"
import CourseDetails from "@/components/course/CourseDetails"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/course_search")({
  component: CourseSearch,
})

// ─── Registrar palette ──────────────────────────────────────────────────────
//  Original blue identity kept; weighting segments keep the page's original
//  intra/final/participation accent colors.
const C = {
  ink: "#1A202C", // gray.800
  inkMute: "#4A5568", // gray.600
  faint: "#A0AEC0", // gray.400
  line: "#E2E8F0", // gray.200
  paper: "#F7FAFC", // gray.50
  brand: "#2b6cb0",
  brandDeep: "#2c5282",
  headerGrad: "linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)",
  intra: "#D97706", // amber
  final: "#DC2626", // red
  part: "#0D9488", // teal
  other: "#E2E8F0", // unweighted remainder
  statusOn: "#38A169",
  statusOnText: "#2F855A",
  statusOff: "#E53E3E",
  statusOffText: "#C53030",
}
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

// ─── Teacher Avatar ─────────────────────────────────────────────────────────
function TeacherAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <Flex
      align="center"
      justify="center"
      w="28px"
      h="28px"
      borderRadius="3px"
      bg="#EDF2F7"
      color={C.brandDeep}
      fontSize="11px"
      fontWeight="700"
      flexShrink={0}
      border="1px solid"
      borderColor={C.line}
      letterSpacing="0.3px"
    >
      {initials}
    </Flex>
  )
}

// ─── Weighting bar — the signature element ──────────────────────────────────
//  Three separate % pills collapse into one bar that splits 100% into
//  intra / final / participation. The shape of the grade is comparable
//  row-to-row; exact numbers stay legible in mono beneath.
function WeightingBar({
  intra,
  final,
  participation,
}: {
  intra?: number | null
  final?: number | null
  participation?: number | null
}) {
  const i = intra || 0
  const f = final || 0
  const p = participation || 0
  const sum = i + f + p

  if (sum === 0)
    return (
      <Text color={C.line} fontSize="13px" fontFamily={MONO}>
        —
      </Text>
    )

  const other = Math.max(0, 100 - sum)
  const denom = Math.max(100, sum)
  const segs = [
    { v: i, c: C.intra },
    { v: f, c: C.final },
    { v: p, c: C.part },
    { v: other, c: C.other },
  ].filter((s) => s.v > 0)

  const title = `Intra ${i}% · Final ${f}% · Participation ${p}%${
    other ? ` · Autre ${other}%` : ""
  }`

  return (
    <Box w="148px" title={title}>
      <Flex
        h="7px"
        borderRadius="2px"
        overflow="hidden"
        bg={C.other}
        gap="1.5px"
      >
        {segs.map((s, idx) => (
          <Box
            key={idx}
            flexBasis={`${(s.v / denom) * 100}%`}
            bg={s.c}
            transition="flex-basis 0.3s ease"
          />
        ))}
      </Flex>
      <HStack gap="8px" mt="5px" fontFamily={MONO} fontSize="10.5px">
        <Text color={C.intra} fontWeight="700">
          {i || "·"}
        </Text>
        <Text color={C.final} fontWeight="700">
          {f || "·"}
        </Text>
        <Text color={C.part} fontWeight="700">
          {p || "·"}
        </Text>
      </HStack>
    </Box>
  )
}

// ─── A filter control in the filter card ────────────────────────────────────
function FilterControl({
  icon,
  label,
  value,
  children,
  maxW,
}: {
  icon: any
  label: string
  value: string
  children: ReactNode
  maxW?: string
}) {
  return (
    <MenuRoot positioning={{ gutter: 6, placement: "bottom-start" }}>
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
          maxW={maxW}
        >
          <Icon as={icon} color={C.brand} boxSize={3.5} flexShrink={0} />
          <Box minW={0}>
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
            <Text
              fontSize="13px"
              fontWeight="600"
              color={C.ink}
              truncate
              lineHeight="1.3"
            >
              {value}
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
      {children}
    </MenuRoot>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
function CourseSearch() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const [programLevelId, setProgramLevelId] = useState("")
  const [sessionNumber, setSessionNumber] = useState("")
  const [yearLevel, setYearLevel] = useState("")
  const [shouldFetch, setShouldFetch] = useState(false)

  const isStudent = currentUser && !currentUser.is_superuser

  const { data: studentData } = useQuery({
    queryKey: ["student_by_user", currentUser?.id],
    queryFn: () =>
      StudentsService.readStudentByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && !!isStudent,
  })

  useEffect(() => {
    if (isStudent && studentData?.program_level?.id) {
      setProgramLevelId(studentData.program_level.id)
    }
  }, [isStudent, studentData])

  const { data: programLevels } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
  })

  const selectedProgram = programLevels?.data?.find(
    (p) => p.id === programLevelId,
  )
  const maxYearLevel = selectedProgram?.typical_duration || 1
  const yearLevels = Array.from({ length: maxYearLevel }, (_, i) => i + 1)

  useEffect(() => {
    if (yearLevel && parseInt(yearLevel, 10) > maxYearLevel) setYearLevel("")
  }, [maxYearLevel, yearLevel])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["course-search", programLevelId, sessionNumber, yearLevel],
    queryFn: () =>
      CoursesService.searchCourses({
        programLevelId: programLevelId || "",
        sessionNumber: sessionNumber ? parseInt(sessionNumber, 10) : undefined,
        yearLevel: yearLevel ? parseInt(yearLevel, 10) : undefined,
      }),
    enabled: shouldFetch && (!isStudent || !!programLevelId),
    retry: false,
  })

  const handleSearch = () => {
    setShouldFetch(true)
    refetch()
  }

  useEffect(() => {
    if (shouldFetch) return
    if (isStudent && !programLevelId) return
    setShouldFetch(true)
  }, [programLevelId, isStudent, shouldFetch])

  const resultsRef = useRef<HTMLDivElement | null>(null)
  const [resultsMaxH, setResultsMaxH] = useState<string>("50vh")

  useEffect(() => {
    const update = () => {
      if (!resultsRef.current) return
      const top = resultsRef.current.getBoundingClientRect().top
      setResultsMaxH(
        `${Math.max(300, Math.floor(window.innerHeight - top - 24))}px`,
      )
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const count = data?.data.length ?? 0
  const yearLabel = (lvl: string | number) =>
    t("course.session.table.year_short", { year: lvl })

  return (
    <Box minH="100vh" bg={C.paper} py={{ base: 5, md: 9 }}>
      <Container maxW="container.xl">
        {/* ── Hero: registrar header ──────────────────────────────────── */}
        <Flex
          justify="space-between"
          align="flex-start"
          mb={5}
          gap={4}
          wrap="wrap"
        >
          <Flex gap={4} align="stretch">
            {/* teal rule — the page's spine */}
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
                RELEVÉ DE COURS
              </Text>
              <Heading
                fontSize={{ base: "22px", md: "27px" }}
                fontWeight="800"
                color={C.ink}
                letterSpacing="-0.6px"
                lineHeight="1.05"
              >
                {isStudent ? "Mes cours" : "Recherche de cours"}
              </Heading>
              <Text color={C.inkMute} fontSize="13.5px" mt="6px">
                {data
                  ? count === 0
                    ? "Aucun cours pour ces filtres."
                    : `${count} cours · pondération, professeur et statut en un coup d'œil.`
                  : "Filtrez par session, année et programme pour afficher vos cours."}
              </Text>
            </Box>
          </Flex>

          <IconButton
            variant="outline"
            size="sm"
            onClick={handleSearch}
            loading={isLoading}
            aria-label="Actualiser"
            borderColor={C.line}
            color={C.inkMute}
            borderRadius="4px"
            _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}
          >
            <FiRefreshCw />
          </IconButton>
        </Flex>

        {/* ── Filter card ─────────────────────────────────────────────── */}
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

          {/* Année */}
          <FilterControl
            icon={FiCalendar}
            label="Année"
            value={yearLevel ? yearLabel(yearLevel) : "Toutes"}
          >
            <MenuContent
              minW="150px"
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
                onClick={() => setYearLevel("")}
              >
                Toutes
              </MenuItem>
              {yearLevels.map((level) => (
                <MenuItem
                  key={level}
                  value={String(level)}
                  fontSize="13px"
                  borderRadius="6px"
                  onClick={() => setYearLevel(String(level))}
                >
                  {yearLabel(level)}
                </MenuItem>
              ))}
            </MenuContent>
          </FilterControl>

          {/* Session */}
          <FilterControl
            icon={FiActivity}
            label="Session"
            value={
              sessionNumber === "1"
                ? "Session 1"
                : sessionNumber === "2"
                  ? "Session 2"
                  : "Toutes"
            }
          >
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
          </FilterControl>

          {/* Programme — admin only */}
          {!isStudent && (
            <FilterControl
              icon={FiSearch}
              label="Programme"
              maxW="280px"
              value={
                programLevelId
                  ? (programLevels?.data?.find((p) => p.id === programLevelId)
                      ?.name ?? "Programme")
                  : "Tous"
              }
            >
              <MenuContent
                minW="280px"
                maxH="320px"
                overflowY="auto"
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
                  onClick={() => setProgramLevelId("")}
                >
                  Tous les programmes
                </MenuItem>
                {programLevels?.data?.map((level) => (
                  <MenuItem
                    key={level.id}
                    value={level.id}
                    fontSize="13px"
                    borderRadius="6px"
                    onClick={() => setProgramLevelId(level.id)}
                  >
                    {level.program.name} — {level.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </FilterControl>
          )}

          {/* Legend for the weighting bar — decodes the signature */}
          <HStack
            gap="12px"
            fontSize="10.5px"
            color={C.inkMute}
            display={{ base: "none", lg: "flex" }}
          >
            {[
              { c: C.intra, l: "Intra" },
              { c: C.final, l: "Final" },
              { c: C.part, l: "Particip." },
            ].map((s) => (
              <HStack key={s.l} gap="5px">
                <Box w="9px" h="9px" borderRadius="2px" bg={s.c} />
                <Text fontWeight="600">{s.l}</Text>
              </HStack>
            ))}
          </HStack>

          <HStack
            as="button"
            onClick={handleSearch}
            gap="7px"
            px="15px"
            py="9px"
            borderRadius="4px"
            bg={C.brand}
            color="white"
            fontSize="13px"
            fontWeight="700"
            cursor="pointer"
            transition="background 0.15s"
            _hover={{ bg: C.brandDeep }}
          >
            <Icon as={FiSearch} boxSize={3.5} />
            <Text>Rechercher</Text>
          </HStack>
        </Flex>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <Flex
            align="center"
            gap={3}
            p={4}
            bg="#FCEDED"
            border="1px solid"
            borderColor="#F3C9C9"
            borderRadius="6px"
            mb={4}
          >
            <Icon as={FiAlertCircle} color="#C0392B" fontSize="18px" />
            <Box>
              <Text fontWeight="700" fontSize="13px" color="#922B21">
                La recherche a échoué
              </Text>
              <Text fontSize="12px" color="#C0392B">
                {error.message}
              </Text>
            </Box>
          </Flex>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isLoading && (
          <Flex justify="center" align="center" py={16} gap={3}>
            <Spinner size="sm" color={C.brand} />
            <Text color={C.inkMute} fontSize="13px">
              Chargement des cours…
            </Text>
          </Flex>
        )}

        {/* ── Results ledger ──────────────────────────────────────────── */}
        {data && !isLoading && (
          <Box
            bg="white"
            border="1px solid"
            borderColor={C.line}
            borderRadius="6px"
            overflow="hidden"
            boxShadow="0 1px 3px rgba(20,34,30,0.05)"
          >
            <Box
              ref={resultsRef}
              overflowX="auto"
              overflowY="auto"
              maxH={resultsMaxH}
            >
              <Table.Root size="sm" stickyHeader>
                <Table.Header>
                  <Table.Row background={C.headerGrad}>
                    {[
                      { label: "Code", align: "left" },
                      { label: "Cours", align: "left" },
                      { label: "Professeur", align: "left" },
                      { label: "Session / Année", align: "left" },
                      { label: "Niveau", align: "center" },
                      { label: "Pondération", align: "left" },
                      { label: "Type", align: "left" },
                      { label: "Statut", align: "left" },
                      { label: "", align: "right" },
                    ].map(({ label, align }) => (
                      <Table.ColumnHeader
                        key={label || "actions"}
                        fontSize="10px"
                        fontWeight="700"
                        color="white"
                        textTransform="uppercase"
                        letterSpacing="0.7px"
                        py={3}
                        textAlign={align as any}
                        borderBottom="1px solid"
                        borderColor="whiteAlpha.300"
                      >
                        {label}
                      </Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {count === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={9} textAlign="center" py={16}>
                        <Flex direction="column" align="center" gap={3}>
                          <Flex
                            align="center"
                            justify="center"
                            w="44px"
                            h="44px"
                            borderRadius="6px"
                            bg={C.paper}
                            border="1px solid"
                            borderColor={C.line}
                          >
                            <Icon
                              as={FiLayers}
                              fontSize="20px"
                              color={C.faint}
                            />
                          </Flex>
                          <Box textAlign="center">
                            <Text
                              fontWeight="700"
                              fontSize="14px"
                              color={C.ink}
                              mb="3px"
                            >
                              Aucun cours pour ces filtres
                            </Text>
                            <Text fontSize="12.5px" color={C.faint}>
                              Élargissez l'année ou la session pour voir des
                              résultats.
                            </Text>
                          </Box>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    data.data.map((course) => (
                      <Table.Row
                        key={course.id}
                        borderBottom="1px solid"
                        borderColor={C.line}
                        _odd={{ bg: "#f7f9fc" }}
                        _even={{ bg: "white" }}
                        _hover={{ bg: "#edf2f7" }}
                        transition="background 0.12s"
                      >
                        {/* Code */}
                        <Table.Cell py={3.5}>
                          <Box
                            display="inline-block"
                            px="8px"
                            py="3px"
                            bg={C.paper}
                            borderRadius="3px"
                            border="1px solid"
                            borderColor={C.line}
                          >
                            <Text
                              fontFamily={MONO}
                              fontSize="11.5px"
                              fontWeight="700"
                              color={C.brandDeep}
                              letterSpacing="0.3px"
                            >
                              {course.code}
                            </Text>
                          </Box>
                        </Table.Cell>

                        {/* Cours */}
                        <Table.Cell py={3.5} maxW="260px">
                          <Text
                            fontWeight="700"
                            fontSize="13.5px"
                            color={C.ink}
                            lineClamp={1}
                          >
                            {course.name}
                          </Text>
                          {course.description && (
                            <Text
                              fontSize="11.5px"
                              color={C.faint}
                              lineClamp={1}
                              mt="1px"
                            >
                              {course.description}
                            </Text>
                          )}
                        </Table.Cell>

                        {/* Professeur */}
                        <Table.Cell py={3.5}>
                          {(course as any).teacher_name ? (
                            <Flex align="center" gap={2.5}>
                              <TeacherAvatar
                                name={(course as any).teacher_name}
                              />
                              <Box minW={0}>
                                <Text
                                  fontSize="12.5px"
                                  fontWeight="600"
                                  color={C.ink}
                                  lineClamp={1}
                                >
                                  {(course as any).teacher_name}
                                </Text>
                                <Text
                                  fontSize="11px"
                                  color={C.faint}
                                  lineClamp={1}
                                >
                                  {(course as any).teacher_email}
                                </Text>
                              </Box>
                            </Flex>
                          ) : (
                            <Flex align="center" gap={1.5}>
                              <Icon
                                as={FiUser}
                                fontSize="12px"
                                color={C.line}
                              />
                              <Text fontSize="11.5px" color={C.faint}>
                                Non assigné
                              </Text>
                            </Flex>
                          )}
                        </Table.Cell>

                        {/* Session / Année */}
                        <Table.Cell py={3.5}>
                          {(course as any).session_name ? (
                            <Box>
                              <Text
                                fontSize="12.5px"
                                fontWeight="600"
                                color={C.ink}
                              >
                                {(course as any).session_name}
                              </Text>
                              {(course as any).academic_year_name && (
                                <Text
                                  fontSize="11px"
                                  color={C.faint}
                                  mt="1px"
                                >
                                  {(course as any).academic_year_name}
                                </Text>
                              )}
                            </Box>
                          ) : (
                            <Text fontSize="13px" color={C.line}>
                              —
                            </Text>
                          )}
                        </Table.Cell>

                        {/* Niveau */}
                        <Table.Cell py={3.5} textAlign="center">
                          {(course as any).year_level ? (
                            <Flex justify="center">
                              <Flex
                                align="center"
                                justify="center"
                                w="26px"
                                h="26px"
                                borderRadius="4px"
                                bg={C.paper}
                                border="1px solid"
                                borderColor={C.line}
                              >
                                <Text
                                  fontFamily={MONO}
                                  fontSize="12px"
                                  fontWeight="700"
                                  color={C.inkMute}
                                >
                                  {(course as any).year_level}
                                </Text>
                              </Flex>
                            </Flex>
                          ) : (
                            <Text color={C.line} fontSize="13px">
                              —
                            </Text>
                          )}
                        </Table.Cell>

                        {/* Pondération — signature */}
                        <Table.Cell py={3.5}>
                          <WeightingBar
                            intra={(course as any).intra_percentage}
                            final={(course as any).final_percentage}
                            participation={
                              (course as any).participation_percentage
                            }
                          />
                        </Table.Cell>

                        {/* Type */}
                        <Table.Cell py={3.5}>
                          {course.is_mandatory ? (
                            <Box
                              display="inline-block"
                              px="8px"
                              py="2px"
                              borderRadius="3px"
                              bg={C.brand + "14"}
                              border="1px solid"
                              borderColor={C.brand + "33"}
                            >
                              <Text
                                fontSize="11px"
                                fontWeight="700"
                                color={C.brandDeep}
                              >
                                Obligatoire
                              </Text>
                            </Box>
                          ) : (
                            <Text
                              fontSize="11.5px"
                              fontWeight="500"
                              color={C.faint}
                            >
                              Optionnel
                            </Text>
                          )}
                        </Table.Cell>

                        {/* Statut */}
                        <Table.Cell py={3.5}>
                          <Flex align="center" gap={1.5}>
                            <Box
                              w="7px"
                              h="7px"
                              borderRadius="full"
                              bg={course.is_active ? C.statusOn : C.statusOff}
                              flexShrink={0}
                              boxShadow={
                                course.is_active
                                  ? `0 0 0 3px ${C.statusOn}1f`
                                  : `0 0 0 3px ${C.statusOff}1f`
                              }
                            />
                            <Text
                              fontSize="12px"
                              fontWeight="600"
                              color={
                                course.is_active
                                  ? C.statusOnText
                                  : C.statusOffText
                              }
                            >
                              {course.is_active ? "Actif" : "Inactif"}
                            </Text>
                          </Flex>
                        </Table.Cell>

                        {/* Actions */}
                        <Table.Cell py={3.5} textAlign="right">
                          <CourseDetails course={course as any} />
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  )
}
