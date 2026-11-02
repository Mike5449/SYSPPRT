import {
  Box,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
} from "@/components/ui/menu"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiActivity,
  FiAlertTriangle,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiSearch,
  FiStar,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from "react-icons/fi"

import {
  AcademicYearsService,
  CourseSessionsService,
  ProgramLevelsService,
  StudentsService,
  TeacherAnalyticsService,
} from "@/client"

export const Route = createFileRoute("/_layout/dashboard/admin")({
  component: AdminDashboard,
})

// --- Components ---

// --- Shared Premium Components ---

const KPICard = ({ title, value, subLeft, trendValue, trendIcon, trendColor, icon: IconComponent, isLoading }: any) => {
  return (
    <Box
      bg="white"
      borderRadius="12px"
      p="0.8rem 1rem"
      boxShadow="0 8px 16px -10px rgba(30, 60, 100, 0.1)"
      border="1px solid"
      borderColor="#ecf2f9"
      transition="all 0.2s"
      display="flex"
      flexDirection="column"
      position="relative"
      _hover={{ transform: "translateY(-1px)", borderColor: "#bfd6f0" }}
    >
      <Flex justifyContent="space-between" alignItems="center" color="#6d8ab0" fontWeight="500" fontSize="0.75rem" mb="8px">
        <Text letterSpacing="0.3px">{title}</Text>
        {IconComponent && <Icon as={IconComponent} />}
      </Flex>
      {isLoading ? (
        <Spinner size="sm" color="ui.main" my={2} />
      ) : (
        <Text fontSize="1.8rem" fontWeight="650" color="#102a47" lineHeight="1.1">
          {value}
        </Text>
      )}
      <Flex
        color="#7089ae"
        fontSize="0.75rem"
        mt="6px"
        pt="8px"
        borderTop="1px dashed"
        borderColor="#dfe8f3"
        justify="space-between"
        align="center"
      >
        <Text>{subLeft}</Text>
        {trendValue && (
          <Box
            color={trendColor === "green" ? "#2b7d4c" : trendColor === "orange" ? "#785f1a" : "#1f5090"}
            bg={trendColor === "green" ? "#e2f0e8" : trendColor === "orange" ? "#fcf1d6" : "#deedff"}
            px="0.6rem"
            py="0.1rem"
            borderRadius="12px"
            fontSize="0.7rem"
            fontWeight="600"
          >
            {trendIcon && <Icon as={trendIcon} mr={1} fontSize="10px" />}
            {trendValue}
          </Box>
        )}
      </Flex>
    </Box>
  )
}

const HorizontalBarChart = ({ title, data, dataKey, labelKey, legend, icon: IconComponent }: any) => {
  return (
    <Box bg="white" borderRadius="12px" p="1rem" border="1px solid #eaf0f8" boxShadow="0 4px 12px -8px #b0c8e0">
      <Flex justifyContent="space-between" alignItems="center" mb="0.8rem" wrap="wrap" gap={2}>
        <Heading fontWeight="600" fontSize="0.95rem" color="#1f3d68" display="flex" alignItems="center">
          {IconComponent && <Icon as={IconComponent} mr={2} />}
          {title}
        </Heading>
        {legend && (
          <HStack gap="12px">
            {legend.map((l: any, i: number) => (
              <HStack key={i} gap={1} fontSize="0.7rem">
                <Box w="8px" h="8px" borderRadius="10px" bg={l.color} />
                <Text color="gray.600" fontSize="0.7rem">{l.label}</Text>
              </HStack>
            ))}
          </HStack>
        )}
      </Flex>

      <VStack alignItems="stretch" gap="10px" mt="10px">
        {data.map((item: any, i: number) => (
          <Flex key={i} alignItems="center" gap="6px">
            <Text w="75px" fontWeight="600" color="#304d76" fontSize="0.75rem" truncate title={item[labelKey]}>
              {item[labelKey]}
            </Text>
            <Box flex="1" h="6px" bg="#eaf0f8" borderRadius="12px" overflow="hidden" position="relative">
              <Box
                h="100%"
                borderRadius="12px"
                bg={item.color || "linear-gradient(90deg, #256bb0, #4c8fdc)"}
                w={`${item[dataKey]}%`}
                transition="width 1s ease-in-out"
              />
            </Box>
            <Text minW="35px" fontWeight="650" color="#1f3f6a" fontSize="0.8rem">
              {item[dataKey]}%
            </Text>
          </Flex>
        ))}
      </VStack>
    </Box>
  )
}

