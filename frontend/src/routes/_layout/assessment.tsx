import {
  Badge,
  Box,
  Container,
  EmptyState,
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
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import {
  AssessmentsService,
  ProgramLevelsService,
  SessionsService,
  StudentsService,
  TeacherAnalyticsService,
  TeachersService,
} from "@/client"
import AddAssessment from "@/components/assessment/AddAssessment"
import AssessmentDetails from "@/components/assessment/AssessmentDetails"
import { AssessmentActionsMenu } from "@/components/Common/AssessmentActionsMenu"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"

// ─── Route schema ───────────────────────────────────────────────────────────

const assessmentSearchSchema = z.object({
  page: z.number().catch(1),
  course_name: z.string().optional(),
  year_level: z.number().optional(),
  session_number: z.number().optional(),
  program_level_id: z.string().optional(),
  session_id: z.string().optional(),
})

const PER_PAGE = 10

export const Route = createFileRoute("/_layout/assessment")({
  component: AssessmentPage,
  validateSearch: (search) => assessmentSearchSchema.parse(search),
})

// ─── Palette — original blue identity kept ──────────────────────────────────
const C = {
  ink: "#1A202C", // gray.800
  inkMute: "#4A5568", // gray.600
  faint: "#A0AEC0", // gray.400
  line: "#E2E8F0", // gray.200
  paper: "#F7FAFC", // gray.50
  brand: "#2b6cb0",
  brandDeep: "#2c5282",
  headerGrad: "linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)",
}
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    exam: "red",
    quiz: "blue",
    project: "purple",
    devoir: "orange",
    presentation: "teal",
    lab: "cyan",
    homework: "yellow",
    test: "pink",
    participation: "green",
  }
  const { t } = useTranslation()
  return (
    <Badge colorPalette={colorMap[type] ?? "gray"} variant="surface" size="xs">
      {t(`assessment_types.${type.toLowerCase()}`, { defaultValue: type })}
    </Badge>
  )
}

