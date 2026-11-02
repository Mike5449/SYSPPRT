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
import { FiBook, FiCheckCircle, FiChevronDown, FiRefreshCw, FiSearch } from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import {
  AssessmentsService,
  CourseSessionsService,
  GradesService,
  TeachersService,
} from "@/client"
import { GradeActionsMenu } from "@/components/Common/GradeActionsMenu"
import AddGrade from "@/components/grade/AddGrade"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
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

const gradeSearchSchema = z.object({
  page: z.number().catch(1),
  student_query: z.string().optional(),
  assessment_query: z.string().optional(),
  exam_type: z.string().optional(),
  is_published: z.boolean().optional(),
})

const PER_PAGE = 10

function getGradesQueryOptions({
  page,
  teacherId,
  isTeacher,
  student_query,
  assessment_query,
  exam_type,
  is_published,
}: {
  page: number
  teacherId?: string
  isTeacher?: boolean
  student_query?: string
  assessment_query?: string
  exam_type?: string
  is_published?: boolean
}) {
  return {
    queryFn: async () => {
      if (isTeacher && !teacherId) {
        // We're a teacher but don't have our ID yet - skip the API call
        return { data: [], count: 0 }
      }

      if (!teacherId) {
        // Load all grades for non-teachers (admins)
        return GradesService.readGrades({
          skip: (page - 1) * PER_PAGE,
          limit: PER_PAGE,
          studentQuery: student_query || undefined,
          assessmentQuery: assessment_query || undefined,
          examType: exam_type || undefined,
          isPublished: is_published ?? undefined,
        })
      }

      // For teachers, load only grades from their assessments
      try {
        const courseSessions = await CourseSessionsService.readCourseSessions({
          skip: 0,
          limit: 1000,
        })
        const teacherSessions = courseSessions.data.filter(
          (cs: any) => cs.teacher_id === teacherId,
        )

        // Load assessments from each teacher course session
        const allAssessmentIds: string[] = []
        for (const session of teacherSessions) {
          const assessments =
            await AssessmentsService.readAssessmentsByCourseSession({
              courseSessionId: session.id,
              skip: 0,
              limit: 1000,
            })
          allAssessmentIds.push(...assessments.data.map((a: any) => a.id))
        }

        if (allAssessmentIds.length === 0) {
          return { data: [], count: 0 }
        }

        // Load grades by assessment ID (teachers don't have permission to read all grades)
        const allGrades: any[] = []
        for (const assessmentId of allAssessmentIds) {
          const result = await GradesService.readGradesByAssessment({
            assessmentId,
            skip: 0,
            limit: 1000,
          })
          allGrades.push(...result.data)
        }

        // Apply filters client-side for teachers (since backend doesn't support them on readGradesByAssessment)
        let filteredGrades = allGrades
        if (student_query) {
          const q = student_query.toLowerCase()
          filteredGrades = filteredGrades.filter(
            (g) =>
              g.student?.user?.first_name?.toLowerCase().includes(q) ||
              g.student?.user?.last_name?.toLowerCase().includes(q) ||
              g.student?.user?.user_number?.toLowerCase().includes(q),
          )
        }
        if (assessment_query) {
          const q = assessment_query.toLowerCase()
          filteredGrades = filteredGrades.filter((g) =>
            g.assessment?.name?.toLowerCase().includes(q),
          )
        }
        if (exam_type) {
          filteredGrades = filteredGrades.filter(
            (g) => g.exam_type?.toLowerCase() === exam_type.toLowerCase(),
          )
        }
        if (is_published !== undefined) {
          filteredGrades = filteredGrades.filter(
            (g) => g.is_published === is_published,
          )
        }

        // Apply pagination
        const paginatedGrades = filteredGrades.slice(
          (page - 1) * PER_PAGE,
          page * PER_PAGE,
        )
        return {
          data: paginatedGrades,
          count: filteredGrades.length,
        }
      } catch (error) {
        console.error("Error loading teacher grades:", error)
        return { data: [], count: 0 }
      }
    },
    queryKey: [
      "grades",
      {
        page,
        teacherId,
        isTeacher,
        student_query,
        assessment_query,
        exam_type,
        is_published,
      },
    ],
    enabled: isTeacher ? !!teacherId : true,
  }
}

export const Route = createFileRoute("/_layout/grade")({
  component: GradePage,
  validateSearch: (search) => gradeSearchSchema.parse(search),
})