const TeacherCourseCard = ({ name, code, progress, students, attendance, average_exam, year }: any) => {
  const { t } = useTranslation()
  return (
  <Box
    bg="white"
    borderRadius="12px"
    p="0.8rem"
    border="1px solid #e2ecf9"
    boxShadow="0 4px 14px -14px #a3b9d4"
    transition="0.15s"
    _hover={{ borderColor: "#b0c9ed" }}
  >
    <Flex justifyContent="space-between" alignItems="center" fontWeight="650" fontSize="0.85rem" color="#0e2742" mb="6px">
      <Text truncate maxW="120px" title={name}>{name}</Text>
      <Text bg="#dfe9f5" px="0.5rem" py="0.1rem" borderRadius="10px" fontSize="0.55rem" fontWeight="600" color="#1f4d86">
        {code}
      </Text>
    </Flex>

    <Flex gap="6px" bg="#f6fafe" borderRadius="8px" p="0.5rem 0.4rem" my="8px" justifyContent="space-around">
      <VStack gap={0} alignItems="center">
        <Text fontSize="0.5rem" textTransform="uppercase" color="#5b779b" fontWeight="500">ETU</Text>
        <Text fontWeight="700" fontSize="0.85rem" color="#102a47">{students}</Text>
      </VStack>
      <VStack gap={0} alignItems="center">
        <Text fontSize="0.5rem" textTransform="uppercase" color="#5b779b" fontWeight="500">EXAM</Text>
        <Text fontWeight="700" fontSize="0.85rem" color="#102a47">{average_exam > 0 ? `${Math.round(average_exam * 10) / 10}` : "—"}</Text>
      </VStack>
      <VStack gap={0} alignItems="center">
        <Text fontSize="0.5rem" textTransform="uppercase" color="#5b779b" fontWeight="500">ASS</Text>
        <Text fontWeight="700" fontSize="0.85rem" color={attendance > 80 ? "#2b7d4c" : "#b5443a"}>{attendance}%</Text>
      </VStack>
    </Flex>

    <Box h="6px" bg="#dde5f0" borderRadius="10px" overflow="hidden" my="10px">
      <Box
        h="100%"
        bg={progress < 35 ? "#b5443a" : progress >= 50 ? "#1f8b4c" : "#266eb0"}
        w={`${progress}%`}
        borderRadius="10px"
      />
    </Box>

    <Flex justifyContent="space-between" color="#6882a5" fontSize="0.7rem">
      <Text display="flex" alignItems="center">
        <Icon as={FiUsers} mr={1} />
        {t("dashboard.admin.year_label", { level: year })}
      </Text>
      <Box bg="#edf3fd" px="0.7rem" py="0.1rem" borderRadius="12px" fontSize="0.65rem" fontWeight="600" color="#1c4582">
        {progress}%
      </Box>
    </Flex>
  </Box>
  )
}



