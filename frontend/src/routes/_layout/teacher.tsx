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
  FiAward,
  FiBarChart,
  FiBriefcase,
  FiCalendar,
  FiHash,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUserCheck,
} from "react-icons/fi"
import { z } from "zod"

import { TeachersService } from "@/client"
import { TeacherActionsMenu } from "@/components/Common/TeacherActionsMenu"
import PendingItems from "@/components/Pending/PendingItems"
import AddTeacherWithUser from "@/components/teacher/AddTeacherWithUser"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"

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

const teacherSearchSchema = z.object({
  page: z.number().catch(1),
  q: z.string().optional(),
  specialization: z.string().optional(),
})

const PER_PAGE = 10

function getTeachersQueryOptions({
  page,
  q,
  specialization,
}: {
  page: number
  q?: string
  specialization?: string
}) {
  return {
    queryFn: () =>
      TeachersService.readTeachers({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        q: q || undefined,
        specialization: specialization || undefined,
      }),
    queryKey: ["teachers", { page, q, specialization }],
  }
}

export const Route = createFileRoute("/_layout/teacher")({
  component: TeacherPage,
  validateSearch: (search) => teacherSearchSchema.parse(search),
})

function TeacherHeader({
  teacherSearch,
  setTeacherSearch,
  specializationFilter,
  setSpecializationFilter,
}: {
  teacherSearch: string
  setTeacherSearch: (v: string) => void
  specializationFilter: string
  setSpecializationFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })


  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["teachers"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              CORPS ENSEIGNANT
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Enseignants
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("common.tables.description_teacher", {
                defaultValue: "Gérer le personnel enseignant, grades académiques et affectations",
              })}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label={t("common.tables.refresh")} borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          <AddTeacherWithUser />
        </HStack>
      </Flex>

      <Flex bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} boxShadow="0 1px 2px rgba(20,34,30,0.04)" p="10px" gap="10px" align="center" wrap="wrap">
        <Text fontSize="9px" fontWeight="800" letterSpacing="0.8px" textTransform="uppercase" color={C.faint} pl="3px" pr="2px">
          Filtres
        </Text>
        <Box flex="1" minW="8px" />

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("common.tables.search_teacher", { defaultValue: "Rechercher…" })} fontSize="13px" color={C.ink} w="150px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} />
        </HStack>

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiBriefcase} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("common.tables.specialization", { defaultValue: "Spécialisation" })} fontSize="13px" color={C.ink} w="140px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={specializationFilter} onChange={(e) => { setSpecializationFilter(e.target.value); navigate({ to: "/teacher", search: (prev) => ({ ...prev, specialization: e.target.value || undefined, page: 1 }) }) }} />
        </HStack>
      </Flex>
    </Box>
  )
}

