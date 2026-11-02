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
  FiRefreshCw,
  FiSearch,
  FiUsers,
} from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import { AttendanceSessionsService, TeachersService } from "@/client"
import AddAttendanceSession from "@/components/attendance_session/AddAttendanceSession"
import { AttendanceSessionActionsMenu } from "@/components/Common/AttendanceSessionActionMenu"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"

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

const attendanceSessionSearchSchema = z.object({
  page: z.number().catch(1),
  course_query: z.string().optional(),
  session_date: z.string().optional(),
  status: z.string().optional(),
})

const PER_PAGE = 10

function getAttendanceSessionsQueryOptions({
  page,
  teacherId,
  course_query,
  session_date,
  status,
}: {
  page: number
  teacherId?: string
  course_query?: string
  session_date?: string
  status?: string
}) {
  return {
    queryFn: async () => {
      // For admins, the backend handles filtering
      if (!teacherId) {
        return AttendanceSessionsService.readAttendanceSessions({
          skip: (page - 1) * PER_PAGE,
          limit: PER_PAGE,
          courseQuery: course_query || undefined,
          sessionDate: session_date || undefined,
          status: status || undefined,
        })
      }

      // For teachers, we load all and filter client-side (as the backend count doesn't support teacher filters on get_all yet)
      const allSessions =
        await AttendanceSessionsService.readAttendanceSessions({
          skip: 0,
          limit: 1000,
          courseQuery: course_query || undefined,
          sessionDate: session_date || undefined,
          status: status || undefined,
        })

      // For teachers, filter by teacher_id from course_session
      let teacherSessions = allSessions.data.filter(
        (session: any) =>
          session.schedule?.course_session?.teacher_id === teacherId,
      )

      const paginated = teacherSessions.slice(
        (page - 1) * PER_PAGE,
        page * PER_PAGE,
      )
      return {
        data: paginated,
        count: teacherSessions.length,
      }
    },
    queryKey: [
      "attendance_sessions",
      { page, teacherId, course_query, session_date, status },
    ],
  }
}

export const Route = createFileRoute("/_layout/attendance_session")({
  component: AttendanceSessionPage,
  validateSearch: (search) => attendanceSessionSearchSchema.parse(search),
})

function AttendanceSessionHeader({
  courseSearch,
  setCourseSearch,
  sessionDateFilter,
  setSessionDateFilter,
  statusFilter,
  setStatusFilter,
}: {
  courseSearch: string
  setCourseSearch: (v: string) => void
  sessionDateFilter: string
  setSessionDateFilter: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })


  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance_sessions"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              SÉANCES DE PRÉSENCE
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Présences
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("attendance.session.description", {
                defaultValue: "Gérer et suivre les séances de présence",
              })}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label={t("common.tables.refresh")} borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          <AddAttendanceSession />
        </HStack>
      </Flex>

      <Flex bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} boxShadow="0 1px 2px rgba(20,34,30,0.04)" p="10px" gap="10px" align="center" wrap="wrap">
        <Text fontSize="9px" fontWeight="800" letterSpacing="0.8px" textTransform="uppercase" color={C.faint} pl="3px" pr="2px">
          Filtres
        </Text>
        <Box flex="1" minW="8px" />

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("attendance.session.table.course")} fontSize="13px" color={C.ink} w="150px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} />
        </HStack>

        <HStack gap="8px" px="11px" py="6px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiCalendar} color={C.brand} boxSize={3.5} flexShrink={0} />
          <Box minW={0}>
            <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Date</Text>
            <Input border="none" bg="transparent" p={0} h="auto" type="date" fontSize="13px" fontFamily={MONO} color={C.ink} w="130px" outline="none" _focus={{ outline: "none", boxShadow: "none" }} value={sessionDateFilter} onChange={(e) => { setSessionDateFilter(e.target.value); navigate({ to: "/attendance_session", search: (prev) => ({ ...prev, session_date: e.target.value || undefined, page: 1 }) }) }} />
          </Box>
        </HStack>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiActivity} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Statut</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{statusFilter === "active" ? t("attendance.session.table.active_badge", { defaultValue: "Active" }) : statusFilter === "cancelled" ? t("attendance.session.table.cancelled_badge", { defaultValue: "Annulée" }) : t("common.tables.all_status", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="140px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter(""); navigate({ to: "/attendance_session", search: (prev) => ({ ...prev, status: undefined, page: 1 }) }) }}>{t("common.tables.all_status", { defaultValue: "Tous" })}</MenuItem>
            <MenuItem value="active" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter("active"); navigate({ to: "/attendance_session", search: (prev) => ({ ...prev, status: "active", page: 1 }) }) }}>{t("attendance.session.table.active_badge", { defaultValue: "Active" })}</MenuItem>
            <MenuItem value="cancelled" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter("cancelled"); navigate({ to: "/attendance_session", search: (prev) => ({ ...prev, status: "cancelled", page: 1 }) }) }}>{t("attendance.session.table.cancelled_badge", { defaultValue: "Annulée" })}</MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Box>
  )
}

