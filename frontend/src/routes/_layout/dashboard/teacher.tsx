import {
  Box,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  Icon,
  Input,
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFilter,
  FiList,
  FiMinus,
  FiPieChart,
  FiSearch,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi"

import {
  AcademicYearsService,
  TeacherAnalyticsService,
  TeachersService,
} from "@/client"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/dashboard/teacher")({
  component: TeacherDashboard,
})

// --- Components ---

// --- Shared Premium Components ---

const KPICard = ({ title, value, subLeft, trendValue, trendIcon, trendColor, icon, isLoading }: any) => (
  <Box bg="white" p="0.8rem 1rem" borderRadius="12px" border="1px solid #e3ecf7" boxShadow="0 2px 10px rgba(0,25,50,0.03)" position="relative">
    <Flex justifyContent="space-between" mb="4px">
      <Text fontSize="0.7rem" fontWeight="600" color="#647b9c" textTransform="uppercase" letterSpacing="0.02em">{title}</Text>
      <Icon as={icon} color="#a0aec0" fontSize="0.9rem" />
    </Flex>
    {isLoading ? <Spinner size="xs" color="ui.main" my="10px" /> : (
      <>
        <Heading fontSize="1.8rem" fontWeight="750" color="#1a365d" letterSpacing="-0.03em">{value}</Heading>
        <Flex justifyContent="space-between" alignItems="center" mt="4px">
          <Text fontSize="0.65rem" color="#718096" fontWeight="500">{subLeft}</Text>
          {trendValue && (
            <HStack gap="2px" color={`${trendColor}.500`} bg={`${trendColor}.50`} px="6px" py="1px" borderRadius="10px">
              <Icon as={trendIcon} fontSize="0.65rem" />
              <Text fontSize="0.65rem" fontWeight="700">{trendValue}</Text>
            </HStack>
          )}
        </Flex>
      </>
    )}
  </Box>
)

