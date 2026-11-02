import {
  Badge,
  Box,
  Container,
  EmptyState,
  Flex,
  Heading,
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
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiActivity,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import {
  AcademicYearsService,
  CourseSessionsService,
  ProgramLevelsService,
  TeachersService,
} from "@/client"
import { CourseSessionActionsMenu } from "@/components/Common/CourseSessionActionsMenu"
import AddCourseSessionWithProgramNew from "@/components/course_session/AddCourseSessionWithProgram_NEW"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"

const C = {
  ink: "#1A202C",
  inkMute: "#4A5568",
  faint: "#A0AEC0",
  line: "#E2E8F0",
  paper: "#F7FAFC",
  brand: "#2b6cb0",
  brandDeep: "#2c5282",
}
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

const courseSessionSearchSchema = z.object({
  page: z.number().catch(1),
  course_query: z.string().optional(),
  program_id: z.string().optional(),
  program_level_id: z.string().optional(),
  teacher_id: z.string().optional(),
  session_id: z.string().optional(),
  year_level: z.number().optional(),
  academic_year_id: z.string().optional(),
  status: z.string().optional(),
})

const PER_PAGE = 10

function getCourseSessionsQueryOptions({
  page,
  course_query,
  program_id,
  program_level_id,
  teacher_id,
  session_id,
  year_level,
  academic_year_id,
  status,
}: {
  page: number
  course_query?: string
  program_id?: string
  program_level_id?: string
  teacher_id?: string
  session_id?: string
  year_level?: number
  academic_year_id?: string
  status?: string
}) {
  return {
    queryFn: () =>
      CourseSessionsService.readCourseSessions({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        courseQuery: course_query || undefined,
        programId: program_id || undefined,
        programLevelId: program_level_id || undefined,
        teacherId: teacher_id || undefined,
        sessionId: session_id || undefined,
        yearLevel: year_level || undefined,
        academicYearId: academic_year_id || undefined,
        isActive:
          status === "active" ? true : status === "inactive" ? false : undefined,
      }),
    queryKey: [
      "course_sessions",
      {
        page,
        course_query,
        program_id,
        program_level_id,
        teacher_id,
        session_id,
        year_level,
        academic_year_id,
        status,
      },
    ],
  }
}

export const Route = createFileRoute("/_layout/course_session")({
  component: CourseSessionPage,
  validateSearch: (search) => courseSessionSearchSchema.parse(search),
})

function CourseSessionHeader({
  courseSearch,
  setCourseSearch,
  statusFilter,
  setStatusFilter,
}: {
  courseSearch: string
  setCourseSearch: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()

  const { data: programLevels } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
  })
  const { data: teachers } = useQuery({
    queryKey: ["teachers_all"],
    queryFn: () => TeachersService.readTeachers({ skip: 0, limit: 1000 }),
  })
  const { data: academicYears } = useQuery({
    queryKey: ["academic_years_all"],
    queryFn: () =>
      AcademicYearsService.readAcademicYears({ skip: 0, limit: 1000 }),
  })

  const setFilter = (patch: Record<string, unknown>) =>
    navigate({
      to: "/course_session",
      search: (prev) => ({ ...prev, ...patch, page: 1 }),
    })

  const selectedPL = programLevels?.data?.find(
    (p) => p.id === search.program_level_id,
  )
  const selectedProgramLevelName = search.program_level_id
    ? (selectedPL?.name ?? "Programme")
    : "Tous"
  const maxYear = selectedPL?.typical_duration ?? 7
  const yearLevels = Array.from({ length: maxYear }, (_, i) => i + 1)

  const selectedTeacher = teachers?.data?.find((x) => x.id === search.teacher_id)
  const selectedTeacherName = search.teacher_id
    ? `${selectedTeacher?.user?.first_name ?? ""} ${selectedTeacher?.user?.last_name ?? ""}`.trim() ||
      "Professeur"
    : "Tous"

  const selectedAcademicYearName = search.academic_year_id
    ? (academicYears?.data?.find((y) => y.id === search.academic_year_id)?.name ??
      "Année")
    : "Toutes"

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["course_sessions"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              SESSIONS DE COURS
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Sessions de cours
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("course.session.description")}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label={t("common.tables.refresh")} borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          <AddCourseSessionWithProgramNew />
        </HStack>
      </Flex>

      <Flex bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} boxShadow="0 1px 2px rgba(20,34,30,0.04)" p="10px" gap="10px" align="center" wrap="wrap">
        <Text fontSize="9px" fontWeight="800" letterSpacing="0.8px" textTransform="uppercase" color={C.faint} pl="3px" pr="2px">
          Filtres
        </Text>
        <Box flex="1" minW="8px" />

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("common.tables.search_by_name_or_code")} fontSize="13px" color={C.ink} w="170px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />
        </HStack>

        {/* Année académique */}
        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }} maxW="200px">
              <Icon as={FiCalendar} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Année acad.</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3" truncate>{selectedAcademicYearName}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="220px" maxH="320px" overflowY="auto" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setFilter({ academic_year_id: undefined })}>Toutes les années</MenuItem>
            {academicYears?.data?.map((y) => (
              <MenuItem key={y.id} value={y.id} fontSize="13px" borderRadius="6px" onClick={() => setFilter({ academic_year_id: y.id })}>
                {y.name}
              </MenuItem>
            ))}
          </MenuContent>
        </MenuRoot>

        {/* Programme (program_level) */}
        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }} maxW="230px">
              <Icon as={FiBookOpen} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Programme</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3" truncate>{selectedProgramLevelName}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="280px" maxH="320px" overflowY="auto" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setFilter({ program_level_id: undefined })}>Tous les programmes</MenuItem>
            {programLevels?.data?.map((pl) => (
              <MenuItem key={pl.id} value={pl.id} fontSize="13px" borderRadius="6px" onClick={() => setFilter({ program_level_id: pl.id })}>
                {pl.program?.name ? `${pl.program.name} — ${pl.name}` : pl.name}
              </MenuItem>
            ))}
          </MenuContent>
        </MenuRoot>

        {/* Niveau (year_level) */}
        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiLayers} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Niveau</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{search.year_level ? t("course.session.table.year_short", { year: search.year_level }) : "Tous"}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="140px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setFilter({ year_level: undefined })}>Tous</MenuItem>
            {yearLevels.map((lv) => (
              <MenuItem key={lv} value={String(lv)} fontSize="13px" borderRadius="6px" onClick={() => setFilter({ year_level: lv })}>
                {t("course.session.table.year_short", { year: lv })}
              </MenuItem>
            ))}
          </MenuContent>
        </MenuRoot>

        {/* Professeur */}
        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }} maxW="210px">
              <Icon as={FiUser} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Professeur</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3" truncate>{selectedTeacherName}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="240px" maxH="320px" overflowY="auto" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setFilter({ teacher_id: undefined })}>Tous</MenuItem>
            {teachers?.data?.map((tc) => (
              <MenuItem key={tc.id} value={tc.id} fontSize="13px" borderRadius="6px" onClick={() => setFilter({ teacher_id: tc.id })}>
                {`${tc.user?.first_name ?? ""} ${tc.user?.last_name ?? ""}`.trim() || tc.user?.email || "—"}
              </MenuItem>
            ))}
          </MenuContent>
        </MenuRoot>

        {/* Statut */}
        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiActivity} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Statut</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{statusFilter === "active" ? t("course.session.table.active", { defaultValue: "Actif" }) : statusFilter === "inactive" ? t("course.session.table.inactive", { defaultValue: "Inactif" }) : t("common.tables.all_status", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="140px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter(""); navigate({ to: "/course_session", search: (prev) => ({ ...prev, status: undefined, page: 1 }) }) }}>{t("common.tables.all_status", { defaultValue: "Tous" })}</MenuItem>
            <MenuItem value="active" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter("active"); navigate({ to: "/course_session", search: (prev) => ({ ...prev, status: "active", page: 1 }) }) }}>{t("course.session.table.active", { defaultValue: "Actif" })}</MenuItem>
            <MenuItem value="inactive" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter("inactive"); navigate({ to: "/course_session", search: (prev) => ({ ...prev, status: "inactive", page: 1 }) }) }}>{t("course.session.table.inactive", { defaultValue: "Inactif" })}</MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Box>
  )
}

