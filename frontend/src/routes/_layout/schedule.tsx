import {
  Badge,
  Box,
  Container,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { type ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiActivity,
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiHome,
  FiLayers,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiSun,
  FiUser,
} from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import {
  type SchedulePublicWithDetails,
  AcademicYearsService,
  AttendanceSessionsService,
  ProgramLevelsService,
  SchedulesService,
  StudentsService,
  TeacherAnalyticsService,
  TeachersService,
} from "@/client"
import { ScheduleActionsMenu } from "@/components/Common/ScheduleActionsMenu"
import AddSchedule from "@/components/schedule/AddSchedule"
import ScheduleAttendanceQR from "@/components/attendance_session/ScheduleAttendanceQR"
import useAuth from "@/hooks/useAuth"

const scheduleSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/schedule")({
  component: SchedulePage,
  validateSearch: (search) => scheduleSearchSchema.parse(search),
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
  // time pills keep the page's original green-start / red-end accents
  startText: "#15803d",
  startBg: "#f0fdf4",
  startBorder: "#bbf7d0",
  endText: "#be123c",
  endBg: "#fff1f2",
  endBorder: "#fecdd3",
}
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

// Teaching-day window used by the in-day track (signature element)
const DAY_START_MIN = 7 * 60
const DAY_END_MIN = 21 * 60

