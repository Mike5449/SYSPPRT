import {
  Badge,
  Box,
  Container,
  EmptyState,
  Flex,
  Grid,
  GridItem,
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
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiX,
  FiActivity,
  FiXCircle,
  FiAlertTriangle,
  FiAward,
} from "react-icons/fi"
import { z } from "zod"

import {
  AttendanceRecordsService,
  StudentsService,
  TeachersService,
  StudentAttendanceViewsService,
  StudentCoursesViewsService,
  CoursesService,
  ProgramLevelsService,
  TeacherAnalyticsService,
  SessionsService,
} from "@/client"
import { AttendanceRecordActionsMenu } from "@/components/Common/AttendanceRecordActionsMenu"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"

const attendanceRecordSearchSchema = z.object({
  page: z.number().catch(1),
  q: z.string().optional(),
  status: z.string().optional(),
  courseId: z.string().optional(),
  yearLevel: z.number().optional(),
  programLevelId: z.string().optional(),
  sessionId: z.string().optional(),
})

const PER_PAGE = 10

export const Route = createFileRoute("/_layout/attendance_record")({
  component: AttendanceRecordPage,
  validateSearch: (search) => attendanceRecordSearchSchema.parse(search),
})

// ──── Premium KPI Card ────
function StatCard({
  label,
  value,
  icon,
  subtext,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  subtext?: string
}) {
  return (
    <GridItem>
      <Box
        bg="white"
        borderRadius="sm"
        p={4}
        border="1px solid #e7edf6"
        boxShadow="sm"
        position="relative"
        overflow="hidden"
        transition="all 0.2s"
        _hover={{ shadow: "md", transform: "translateY(-2px)" }}
      >
        <Flex align="center" gap={2} mb={2}>
          <Icon as={icon} color="#1a3a5c" size="sm" />
          <Text fontSize="2xs" fontWeight="700" color="#1a3a5c" textTransform="uppercase">
            {label}
          </Text>
        </Flex>
        <Heading size="lg" color="#0e2d4f">
          {value}
        </Heading>
        {subtext && (
          <Box mt={3} pt={3} borderTop="1px dashed #d5e0ec">
            <Text color="#657e9f" fontSize="2xs">
              {subtext}
            </Text>
          </Box>
        )}
      </Box>
    </GridItem>
  )
}

