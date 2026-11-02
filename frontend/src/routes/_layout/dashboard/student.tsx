import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
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
  FiAlertTriangle,
  FiArrowUp,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiFilter,
  FiLayers,
  FiMinus,
  FiPieChart,
  FiRefreshCw,
  FiSearch,
  FiStar,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi"

import { StudentAnalyticsService, StudentsService } from "@/client"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/dashboard/student")({
  component: StudentDashboard,
})

// --- Styled Components ---

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
        <HStack gap="12px">
          {legend.map((l: any, i: number) => (
            <HStack key={i} gap={1} fontSize="0.7rem">
              <Box w="8px" h="8px" borderRadius="10px" bg={l.color} />
              <Text color="gray.600" fontSize="0.7rem">{l.label}</Text>
            </HStack>
          ))}
        </HStack>
      </Flex>

      <VStack alignItems="stretch" gap="10px" mt="10px">
        {data.map((item: any, i: number) => (
          <Flex key={i} alignItems="center" gap="6px">
            <Text w="55px" fontWeight="600" color="#304d76" fontSize="0.75rem" truncate>
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

const CourseCard = ({ name, code, progress, scores }: any) => {
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
          <Text fontSize="0.5rem" textTransform="uppercase" color="#5b779b" fontWeight="500">TOT</Text>
          <Text fontWeight="700" fontSize="0.85rem" color="#102a47">{scores.tot}</Text>
        </VStack>
        <VStack gap={0} alignItems="center">
          <Text fontSize="0.5rem" textTransform="uppercase" color="#5b779b" fontWeight="500">EX</Text>
          <Text fontWeight="700" fontSize="0.85rem" color="#102a47">{scores.ex}</Text>
        </VStack>
        <VStack gap={0} alignItems="center">
          <Text fontSize="0.5rem" textTransform="uppercase" color="#5b779b" fontWeight="500">PA</Text>
          <Text fontWeight="700" fontSize="0.85rem" color="#102a47">{scores.pa}</Text>
        </VStack>
      </Flex>

      <Box h="8px" bg="#dde5f0" borderRadius="10px" overflow="hidden" my="12px">
        <Box
          h="100%"
          bg={progress < 35 ? "#b5443a" : progress >= 50 ? "#1f8b4c" : "#266eb0"}
          w={`${progress}%`}
          borderRadius="10px"
        />
      </Box>

      <Flex justifyContent="space-between" color="#6882a5" fontSize="0.7rem">
        <Text display="flex" alignItems="center">
          <Icon as={progress >= 50 ? FiCheckCircle : FiClock} mr={1} color={progress >= 50 ? "#1f8b4c" : "inherit"} />
          {progress === 0 ? "pas commencé" : progress >= 50 ? "validé" : `progression ${progress}%`}
        </Text>
        <Box
          bg={progress >= 50 ? "#e2f0e8" : "#edf3fd"}
          px="0.7rem"
          py="0.1rem"
          borderRadius="12px"
          fontSize="0.65rem"
          fontWeight="600"
          color={progress >= 50 ? "#2b7d4c" : "#1c4582"}
        >
          {progress >= 50 ? "validé" : progress > 0 ? "en cours" : "non débuté"}
        </Box>
      </Flex>
    </Box>
  )
}

function StudentDashboard() {
  const { user: currentUser } = useAuth()
  const { t } = useTranslation()
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | "">("")
  const [searchTerm, setSearchTerm] = useState("")

  // --- Data Fetching ---
  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ["student_by_user", currentUser?.id],
    queryFn: () => StudentsService.readStudentByUser({ userId: currentUser!.id }),
    enabled: !!currentUser,
  })

  useEffect(() => {
    if (studentData && selectedYearLevel === "") {
      setSelectedYearLevel(studentData.current_year_level || 1)
    }
  }, [studentData, selectedYearLevel])

  // year_level from student, overridable by filter. No academic_year_id filter.
  const studentYearLevel = selectedYearLevel || studentData?.current_year_level || 1

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["student_dashboard_metrics", studentData?.id, studentYearLevel],
    queryFn: () => StudentAnalyticsService.getStudentDashboardMetrics({
      studentId: studentData!.id,
      yearLevel: studentYearLevel as number,
    }),
    enabled: !!studentData?.id,
  })

  // Prepare Chart Data
  const academicChartData = useMemo(() => {
    if (!(metricsData as any)?.course_progress) return []
    return (metricsData as any).course_progress
      .filter((cp: any) => (cp.max_score_sum || 0) > 0)
      .slice(0, 6)
      .map((cp: any) => ({
        name: cp.course_name.substring(0, 6).toUpperCase(),
        score: Math.round(cp.progress_percentage),
        color: cp.progress_percentage > 75
          ? "linear-gradient(90deg, #1f8b4c, #41b77b)"
          : cp.progress_percentage > 50
            ? "linear-gradient(90deg, #da7b38, #e89f62)"
            : "linear-gradient(90deg, #b5443a, #cd6b62)",
      }))
  }, [metricsData])

  const attendanceChartData = useMemo(() => {
    if (!metricsData) return []
    const globalRate = (metricsData as any).attendance_rate || 0
    return ((metricsData as any).course_progress || [])
      .filter((cp: any) => (cp.max_score_sum || 0) > 0)
      .slice(0, 6)
      .map((cp: any) => {
        // Utiliser le taux par cours s'il est disponible, sinon le taux global
        const rate = cp.attendance_rate !== undefined ? cp.attendance_rate : globalRate
        return {
          name: cp.course_name.substring(0, 6).toUpperCase(),
          rate: Math.round(rate),
          color: rate > 80
            ? "linear-gradient(90deg, #1f8b4c, #41b77b)"
            : rate > 60
              ? "linear-gradient(90deg, #da7b38, #e89f62)"
              : "linear-gradient(90deg, #b5443a, #cd6b62)",
        }
      })
  }, [metricsData])

  // Average grade in /20 — computed from course_progress (score_sum / max_score_sum * 20)
  const averageGrade20 = useMemo(() => {
    const courses = ((metricsData as any)?.course_progress || []).filter(
      (cp: any) => (cp.max_score_sum || 0) > 0
    )
    if (courses.length === 0) return 0
    const total = courses.reduce((sum: number, cp: any) => {
      return sum + (cp.score_sum / cp.max_score_sum) * 20
    }, 0)
    return Math.round((total / courses.length) * 10) / 10
  }, [metricsData])

  // A course is "completed/validated" when score >= 50% of max (≡ 10/20)
  const completedCourses = useMemo(() => {
    return ((metricsData as any)?.course_progress || []).filter(
      (cp: any) => (cp.max_score_sum || 0) > 0 && cp.progress_percentage >= 50,
    ).length
  }, [metricsData])

  const activeCourses = useMemo(() => {
    const toNote20 = (score: number, max: number) =>
      max > 0 ? Math.round((score / max) * 20 * 10) / 10 : 0

    const courses = ((metricsData as any)?.course_progress || []).map((cp: any) => ({
      name: cp.course_name,
      code: cp.course_code,
      progress: Math.round(cp.progress_percentage),
      scores: {
        tot: `${toNote20(cp.score_sum, cp.max_score_sum)}/20`,
        ex: cp.exam_max_score_sum > 0
          ? `${toNote20(cp.exam_score_sum, cp.exam_max_score_sum)}/20`
          : "—",
        pa: cp.participation_max_score_sum > 0
          ? `${toNote20(cp.participation_score_sum, cp.participation_max_score_sum)}/20`
          : "—",
      }
    }))

    if (!searchTerm) return courses
    return courses.filter((c: any) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [metricsData, searchTerm])

  if (studentLoading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="ui.main" />
      </Flex>
    )
  }

  if (!studentData) {
    return (
      <Flex justify="center" align="center" minH="60vh" direction="column" gap={4}>
        <Icon as={FiAlertTriangle} fontSize="3rem" color="orange.400" />
        <Text fontWeight="600" color="#1f3b62" fontSize="1.1rem">
          Aucun profil étudiant trouvé pour ce compte.
        </Text>
        <Text color="gray.500" fontSize="0.85rem">
          Veuillez contacter l'administration pour lier votre compte à un dossier étudiant.
        </Text>
      </Flex>
    )
  }

  return (
    <Box bg="#f0f5fa" minH="100vh" py="2rem" fontFamily="'Inter', sans-serif">
      <Container maxW="1600px">

        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center" mb="1.2rem" wrap="wrap" gap="0.6rem">
          <Box>
            <Heading fontSize="1.25rem" fontWeight="600" color="#13294b" letterSpacing="-0.02em" display="flex" alignItems="center">
              <Icon as={FiPieChart} mr="8px" color="#214973" />
              {t("dashboard.student_title", { defaultValue: "Tableau de Bord Étudiant" })}
            </Heading>
            <Text color="#4c658a" fontWeight="400" mt="1px" fontSize="0.75rem">
              Vue d’ensemble des performances et de l’assiduité · {t("dashboard.common.year_label", { level: studentYearLevel })}
            </Text>
          </Box>
          <HStack bg="white" borderRadius="12px" p="0.4rem 1rem 0.4rem 0.8rem" boxShadow="0 2px 8px rgba(0,20,40,0.04)" gap="12px">
            <HStack color="#1f3b62" fontWeight="500" fontSize="0.75rem">
              <Icon as={FiCreditCard} color="#2a5f8a" mr="3px" />
              <Text>{currentUser?.first_name} {currentUser?.last_name} · {studentData?.user?.user_number}</Text>
            </HStack>
            <Box w="1px" h="10px" bg="gray.100" />
            {/* Year level selector */}
            <HStack color="#1f3b62" fontWeight="500" fontSize="0.75rem">
              <Icon as={FiCalendar} color="#2a5f8a" mr="3px" />
              <Text>{t("dashboard.common.year_label", { level: studentYearLevel })}</Text>
            </HStack>
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <Box cursor="pointer" display="flex" alignItems="center" justifyContent="center" transition="all 0.2s" _hover={{ color: "ui.main" }}>
                  <Icon as={FiFilter} color="#2a5f8a" fontSize="0.8rem" />
                </Box>
              </MenuTrigger>
              <MenuContent minW="120px" bg="white" borderRadius="12px" border="1px solid #e2ecf9" boxShadow="0 4px 12px rgba(0,0,0,0.08)" p="4px">
                {[1, 2, 3, 4].map((year) => (
                  <MenuItem
                    key={year}
                    value={year.toString()}
                    fontSize="0.75rem"
                    borderRadius="8px"
                    fontWeight={selectedYearLevel === year ? "600" : "400"}
                    color={selectedYearLevel === year ? "ui.main" : "#1f3b62"}
                    _hover={{ bg: "#f0f7ff" }}
                    onClick={() => setSelectedYearLevel(year)}
                  >
                    {t("dashboard.common.year_label", { level: year })}
                  </MenuItem>
                ))}
              </MenuContent>
            </MenuRoot>
          </HStack>
        </Flex>

        {/* KPI Grid */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap="1rem" mb="1.2rem">
          <KPICard
            title={t("dashboard.student.kpi_courses")}
            value={`${completedCourses} / ${metricsData?.total_courses || 0}`}
            subLeft={t("dashboard.student.kpi_courses_sub", { level: studentYearLevel, count: completedCourses })}
            trendValue={metricsData?.total_courses ? `${Math.round((completedCourses / (metricsData.total_courses || 1)) * 100)}%` : "0%"}
            trendIcon={FiArrowUp}
            trendColor={completedCourses > 0 && completedCourses === (metricsData?.total_courses || 0) ? "green" : "blue"}
            icon={FiLayers}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.student.kpi_sessions")}
            value={metricsData?.total_attendance_sessions || 0}
            subLeft={t("dashboard.student.kpi_sessions_sub", { count: metricsData?.present_count || 0 })}
            trendValue={`${Math.round(((metricsData?.present_count || 0) / (metricsData?.total_attendance_sessions || 1)) * 100)}%`}
            trendColor="blue"
            icon={FiClock}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.student.kpi_attendance")}
            value={`${metricsData?.attendance_rate || 0}%`}
            subLeft={t("dashboard.student.kpi_attendance_sub", { present: metricsData?.present_count || 0, late: metricsData?.late_count || 0, absent: metricsData?.absent_count || 0 })}
            trendValue={`${metricsData?.absent_count || 0} abs`}
            trendIcon={FiMinus}
            trendColor="orange"
            icon={FiUserCheck}
            isLoading={metricsLoading}
          />
          <KPICard
            title={t("dashboard.student.kpi_grade")}
            value={`${averageGrade20} / 20`}
            subLeft={t("dashboard.student.kpi_grade_sub", { exams: Math.round(metricsData?.exam_count || 0), lab: Math.round(metricsData?.participation_count || 0) })}
            trendValue="+2%"
            trendIcon={FiArrowUp}
            trendColor="green"
            icon={FiStar}
            isLoading={metricsLoading}
          />
        </Grid>

        {/* Charts Row */}
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="1rem" mb="1.2rem">
          <HorizontalBarChart
            title={t("dashboard.common.performance_by_course")}
            icon={FiTrendingUp}
            data={academicChartData}
            dataKey="score"
            labelKey="name"
            legend={[
              { label: t("dashboard.common.excellent_75"), color: "#1f8b4c" },
              { label: t("dashboard.common.good_50"), color: "#da7b38" },
              { label: t("dashboard.common.improve_50"), color: "#b5443a" }
            ]}
          />
          <HorizontalBarChart
            title={t("dashboard.common.attendance_by_course")}
            icon={FiCalendar}
            data={attendanceChartData}
            dataKey="rate"
            labelKey="name"
            legend={[
              { label: t("dashboard.common.excellent_80"), color: "#1f8b4c" },
              { label: t("dashboard.common.warn_60"), color: "#da7b38" },
              { label: t("dashboard.common.critical_60"), color: "#b5443a" }
            ]}
          />
        </Grid>

        {/* Course Grid Title */}
        <Flex justifyContent="space-between" alignItems="center" my="1.2rem 0.8rem">
          <Heading fontWeight="600" color="#10243f" fontSize="1.15rem">
            <Icon as={FiBookOpen} mr={2} />
            {t("dashboard.student.my_courses")}
          </Heading>
          <HStack bg="white" borderRadius="12px" border="1px solid #d6e2f0" px="0.6rem" py="0.2rem">
            <Icon as={FiSearch} color="#819cbf" fontSize="0.75rem" />
            <Input
              border="none"
              bg="transparent"
              placeholder={t("dashboard.common.search_course")}
              fontSize="0.75rem"
              w="150px"
              outline="none"
              _focus={{ outline: "none" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </HStack>
        </Flex>

        {/* Course Grid */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(5, 1fr)" }} gap="0.8rem" mb="1.5rem">
          {activeCourses.map((c: any, i: number) => (
            <CourseCard key={i} {...c} />
          ))}
        </Grid>

        {/* Bottom Stats */}
        <Grid templateColumns="1fr" gap="1rem" maxW="420px">
          {/* Global Attendance Detail */}
          <Box bg="white" borderRadius="12px" p="1rem" border="1px solid #e3ecf7">
            <Heading fontSize="0.95rem" mb="12px" color="#1f3d68">
              <Icon as={FiUsers} mr={2} /> {t("dashboard.student.global_attendance")}
            </Heading>
            <Flex alignItems="center" justifyContent="center" gap="10px" my="10px 15px">
              {/* Simplified CSS Ring */}
              <Box
                w="70px"
                h="70px"
                borderRadius="full"
                bg={`conic-gradient(#2d7f4b 0% ${metricsData?.attendance_rate || 0}%, #c03b33 ${metricsData?.attendance_rate || 0}% 100%)`}
                border="2px solid white"
                boxShadow="0 4px 10px rgba(0,0,0,0.05)"
              />
              <VStack alignItems="start" gap="1px" fontSize="0.75rem">
                <HStack><Box w="6px" h="6px" borderRadius="full" bg="#2d7f4b" /><Text>Présent {metricsData?.attendance_rate || 0}%</Text></HStack>
                <HStack><Box w="6px" h="6px" borderRadius="full" bg="#f0b342" /><Text>Retard {metricsData?.late_count || 0}</Text></HStack>
                <HStack><Box w="6px" h="6px" borderRadius="full" bg="#c03b33" /><Text>Absence {metricsData?.absent_count || 0}</Text></HStack>
              </VStack>
            </Flex>
            <Flex justifyContent="space-between" bg="#f4f9ff" p="0.7rem" borderRadius="10px" my="12px">
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e">{metricsData?.total_attendance_sessions || 0}</Text><Text fontSize="9px">sessions</Text></VStack>
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e">{metricsData?.present_count || 0}</Text><Text fontSize="9px">présences</Text></VStack>
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e" title="Retards">{metricsData?.late_count || 0}</Text><Text fontSize="9px">retards</Text></VStack>
              <VStack gap={0}><Text fontWeight="700" fontSize="1.1rem" color="#1f3a5e">{metricsData?.absent_count || 0}</Text><Text fontSize="9px">absences</Text></VStack>
            </Flex>
            <Flex bg="#fff2e5" borderRadius="12px" p="0.7rem 0.8rem" justifyContent="space-between" alignItems="center">
              <Text fontSize="0.75rem" display="flex" alignItems="center">
                <Icon as={FiAlertTriangle} color="#b85c42" mr={2} />
                {t("dashboard.student.status_label")} : {metricsData?.attendance_rate && metricsData.attendance_rate < 80 ? t("dashboard.student.status_critical") : t("dashboard.student.status_normal")}
              </Text>
              <Box bg="#edf3fd" px="0.6rem" py="0.1rem" borderRadius="12px" fontSize="0.65rem" fontWeight="600" color="#1c4582">
                vigilance
              </Box>
            </Flex>
          </Box>

        </Grid>

        {/* Micro Footer */}
        <Flex mt="1.2rem" fontSize="0.7rem" color="#6681a5" gap="1.2rem" borderTop="1px dashed #b7ceea" pt="1rem" wrap="wrap">
          <HStack><Icon as={FiBell} /><Text>Assiduité : {metricsData?.attendance_rate || 0}% · {metricsData?.absent_count || 0} absence(s)</Text></HStack>
          <HStack cursor="pointer" _hover={{ color: "ui.main" }}><Icon as={FiFileText} /><Text>{t("dashboard.student.footer_export")}</Text></HStack>
          <HStack><Icon as={FiRefreshCw} /><Text>mis à jour {new Date().toLocaleDateString("fr-FR")}</Text></HStack>
        </Flex>

      </Container>
    </Box>
  )
}