function AdminDashboard() {
  const { t } = useTranslation()
  // Selection States
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("")
  const [selectedProgramLevel, setSelectedProgramLevel] = useState<string>("")
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | "">("")
  const [searchTerm, setSearchTerm] = useState("")

  // --- Data Fetching ---

  const { data: academicYears } = useQuery({
    queryKey: ["academic_years"],
    queryFn: () => AcademicYearsService.readAcademicYears({ limit: 100 }),
  })

  const { data: allProgramLevels } = useQuery({
    queryKey: ["all_program_levels"],
    queryFn: () => ProgramLevelsService.readProgramLevels({ limit: 100 }),
  })

  const { data: assignedTeachers } =
    useQuery({
      queryKey: [
        "assigned_teachers_admin",
        selectedProgramLevel,
        selectedAcademicYear,
      ],
      queryFn: () =>
        TeacherAnalyticsService.getAssignedTeachers({
          programLevelId: selectedProgramLevel || undefined,
          academicYearId: selectedAcademicYear || undefined,
        }),
    })

  useEffect(() => {
    if (academicYears?.data?.length && !selectedAcademicYear) {
      const current = academicYears.data.find((y) => y.is_current)
      if (current) setSelectedAcademicYear(current.id)
    }
  }, [academicYears, selectedAcademicYear])

  // Métriques globales admin (sans filtre teacher) — même structure que teacher metrics
  const { data: globalMetrics, isLoading: globalMetricsLoading } = useQuery({
    queryKey: ["admin_global_metrics", selectedAcademicYear, selectedProgramLevel, selectedYearLevel],
    queryFn: () => TeacherAnalyticsService.getGlobalDashboardMetrics({
      academicYearId: selectedAcademicYear || undefined,
      programLevelId: selectedProgramLevel || undefined,
      yearLevel: selectedYearLevel === "" ? undefined : selectedYearLevel,
    }),
    enabled: !selectedTeacherId,
  })

  // Counts fiables depuis les tables directes (fallback si globalMetrics est vide)
  const { data: studentsCount } = useQuery({
    queryKey: ["students_count_global"],
    queryFn: () => StudentsService.readStudents({ limit: 1 }),
    enabled: !selectedTeacherId,
  })

  const { data: courseSessionsCount } = useQuery({
    queryKey: ["course_sessions_count_global"],
    queryFn: () => CourseSessionsService.readCourseSessions({ limit: 1 }),
    enabled: !selectedTeacherId,
  })

  // NOTE: getCoursesAnalyticsAdmin ne retourne pas performance_by_course —
  // les charts par cours ne sont disponibles qu'en mode professeur sélectionné.

  // Teacher specific metrics
  const { data: teacherMetrics, isLoading: teacherMetricsLoading } = useQuery({
    queryKey: [
      "admin_teacher_metrics",
      selectedTeacherId,
      selectedAcademicYear,
      selectedProgramLevel,
      selectedYearLevel,
    ],
    queryFn: () =>
      TeacherAnalyticsService.getTeacherDashboardMetrics({
        teacherId: selectedTeacherId,
        academicYearId: selectedAcademicYear || undefined,
        programLevelId: selectedProgramLevel || undefined,
        yearLevel: selectedYearLevel === "" ? undefined : selectedYearLevel,
      }),
    enabled: !!selectedTeacherId,
  })

  const metricsLoading = selectedTeacherId ? teacherMetricsLoading : globalMetricsLoading

  // Normalize Data for display
  const displayMetrics = useMemo(() => {
    if (selectedTeacherId) {
      return {
        total_students: teacherMetrics?.total_students || 0,
        total_courses: teacherMetrics?.total_courses || 0,
        attendance_rate: teacherMetrics?.attendance_rate || 0,
        average_progress: teacherMetrics?.average_student_progress || 0,
        present_count: teacherMetrics?.present_count || 0,
        late_count: teacherMetrics?.late_count || 0,
        absent_count: teacherMetrics?.absent_count || 0,
        total_sessions: teacherMetrics?.total_attendance_sessions || 0,
        course_metrics: teacherMetrics?.course_metrics || []
      }
    }
    // Global mode — utilise le nouvel endpoint admin/dashboard (même structure que teacher)
    const gm = globalMetrics as any
    return {
      total_students: gm?.total_students || studentsCount?.count || 0,
      total_courses: gm?.total_courses || courseSessionsCount?.count || 0,
      attendance_rate: gm?.attendance_rate || 0,
      average_progress: gm?.average_student_progress || 0,
      present_count: gm?.present_count || 0,
      late_count: gm?.late_count || 0,
      absent_count: gm?.absent_count || 0,
      total_sessions: gm?.total_attendance_sessions || 0,
      course_metrics: gm?.course_metrics || []
    }
  }, [selectedTeacherId, teacherMetrics, globalMetrics, studentsCount, courseSessionsCount])

  // Prepare Charts Data — fonctionne en mode teacher ET global
  const performanceChartData = useMemo(() => {
    return (displayMetrics.course_metrics || []).slice(0, 8).map((cm: any) => ({
      name: cm.course_name.substring(0, 6).toUpperCase(),
      score: Math.round(cm.average_progress),
      color: cm.average_progress > 75
        ? "linear-gradient(90deg, #1f8b4c, #41b77b)"
        : cm.average_progress > 50
          ? "linear-gradient(90deg, #256bb0, #4c8fdc)"
          : "linear-gradient(90deg, #b5443a, #cd6b62)"
    }))
  }, [displayMetrics])

  const attendanceChartData = useMemo(() => {
    return (displayMetrics.course_metrics || []).slice(0, 8).map((cm: any) => ({
      name: cm.course_name.substring(0, 6).toUpperCase(),
      rate: Math.round(cm.attendance_rate),
      color: cm.attendance_rate > 80
        ? "linear-gradient(90deg, #1f8b4c, #41b77b)"
        : cm.attendance_rate > 60
          ? "linear-gradient(90deg, #da7b38, #e89f62)"
          : "linear-gradient(90deg, #b5443a, #cd6b62)"
    }))
  }, [displayMetrics])

  const filteredCourses = useMemo(() => {
    const courses = displayMetrics.course_metrics || []
    if (!searchTerm) return courses
    return courses.filter(
      (c: any) =>
        c.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.course_code.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [displayMetrics, searchTerm])

  const activeYearName = academicYears?.data?.find(y => y.id === selectedAcademicYear)?.name || "---"
  const activeProgramName = allProgramLevels?.data?.find(p => p.id === selectedProgramLevel)?.name || "Tous les programmes"
  const activeTeacherName = assignedTeachers?.find((t: any) => t.id === selectedTeacherId)?.full_name || "Sélectionner un prof..."

  return (
    <Box bg="#f0f5fa" minH="100vh" py="2rem" fontFamily="'Inter', sans-serif">
      <Container maxW="1600px">
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center" mb="1.2rem" wrap="wrap" gap="0.6rem">
          <Box>
            <Heading fontSize="1.25rem" fontWeight="600" color="#13294b" letterSpacing="-0.02em" display="flex" alignItems="center">
              <Icon as={FiActivity} mr="8px" color="#214973" />
              Tableau de Bord Administratif
            </Heading>
            <Text color="#4c658a" fontWeight="400" mt="1px" fontSize="0.75rem">
              {selectedTeacherId ? t("dashboard.admin.subtitle_teacher", { name: activeTeacherName }) : t("dashboard.admin.subtitle_global")} · {activeYearName}
            </Text>
          </Box>
          <HStack bg="white" borderRadius="12px" p="0.4rem 1rem 0.4rem 0.8rem" boxShadow="0 2px 8px rgba(0,20,40,0.04)" gap="12px">
            {/* Academic Year */}
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-start" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }}>
                  <Icon as={FiCalendar} color="#2a5f8a" boxSize={3} />
                  <Text>{activeYearName}</Text>
                </HStack>
              </MenuTrigger>
              <MenuContent minW="140px" bg="white" borderRadius="10px" border="1px solid #e2ecf9" p="4px" zIndex={1500}>
                {academicYears?.data?.map((y) => (
                  <MenuItem key={y.id} value={y.id} fontSize="0.75rem" borderRadius="6px" onClick={() => setSelectedAcademicYear(y.id)}>
                    {y.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>
            <Box w="1px" h="10px" bg="gray.100" />

            {/* Program Filter */}
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-start" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }}>
                  <Icon as={FiBookOpen} color="#2a5f8a" boxSize={3} />
                  <Text truncate maxW="100px">{activeProgramName}</Text>
                </HStack>
              </MenuTrigger>
              <MenuContent minW="180px" bg="white" borderRadius="10px" border="1px solid #e2ecf9" p="4px" zIndex={1500}>
                <MenuItem value="" fontSize="0.75rem" borderRadius="6px" onClick={() => setSelectedProgramLevel("")}>Tous les programmes</MenuItem>
                {allProgramLevels?.data?.map((p) => (
                  <MenuItem key={p.id} value={p.id} fontSize="0.75rem" borderRadius="6px" onClick={() => setSelectedProgramLevel(p.id)}>
                    {p.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>
            <Box w="1px" h="10px" bg="gray.100" />

            {/* Teacher Filter */}
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-start" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }}>
                  <Icon as={FiUser} color="#2a5f8a" boxSize={3} />
                  <Text truncate maxW="120px">{selectedTeacherId ? String(activeTeacherName) : t("dashboard.admin.all_teachers")}</Text>
                </HStack>
              </MenuTrigger>
              <MenuContent minW="180px" bg="white" borderRadius="10px" border="1px solid #e2ecf9" p="4px" zIndex={1500}>
                <MenuItem value="" fontSize="0.75rem" borderRadius="6px" onClick={() => setSelectedTeacherId("")}>{t("dashboard.admin.all_teachers")}</MenuItem>
                {assignedTeachers?.map((t: any) => (
                  <MenuItem key={t.id} value={t.id} fontSize="0.75rem" borderRadius="6px" onClick={() => setSelectedTeacherId(t.id)}>
                    {t.full_name}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>
            <Box w="1px" h="10px" bg="gray.100" />

            {/* Niveau/Year Level */}
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-start" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }}>
                  <Icon as={FiFilter} color="#2a5f8a" boxSize={3} />
                  <Text>{selectedYearLevel === "" ? t("dashboard.admin.levels") : t("dashboard.admin.level_short", { level: selectedYearLevel })}</Text>
                </HStack>
              </MenuTrigger>
              <MenuContent minW="120px" bg="white" borderRadius="10px" border="1px solid #e2ecf9" p="4px" zIndex={1500}>
                <MenuItem value="" fontSize="0.75rem" borderRadius="6px" onClick={() => setSelectedYearLevel("")}>{t("dashboard.admin.all_levels")}</MenuItem>
                {[1, 2, 3, 4, 5].map((v) => (
                  <MenuItem key={v} value={v.toString()} fontSize="0.75rem" borderRadius="6px" onClick={() => setSelectedYearLevel(v)}>
                    {t("dashboard.common.year_label", { level: v })}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>
          </HStack>
        </Flex>

        {/* Global KPI Grid */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap="1rem" mb="1.2rem">
          <KPICard
            title={t("dashboard.admin.kpi_students")}
            value={displayMetrics.total_students}
            subLeft={t("dashboard.admin.kpi_students_sub")}
            icon={FiUsers}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.admin.kpi_sessions")}
            value={displayMetrics.total_courses}
            subLeft={t("dashboard.admin.kpi_sessions_sub")}
            icon={FiBook}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.admin.kpi_attendance")}
            value={`${displayMetrics.attendance_rate}%`}
            subLeft={t("dashboard.admin.kpi_attendance_sub", { present: displayMetrics.present_count, late: displayMetrics.late_count })}
            trendValue={displayMetrics.attendance_rate > 80 ? t("dashboard.admin.kpi_attendance_normal") : t("dashboard.admin.kpi_attendance_warn")}
            trendIcon={displayMetrics.attendance_rate > 80 ? FiCheckCircle : FiAlertTriangle}
            trendColor={displayMetrics.attendance_rate > 80 ? "green" : "orange"}
            icon={FiCheckCircle}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.admin.kpi_performance")}
            value={`${displayMetrics.average_progress}%`}
            subLeft={t("dashboard.admin.kpi_performance_sub")}
            trendValue={selectedTeacherId ? undefined : t("dashboard.admin.kpi_performance_global")}
            trendIcon={FiTrendingUp}
            trendColor="green"
            icon={FiStar}
            isLoading={metricsLoading}
          />
        </Grid>

        {/* Charts Row */}
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="1.5rem" mb="1.2rem">
          <HorizontalBarChart
            title={t("dashboard.admin.perf_chart_title")}
            icon={FiTrendingUp}
            data={performanceChartData}
            dataKey="score"
            labelKey="name"
            legend={[
              { label: t("dashboard.common.excellent_75"), color: "#1f8b4c" },
              { label: t("dashboard.common.normal_50"), color: "#256bb0" },
              { label: t("dashboard.common.critical_50"), color: "#b5443a" }
            ]}
          />
          <HorizontalBarChart
            title={t("dashboard.admin.att_chart_title")}
            icon={FiCalendar}
            data={attendanceChartData}
            dataKey="rate"
            labelKey="name"
            legend={[
              { label: t("dashboard.common.excellent_80"), color: "#2b7d4c" },
              { label: t("dashboard.common.normal_60"), color: "#da7b38" },
              { label: t("dashboard.common.critical_60"), color: "#b5443a" }
            ]}
          />
        </Grid>

        {/* Course Grid Title */}
        <Flex justifyContent="space-between" alignItems="center" my="1.2rem 0.8rem">
          <Heading fontWeight="600" color="#10243f" fontSize="1.15rem">
            <Icon as={FiBookOpen} mr={2} />
            {t("dashboard.admin.courses_title")}
          </Heading>
          <HStack bg="white" borderRadius="12px" border="1px solid #d6e2f0" px="0.6rem" py="0.2rem">
            <Icon as={FiSearch} color="#819cbf" fontSize="0.75rem" />
            <Input
              border="none"
              bg="transparent"
              placeholder={t("dashboard.common.search_course")}
              fontSize="0.75rem"
              w="180px"
              outline="none"
              _focus={{ outline: "none" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </HStack>
        </Flex>

        {/* High-Density Course Grid */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(5, 1fr)" }} gap="0.8rem" mb="1.5rem">
          {filteredCourses.map((cm: any) => (
            <TeacherCourseCard
              key={cm.course_id}
              name={cm.course_name}
              code={cm.course_code}
              progress={Math.round(cm.average_progress)}
              students={cm.student_count}
              attendance={Math.round(cm.attendance_rate)}
              average_exam={Math.round(cm.exam_average || 0)}
              year={cm.year_level}
            />
          ))}
        </Grid>

        {/* Bottom Stats: Attendance Breakdown */}
        <Box bg="white" borderRadius="12px" p="1.2rem" border="1px solid #e3ecf7" boxShadow="0 8px 16px -10px rgba(30, 60, 100, 0.1)">
          <Flex direction={{ base: "column", md: "row" }} gap="2rem" alignItems="center">
            <Box w={{ base: "100%", md: "200px" }} textAlign="center" borderRight={{ md: "1px dashed #dfe8f3" }} pr={{ md: "2rem" }}>
              <Heading fontSize="0.85rem" fontWeight="700" color="#6d8ab0" mb="1rem" textTransform="uppercase" letterSpacing="0.5px">Assiduité Globale</Heading>
              <Flex justifyContent="center" mb="0.5rem">
                <Box
                  w="80px"
                  h="80px"
                  borderRadius="full"
                  bg={`conic-gradient(#2d7f4b 0% ${displayMetrics.attendance_rate}%, #c03b33 ${displayMetrics.attendance_rate}% 100%)`}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  position="relative"
                  boxShadow="0 4px 10px rgba(0,0,0,0.05)"
                >
                  <Box w="60px" h="60px" bg="white" borderRadius="full" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                    <Text fontSize="1.1rem" fontWeight="800" color="#1a365d">{displayMetrics.attendance_rate}%</Text>
                  </Box>
                </Box>
              </Flex>
            </Box>

            <Grid flex="1" templateColumns="repeat(4, 1fr)" gap="1rem" w="100%">
              {[
                { label: t("dashboard.admin.sessions_label"), val: displayMetrics.total_sessions, icon: FiActivity, col: "#3182ce" },
                { label: t("dashboard.admin.present_label"), val: displayMetrics.present_count, icon: FiCheckCircle, col: "#2d7f4b" },
                { label: t("dashboard.admin.late_label"), val: displayMetrics.late_count, icon: FiClock, col: "#f0b342" },
                { label: t("dashboard.admin.absent_label"), val: displayMetrics.absent_count, icon: FiAlertTriangle, col: "#c03b33" }
              ].map((stat, idx) => (
                <Box key={idx} bg="#f8fafc" p="0.8rem" borderRadius="12px" border="1px solid #edf2f7" textAlign="center">
                  <Icon as={stat.icon} color={stat.col} mb="4px" boxSize={3} />
                  <Text fontSize="1.2rem" fontWeight="800" color="#102a47">{stat.val}</Text>
                  <Text fontSize="0.55rem" fontWeight="700" color="#718096" textTransform="uppercase" letterSpacing="0.5px">{stat.label}</Text>
                </Box>
              ))}
            </Grid>
          </Flex>
        </Box>
      </Container>
    </Box>
  )
}