// ──── Main Page Component ────
function AttendanceRecordPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const { data: userRoles } = useUserRoles(currentUser?.id)
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, q, status, courseId, yearLevel, programLevelId, sessionId } = Route.useSearch()

  // Role detection
  const isStudent = (userRoles || []).some(
    (r: any) => ["student", "étudiant", "etudiant"].includes(r.name?.toLowerCase()) || r.code === "STUDENT",
  )
  const isTeacher = (userRoles || []).some(
    (r: any) => ["teacher", "enseignant", "professeur"].includes(r.name?.toLowerCase()) || r.code === "TEACHER",
  )
  const isAdmin = currentUser?.is_superuser === true || (userRoles || []).some((r: any) => r.name?.toLowerCase() === "admin" || r.code === "ADMIN")


  // Fetch student data (for student role)
  const { data: studentData } = useQuery({
    queryKey: ["student_by_user", currentUser?.id],
    queryFn: () =>
      StudentsService.readStudentByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && isStudent,
    retry: false,
  })

  // Fetch teacher data (for teacher role)
  const { data: teacherData } = useQuery({
    queryKey: ["teacher_by_user", currentUser?.id],
    queryFn: () =>
      TeachersService.readTeacherByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && isTeacher && !isAdmin,
    retry: false,
  })



  // Auto-set initial filters for student
  useEffect(() => {
    if (isStudent && studentData && !yearLevel) {
      navigate({
        to: "/attendance_record",
        search: (prev) => ({
          ...prev,
          yearLevel: studentData.current_year_level,
        }),
        replace: true,
      })
    }
  }, [isStudent, studentData, yearLevel, navigate])

  // Fetch courses for filtering
  const { data: studentCourses } = useQuery({
    queryKey: ["student_courses", studentData?.id],
    queryFn: () => StudentCoursesViewsService.getStudentCourses({ studentId: studentData!.id }),
    enabled: isStudent && !!studentData?.id,
  })

  const { data: allCourses } = useQuery({
    queryKey: ["all_courses"],
    queryFn: () => CoursesService.readCourses({ limit: 100 }),
    enabled: isAdmin || isTeacher,
  })

  const courseOptions = isStudent
    ? studentCourses?.map((c) => ({ id: c.course_id, name: c.course_name })) || []
    : allCourses?.data?.map((c) => ({ id: c.id, name: c.name })) || []

  // Program level filter options — admin: all; teacher: only assigned levels.
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
    enabled: isTeacher && !isAdmin && !!teacherData?.id,
  })
  const programLevelOptions: { id: string; name: string }[] = isAdmin
    ? (allProgramLevels?.data ?? []).map((pl) => ({
        id: pl.id,
        name: pl.program?.name ? `${pl.program.name} — ${pl.name}` : pl.name,
      }))
    : (assignedLevels ?? []).map((pl: any) => ({
        id: String(pl.id),
        name: pl.code ? `${pl.name} (${pl.code})` : pl.name,
      }))

  // Academic session filter options (admin/teacher)
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions_all"],
    queryFn: () =>
      SessionsService.readSessionsWithAcademicYear({ skip: 0, limit: 1000 }),
    enabled: isAdmin || isTeacher,
  })
  const sessionOptions = (sessionsData?.data ?? []).map((se: any) => {
    // Include the academic year so identical session names across years are
    // distinguishable. `description` names the year directly as a fallback.
    const ay = se.academic_year?.name || se.description
    return { id: se.id, name: ay ? `${se.name} · ${ay}` : se.name }
  })

  // Search filters state
  const [studentQ, setStudentQ] = useState(q || "")

  // Debounce student search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (studentQ !== (q || "")) {
        navigate({
          to: "/attendance_record",
          search: (prev) => ({ ...prev, q: studentQ || undefined, page: 1 }),
        })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [studentQ, q, navigate])

  const updateFilter = (filters: Partial<{ status: string | undefined; courseId: string | undefined; yearLevel: number | undefined; programLevelId: string | undefined; sessionId: string | undefined; page: number }>) => {
    navigate({
      to: "/attendance_record",
      search: (prev) => ({ ...prev, ...filters, page: 1 }),
    })
  }

  const resetFilters = () => {
    setStudentQ("")
    navigate({
      to: "/attendance_record",
      search: () => ({
        page: 1,
        yearLevel: isStudent ? studentData?.current_year_level : undefined
      }),
    })
  }

  const hasFilters = !!(q || status || courseId || yearLevel || programLevelId || sessionId)

  // ── Data fetching: role-based ──
  // Student: fetch complete enriched data
  const {
    data: studentRecordsData,
    isLoading: studentLoading,
    isPlaceholderData: studentPlaceholder,
  } = useQuery({
    queryKey: ["attendance_records_student_complete", studentData?.id, page, status, courseId, yearLevel],
    queryFn: () =>
      StudentAttendanceViewsService.getStudentAttendanceComplete({
        studentId: studentData!.id,
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        courseId: courseId || undefined,
        attendanceStatus: status || undefined,
        yearLevel: yearLevel || undefined,
      }),
    enabled: isStudent && !!studentData?.id,
    placeholderData: (prev) => prev,
  })

  // Teacher/Admin: fetch general records
  const {
    data: generalRecordsData,
    isLoading: generalLoading,
    isPlaceholderData: generalPlaceholder,
  } = useQuery({
    queryKey: ["attendance_records_teacher_admin", page, status, courseId, q, yearLevel, programLevelId, sessionId],
    queryFn: () =>
      AttendanceRecordsService.readAttendanceRecords({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        courseId: courseId || undefined,
        yearLevel: yearLevel || undefined,
        programLevelId: programLevelId || undefined,
        sessionId: sessionId || undefined,
        status: status || undefined,
        studentQuery: q || undefined,
        teacherId: isTeacher && !isAdmin ? teacherData?.id : undefined,
      }),
    enabled: isAdmin || (isTeacher && !!teacherData?.id),
    placeholderData: (prev) => prev,
  })

  // Stats fetching for all
  const { data: statsData } = useQuery({
    queryKey: ["attendance_stats", studentData?.id, teacherData?.id, courseId, yearLevel],
    queryFn: () =>
      StudentAttendanceViewsService.getAttendanceStatistics({
        studentId: isStudent ? studentData?.id : undefined,
        teacherId: isTeacher ? teacherData?.id : undefined,
        courseId: courseId || undefined,
        yearLevel: yearLevel || undefined,
      }),
    enabled: (isStudent && !!studentData?.id) || (isTeacher && !!teacherData?.id) || isAdmin,
  })

  // Determine active data
  const activeData = isStudent ? studentRecordsData : generalRecordsData
  const isLoading = isStudent ? studentLoading : generalLoading
  const isPlaceholderData = isStudent ? studentPlaceholder : generalPlaceholder

  const records = activeData?.data?.slice(0, PER_PAGE) ?? []
  const count = activeData?.count ?? 0

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance_records_student_complete"] })
    queryClient.invalidateQueries({ queryKey: ["attendance_records_teacher_admin"] })
    queryClient.invalidateQueries({ queryKey: ["attendance_stats"] })
  }

  const setPage = (p: number) => {
    navigate({
      to: "/attendance_record",
      search: (prev) => ({ ...prev, page: p }),
    })
  }

  // Column visibility
  const showStudentSearch = isAdmin || isTeacher || !isStudent
  const showActions = isAdmin
  const showStudentColumn = !isStudent

  const compactSelect: React.CSSProperties = { height: "32px", padding: "0 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#374151", cursor: "pointer", outline: "none", fontFamily: "inherit" }

  return (
    <Box bg="#f2f4f7" minH="100vh" py={{ base: 4, md: 8 }}>
      <Container maxW="1440px">
        <Box
          bg="white"
          borderRadius="sm"
          boxShadow="0 20px 40px -10px rgba(0, 20, 30, 0.15)"
          overflow="hidden"
        >
          <Box p={{ base: 6, md: 10 }}>
            {/* ── Title & Legend ── */}
            <Box mb={10}>
              <Flex align="center" gap={4} mb={3}>
                <Icon as={FiAward} color="#1f4973" boxSize={8} />
                <Box>
                  <Heading size="lg" color="#0c2034" letterSpacing="-0.01em">
                    Registre de Présence
                  </Heading>
                  <Text color="#526c8a" fontSize="sm">
                    {isStudent
                      ? t("attendance.record.student_description", { defaultValue: "Suivi de présence académique" })
                      : t("attendance.record.description")}
                  </Text>
                </Box>
              </Flex>
              <Flex gap={3} wrap="wrap">
                <Flex bg="white" border="1px solid #d9e1ec" borderRadius="sm" px={4} py={1.5} align="center" gap={2} fontSize="xs" fontWeight="600">
                  <FiSearch color="#7996b7" />
                  {t("attendance.record.analysis", { defaultValue: "Analyses détaillées" })}
                </Flex>
                <Flex bg="white" border="1px solid #d9e1ec" borderRadius="sm" px={4} py={1.5} align="center" gap={2} fontSize="xs" fontWeight="600" color="#28965a">
                  <Icon as={FiCheckCircle} />
                  {t("attendance.record.values.present")}
                </Flex>
                <Flex bg="white" border="1px solid #d9e1ec" borderRadius="sm" px={4} py={1.5} align="center" gap={2} fontSize="xs" fontWeight="600" color="#c95a4a">
                  <Icon as={FiXCircle} />
                  {t("attendance.record.values.absent")}
                </Flex>
              </Flex>
            </Box>

            {/* ── Summary KPI Cards ── */}
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={4} mb={8}>
              <StatCard
                label={t("attendance.record.stats.rate", { defaultValue: "Taux de présence" })}
                value={`${statsData?.overall_statistics?.attendance_rate || 0}%`}
                icon={FiActivity}
                subtext={t("attendance.record.stats.global", { defaultValue: "Score de ponctualité global" })}
              />
              <StatCard
                label={t("attendance.record.values.present")}
                value={statsData?.overall_statistics?.attended_sessions || 0}
                icon={FiCheckCircle}
                subtext={t("attendance.record.stats.validated", { defaultValue: "Séances validées" })}
              />
              <StatCard
                label={t("attendance.record.values.absent")}
                value={statsData?.overall_statistics?.absent_sessions || 0}
                icon={FiXCircle}
                subtext={t("attendance.record.stats.risk", { defaultValue: "Absentéisme à surveiller" })}
              />
              <StatCard
                label={t("attendance.record.stats.late_excused", { defaultValue: "Retards / Excusés" })}
                value={`${statsData?.overall_statistics?.late_sessions || 0} / ${statsData?.overall_statistics?.excused_sessions || 0}`}
                icon={FiAlertTriangle}
                subtext={t("attendance.record.stats.justification", { defaultValue: "Impact sur la progression" })}
              />
            </Grid>

            {/* ── Filters ── */}
            <Flex justify="flex-end" gap={2} mb={4} wrap="wrap" align="center">
              {showStudentSearch && (
                <Input
                  size="sm"
                  w="160px"
                  borderRadius="md"
                  fontSize="xs"
                  bg="white"
                  borderColor="gray.200"
                  placeholder={t("attendance.record.search_placeholder", { defaultValue: "Nom ou Code..." })}
                  value={studentQ}
                  onChange={(e) => setStudentQ(e.target.value)}
                />
              )}
              {!isStudent && (
                <select
                  style={{ ...compactSelect, maxWidth: "220px" }}
                  value={programLevelId || ""}
                  onChange={(e) => updateFilter({ programLevelId: e.target.value || undefined })}
                >
                  <option value="">{t("common.tables.all_program_levels", { defaultValue: "Tous les programmes" })}</option>
                  {programLevelOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              )}
              {!isStudent && (
                <select
                  style={{ ...compactSelect, maxWidth: "220px" }}
                  value={sessionId || ""}
                  onChange={(e) => updateFilter({ sessionId: e.target.value || undefined })}
                >
                  <option value="">{t("common.tables.all_sessions", { defaultValue: "Toutes les sessions" })}</option>
                  {sessionOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                style={compactSelect}
                value={yearLevel || ""}
                onChange={(e) => updateFilter({ yearLevel: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">{t("common.tables.all_levels", { defaultValue: "Tous les niveaux" })}</option>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {t("common.level", { defaultValue: "Année" })} {lvl}
                  </option>
                ))}
              </select>
              <select
                style={{ ...compactSelect, maxWidth: "200px" }}
                value={courseId || ""}
                onChange={(e) => updateFilter({ courseId: e.target.value || undefined })}
              >
                <option value="">{t("common.tables.all_courses", { defaultValue: "Tous les cours" })}</option>
                {courseOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <select
                style={compactSelect}
                value={status || ""}
                onChange={(e) => updateFilter({ status: e.target.value || undefined })}
              >
                <option value="">{t("common.tables.all_statuses", { defaultValue: "Tous les statuts" })}</option>
                <option value="present">{t("attendance.record.values.present")}</option>
                <option value="absent">{t("attendance.record.values.absent")}</option>
                <option value="late">{t("attendance.record.values.late")}</option>
                <option value="excused">{t("attendance.record.values.excused")}</option>
              </select>
              <IconButton
                size="sm"
                variant="outline"
                borderRadius="md"
                onClick={resetFilters}
                aria-label="Clear filters"
                disabled={!hasFilters}
                color="#5e7899"
              >
                <FiX />
              </IconButton>
              <IconButton
                size="sm"
                variant="outline"
                borderRadius="md"
                onClick={handleRefresh}
                aria-label="Refresh"
                color="#5e7899"
              >
                <FiRefreshCw />
              </IconButton>
            </Flex>

            {/* ── Table ── */}
            {isLoading ? (
              <PendingItems />
            ) : records.length === 0 ? (
              <Box py={12} bg="white" borderRadius="sm" border="1px solid #eef2f8">
                <EmptyState.Root>
                  <EmptyState.Content>
                    <EmptyState.Indicator>
                      <FiSearch size="48px" />
                    </EmptyState.Indicator>
                    <VStack textAlign="center" gap={2}>
                      <EmptyState.Title fontSize="sm" color="gray.800" fontWeight="bold">
                        {t("attendance.record.empty.title")}
                      </EmptyState.Title>
                      <EmptyState.Description color="gray.500" fontSize="xs">
                        {t("attendance.record.empty.description")}
                      </EmptyState.Description>
                    </VStack>
                  </EmptyState.Content>
                </EmptyState.Root>
              </Box>
            ) : (
              <VStack align="stretch" gap={4}>
                <Box bg="white" borderRadius="sm" border="1px solid #eef2f8" overflowX="auto">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        {showStudentColumn && (
                          <Table.ColumnHeader py={3} px={4} fontSize="xs" fontWeight="700" textTransform="uppercase" color="#1a3a5c" borderBottom="1px solid #dee7f2">
                            {t("attendance.record.table.student")}
                          </Table.ColumnHeader>
                        )}
                        {[
                          t("common.course"),
                          t("attendance.record.table.session"),
                          t("attendance.record.table.status"),
                          t("attendance.record.table.arrival"),
                          t("attendance.record.table.date"),
                          t("attendance.record.table.excused"),
                          t("attendance.record.table.actions")
                        ].map((head, i) => {
                          if (head === t("attendance.record.table.actions") && !showActions) return null
                          return (
                            <Table.ColumnHeader key={i} py={3} px={4} fontSize="xs" fontWeight="700" textTransform="uppercase" color="#1a3a5c" borderBottom="1px solid #dee7f2" whiteSpace="nowrap">
                              {head}
                            </Table.ColumnHeader>
                          )
                        })}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {records.map((record) => (
                        <Table.Row
                          key={(record as any).id || (record as any).attendance_record_id}
                          opacity={isPlaceholderData ? 0.5 : 1}
                          _hover={{ bg: "#f8f9fb" }}
                        >
                          {showStudentColumn && (
                            <Table.Cell py={4} px={4}>
                              <HStack gap={2}>
                                <Icon as={FiUser} color="gray.400" size="xs" />
                                <Text fontSize="sm" color="#2c3e50" fontWeight="600">
                                  {(record as any).student
                                    ? `${(record as any).student.first_name} ${(record as any).student.last_name}`
                                    : t("common.tables.unknown")}
                                </Text>
                              </HStack>
                            </Table.Cell>
                          )}

                          <Table.Cell px={4}>
                            <Text fontWeight="700" color="#2c3e50" fontSize="sm">
                              {/* If using enriched view, we have course_name directly */}
                              {(record as any).course_name ||
                                (record as any).attendance_session?.schedule?.course_session?.course_program_level?.course?.name ||
                                t("common.tables.unknown")}
                            </Text>
                            <Badge bg="#f0f5fd" color="#48648a" borderRadius="sm" px={2} fontSize="3xs">
                              {(record as any).course_code ||
                                (record as any).attendance_session?.schedule?.course_session?.course_program_level?.course?.code ||
                                "-"}
                            </Badge>
                          </Table.Cell>

                          <Table.Cell px={4}>
                            <Text fontSize="xs" color="#1f4973" fontWeight="500">
                              {(record as any).topic || (record as any).attendance_session?.topic || "No topic"}
                            </Text>
                          </Table.Cell>

                          <Table.Cell px={4}>
                            <Badge
                              colorPalette={
                                (record as any).status === "present" || (record as any).attendance_status === "present" ? "green" :
                                  (record as any).status === "absent" || (record as any).attendance_status === "absent" ? "red" :
                                    (record as any).status === "late" || (record as any).attendance_status === "late" ? "orange" :
                                      (record as any).status === "excused" || (record as any).attendance_status === "excused" ? "blue" : "gray"
                              }
                              variant="subtle"
                              borderRadius="sm"
                              px={2}
                              py={0.5}
                              fontSize="2xs"
                              fontWeight="700"
                            >
                              {(record as any).status || (record as any).attendance_status ? t(`attendance.record.values.${(record as any).status || (record as any).attendance_status}`) : "-"}
                            </Badge>
                          </Table.Cell>

                          <Table.Cell px={4}>
                            <HStack gap={1}>
                              <Icon as={FiClock} size="xs" color="gray.400" />
                              <Text fontSize="xs" color="gray.600" fontFamily="mono">
                                {record.arrival_time?.slice(0, 5) || "-"}
                              </Text>
                            </HStack>
                          </Table.Cell>

                          <Table.Cell px={4}>
                            <HStack gap={1}>
                              <Icon as={FiCalendar} size="xs" color="gray.400" />
                              <Text fontSize="xs" color="gray.600">
                                {new Date((record as any).created_at || (record as any).record_created_at).toLocaleDateString()}
                              </Text>
                            </HStack>
                          </Table.Cell>

                          <Table.Cell px={4} textAlign="center">
                            {record.is_excused ? (
                              <Icon as={FiCheckCircle} color="green.500" size="sm" />
                            ) : (
                              <Text fontSize="xs" color="gray.300">-</Text>
                            )}
                          </Table.Cell>

                          {showActions && (
                            <Table.Cell px={4} textAlign="center">
                              <AttendanceRecordActionsMenu attendanceRecord={record as any} />
                            </Table.Cell>
                          )}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>

                {/* ── Pagination ── */}
                <Flex justify="space-between" align="center" mt={2} px={1}>
                  <Text fontSize="xs" color="#5e7899" fontWeight="600">
                    {t("common.tables.showing", {
                      first: (page - 1) * PER_PAGE + 1,
                      last: Math.min(page * PER_PAGE, count),
                      total: count,
                      items: t("common.attendance_records"),
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
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