// ─── A filter control in the filter card ────────────────────────────────────
function FilterControl({
  icon,
  label,
  value,
  children,
}: {
  icon: any
  label: string
  value: string
  children: ReactNode
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
          <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
        </HStack>
      </MenuTrigger>
      {children}
    </MenuRoot>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AssessmentPage() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const queryClient = useQueryClient()

  const { user } = useAuth()
  const { data: userRoles } = useUserRoles(user?.id)
  const isAdmin = user?.is_superuser ?? false
  const isTeacher = !isAdmin && (userRoles || []).some((r: any) => (r.code || "").toUpperCase() === "TEACHER")
  const isStudent = !isAdmin && (userRoles || []).some((r: any) => (r.code || "").toUpperCase() === "STUDENT")

  // Course name search state (local, debounced)
  const [courseNameInput, setCourseNameInput] = useState(search.course_name || "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (courseNameInput !== (search.course_name || "")) {
        navigate({ to: "/assessment", search: (prev) => ({ ...prev, course_name: courseNameInput || undefined, page: 1 }) })
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [courseNameInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // Role-based data
  const { data: teacherData } = useQuery({
    queryKey: ["teacher_by_user", user?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: user!.id }),
    enabled: !!user?.id && isTeacher,
    retry: false,
  })

  const { data: studentData } = useQuery({
    queryKey: ["student_by_user", user?.id],
    queryFn: () => StudentsService.readStudentByUser({ userId: user!.id }),
    enabled: !!user?.id && isStudent,
    retry: false,
  })

  // Derived filter values
  const teacherId = isTeacher ? teacherData?.id : undefined
  // StudentPublicWithDetails has program_level (nested object), not program_level_id
  const studentProgramLevelId = isStudent ? studentData?.program_level?.id : undefined


  // Wait for role-specific data before fetching
  const readyToFetch =
    isAdmin ||
    (isTeacher && !!teacherData?.id) ||
    (isStudent && !!studentData?.id)

  // For students the program_level_id filter is fixed (their own); for
  // admin/teacher it comes from the URL search param.
  const effectiveProgramLevelId = isStudent
    ? studentProgramLevelId
    : search.program_level_id || undefined

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["assessments", {
      page: search.page,
      course_name: search.course_name,
      year_level: search.year_level,
      session_number: search.session_number,
      session_id: search.session_id,
      effectiveProgramLevelId,
      teacherId,
    }],
    queryFn: () =>
      AssessmentsService.readAssessments({
        skip: (search.page - 1) * PER_PAGE,
        limit: PER_PAGE,
        courseName: search.course_name || undefined,
        yearLevel: search.year_level || undefined,
        sessionNumber: search.session_number || undefined,
        sessionId: search.session_id || undefined,
        programLevelId: effectiveProgramLevelId || undefined,
        teacherId: teacherId || undefined,
      }),
    enabled: readyToFetch,
    placeholderData: (prev) => prev,
  })

  const assessments = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  const setPage = (page: number) => {
    navigate({ to: "/assessment", search: (prev) => ({ ...prev, page }) })
  }

  const updateFilter = (filters: Partial<typeof search>) => {
    navigate({ to: "/assessment", search: (prev) => ({ ...prev, ...filters, page: 1 }) })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["assessments"] })
  }

  const maxYearLevel = isStudent
    ? (studentData?.program_level?.typical_duration ?? 7)
    : 7
  const yearLevelOptions = Array.from({ length: maxYearLevel }, (_, i) => i + 1)

  const yearValue = search.year_level
    ? t("common.tables.year_level_label", {
        level: search.year_level,
        defaultValue: `Année ${search.year_level}`,
      })
    : t("common.tables.all_levels", { defaultValue: "Tous niveaux" })

  // ── Program level filter (admin: all, teacher: assigned) ──────────────────
  const { data: allProgramLevels } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
    enabled: isAdmin,
  })
  const { data: assignedLevels } = useQuery({
    queryKey: ["assigned_program_levels", teacherData?.id],
    queryFn: () =>
      TeacherAnalyticsService.getAssignedProgramLevels({
        teacherId: teacherData!.id,
      }),
    enabled: isTeacher && !!teacherData?.id,
  })
  const programOptions: { id: string; name: string }[] = isAdmin
    ? (allProgramLevels?.data ?? []).map((pl) => ({
        id: pl.id,
        name: pl.program?.name ? `${pl.program.name} — ${pl.name}` : pl.name,
      }))
    : (assignedLevels ?? []).map((pl: any) => ({
        id: String(pl.id),
        name: pl.code ? `${pl.name} (${pl.code})` : pl.name,
      }))
  const selectedProgramName = search.program_level_id
    ? (programOptions.find((p) => p.id === search.program_level_id)?.name ??
      "Programme")
    : "Tous"

  // ── Academic session filter ───────────────────────────────────────────────
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions_all"],
    queryFn: () =>
      SessionsService.readSessionsWithAcademicYear({ skip: 0, limit: 1000 }),
  })
  const sessionOptions = (sessionsData?.data ?? []).map((se: any) => {
    // Include the academic year so identical session names (e.g. "Session 1")
    // across years are distinguishable. `description` names the year directly.
    const ay = se.academic_year?.name || se.description
    return { id: se.id, name: ay ? `${se.name} · ${ay}` : se.name }
  })
  const academicSessionValue = search.session_id
    ? (sessionOptions.find((s) => s.id === search.session_id)?.name ?? "Session")
    : "Toutes"

  // ── Render ──────────────────────────────────────────────────────────────────

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
                ÉVALUATIONS
              </Text>
              <Text
                fontSize={{ base: "22px", md: "26px" }}
                fontWeight="800"
                color={C.ink}
                letterSpacing="-0.6px"
                lineHeight="1.05"
              >
                {isStudent || isTeacher
                  ? "Mes évaluations"
                  : "Évaluations & examens"}
              </Text>
              <Text color={C.inkMute} fontSize="13.5px" mt="6px">
                {data
                  ? `${count} évaluation${count !== 1 ? "s" : ""} · examens, devoirs et notations.`
                  : t("common.tables.description_assessment", {
                      defaultValue:
                        "Gérer les évaluations, examens et notations",
                    })}
              </Text>
            </Box>
          </Flex>

          <HStack gap={2}>
            <IconButton
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              aria-label={t("common.tables.refresh")}
              borderColor={C.line}
              color={C.inkMute}
              borderRadius="4px"
              _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}
            >
              <FiRefreshCw />
            </IconButton>
            {isTeacher && <AddAssessment />}
          </HStack>
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

          {/* Search input */}
          <HStack
            gap="8px"
            px="11px"
            py="7px"
            borderRadius="4px"
            border="1px solid"
            borderColor={C.line}
            bg="white"
            transition="border-color 0.15s"
            _focusWithin={{ borderColor: C.brand }}
            minW="200px"
          >
            <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
            <Input
              border="none"
              bg="transparent"
              p={0}
              h="auto"
              placeholder={t("common.tables.search_by_course", {
                defaultValue: "Rechercher un cours…",
              })}
              fontSize="13px"
              color={C.ink}
              outline="none"
              _placeholder={{ color: C.faint }}
              _focus={{ outline: "none", boxShadow: "none" }}
              value={courseNameInput}
              onChange={(e) => setCourseNameInput(e.target.value)}
            />
          </HStack>

          {/* Année */}
          {!isStudent && (
            <FilterControl icon={FiBookOpen} label="Programme" value={selectedProgramName}>
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
                <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => updateFilter({ program_level_id: undefined })}>
                  Tous les programmes
                </MenuItem>
                {programOptions.map((pl) => (
                  <MenuItem key={pl.id} value={pl.id} fontSize="13px" borderRadius="6px" onClick={() => updateFilter({ program_level_id: pl.id })}>
                    {pl.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </FilterControl>
          )}

          <FilterControl icon={FiFilter} label="Niveau" value={yearValue}>
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
                onClick={() => updateFilter({ year_level: undefined })}
              >
                {t("common.tables.all_levels", { defaultValue: "Tous niveaux" })}
              </MenuItem>
              {yearLevelOptions.map((lvl) => (
                <MenuItem
                  key={lvl}
                  value={lvl.toString()}
                  fontSize="13px"
                  borderRadius="6px"
                  onClick={() => updateFilter({ year_level: lvl })}
                >
                  {t("common.tables.year_level_label", {
                    level: lvl,
                    defaultValue: `Année ${lvl}`,
                  })}
                </MenuItem>
              ))}
            </MenuContent>
          </FilterControl>

          {/* Session académique */}
          <FilterControl icon={FiClock} label="Session" value={academicSessionValue}>
            <MenuContent
              minW="240px"
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
                onClick={() => updateFilter({ session_id: undefined })}
              >
                {t("common.tables.all_sessions", { defaultValue: "Toutes" })}
              </MenuItem>
              {sessionOptions.map((se) => (
                <MenuItem
                  key={se.id}
                  value={se.id}
                  fontSize="13px"
                  borderRadius="6px"
                  onClick={() => updateFilter({ session_id: se.id })}
                >
                  {se.name}
                </MenuItem>
              ))}
            </MenuContent>
          </FilterControl>
        </Flex>

        {/* Table */}
        {isLoading ? (
          <PendingItems />
        ) : assessments.length === 0 ? (
          <Box
            py={14}
            bg="white"
            borderRadius="6px"
            border="1px solid"
            borderColor={C.line}
          >
            <EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Indicator color={C.faint}>
                  <FiFileText size="34px" />
                </EmptyState.Indicator>
                <VStack textAlign="center" gap={1}>
                  <EmptyState.Title
                    fontSize="14px"
                    color={C.ink}
                    fontWeight="700"
                  >
                    {t("common.tables.no_results")}
                  </EmptyState.Title>
                  <EmptyState.Description color={C.faint} fontSize="12.5px">
                    {t("common.tables.add_first_assessment")}
                  </EmptyState.Description>
                </VStack>
              </EmptyState.Content>
            </EmptyState.Root>
          </Box>
        ) : (
          <VStack align="stretch" gap={4}>
            <Box
              bg="white"
              borderRadius="6px"
              border="1px solid"
              borderColor={C.line}
              boxShadow="0 1px 3px rgba(20,34,30,0.05)"
              overflowX="auto"
            >
              <Table.Root size="sm" interactive stickyHeader>
                <Table.Header>
                  <Table.Row background={C.headerGrad}>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="200px">
                      {t("common.tables.name")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="160px">
                      {t("common.tables.course_session", { defaultValue: "Cours" })}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="140px">
                      {t("common.tables.teacher", { defaultValue: "Professeur" })}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="110px">
                      {t("common.tables.type")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="80px" textAlign="center">
                      {t("common.tables.score")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="100px">
                      {t("common.tables.due_date")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="75px" textAlign="center">
                      {t("common.tables.duration")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="90px" textAlign="center">
                      {t("common.tables.status")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" whiteSpace="nowrap" w="70px" textAlign="center">
                      {t("common.tables.actions")}
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {assessments.map((assessment) => (
                    <Table.Row
                      key={assessment.id}
                      opacity={isPlaceholderData ? 0.5 : 1}
                      _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                      transition="background 0.1s"
                    >
                      {/* Name */}
                      <Table.Cell w="200px">
                        <HStack gap={2}>
                          <Icon as={FiFileText} color={C.brand} fontSize="13px" />
                          <Text fontWeight="700" color={C.brandDeep} fontSize="xs" truncate>
                            {assessment.name}
                          </Text>
                        </HStack>
                      </Table.Cell>

                      {/* Course */}
                      <Table.Cell w="160px">
                        <VStack align="start" gap={0}>
                          <Text fontSize="xs" fontWeight="600" color={C.ink} truncate>
                            {assessment.course_session?.course_program_level?.course?.name || "—"}
                          </Text>
                          {assessment.course_session?.session && (
                            <Text fontSize="10px" color={C.faint}>
                              {assessment.course_session.session.name}
                              {" · "}
                              {t("common.tables.year_level_label", {
                                level: assessment.course_session.year_level,
                                defaultValue: `Année ${assessment.course_session.year_level}`,
                              })}
                            </Text>
                          )}
                        </VStack>
                      </Table.Cell>

                      {/* Teacher */}
                      <Table.Cell w="140px">
                        {(() => {
                          const teacher = assessment.course_session?.teacher
                          const fullName = [teacher?.user?.first_name, teacher?.user?.last_name].filter(Boolean).join(" ").trim() || undefined
                          const initials = fullName
                            ? fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                            : "?"
                          return teacher ? (
                            <HStack gap={2}>
                              <Flex
                                w="24px" h="24px" borderRadius="3px"
                                bg="#EDF2F7" border="1px solid" borderColor={C.line}
                                align="center" justify="center"
                                flexShrink={0}
                              >
                                <Text fontSize="9px" fontWeight="700" color={C.brandDeep}>{initials}</Text>
                              </Flex>
                              <Text fontSize="xs" color={C.inkMute} truncate>
                                {fullName || teacher.user?.email || "—"}
                              </Text>
                            </HStack>
                          ) : (
                            <Text fontSize="xs" color={C.faint}>—</Text>
                          )
                        })()}
                      </Table.Cell>

                      {/* Type */}
                      <Table.Cell w="110px">
                        {assessment.assessment_type ? (
                          <TypeBadge type={assessment.assessment_type} />
                        ) : (
                          <Text fontSize="xs" color={C.faint}>—</Text>
                        )}
                      </Table.Cell>

                      {/* Score */}
                      <Table.Cell w="80px" textAlign="center">
                        <Text fontSize="xs" color={C.inkMute} fontFamily={MONO} fontWeight="700">
                          {assessment.max_score ?? "—"}
                        </Text>
                      </Table.Cell>

                      {/* Due date */}
                      <Table.Cell w="100px">
                        {assessment.due_date ? (
                          <HStack gap={1}>
                            <Icon as={FiCalendar} fontSize="11px" color={C.faint} />
                            <Text fontSize="xs" color={C.inkMute} fontFamily={MONO}>
                              {new Date(assessment.due_date).toLocaleDateString()}
                            </Text>
                          </HStack>
                        ) : (
                          <Text fontSize="xs" color={C.faint}>—</Text>
                        )}
                      </Table.Cell>

                      {/* Duration */}
                      <Table.Cell w="75px" textAlign="center">
                        {assessment.duration_minutes ? (
                          <HStack gap={1} justify="center">
                            <Icon as={FiClock} fontSize="11px" color={C.faint} />
                            <Text fontSize="xs" color={C.inkMute} fontFamily={MONO}>
                              {assessment.duration_minutes}m
                            </Text>
                          </HStack>
                        ) : (
                          <Text fontSize="xs" color={C.faint}>—</Text>
                        )}
                      </Table.Cell>

                      {/* Status */}
                      <Table.Cell w="90px" textAlign="center">
                        <VStack gap={0.5}>
                          {assessment.is_published ? (
                            <Badge colorPalette="green" variant="solid" size="xs">
                              {t("common.tables.published")}
                            </Badge>
                          ) : (
                            <Text fontSize="10px" color={C.faint}>
                              {t("common.tables.draft")}
                            </Text>
                          )}
                          {assessment.is_mandatory && (
                            <Badge colorPalette="orange" variant="outline" size="xs">
                              {t("common.tables.mandatory")}
                            </Badge>
                          )}
                        </VStack>
                      </Table.Cell>

                      {/* Actions */}
                      <Table.Cell w="70px" textAlign="center">
                        {isStudent ? (
                          <AssessmentDetails assessment={assessment} />
                        ) : (
                          <AssessmentActionsMenu assessment={assessment} />
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>

            {/* Pagination */}
            <Flex justify="space-between" align="center" px={1}>
              <Text fontSize="xs" color={C.inkMute}>
                {t("common.tables.showing", {
                  first: (search.page - 1) * PER_PAGE + 1,
                  last: Math.min(search.page * PER_PAGE, count),
                  total: count,
                  items: t("common.assessments"),
                })}
              </Text>
              <PaginationRoot
                count={count}
                pageSize={PER_PAGE}
                page={search.page}
                onPageChange={({ page }) => setPage(page)}
              >
                <HStack gap={1}>
                  <PaginationPrevTrigger />
                  <PaginationItems />
                  <PaginationNextTrigger />
                </HStack>
              </PaginationRoot>
            </Flex>
          </VStack>
        )}
      </Container>
    </Box>
  )
}