function AttendanceSessionTable({ courseSearch }: { courseSearch: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const {
    page,
    session_date,
    status,
  } = Route.useSearch()
  const course_query = courseSearch

  // Sync debounced courseSearch to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({
        to: "/attendance_session",
        search: (prev) => ({ ...prev, course_query: courseSearch || undefined, page: 1 }),
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [courseSearch]) // eslint-disable-line react-hooks/exhaustive-deps
  const { user } = useAuth()
  const { data: rolesData } = useUserRoles(user?.id)

  const isTeacher = rolesData?.some((r) => r.code === "TEACHER")

  // Get teacher data if user is a teacher
  const { data: teacherData } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: user!.id }),
    enabled: !!user?.id && isTeacher,
  })

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getAttendanceSessionsQueryOptions({
      page,
      teacherId: isTeacher ? teacherData?.id : undefined,
      course_query,
      session_date,
      status,
    }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/attendance_session",
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
                {t("attendance.session.empty.title")}
              </EmptyState.Title>
              <EmptyState.Description color="gray.500" fontSize="xs">
                {t("attendance.session.empty.description")}
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
        <Table.Root size="sm" interactive stickyHeader minW="1200px">
          <Table.Header>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.course")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.date")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="110px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.time")}
              </Table.ColumnHeader>
              {/* <Table.ColumnHeader w="150px" color="black" fontWeight="bold" fontSize="xs" textTransform="uppercase" letterSpacing="wider">{t("attendance.session.table.location")}</Table.ColumnHeader> */}
              <Table.ColumnHeader
                w="120px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.topic")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.students")}
              </Table.ColumnHeader>
              {/* <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="#4b6a92"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.attendance")}
              </Table.ColumnHeader> */}
              <Table.ColumnHeader
                w="90px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.status")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("attendance.session.table.actions")}
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
                <Table.Cell w="180px">
                  <HStack gap={2}>
                    <Icon as={FiBookOpen} color="gray.400" size="xs" />
                    <Text
                      fontSize="xs"
                      color="#1a3a5c"
                      fontWeight="600"
                      truncate
                      title={
                        (session as any).schedule?.course_session
                          ?.course_program_level?.course?.name
                      }
                    >
                      {(session as any).schedule?.course_session
                        ?.course_program_level?.course?.name ||
                        t("common.tables.unknown")}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="100px">
                  <HStack gap={1}>
                    <Icon as={FiCalendar} size="xs" color="gray.400" />
                    <Text fontSize="xs" color="gray.600">
                      {new Date(session.session_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="110px" textAlign="center">
                  <VStack align="center" gap={0}>
                    <HStack gap={1}>
                      <Icon as={FiClock} size="xs" color="gray.400" />
                      <Text
                        fontSize="xs"
                        color="gray.700"
                        fontFamily="mono"
                        fontWeight="500"
                      >
                        {session.start_time.slice(0, 5)} -{" "}
                        {session.end_time.slice(0, 5)}
                      </Text>
                    </HStack>
                  </VStack>
                </Table.Cell>

                {/* <Table.Cell w="150px">
                  <VStack align="start" gap={0}>
                    <HStack gap={1}>
                      <Icon as={FiMapPin} size="xs" color="gray.400" />
                      <Text
                        fontSize="xs"
                        color="gray.700"
                        truncate
                        maxW="120px"
                      >
                        {session.actual_room ||
                          t("attendance.session.table.no_room")}
                      </Text>
                    </HStack>
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      truncate
                      maxW="120px"
                      pl={4}
                    >
                      {session.actual_building ||
                        t("attendance.session.table.no_building")}
                    </Text>
                  </VStack>
                </Table.Cell> */}

                <Table.Cell w="120px">
                  <Text
                    fontSize="xs"
                    color="#1a3a5c"
                    truncate
                    maxW="120px"
                    title={session.topic || undefined}
                  >
                    {session.topic || "n/a"}
                  </Text>
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  <VStack gap={0.5}>
                    <HStack gap={1} justify="center">
                      <Icon as={FiUsers} size="xs" color="gray.400" />
                      <Text
                        fontSize="xs"
                        color="gray.700"
                        fontFamily="mono"
                        fontWeight="bold"
                      >
                        {session.total_students || 0}
                      </Text>
                    </HStack>
                    <HStack gap={1} justify="center" fontSize="2xs">
                      <Text color="green.600" fontWeight="bold">
                        {session.present_students || 0}
                      </Text>
                      <Text color="gray.300">/</Text>
                      <Text color="red.600" fontWeight="bold">
                        {session.absent_students || 0}
                      </Text>
                      <Text color="gray.300">/</Text>
                      <Text color="orange.600" fontWeight="bold">
                        {session.late_students || 0}
                      </Text>
                    </HStack>
                  </VStack>
                </Table.Cell>

                {/* <Table.Cell w="100px" textAlign="center">
                  {session.attendance_taken ? (
                    <Badge colorPalette="green" variant="surface" size="xs">
                      {t("attendance.session.table.taken_badge")}
                    </Badge>
                  ) : (
                    <Badge colorPalette="gray" variant="outline" size="xs">
                      {t("attendance.session.table.pending_badge")}
                    </Badge>
                  )}
                </Table.Cell> */}

                <Table.Cell w="110px" textAlign="center">
                  {(() => {
                    const st = (session as any).status
                    if (session.is_cancelled || st === "cancelled")
                      return (
                        <Badge colorPalette="red" variant="solid" size="xs">
                          Annulée
                        </Badge>
                      )
                    if (st === "completed")
                      return (
                        <Badge colorPalette="green" variant="solid" size="xs">
                          Terminée
                        </Badge>
                      )
                    if (st === "in_progress")
                      return (
                        <Badge colorPalette="blue" variant="surface" size="xs">
                          En cours
                        </Badge>
                      )
                    return (
                      <Badge colorPalette="gray" variant="outline" size="xs">
                        Créée
                      </Badge>
                    )
                  })()}
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <AttendanceSessionActionsMenu attendanceSession={session} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Pagination - Always visible */}
      <Flex justify="space-between" align="center" mt={2} px={1}>
        <Text fontSize="xs" color="gray.500">
          {t("common.tables.showing", {
            first: (page - 1) * PER_PAGE + 1,
            last: Math.min(page * PER_PAGE, count),
            total: count,
            items: t("common.attendance_sessions"),
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

function AttendanceSessionPage() {
  const search = Route.useSearch()
  const [courseSearch, setCourseSearch] = useState(search.course_query || "")
  const [sessionDateFilter, setSessionDateFilter] = useState(search.session_date || "")
  const [statusFilter, setStatusFilter] = useState(search.status || "")

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <AttendanceSessionHeader
          courseSearch={courseSearch}
          setCourseSearch={setCourseSearch}
          sessionDateFilter={sessionDateFilter}
          setSessionDateFilter={setSessionDateFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        <AttendanceSessionTable courseSearch={courseSearch} />
      </Container>
    </Box>
  )
}