const HorizontalBarChart = ({ title, icon, data, dataKey, labelKey, colorScheme = "blue" }: any) => {
  const maxVal = 100 // Les valeurs sont déjà des pourcentages (0-100)
  return (
    <Box bg="white" borderRadius="12px" p="1rem" border="1px solid #e3ecf7" boxShadow="0 2px 10px rgba(0,25,50,0.03)">
      <Flex justifyContent="space-between" alignItems="center" mb="12px">
        <Heading fontSize="0.95rem" fontWeight="600" color="#1a365d">
          <Icon as={icon} mr={2} boxSize={4} /> {title}
        </Heading>
        <Box bg="#edf3fd" px="8px" py="2px" borderRadius="10px" fontSize="0.65rem" fontWeight="600" color="#1e4e8c">Top 8</Box>
      </Flex>
      <VStack gap="10px" alignItems="stretch">
        {data.map((item: any, i: number) => {
          const val = item[dataKey]
          const pct = (val / maxVal) * 100
          return (
            <Box key={i}>
              <Flex justifyContent="space-between" mb="3px" fontSize="0.7rem" fontWeight="600">
                <Text color="#4a5568" truncate maxW="150px">{item[labelKey]}</Text>
                <Text color="#1a365d">{val}%</Text>
              </Flex>
              <Box w="100%" h="6px" bg="#f1f5f9" borderRadius="full" overflow="hidden">
                <Box
                  h="100%"
                  w={`${pct}%`}
                  bg={colorScheme === "blue" ? "linear-gradient(90deg, #4299E1, #2B6CB0)" : "linear-gradient(90deg, #48BB78, #2F855A)"}
                  borderRadius="full"
                  transition="width 0.8s ease-out"
                />
              </Box>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}

const TeacherCourseCard = ({ name, code, progress, students, attendance, average_exam, year }: any) => (
  <Box bg="white" borderRadius="12px" p="0.8rem" border="1px solid #e2ecf9" boxShadow="0 2px 8px rgba(0,20,40,0.03)" _hover={{ borderColor: "#b0c9ed" }}>
    <Flex justifyContent="space-between" alignItems="center" fontWeight="650" fontSize="0.85rem" color="#0e2742" mb="6px">
      <Text truncate maxW="120px" title={name}>{name}</Text>
      <Text bg="#dfe9f5" px="0.5rem" py="0.1rem" borderRadius="10px" fontSize="0.55rem" fontWeight="600" color="#1f4d86">{code}</Text>
    </Flex>
    <Flex justifyContent="space-between" alignItems="center" mb="6px">
      <HStack gap="4px" fontSize="0.65rem" color="#718096">
        <Icon as={FiUsers} />
        <Text>{students} étudiants · Niv. {year}</Text>
      </HStack>
    </Flex>
    <Box w="100%" h="4px" bg="#f1f5f9" borderRadius="full" mb="8px">
      <Box h="100%" w={`${progress}%`} bg={progress > 75 ? "#2d7f4b" : progress > 50 ? "#2b6cb0" : "#c53030"} borderRadius="full" />
    </Box>
    <Flex gap="6px" bg="#f6fafe" borderRadius="8px" p="0.4rem" justifyContent="space-around">
      <VStack gap={0}><Text fontSize="0.5rem" color="#5b779b">PROG</Text><Text fontWeight="700" fontSize="0.8rem">{progress}%</Text></VStack>
      <VStack gap={0}><Text fontSize="0.5rem" color="#5b779b">EXAM</Text><Text fontWeight="700" fontSize="0.8rem">{average_exam > 0 ? `${Math.round(average_exam * 10) / 10}` : "—"}</Text></VStack>
      <VStack gap={0}><Text fontSize="0.5rem" color="#5b779b">ASS</Text><Text fontWeight="700" fontSize="0.8rem" color={attendance > 80 ? "#2d7f4b" : "#c05621"}>{attendance}%</Text></VStack>
    </Flex>
  </Box>
)

function TeacherDashboard() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  // Selection States
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("")
  const [selectedProgramLevel, setSelectedProgramLevel] = useState<string>("")
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | "">("")
  const [searchTerm, setSearchTerm] = useState("")

  // --- Data Fetching ---

  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ["teacher_by_user", currentUser?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: currentUser!.id }),
    enabled: !!currentUser,
  })

  const { data: academicYears } = useQuery({
    queryKey: ["academic_years"],
    queryFn: () => AcademicYearsService.readAcademicYears({ limit: 100 }),
  })

  const { data: assignedProgramLevels } = useQuery({
    queryKey: ["assigned_program_levels", teacherData?.id, selectedAcademicYear],
    queryFn: () =>
      TeacherAnalyticsService.getAssignedProgramLevels({
        teacherId: teacherData!.id,
        academicYearId: selectedAcademicYear || undefined,
      }),
    enabled: !!teacherData?.id,
  })

  useEffect(() => {
    if (academicYears?.data?.length && !selectedAcademicYear) {
      const current = academicYears.data.find((y) => y.is_current)
      if (current) setSelectedAcademicYear(current.id)
    }
  }, [academicYears, selectedAcademicYear])

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: [
      "teacher_dashboard_metrics",
      teacherData?.id,
      selectedAcademicYear,
      selectedProgramLevel,
      selectedYearLevel,
    ],
    queryFn: () =>
      TeacherAnalyticsService.getTeacherDashboardMetrics({
        teacherId: teacherData!.id,
        academicYearId: selectedAcademicYear || undefined,
        programLevelId: selectedProgramLevel || undefined,
        yearLevel: selectedYearLevel === "" ? undefined : selectedYearLevel,
      }),
    enabled: !!teacherData?.id,
  })

  const performanceChartData = useMemo(() => {
    if (!metricsData?.course_metrics) return []
    return metricsData.course_metrics.slice(0, 8).map((cm: any) => ({
      name: cm.course_name.substring(0, 10),
      score: Math.round(cm.average_progress),
    }))
  }, [metricsData])

  const attendanceChartData = useMemo(() => {
    if (!metricsData?.course_metrics) return []
    return metricsData.course_metrics.slice(0, 8).map((cm: any) => ({
      name: cm.course_name.substring(0, 10),
      rate: Math.round(cm.attendance_rate),
    }))
  }, [metricsData])

  const filteredCourses = useMemo(() => {
    const courses = metricsData?.course_metrics || []
    if (!searchTerm) return courses
    return courses.filter(
      (c: any) =>
        c.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.course_code.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [metricsData, searchTerm])

  if (teacherLoading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="ui.main" />
      </Flex>
    )
  }

  return (
    <Box bg="#f0f5fa" minH="100vh" py="1.5rem" fontFamily="'Inter', sans-serif">
      <Container maxW="1600px">
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center" mb="1.2rem" wrap="wrap" gap="0.6rem">
          <Box>
            <Heading fontSize="1.25rem" fontWeight="600" color="#13294b" letterSpacing="-0.02em" display="flex" alignItems="center">
              <Icon as={FiActivity} mr="8px" color="#214973" />
              {t("dashboard.teacher_title", { defaultValue: "Tableau de Bord Enseignant" })}
            </Heading>
            <Text color="#4c658a" fontWeight="400" mt="1px" fontSize="0.75rem">
              {t("dashboard.teacher.subtitle")}
            </Text>
          </Box>

          <HStack bg="white" borderRadius="12px" p="0.4rem 1rem" boxShadow="0 2px 8px rgba(0,20,40,0.04)" gap="12px" wrap="wrap">
            <HStack color="#1f3b62" fontWeight="500" fontSize="0.75rem">
              <Icon as={FiCreditCard} color="#2a5f8a" mr="3px" />
              <Text>{currentUser?.first_name} {currentUser?.last_name} · Enseignant</Text>
            </HStack>
            <Box w="1px" h="10px" bg="gray.100" display={{ base: "none", md: "block" }} />

            {/* Academic Year Filter */}
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }}>
                  <Icon as={FiCalendar} color="#2a5f8a" mr="3px" />
                  <Text>{academicYears?.data?.find(y => y.id === selectedAcademicYear)?.name || t("dashboard.teacher.year_placeholder")}</Text>
                  <Icon as={FiFilter} fontSize="0.7rem" />
                </HStack>
              </MenuTrigger>
              <MenuContent minW="150px" bg="white" borderRadius="12px" border="1px solid #e2ecf9" p="4px">
                <MenuItem value="" fontSize="0.75rem" borderRadius="8px" onClick={() => setSelectedAcademicYear("")}>{t("dashboard.teacher.all_years")}</MenuItem>
                {academicYears?.data?.map((y) => (
                  <MenuItem key={y.id} value={y.id} fontSize="0.75rem" borderRadius="8px" onClick={() => setSelectedAcademicYear(y.id)}>
                    {y.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>

            <Box w="1px" h="10px" bg="gray.100" />

            {/* Program Filter */}
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }}>
                  <Icon as={FiList} color="#2a5f8a" mr="3px" />
                  <Text truncate maxW="150px">{String(assignedProgramLevels?.find(p => p.id === selectedProgramLevel)?.name ?? t("dashboard.teacher.program_placeholder"))}</Text>
                  <Icon as={FiFilter} fontSize="0.7rem" />
                </HStack>
              </MenuTrigger>
              <MenuContent minW="180px" bg="white" borderRadius="12px" border="1px solid #e2ecf9" p="4px">
                <MenuItem value="" fontSize="0.75rem" borderRadius="8px" onClick={() => setSelectedProgramLevel("")}>{t("dashboard.teacher.all_programs")}</MenuItem>
                {assignedProgramLevels?.map((p) => (
                  <MenuItem key={String(p.id)} value={String(p.id)} fontSize="0.75rem" borderRadius="8px" onClick={() => setSelectedProgramLevel(String(p.id))}>
                    {String(p.name)}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>

            <Box w="1px" h="10px" bg="gray.100" />

            {/* Year Level Filter */}
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }}>
                  <Icon as={FiTrendingUp} color="#2a5f8a" mr="3px" />
                  <Text>{selectedYearLevel ? t("dashboard.common.year_label", { level: selectedYearLevel }) : t("dashboard.teacher.level_placeholder")}</Text>
                  <Icon as={FiFilter} fontSize="0.7rem" />
                </HStack>
              </MenuTrigger>
              <MenuContent minW="120px" bg="white" borderRadius="12px" border="1px solid #e2ecf9" p="4px">
                <MenuItem value="" fontSize="0.75rem" borderRadius="8px" onClick={() => setSelectedYearLevel("")}>{t("dashboard.teacher.all_levels")}</MenuItem>
                {[1, 2, 3, 4, 5].map((y) => (
                  <MenuItem key={y} value={y.toString()} fontSize="0.75rem" borderRadius="8px" onClick={() => setSelectedYearLevel(y)}>
                    {t("dashboard.common.year_label", { level: y })}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>
          </HStack>
        </Flex>

        {/* KPI Grid */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap="1rem" mb="1.2rem">
          <KPICard
            title={t("dashboard.teacher.kpi_students")}
            value={metricsData?.total_students || 0}
            subLeft={t("dashboard.teacher.kpi_students_sub")}
            icon={FiUsers}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.teacher.kpi_courses")}
            value={metricsData?.total_courses || 0}
            subLeft={t("dashboard.teacher.kpi_courses_sub")}
            icon={FiBook}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.teacher.kpi_progress")}
            value={`${Math.round(metricsData?.average_student_progress || 0)}%`}
            subLeft={t("dashboard.teacher.kpi_progress_sub")}
            icon={FiActivity}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.teacher.kpi_attendance")}
            value={`${Math.round(metricsData?.attendance_rate || 0)}%`}
            subLeft={t("dashboard.teacher.kpi_attendance_sub")}
            trendValue={`${metricsData?.absent_count || 0} abs`}
            trendIcon={FiMinus}
            trendColor="orange"
            icon={FiUserCheck}
            isLoading={metricsLoading}
          />
        </Grid>

        {/* Charts Row */}
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="1rem" mb="1.2rem">
          <HorizontalBarChart
            title={t("dashboard.common.performance_by_course")}
            icon={FiTrendingUp}
            data={performanceChartData}
            dataKey="score"
            labelKey="name"
            colorScheme="blue"
          />
          <HorizontalBarChart
            title={t("dashboard.common.attendance_by_course")}
            icon={FiBarChart2}
            data={attendanceChartData}
            dataKey="rate"
            labelKey="name"
            colorScheme="teal"
          />
        </Grid>

        {/* Course Grid Title */}
        <Flex justifyContent="space-between" alignItems="center" my="1.2rem 0.8rem">
          <Heading fontWeight="600" color="#10243f" fontSize="1.15rem">
            <Icon as={FiBookOpen} mr={2} />
            {t("dashboard.teacher.modules_title")}
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
          {filteredCourses.map((c: any, i: number) => (
            <TeacherCourseCard
              key={i}
              name={c.course_name}
              code={c.course_code}
              progress={Math.round(c.average_progress)}
              students={c.student_count}
              attendance={Math.round(c.attendance_rate)}
              average_exam={Math.round(c.exam_average)}
              average_participation={Math.round(c.participation_average)}
              year={c.year_level}
            />
          ))}
          {filteredCourses.length === 0 && (
            <Box gridColumn="1 / -1" bg="white" p="3rem" borderRadius="12px" textAlign="center" border="1px dashed #cbd5e0">
              <Icon as={FiBook} fontSize="2.5rem" color="#cbd5e0" mb="1rem" />
              <Text color="#718096" fontWeight="500">{t("dashboard.teacher.no_courses")}</Text>
            </Box>
          )}
        </Grid>

        {/* Bottom Attendance Detail */}
        <Grid templateColumns={{ base: "1fr", lg: "1.2fr 2fr" }} gap="1rem">
          <Box bg="white" borderRadius="12px" p="1rem" border="1px solid #e3ecf7">
            <Heading fontSize="0.95rem" mb="12px" color="#1f3d68">
              <Icon as={FiPieChart} mr={2} /> {t("dashboard.teacher.aggregated_attendance")}
            </Heading>
            <Flex alignItems="center" justifyContent="center" gap="10px" my="10px 15px">
              <Box
                w="70px"
                h="70px"
                borderRadius="full"
                bg={`conic-gradient(#2d7f4b 0% ${metricsData?.attendance_rate || 0}%, #c03b33 ${metricsData?.attendance_rate || 0}% 100%)`}
                border="2px solid white"
                boxShadow="0 4px 10px rgba(0,0,0,0.05)"
              />
              <VStack alignItems="start" gap="1px" fontSize="0.75rem">
                <HStack><Box w="6px" h="6px" borderRadius="full" bg="#2d7f4b" /><Text color="#4a5568">{t("dashboard.teacher.present_label", { rate: Math.round(metricsData?.attendance_rate || 0) })}</Text></HStack>
                <HStack><Box w="6px" h="6px" borderRadius="full" bg="#f0b342" /><Text color="#4a5568">{t("dashboard.teacher.late_label", { count: metricsData?.late_count || 0 })}</Text></HStack>
                <HStack><Box w="6px" h="6px" borderRadius="full" bg="#c03b33" /><Text color="#4a5568">{t("dashboard.teacher.absence_label", { count: metricsData?.absent_count || 0 })}</Text></HStack>
              </VStack>
            </Flex>
            <Flex justifyContent="space-between" bg="#f4f9ff" p="0.7rem 1rem" borderRadius="10px" my="12px">
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e">{metricsData?.total_attendance_sessions || 0}</Text><Text fontSize="9px" color="#647b9c" textTransform="uppercase">sessions</Text></VStack>
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e">{metricsData?.present_count || 0}</Text><Text fontSize="9px" color="#647b9c" textTransform="uppercase">présences</Text></VStack>
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e">{metricsData?.late_count || 0}</Text><Text fontSize="9px" color="#647b9c" textTransform="uppercase">retards</Text></VStack>
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e">{metricsData?.absent_count || 0}</Text><Text fontSize="9px" color="#647b9c" textTransform="uppercase">absences</Text></VStack>
            </Flex>
          </Box>

          <Box bg="white" borderRadius="12px" p="1rem" border="1px solid #e3ecf7">
            <Heading fontSize="0.95rem" mb="12px" color="#1f3d68">
              <Icon as={FiClock} mr={2} /> {t("dashboard.teacher.activities_title")}
            </Heading>
            <VStack gap="6px" alignItems="stretch">
              <Flex bg="#f0fdf4" p="0.55rem" borderRadius="8px" justifyContent="space-between" alignItems="center" borderLeft="3px solid #38a169">
                <HStack gap="8px">
                  <Icon as={FiCheckCircle} color="green.500" fontSize="0.8rem" />
                  <Text fontSize="0.75rem" fontWeight="600" color="#2d3748">{t("dashboard.teacher.presences_recorded", { count: metricsData?.present_count || 0 })}</Text>
                </HStack>
                <Text fontSize="0.7rem" color="#a0aec0">{t("dashboard.teacher.ass_pct", { rate: Math.round(metricsData?.attendance_rate || 0) })}</Text>
              </Flex>
              <Flex bg="#fff7ed" p="0.55rem" borderRadius="8px" justifyContent="space-between" alignItems="center" borderLeft="3px solid #d97706">
                <HStack gap="8px">
                  <Icon as={FiClock} color="orange.500" fontSize="0.8rem" />
                  <Text fontSize="0.75rem" fontWeight="600" color="#2d3748">{t("dashboard.teacher.lates_reported", { count: metricsData?.late_count || 0 })}</Text>
                </HStack>
                <Text fontSize="0.7rem" color="#a0aec0">{t("dashboard.teacher.sessions_count", { count: metricsData?.total_attendance_sessions || 0 })}</Text>
              </Flex>
              <Flex bg={metricsData?.absent_count && metricsData.absent_count > 0 ? "#fef2f2" : "#f8fafc"} p="0.55rem" borderRadius="8px" justifyContent="space-between" alignItems="center" borderLeft={metricsData?.absent_count && metricsData.absent_count > 0 ? "3px solid #e53e3e" : "3px solid #cbd5e0"}>
                <HStack gap="8px">
                  <Icon as={FiAlertTriangle} color={metricsData?.absent_count && metricsData.absent_count > 0 ? "red.500" : "gray.400"} fontSize="0.8rem" />
                  <Text fontSize="0.75rem" fontWeight="600" color="#2d3748">{t("dashboard.teacher.absences_unjustified", { count: metricsData?.absent_count || 0 })}</Text>
                </HStack>
                <Text fontSize="0.7rem" color="#a0aec0">{t("dashboard.teacher.courses_count", { count: metricsData?.total_courses || 0 })}</Text>
              </Flex>
            </VStack>
          </Box>
        </Grid>

        {/* Footer */}
        <Flex mt="1.2rem" fontSize="0.7rem" color="#6681a5" gap="1.2rem" borderTop="1px dashed #b7ceea" pt="1rem" wrap="wrap" justifyContent="space-between">
          <Text fontWeight="500">{t("dashboard.teacher.footer_portal", { year: new Date().getFullYear() })}</Text>
          <HStack><Icon as={FiClock} /><Text>{t("dashboard.teacher.footer_updated", { time: new Date().toLocaleTimeString() })}</Text></HStack>
        </Flex>
      </Container>
    </Box>
  )
}

export default TeacherDashboard