// ─── In-day track — signature ───────────────────────────────────────────────
//  A thin rail spanning the teaching day (07h–21h) with a filled segment for
//  this session's slot. Encodes *when* in the day the class sits and how long,
//  comparable row-to-row. Exact times stay in the mono pills above it.
function InDayTrack({ start, end }: { start: string; end: string }) {
  const toMin = (t: string) => {
    const p = t.split(":")
    return Number(p[0]) * 60 + Number(p[1] || 0)
  }
  const s = toMin(start)
  const e = toMin(end)
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null

  const span = DAY_END_MIN - DAY_START_MIN
  const clamp = (x: number) => Math.max(0, Math.min(1, x))
  const left = clamp((s - DAY_START_MIN) / span) * 100
  const width = Math.max(3, clamp((e - s) / span) * 100)

  return (
    <Box
      position="relative"
      h="4px"
      w="100%"
      maxW="180px"
      mx="auto"
      mt="7px"
      bg={C.line}
      borderRadius="2px"
      title={`${start}–${end}`}
    >
      <Box
        position="absolute"
        top={0}
        left={`${left}%`}
        w={`${width}%`}
        h="100%"
        bg={C.brand}
        borderRadius="2px"
        transition="left 0.3s ease, width 0.3s ease"
      />
    </Box>
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

function SchedulePage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  const [yearLevel, setYearLevel] = useState("")
  const [sessionNumber, setSessionNumber] = useState("")
  const [courseSearch, setCourseSearch] = useState("")
  const [programLevelId, setProgramLevelId] = useState<string | undefined>()
  const [teacherId, setTeacherId] = useState<string | undefined>()
  const [academicYearId, setAcademicYearId] = useState<string | undefined>()
  const [dayOfWeek, setDayOfWeek] = useState<string>("")
  const [maxYearLevel, setMaxYearLevel] = useState(6)
  const [shouldFetch, setShouldFetch] = useState(false)

  const isSuperAdmin = currentUser?.is_superuser

  const { data: studentData } = useQuery({
    queryKey: ["student_by_user", currentUser?.id],
    queryFn: () => StudentsService.readStudentByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && !isSuperAdmin,
  })

  const { data: teacherData } = useQuery({
    queryKey: ["teacher_by_user", currentUser?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && !isSuperAdmin,
  })

  const isTeacher = !isSuperAdmin && !!teacherData?.id
  const isStudent = !isSuperAdmin && !!studentData?.program_level?.id

  // Academic years (list + current for the default filter)
  const { data: academicYears } = useQuery({
    queryKey: ["academic_years_all"],
    queryFn: () =>
      AcademicYearsService.readAcademicYears({ skip: 0, limit: 1000 }),
  })

  // Program levels for the filter — admin: all, teacher: assigned
  const { data: allProgramLevels } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
    enabled: !!isSuperAdmin,
  })
  const { data: assignedLevels } = useQuery({
    queryKey: ["assigned_program_levels", teacherData?.id],
    queryFn: () =>
      TeacherAnalyticsService.getAssignedProgramLevels({
        teacherId: teacherData!.id,
      }),
    enabled: isTeacher && !!teacherData?.id,
  })

  // Teachers list — admin only
  const { data: teachersList } = useQuery({
    queryKey: ["teachers_all"],
    queryFn: () => TeachersService.readTeachers({ skip: 0, limit: 1000 }),
    enabled: !!isSuperAdmin,
  })

  // Today's attendance sessions → schedules whose attendance is already
  // completed today (used to hide the "Présence" button for them).
  const todayStr = new Date().toISOString().split("T")[0]
  const { data: todaySessions } = useQuery({
    queryKey: ["attendance_sessions_today", todayStr],
    queryFn: () =>
      AttendanceSessionsService.readAttendanceSessions({
        sessionDate: todayStr,
        limit: 1000,
      }),
    enabled: !!isSuperAdmin || isTeacher,
  })
  // schedule_id → completed session id today (for the admin "Reprendre" flow)
  const completedTodayBySchedule = new Map<string, string>(
    (todaySessions?.data ?? [])
      .filter((se: any) => se.status === "completed")
      .map((se: any) => [se.schedule_id, se.id] as [string, string]),
  )

  // Default to the current academic year once loaded
  useEffect(() => {
    if (academicYearId) return
    const current = academicYears?.data?.find((y: any) => y.is_current)
    if (current) setAcademicYearId(current.id)
  }, [academicYears, academicYearId])

  useEffect(() => {
    if (!studentData) return
    if (studentData.program_level?.id) {
      setProgramLevelId(studentData.program_level.id)
      setMaxYearLevel(studentData.program_level.typical_duration || 6)
    }
    if (studentData.current_year_level)
      setYearLevel(studentData.current_year_level.toString())
    setShouldFetch(true)
  }, [studentData])

  useEffect(() => {
    if (!teacherData?.id) return
    setTeacherId(teacherData.id)
    setShouldFetch(true)
  }, [teacherData])

  useEffect(() => {
    if (isSuperAdmin && !shouldFetch) setShouldFetch(true)
  }, [isSuperAdmin, shouldFetch])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["schedules-search", programLevelId, sessionNumber, yearLevel, teacherId, academicYearId, dayOfWeek],
    queryFn: () =>
      SchedulesService.searchSchedules({
        programLevelId: programLevelId || undefined,
        sessionNumber: sessionNumber ? parseInt(sessionNumber, 10) : undefined,
        yearLevel: yearLevel ? parseInt(yearLevel, 10) : undefined,
        teacherId: teacherId || undefined,
        academicYearId: academicYearId || undefined,
        dayOfWeek: dayOfWeek !== "" ? parseInt(dayOfWeek, 10) : undefined,
        skip: 0,
        limit: 1000,
      }),
    enabled: shouldFetch,
    retry: false,
  })

  const schedules = data?.data ?? []
  const yearLevels = Array.from({ length: maxYearLevel }, (_, i) => i + 1)

  const DAY_NAMES = [
    t("schedule.days.sunday"),
    t("schedule.days.monday"),
    t("schedule.days.tuesday"),
    t("schedule.days.wednesday"),
    t("schedule.days.thursday"),
    t("schedule.days.friday"),
    t("schedule.days.saturday"),
  ]

  const getWeekdayName = (d: number) => DAY_NAMES[d] || t("common.unknown")

  const formatTime = (str: string) => {
    const parts = str.split(":")
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : str
  }

  const calcDuration = (start: string, end: string) => {
    try {
      const s = new Date(`1970-01-01T${start}`)
      const e = new Date(`1970-01-01T${end}`)
      const m = Math.floor((e.getTime() - s.getTime()) / 60000)
      const h = Math.floor(m / 60),
        min = m % 60
      return h > 0 ? `${h}h${min > 0 ? `${min}m` : ""}` : `${min}m`
    } catch {
      return "—"
    }
  }

  // Client-side text filter on course name or code
  const courseQuery = courseSearch.trim().toLowerCase()
  const searchedSchedules = courseQuery
    ? schedules.filter((s: SchedulePublicWithDetails) => {
        const course = s.course_session?.course_program_level?.course
        const name = (course?.name || "").toLowerCase()
        const code = (course?.code || "").toLowerCase()
        return name.includes(courseQuery) || code.includes(courseQuery)
      })
    : schedules

  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
  const sortedSchedules = searchedSchedules.slice().sort((a, b) => {
    const dayDiff =
      DAY_ORDER.indexOf(a.day_of_week ?? 0) - DAY_ORDER.indexOf(b.day_of_week ?? 0)
    return dayDiff !== 0 ? dayDiff : a.start_time.localeCompare(b.start_time)
  })

  const runSearch = () => {
    setShouldFetch(true)
    refetch()
  }

  const count = sortedSchedules.length

  const yearLabel = (lvl: string | number) =>
    t("course.session.table.year_short", { year: lvl })

  // ── Filter options / labels ───────────────────────────────────────────────
  const programLevelOptions: { id: string; name: string }[] = isSuperAdmin
    ? (allProgramLevels?.data ?? []).map((pl) => ({
        id: pl.id,
        name: pl.program?.name ? `${pl.program.name} — ${pl.name}` : pl.name,
      }))
    : (assignedLevels ?? []).map((pl: any) => ({
        id: String(pl.id),
        name: pl.code ? `${pl.name} (${pl.code})` : pl.name,
      }))
  const selectedProgramName = programLevelId
    ? (programLevelOptions.find((p) => p.id === programLevelId)?.name ??
      "Programme")
    : "Tous"

  const teacherOptions = (teachersList?.data ?? []).map((tc: any) => ({
    id: tc.id,
    name:
      `${tc.user?.first_name ?? ""} ${tc.user?.last_name ?? ""}`.trim() ||
      tc.user?.email ||
      "—",
  }))
  const selectedTeacherName = teacherId
    ? (teacherOptions.find((x) => x.id === teacherId)?.name ?? "Professeur")
    : "Tous"

  const selectedAcademicYearName = academicYearId
    ? (academicYears?.data?.find((y) => y.id === academicYearId)?.name ??
      "Année")
    : "Toutes"

  const dayOptions = DAY_ORDER.map((d) => ({ value: d, name: DAY_NAMES[d] }))
  const selectedDayName =
    dayOfWeek !== "" ? getWeekdayName(parseInt(dayOfWeek, 10)) : "Tous"

  return (
    <Box minH="100vh" bg={C.paper} py={{ base: 5, md: 8 }}>
      <Container maxW="full">
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
                HORAIRE & PRÉSENCES
              </Text>
              <Text
                fontSize={{ base: "22px", md: "26px" }}
                fontWeight="800"
                color={C.ink}
                letterSpacing="-0.6px"
                lineHeight="1.05"
              >
                {isSuperAdmin
                  ? "Horaire & présences"
                  : isTeacher
                    ? "Horaire & présences"
                    : "Mon emploi du temps"}
              </Text>
              <Text color={C.inkMute} fontSize="13.5px" mt="6px">
                {data
                  ? count === 0
                    ? "Aucune séance pour ces filtres."
                    : `${count} séance${count !== 1 ? "s" : ""} · réparties sur la semaine.`
                  : t("schedule.description")}
              </Text>
            </Box>
          </Flex>

          <HStack gap={2}>
            <IconButton
              variant="outline"
              size="sm"
              onClick={runSearch}
              loading={isLoading}
              aria-label={t("common.tables.refresh")}
              borderColor={C.line}
              color={C.inkMute}
              borderRadius="4px"
              _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}
            >
              <FiRefreshCw />
            </IconButton>
            {isSuperAdmin && <AddSchedule />}
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

          {/* Recherche par nom ou code de cours */}
          <Flex
            align="center"
            gap="6px"
            bg="white"
            border="1px solid"
            borderColor={C.line}
            borderRadius="6px"
            px="8px"
            h="30px"
            minW="200px"
            _focusWithin={{ borderColor: C.brand }}
          >
            <Icon as={FiSearch} color={C.faint} fontSize="13px" flexShrink={0} />
            <Input
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder="Cours ou code…"
              variant="outline"
              border="none"
              outline="none"
              _focusVisible={{ boxShadow: "none" }}
              px={0}
              h="28px"
              fontSize="13px"
            />
            {courseSearch && (
              <Box
                as="button"
                onClick={() => setCourseSearch("")}
                color={C.faint}
                fontSize="14px"
                lineHeight="1"
                px="2px"
                aria-label="Effacer la recherche"
              >
                ×
              </Box>
            )}
          </Flex>

          <Box flex="1" minW="8px" />

          {/* Année académique (admin uniquement) */}
          {isSuperAdmin && (
            <FilterControl icon={FiCalendar} label="Année acad." value={selectedAcademicYearName}>
              <MenuContent minW="220px" maxH="320px" overflowY="auto" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
                <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setAcademicYearId(undefined)}>
                  Toutes les années
                </MenuItem>
                {(academicYears?.data ?? []).map((y) => (
                  <MenuItem key={y.id} value={y.id} fontSize="13px" borderRadius="6px" onClick={() => setAcademicYearId(y.id)}>
                    {y.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </FilterControl>
          )}

          {/* Programme (admin + prof) */}
          {!isStudent && (
            <FilterControl icon={FiBookOpen} label="Programme" value={selectedProgramName}>
              <MenuContent minW="280px" maxH="320px" overflowY="auto" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
                <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setProgramLevelId(undefined)}>
                  Tous les programmes
                </MenuItem>
                {programLevelOptions.map((pl) => (
                  <MenuItem key={pl.id} value={pl.id} fontSize="13px" borderRadius="6px" onClick={() => setProgramLevelId(pl.id)}>
                    {pl.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </FilterControl>
          )}

          {/* Année (niveau) */}
          <FilterControl
            icon={FiLayers}
            label="Niveau"
            value={yearLevel ? yearLabel(yearLevel) : t("schedule.fields.all_sessions")}
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
                {t("common.forms.select")}
              </MenuItem>
              {yearLevels.map((lv) => (
                <MenuItem
                  key={lv}
                  value={String(lv)}
                  fontSize="13px"
                  borderRadius="6px"
                  onClick={() => setYearLevel(String(lv))}
                >
                  {yearLabel(lv)}
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
                ? t("schedule.fields.session_1")
                : sessionNumber === "2"
                  ? t("schedule.fields.session_2")
                  : t("schedule.fields.all_sessions")
            }
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
                onClick={() => setSessionNumber("")}
              >
                {t("schedule.fields.all_sessions")}
              </MenuItem>
              <MenuItem
                value="1"
                fontSize="13px"
                borderRadius="6px"
                onClick={() => setSessionNumber("1")}
              >
                {t("schedule.fields.session_1")}
              </MenuItem>
              <MenuItem
                value="2"
                fontSize="13px"
                borderRadius="6px"
                onClick={() => setSessionNumber("2")}
              >
                {t("schedule.fields.session_2")}
              </MenuItem>
            </MenuContent>
          </FilterControl>

          {/* Professeur — admin uniquement */}
          {isSuperAdmin && (
            <FilterControl icon={FiUser} label="Professeur" value={selectedTeacherName}>
              <MenuContent minW="240px" maxH="320px" overflowY="auto" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
                <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setTeacherId(undefined)}>
                  Tous
                </MenuItem>
                {teacherOptions.map((tc) => (
                  <MenuItem key={tc.id} value={tc.id} fontSize="13px" borderRadius="6px" onClick={() => setTeacherId(tc.id)}>
                    {tc.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </FilterControl>
          )}

          {/* Jour */}
          <FilterControl icon={FiSun} label="Jour" value={selectedDayName}>
            <MenuContent minW="170px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
              <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => setDayOfWeek("")}>
                Tous
              </MenuItem>
              {dayOptions.map((d) => (
                <MenuItem key={d.value} value={String(d.value)} fontSize="13px" borderRadius="6px" onClick={() => setDayOfWeek(String(d.value))}>
                  {d.name}
                </MenuItem>
              ))}
            </MenuContent>
          </FilterControl>

          <HStack
            as="button"
            onClick={runSearch}
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
            <Text>Afficher</Text>
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
                {t("common.error")}
              </Text>
              <Text fontSize="12px" color="#C0392B">
                {(error as any).message}
              </Text>
            </Box>
          </Flex>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isLoading && (
          <Flex justify="center" align="center" py={16} gap={3}>
            <Spinner size="sm" color={C.brand} />
            <Text color={C.inkMute} fontSize="13px">
              {t("common.loading")}…
            </Text>
          </Flex>
        )}

        {/* ── Empty ───────────────────────────────────────────────────── */}
        {!isLoading && shouldFetch && count === 0 && (
          <Flex
            direction="column"
            align="center"
            py={16}
            gap={3}
            bg="white"
            borderRadius="6px"
            border="1px solid"
            borderColor={C.line}
          >
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
              <Icon as={FiCalendar} fontSize="20px" color={C.faint} />
            </Flex>
            <Box textAlign="center">
              <Text fontWeight="700" fontSize="14px" color={C.ink} mb="3px">
                {t("common.tables.no_results")}
              </Text>
              <Text fontSize="12.5px" color={C.faint}>
                {t("schedule.no_results_description")}
              </Text>
            </Box>
          </Flex>
        )}

        {/* ── Table ───────────────────────────────────────────────────── */}
        {!isLoading && shouldFetch && count > 0 && (
          <Box
            bg="white"
            borderRadius="6px"
            border="1px solid"
            borderColor={C.line}
            boxShadow="0 1px 3px rgba(20,34,30,0.05)"
            overflow="hidden"
          >
            <Box overflowX="auto">
              <Table.Root size="sm" stickyHeader minW="860px">
                <Table.Header>
                  <Table.Row background={C.headerGrad}>
                    {[
                      { label: "Cours", w: "auto" },
                      { label: "Programme", w: "180px" },
                      { label: "Professeur", w: "160px" },
                      { label: "Jour", w: "110px" },
                      { label: "Horaire", w: "210px" },
                      { label: "Durée", w: "80px" },
                      { label: "Salle", w: "130px" },
                      ...(isSuperAdmin || isTeacher
                        ? [{ label: "Présence", w: "120px" }]
                        : []),
                      ...(isSuperAdmin ? [{ label: "", w: "50px" }] : []),
                    ].map(({ label, w }) => (
                      <Table.ColumnHeader
                        key={label || "actions"}
                        w={w}
                        fontSize="10px"
                        fontWeight="700"
                        color="white"
                        textTransform="uppercase"
                        letterSpacing="0.6px"
                        py={3}
                        borderBottom="1px solid"
                        borderColor="whiteAlpha.300"
                        pl={label === "Cours" ? 5 : undefined}
                        textAlign={
                          label === "Horaire" || label === "Durée"
                            ? "center"
                            : label === ""
                              ? "right"
                              : "left"
                        }
                      >
                        {label}
                      </Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {sortedSchedules.map((s: SchedulePublicWithDetails) => {
                    const courseName =
                      s.course_session?.course_program_level?.course?.name || "—"
                    const courseCode =
                      s.course_session?.course_program_level?.course?.code || "—"
                    const teacher = s.course_session?.teacher?.user
                      ? `${s.course_session.teacher.user.first_name} ${s.course_session.teacher.user.last_name}`
                      : "—"

                    return (
                      <Table.Row
                        key={s.id}
                        _odd={{ bg: "#f7f9fc" }}
                        _even={{ bg: "white" }}
                        _hover={{ bg: "#edf2f7" }}
                        transition="background 0.1s"
                        borderBottom="1px solid"
                        borderColor={C.line}
                      >
                        {/* Cours */}
                        <Table.Cell py="11px" pl={5}>
                          <VStack align="start" gap="3px">
                            <Text
                              fontSize="13px"
                              fontWeight="700"
                              color={C.ink}
                              lineClamp={1}
                            >
                              {courseName}
                            </Text>
                            <Box
                              display="inline-block"
                              px="6px"
                              py="1px"
                              bg={C.paper}
                              borderRadius="3px"
                              border="1px solid"
                              borderColor={C.line}
                            >
                              <Text
                                fontSize="10px"
                                fontFamily={MONO}
                                fontWeight="700"
                                color={C.brandDeep}
                                letterSpacing="0.3px"
                              >
                                {courseCode}
                              </Text>
                            </Box>
                          </VStack>
                        </Table.Cell>

                        {/* Programme */}
                        <Table.Cell py="11px">
                          {(() => {
                            const pl: any =
                              s.course_session?.course_program_level
                                ?.program_level
                            return pl ? (
                              <VStack align="start" gap="1px" maxW="170px">
                                <Text
                                  fontSize="12.5px"
                                  fontWeight="600"
                                  color={C.ink}
                                  lineClamp={1}
                                  title={pl.program?.name}
                                >
                                  {pl.program?.name || pl.name || "—"}
                                </Text>
                                <Text
                                  fontSize="10.5px"
                                  color={C.faint}
                                  lineClamp={1}
                                >
                                  {pl.name}
                                  {pl.code ? ` · ${pl.code}` : ""}
                                </Text>
                              </VStack>
                            ) : (
                              <Text fontSize="12px" color={C.faint}>
                                —
                              </Text>
                            )
                          })()}
                        </Table.Cell>

                        {/* Professeur */}
                        <Table.Cell py="11px">
                          <HStack gap={2}>
                            <Flex
                              w="26px"
                              h="26px"
                              borderRadius="3px"
                              bg="#EDF2F7"
                              border="1px solid"
                              borderColor={C.line}
                              align="center"
                              justify="center"
                              flexShrink={0}
                            >
                              <Icon
                                as={FiUser}
                                color={C.brandDeep}
                                fontSize="12px"
                              />
                            </Flex>
                            <Text
                              fontSize="12.5px"
                              fontWeight="600"
                              color={C.inkMute}
                              lineClamp={1}
                            >
                              {teacher}
                            </Text>
                          </HStack>
                        </Table.Cell>

                        {/* Jour */}
                        <Table.Cell py="11px">
                          <Text fontSize="12.5px" fontWeight="600" color={C.ink}>
                            {getWeekdayName(s.day_of_week ?? 0)}
                          </Text>
                        </Table.Cell>

                        {/* Horaire + in-day track (signature) */}
                        <Table.Cell py="11px" textAlign="center">
                          <HStack gap={1} justify="center">
                            <Box
                              display="inline-flex"
                              alignItems="center"
                              gap="4px"
                              px="8px"
                              py="3px"
                              bg={C.startBg}
                              borderRadius="3px"
                              border={`1px solid ${C.startBorder}`}
                            >
                              <Icon
                                as={FiClock}
                                fontSize="10px"
                                color={C.startText}
                              />
                              <Text
                                fontSize="12px"
                                fontFamily={MONO}
                                fontWeight="700"
                                color={C.startText}
                              >
                                {formatTime(s.start_time)}
                              </Text>
                            </Box>
                            <Text fontSize="10px" color={C.faint}>
                              →
                            </Text>
                            <Box
                              display="inline-flex"
                              alignItems="center"
                              gap="4px"
                              px="8px"
                              py="3px"
                              bg={C.endBg}
                              borderRadius="3px"
                              border={`1px solid ${C.endBorder}`}
                            >
                              <Icon
                                as={FiClock}
                                fontSize="10px"
                                color={C.endText}
                              />
                              <Text
                                fontSize="12px"
                                fontFamily={MONO}
                                fontWeight="700"
                                color={C.endText}
                              >
                                {formatTime(s.end_time)}
                              </Text>
                            </Box>
                          </HStack>
                          <InDayTrack start={s.start_time} end={s.end_time} />
                        </Table.Cell>

                        {/* Durée */}
                        <Table.Cell py="11px" textAlign="center">
                          <Box
                            display="inline-block"
                            px="8px"
                            py="2px"
                            bg={C.paper}
                            borderRadius="3px"
                            border="1px solid"
                            borderColor={C.line}
                          >
                            <Text
                              fontSize="11.5px"
                              fontFamily={MONO}
                              fontWeight="700"
                              color={C.inkMute}
                            >
                              {calcDuration(s.start_time, s.end_time)}
                            </Text>
                          </Box>
                        </Table.Cell>

                        {/* Salle */}
                        <Table.Cell py="11px">
                          <VStack align="start" gap="1px">
                            <HStack gap={1}>
                              <Icon
                                as={FiMapPin}
                                fontSize="11px"
                                color={C.brand}
                              />
                              <Text
                                fontSize="12px"
                                fontWeight="700"
                                color={C.ink}
                              >
                                {s.room || "—"}
                              </Text>
                            </HStack>
                            {s.building && (
                              <HStack gap={1}>
                                <Icon
                                  as={FiHome}
                                  fontSize="10px"
                                  color={C.faint}
                                />
                                <Text fontSize="11px" color={C.faint}>
                                  {s.building}
                                </Text>
                              </HStack>
                            )}
                          </VStack>
                        </Table.Cell>

                        {/* Présence (générer QR). Séance du jour terminée :
                            badge pour le prof, bouton "Reprendre" pour l'admin. */}
                        {(isSuperAdmin || isTeacher) && (
                          <Table.Cell py="11px">
                            {completedTodayBySchedule.has(s.id) ? (
                              isSuperAdmin ? (
                                <HStack gap={2}>
                                  <Badge
                                    colorPalette="green"
                                    variant="subtle"
                                    size="xs"
                                  >
                                    Terminée
                                  </Badge>
                                  <ScheduleAttendanceQR
                                    scheduleId={s.id}
                                    courseName={courseName}
                                    reopenSessionId={completedTodayBySchedule.get(
                                      s.id,
                                    )}
                                  />
                                </HStack>
                              ) : (
                                <Badge
                                  colorPalette="green"
                                  variant="subtle"
                                  size="xs"
                                >
                                  Terminée aujourd'hui
                                </Badge>
                              )
                            ) : (
                              <ScheduleAttendanceQR
                                scheduleId={s.id}
                                courseName={courseName}
                              />
                            )}
                          </Table.Cell>
                        )}

                        {/* Actions */}
                        {isSuperAdmin && (
                          <Table.Cell py="11px" textAlign="right" pr={4}>
                            <ScheduleActionsMenu schedule={s} />
                          </Table.Cell>
                        )}
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  )
}