function GradeHeader({
  studentSearch,
  setStudentSearch,
  assessmentSearch,
  setAssessmentSearch,
  examTypeFilter,
  setExamTypeFilter,
  publishedFilter,
  setPublishedFilter,
}: {
  studentSearch: string
  setStudentSearch: (v: string) => void
  assessmentSearch: string
  setAssessmentSearch: (v: string) => void
  examTypeFilter: string
  setExamTypeFilter: (v: string) => void
  publishedFilter: string
  setPublishedFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const { user } = useAuth()
  const { data: userRoles } = useUserRoles(user?.id)
  const isStudent = (userRoles || []).some(
    (r: any) => (r.code || "").toUpperCase() === "STUDENT",
  )


  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["grades"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              RELEVÉ DE NOTES
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Notes
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("grade.description")}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label="Actualiser" borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          {!isStudent && <AddGrade />}
        </HStack>
      </Flex>

      <Flex bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} boxShadow="0 1px 2px rgba(20,34,30,0.04)" p="10px" gap="10px" align="center" wrap="wrap">
        <Text fontSize="9px" fontWeight="800" letterSpacing="0.8px" textTransform="uppercase" color={C.faint} pl="3px" pr="2px">
          Filtres
        </Text>
        <Box flex="1" minW="8px" />

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("grade.placeholders.search_student")} fontSize="13px" color={C.ink} w="130px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
        </HStack>

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiBook} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("grade.placeholders.search_assessment")} fontSize="13px" color={C.ink} w="130px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={assessmentSearch} onChange={(e) => setAssessmentSearch(e.target.value)} />
        </HStack>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiBook} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Type</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{examTypeFilter === "intra" ? "Intra" : examTypeFilter === "final" ? "Final" : examTypeFilter === "regular" ? "Régulier" : t("common.tables.all_types", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="140px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setExamTypeFilter(""); navigate({ to: "/grade", search: (prev) => ({ ...prev, exam_type: undefined, page: 1 }) }) }}>{t("common.tables.all_types", { defaultValue: "Tous" })}</MenuItem>
            <MenuItem value="intra" fontSize="13px" borderRadius="6px" onClick={() => { setExamTypeFilter("intra"); navigate({ to: "/grade", search: (prev) => ({ ...prev, exam_type: "intra", page: 1 }) }) }}>Intra</MenuItem>
            <MenuItem value="final" fontSize="13px" borderRadius="6px" onClick={() => { setExamTypeFilter("final"); navigate({ to: "/grade", search: (prev) => ({ ...prev, exam_type: "final", page: 1 }) }) }}>Final</MenuItem>
            <MenuItem value="regular" fontSize="13px" borderRadius="6px" onClick={() => { setExamTypeFilter("regular"); navigate({ to: "/grade", search: (prev) => ({ ...prev, exam_type: "regular", page: 1 }) }) }}>Régulier</MenuItem>
          </MenuContent>
        </MenuRoot>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiCheckCircle} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Statut</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{publishedFilter === "published" ? t("grade.table.published", { defaultValue: "Publié" }) : publishedFilter === "draft" ? t("grade.table.draft", { defaultValue: "Brouillon" }) : t("common.tables.all_status", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="150px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setPublishedFilter(""); navigate({ to: "/grade", search: (prev) => ({ ...prev, is_published: undefined, page: 1 }) }) }}>{t("common.tables.all_status", { defaultValue: "Tous" })}</MenuItem>
            <MenuItem value="published" fontSize="13px" borderRadius="6px" onClick={() => { setPublishedFilter("published"); navigate({ to: "/grade", search: (prev) => ({ ...prev, is_published: true, page: 1 }) }) }}>{t("grade.table.published", { defaultValue: "Publié" })}</MenuItem>
            <MenuItem value="draft" fontSize="13px" borderRadius="6px" onClick={() => { setPublishedFilter("draft"); navigate({ to: "/grade", search: (prev) => ({ ...prev, is_published: false, page: 1 }) }) }}>{t("grade.table.draft", { defaultValue: "Brouillon" })}</MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Box>
  )
}

function GradeTable({
  studentSearch,
  assessmentSearch,
}: {
  studentSearch: string
  assessmentSearch: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const {
    page,
    exam_type,
    is_published,
  } = Route.useSearch()
  const student_query = studentSearch
  const assessment_query = assessmentSearch

  // Sync debounced searches to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/grade", search: (prev) => ({ ...prev, student_query: studentSearch || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [studentSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/grade", search: (prev) => ({ ...prev, assessment_query: assessmentSearch || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [assessmentSearch]) // eslint-disable-line react-hooks/exhaustive-deps
  const { user } = useAuth()
  const { data: userRoles } = useUserRoles(user?.id)
  const isTeacher = (userRoles || []).some(
    (r: any) => (r.code || "").toUpperCase() === "TEACHER",
  )

  const { data: teacherData } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: user!.id }),
    enabled: !!user?.id && isTeacher,
  })

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getGradesQueryOptions({
      page,
      teacherId: isTeacher ? teacherData?.id : undefined,
      student_query,
      assessment_query,
      exam_type,
      is_published,
    }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/grade",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const grades = data?.data ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (grades.length === 0) {
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
                {t("common.tables.no_results")}
              </EmptyState.Title>
              <EmptyState.Description color="gray.500" fontSize="xs">
                {t("grade.add_description")}
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
        <Table.Root size="sm" interactive stickyHeader minW="1000px">
          <Table.Header>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("grade.table.id")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("grade.table.student")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("grade.table.assessment")}
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
                {t("grade.table.score")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("grade.table.grade")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("grade.table.exam_type")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("grade.table.status")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                flex="1"
                minW="150px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("grade.table.comments")}
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
                {t("grade.table.actions")}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {grades.map((grade) => (
              <Table.Row
                key={grade.id}
                opacity={isPlaceholderData ? 0.5 : 1}
                _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                transition="background 0.1s"
              >
                <Table.Cell w="80px" textAlign="center">
                  <Text fontSize="xs" fontFamily="mono" color="gray.600">
                    {grade.id?.toString().slice(-4) || t("common.tables.none")}
                  </Text>
                </Table.Cell>

                <Table.Cell w="180px">
                  <Text
                    fontWeight="600"
                    color="gray.800"
                    fontSize="xs"
                    truncate
                    title={`${grade.student?.user?.first_name} ${grade.student?.user?.last_name}`}
                  >
                    {grade.student?.user
                      ? `${grade.student.user.first_name} ${grade.student.user.last_name}`
                      : t("common.tables.unknown")}
                  </Text>
                </Table.Cell>

                <Table.Cell>
                  <Text
                    fontSize="xs"
                    color="gray.700"
                    truncate
                    title={grade.assessment?.name}
                  >
                    {grade.assessment?.name || t("common.tables.unknown")}
                  </Text>
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <Text
                    fontSize="xs"
                    color="gray.800"
                    fontFamily="mono"
                    fontWeight="600"
                  >
                    {grade.score !== null ? grade.score : "-"}
                  </Text>
                </Table.Cell>

                <Table.Cell w="100px">
                  <Badge
                    colorPalette={
                      (grade.score ?? 0) >= 90
                        ? "green"
                        : (grade.score ?? 0) >= 80
                          ? "blue"
                          : (grade.score ?? 0) >= 70
                            ? "orange"
                            : (grade.score ?? 0) >= 60
                              ? "yellow"
                              : "red"
                    }
                    variant="subtle"
                    size="xs"
                  >
                    {(grade.score ?? 0) >= 90
                      ? "A"
                      : (grade.score ?? 0) >= 80
                        ? "B"
                        : (grade.score ?? 0) >= 70
                          ? "C"
                          : (grade.score ?? 0) >= 60
                            ? "D"
                            : "F"}
                  </Badge>
                </Table.Cell>

                <Table.Cell w="120px" textAlign="center">
                  <Badge
                    colorPalette={
                      grade.exam_type?.toLowerCase() === "final"
                        ? "red"
                        : grade.exam_type?.toLowerCase() === "intra"
                          ? "purple"
                          : "blue"
                    }
                    variant="subtle"
                    size="xs"
                  >
                    {grade.exam_type?.toLowerCase() === "final"
                      ? t("grade.exam_types.final")
                      : grade.exam_type?.toLowerCase() === "intra"
                        ? t("grade.exam_types.intra")
                        : t("grade.exam_types.regular")}
                  </Badge>
                </Table.Cell>

                <Table.Cell w="120px" textAlign="center">
                  <Badge
                    colorPalette={grade.is_published ? "green" : "orange"}
                    variant={grade.is_published ? "solid" : "outline"}
                    size="xs"
                  >
                    {grade.is_published
                      ? t("grade.table.published")
                      : t("grade.table.draft")}
                  </Badge>
                </Table.Cell>

                <Table.Cell flex="1" minW="150px">
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    truncate
                    title={grade.comments || undefined}
                  >
                    {grade.comments || t("grade.table.no_comments")}
                  </Text>
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <GradeActionsMenu grade={grade} />
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
            items: t("grade.stats.total_grades"),
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

function GradePage() {
  const search = Route.useSearch()
  const [studentSearch, setStudentSearch] = useState(search.student_query || "")
  const [assessmentSearch, setAssessmentSearch] = useState(search.assessment_query || "")
  const [examTypeFilter, setExamTypeFilter] = useState(search.exam_type || "")
  const [publishedFilter, setPublishedFilter] = useState(
    search.is_published === true ? "published" : search.is_published === false ? "draft" : ""
  )

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <GradeHeader
          studentSearch={studentSearch}
          setStudentSearch={setStudentSearch}
          assessmentSearch={assessmentSearch}
          setAssessmentSearch={setAssessmentSearch}
          examTypeFilter={examTypeFilter}
          setExamTypeFilter={setExamTypeFilter}
          publishedFilter={publishedFilter}
          setPublishedFilter={setPublishedFilter}
        />
        <GradeTable studentSearch={studentSearch} assessmentSearch={assessmentSearch} />
      </Container>
    </Box>
  )
}