function CourseSessionTable({ courseSearch }: { courseSearch: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const {
    page,
    program_id,
    program_level_id,
    teacher_id,
    session_id,
    year_level,
    academic_year_id,
    status,
  } = Route.useSearch()
  const course_query = courseSearch

  // Sync debounced search to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/course_session", search: (prev) => ({ ...prev, course_query: courseSearch || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [courseSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getCourseSessionsQueryOptions({
      page,
      course_query,
      program_id,
      program_level_id,
      teacher_id,
      session_id,
      year_level,
      academic_year_id,
      status,
    }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/course_session",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const sessions = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (sessions.length === 0) {
    return (
      <Box
        py={12}
        bg="white"
        borderRadius="6px"
        border="1px solid"
        borderColor={C.line}
      >
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <FiSearch size="48px" />
            </EmptyState.Indicator>
            <VStack textAlign="center" gap={2}>
              <EmptyState.Title
                fontSize="sm"
                color="gray.800"
                fontWeight="bold"
              >
                {t("course.session.empty.title")}
              </EmptyState.Title>
              <EmptyState.Description color="gray.500" fontSize="xs">
                {t("course.session.empty.description")}
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      </Box>
    )
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box
        bg="white"
        borderRadius="6px"
        border="1px solid"
        borderColor={C.line}
        boxShadow="0 1px 3px rgba(20,34,30,0.05)"
        overflowX="auto"
      >
        <Table.Root size="sm" interactive stickyHeader minW="1400px">
          <Table.Header>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.course")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="220px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.program")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.year_level")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.session")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="150px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.teacher")}
              </Table.ColumnHeader>
              {/* <Table.ColumnHeader w="100px" color="black" fontWeight="bold" fontSize="xs" textTransform="uppercase" letterSpacing="wider">{t("course.session.table.classroom")}</Table.ColumnHeader> */}

              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.intra")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.final")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="90px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.participation")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="90px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.status")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.session.table.actions")}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {sessions.map((session, _index) => (
              <Table.Row
                key={session.id}
                opacity={isPlaceholderData ? 0.5 : 1}
                _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                transition="background 0.1s"
              >
                {/* Course Name */}
                <Table.Cell w="180px">
                  <HStack gap={1}>
                    <Icon as={FiBookOpen} boxSize={3} color="gray.400" />
                    <VStack align="start" gap={0}>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color="gray.800"
                        truncate
                        maxW="150px"
                      >
                        {session.course_program_level?.course?.name ||
                          t("common.tables.unknown")}
                      </Text>
                      <Text fontSize="xs" color="gray.500" fontFamily="mono">
                        {session.course_program_level?.course?.code || "N/A"}
                      </Text>
                    </VStack>
                  </HStack>
                </Table.Cell>

                {/* Programme */}
                <Table.Cell w="220px">
                  {(() => {
                    const pl: any = session.course_program_level?.program_level
                    const dur = pl?.typical_duration
                    const durUnit =
                      pl?.duration_type === "month"
                        ? "mois"
                        : dur > 1
                          ? "ans"
                          : "an"
                    return (
                      <VStack align="start" gap="2px" maxW="210px">
                        <Text
                          fontSize="13px"
                          fontWeight="700"
                          color={C.ink}
                          truncate
                          maxW="210px"
                          title={pl?.program?.name}
                        >
                          {pl?.program?.name ||
                            pl?.name ||
                            t("common.tables.unknown")}
                        </Text>
                        <HStack gap="6px">
                          <Text
                            fontSize="11px"
                            color={C.inkMute}
                            truncate
                            maxW="130px"
                          >
                            {pl?.name}
                          </Text>
                          {pl?.code && (
                            <Box
                              px="5px"
                              py="1px"
                              bg={C.paper}
                              border="1px solid"
                              borderColor={C.line}
                              borderRadius="3px"
                            >
                              <Text
                                fontSize="9.5px"
                                fontFamily={MONO}
                                fontWeight="700"
                                color={C.brandDeep}
                              >
                                {pl.code}
                              </Text>
                            </Box>
                          )}
                        </HStack>
                        {dur ? (
                          <HStack gap="4px">
                            <Icon as={FiClock} boxSize={2.5} color={C.faint} />
                            <Text fontSize="10.5px" color={C.faint}>
                              {dur} {durUnit}
                            </Text>
                          </HStack>
                        ) : null}
                      </VStack>
                    )
                  })()}
                </Table.Cell>

                {/* Year Level */}
                <Table.Cell w="80px" textAlign="center">
                  <Badge
                    colorPalette={session.year_level ? "blue" : "gray"}
                    variant="outline"
                    size="xs"
                  >
                    {session.year_level
                      ? t("course.session.table.year_short", {
                        year: session.year_level,
                      })
                      : "-"}
                  </Badge>
                </Table.Cell>

                {/* Session */}
                <Table.Cell w="120px">
                  <HStack gap={1}>
                    <Icon as={FiClock} boxSize={3} color="gray.400" />
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="gray.700"
                      truncate
                      maxW="100px"
                    >
                      {session.session?.description ||
                        t("common.tables.unknown")}
                    </Text>
                  </HStack>
                </Table.Cell>

                {/* Teacher */}
                <Table.Cell w="150px">
                  <HStack gap={1}>
                    <Icon as={FiUser} boxSize={3} color="gray.400" />
                    <VStack align="start" gap={0}>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="gray.700"
                        truncate
                        maxW="130px"
                      >
                        {session.teacher?.user?.first_name &&
                          session.teacher?.user?.last_name
                          ? `${session.teacher.user.first_name} ${session.teacher.user.last_name}`
                          : t("common.tables.unknown")}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {session.teacher?.user.user_number ||
                          t("common.tables.not_available")}
                      </Text>
                    </VStack>
                  </HStack>
                </Table.Cell>

                {/* Classroom */}
                {/* <Table.Cell w="100px">
                  <HStack gap={1}>
                    <Icon as={FiMapPin} boxSize={3} color="gray.400" />
                    <Text fontSize="xs" color="gray.700" truncate>
                      {session.classroom || "-"}
                    </Text>
                  </HStack>
                </Table.Cell> */}

                {/* Assessments */}
                <Table.Cell w="80px" textAlign="center">
                  <Text fontSize="sm" fontWeight="600" color="purple.600">
                    {session.intra_percentage ?? 0}%
                  </Text>
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <Text fontSize="sm" fontWeight="600" color="red.600">
                    {session.final_percentage ?? 0}%
                  </Text>
                </Table.Cell>

                <Table.Cell w="90px" textAlign="center">
                  <Text fontSize="sm" fontWeight="600" color="blue.600">
                    {session.participation_percentage ?? 0}%
                  </Text>
                </Table.Cell>

                {/* Status */}
                <Table.Cell w="90px" textAlign="center">
                  {session.is_active ? (
                    <Badge colorPalette="green" variant="surface" size="xs">
                      {t("course.session.table.active")}
                    </Badge>
                  ) : (
                    <Badge colorPalette="red" variant="surface" size="xs">
                      {t("course.session.table.inactive")}
                    </Badge>
                  )}
                </Table.Cell>

                {/* Actions */}
                <Table.Cell w="80px" textAlign="center">
                  <CourseSessionActionsMenu courseSession={session} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Pagination - Always visible */}
      <Flex justify="space-between" align="center" mt={2} px={2}>
        <Text fontSize="xs" color="gray.500">
          {t("common.tables.showing", {
            first: (page - 1) * PER_PAGE + 1,
            last: Math.min(page * PER_PAGE, count),
            total: count,
            items: t("common.course_sessions").toLowerCase(),
          })}
        </Text>

        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          page={page}
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
  )
}

function CourseSessionPage() {
  const search = Route.useSearch()
  const [courseSearch, setCourseSearch] = useState(search.course_query || "")
  const [statusFilter, setStatusFilter] = useState(search.status || "")

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <CourseSessionHeader
          courseSearch={courseSearch}
          setCourseSearch={setCourseSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        <CourseSessionTable courseSearch={courseSearch} />
      </Container>
    </Box>
  )
}