function TeacherTable({ teacherSearch }: { teacherSearch: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, specialization } = Route.useSearch()
  const q = teacherSearch

  // Sync debounced search to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/teacher", search: (prev) => ({ ...prev, q: teacherSearch || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [teacherSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getTeachersQueryOptions({ page, q, specialization }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/teacher",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const teachers = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (teachers.length === 0) {
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
                {t("common.tables.add_first_teacher", {
                  defaultValue: "Get started by adding your first teacher",
                })}
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      </Box>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "gray"
    const statusLower = status.toLowerCase()
    if (statusLower.includes("active") || statusLower.includes("full-time"))
      return "green"
    if (statusLower.includes("part-time")) return "blue"
    if (statusLower.includes("sabbatical")) return "purple"
    if (statusLower.includes("retired") || statusLower.includes("inactive"))
      return "red"
    if (statusLower.includes("emeritus")) return "yellow"
    return "gray"
  }

  const getRankColor = (rank: string | null | undefined) => {
    if (!rank) return "gray"
    const rankLower = rank.toLowerCase()
    if (rankLower.includes("professor") || rankLower.includes("full"))
      return "green"
    if (rankLower.includes("associate")) return "blue"
    if (rankLower.includes("assistant")) return "orange"
    if (rankLower.includes("lecturer") || rankLower.includes("instructor"))
      return "purple"
    return "gray"
  }

  const getCourseLoadColor = (load: number | null | undefined) => {
    if (!load) return "gray"
    if (load <= 3) return "green"
    if (load <= 5) return "blue"
    if (load <= 7) return "orange"
    return "red"
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
        <Table.Root size="sm" interactive stickyHeader minW="1300px">
          <Table.Header
          >
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader
                w="60px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.id")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="200px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.teacher_info")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.employee_number", {
                  defaultValue: "Employee #",
                })}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.hire_date", { defaultValue: "Hire Date" })}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.status")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="140px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.specialization", {
                  defaultValue: "Specialization",
                })}
              </Table.ColumnHeader>
              {/* <Table.ColumnHeader w="120px" color="black" fontWeight="bold" fontSize="xs" textTransform="uppercase" letterSpacing="wider">{t("common.tables.office")}</Table.ColumnHeader> */}
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.phone_ext", { defaultValue: "Phone Ext" })}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="130px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.rank", { defaultValue: "Academic Rank" })}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.load", { defaultValue: "Course Load" })}
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
                {t("common.tables.actions")}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {teachers.map((teacher, _index) => (
              <Table.Row
                key={teacher.id}
                opacity={isPlaceholderData ? 0.5 : 1}
                _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                transition="background 0.1s"
              >
                <Table.Cell w="60px" textAlign="center">
                  <Text fontSize="xs" fontFamily="mono" color="gray.500">
                    {teacher.id?.toString().slice(-4) || "N/A"}
                  </Text>
                </Table.Cell>

                <Table.Cell w="200px">
                  <VStack align="start" gap={0}>
                    <HStack gap={2}>
                      <Icon as={FiUserCheck} color="gray.400" size="xs" />
                      <Text
                        fontSize="sm"
                        color="gray.700"
                        fontWeight="600"
                        truncate
                        maxW="160px"
                        title={`${teacher.user?.first_name} ${teacher.user?.last_name}`}
                      >
                        {teacher.user
                          ? `${teacher.user.first_name} ${teacher.user.last_name}`
                          : "N/A"}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" truncate maxW="180px">
                      {teacher.user?.email || "N/A"}
                    </Text>
                  </VStack>
                </Table.Cell>

                <Table.Cell w="120px">
                  <HStack gap={1}>
                    <Icon as={FiHash} size="xs" color="gray.400" />
                    <Text
                      fontSize="xs"
                      color="gray.600"
                      fontFamily="mono"
                      fontWeight="600"
                    >
                      {teacher.user?.user_number || "-"}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="120px" textAlign="center">
                  <HStack gap={1} justify="center">
                    <Icon as={FiCalendar} size="xs" color="gray.400" />
                    <Text
                      fontSize="xs"
                      color="gray.600"
                      fontFamily="mono"
                      fontWeight="medium"
                    >
                      {formatDate(teacher.hire_date)}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  <Badge
                    colorPalette={getStatusColor(teacher.status)}
                    variant="surface"
                    size="xs"
                  >
                    {teacher.status || "Unknown"}
                  </Badge>
                </Table.Cell>

                <Table.Cell w="140px">
                  {teacher.specialization ? (
                    <HStack gap={1}>
                      <Icon as={FiBriefcase} size="xs" color="gray.400" />
                      <Text
                        fontSize="xs"
                        color="gray.600"
                        truncate
                        title={teacher.specialization}
                      >
                        {teacher.specialization}
                      </Text>
                    </HStack>
                  ) : (
                    <Text fontSize="xs" color="gray.400">
                      -
                    </Text>
                  )}
                </Table.Cell>

                {/* <Table.Cell w="120px">
                  {teacher.office_location ? (
                    <HStack gap={1}>
                      <Icon as={FiMapPin} size="xs" color="gray.400" />
                      <Text fontSize="xs" color="gray.600" truncate>
                        {teacher.office_location}
                      </Text>
                    </HStack>
                  ) : (
                    <Text fontSize="xs" color="gray.400">-</Text>
                  )}
                </Table.Cell> */}

                <Table.Cell w="100px" textAlign="center">
                  {teacher.phone_extension ? (
                    <HStack gap={1} justify="center">
                      <Icon as={FiPhone} size="xs" color="gray.400" />
                      <Text
                        fontSize="xs"
                        color="gray.600"
                        fontFamily="mono"
                        fontWeight="medium"
                      >
                        {teacher.phone_extension}
                      </Text>
                    </HStack>
                  ) : (
                    <Text fontSize="xs" color="gray.400">
                      -
                    </Text>
                  )}
                </Table.Cell>

                <Table.Cell w="130px">
                  {teacher.academic_rank ? (
                    <HStack gap={1}>
                      <Icon as={FiAward} size="xs" color="gray.400" />
                      <Badge
                        colorPalette={getRankColor(teacher.academic_rank)}
                        variant="outline"
                        size="xs"
                      >
                        <Text fontSize="xs">{teacher.academic_rank}</Text>
                      </Badge>
                    </HStack>
                  ) : (
                    <Text fontSize="xs" color="gray.400">
                      -
                    </Text>
                  )}
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  {teacher.max_course_load ? (
                    <HStack gap={1} justify="center">
                      <Icon as={FiBarChart} size="xs" color="gray.400" />
                      <Badge
                        colorPalette={getCourseLoadColor(
                          teacher.max_course_load,
                        )}
                        variant="solid"
                        size="xs"
                      >
                        <Text fontSize="xs" fontFamily="mono" fontWeight="600">
                          {teacher.max_course_load}
                        </Text>
                      </Badge>
                    </HStack>
                  ) : (
                    <Text fontSize="xs" color="gray.400">
                      -
                    </Text>
                  )}
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <TeacherActionsMenu teacher={teacher} />
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
            items: t("common.teachers", { defaultValue: "teachers" }),
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

function TeacherPage() {
  const search = Route.useSearch()
  const [teacherSearch, setTeacherSearch] = useState(search.q || "")
  const [specializationFilter, setSpecializationFilter] = useState(search.specialization || "")

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <TeacherHeader
          teacherSearch={teacherSearch}
          setTeacherSearch={setTeacherSearch}
          specializationFilter={specializationFilter}
          setSpecializationFilter={setSpecializationFilter}
        />
        <TeacherTable teacherSearch={teacherSearch} />
      </Container>
    </Box>
  )
}
