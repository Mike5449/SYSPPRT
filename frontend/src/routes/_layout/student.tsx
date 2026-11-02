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
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiFileText,
  FiFilter,
  FiChevronDown,
  FiGift,
  FiHash,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from "react-icons/fi"
import { z } from "zod"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"

import {
  ProgramLevelsService,
  StudentsService,
  TeacherAnalyticsService,
  TeachersService,
} from "@/client"
import { StudentActionsMenu } from "@/components/Common/StudentActionsMenu"
import PendingItems from "@/components/Pending/PendingItems"
import AddStudentWithUser from "@/components/student/AddStudentWithUser"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"
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

const studentSearchSchema = z.object({
  page: z.number().catch(1),
  q: z.string().optional(),
  yearLevel: z.number().optional(),
  programId: z.string().optional(),
  programLevelId: z.string().optional(),
  scholarshipType: z.string().optional(),
})

const PER_PAGE = 10

function getStudentsQueryOptions({
  page,
  q,
  yearLevel,
  programId,
  programLevelId,
  scholarshipType
}: {
  page: number,
  q?: string,
  yearLevel?: number,
  programId?: string,
  programLevelId?: string,
  scholarshipType?: string
}) {
  return {
    queryFn: () =>
      StudentsService.readStudents({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        q: q || undefined,
        yearLevel: yearLevel || undefined,
        programId: programId || undefined,
        programLevelId: programLevelId || undefined,
        scholarshipType: scholarshipType || undefined,
      }),
    queryKey: ["students", { page, q, yearLevel, programId, programLevelId, scholarshipType }],
  }
}

export const Route = createFileRoute("/_layout/student")({
  component: Students,
  validateSearch: (search) => studentSearchSchema.parse(search),
})

function StudentsHeader({
  searchTerm,
  setSearchTerm,
  yearLevelValue,
  onYearLevelChange,
  programLevelValue,
  onProgramLevelChange,
}: {
  searchTerm: string
  setSearchTerm: (v: string) => void
  yearLevelValue: string
  onYearLevelChange: (v: string) => void
  programLevelValue: string
  onProgramLevelChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.is_superuser ?? false
  const { data: userRoles } = useUserRoles(currentUser?.id)
  const isTeacher =
    !isAdmin &&
    (userRoles || []).some((r: any) => (r.code || "").toUpperCase() === "TEACHER")

  // Admin: all program levels. Teacher: only the ones assigned to them.
  const { data: allProgramLevels } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
    enabled: isAdmin,
  })

  const { data: teacherData } = useQuery({
    queryKey: ["teacher_by_user", currentUser?.id],
    queryFn: () =>
      TeachersService.readTeacherByUser({ userId: currentUser!.id }),
    enabled: !!currentUser && isTeacher,
  })

  const { data: assignedLevels } = useQuery({
    queryKey: ["assigned_program_levels", teacherData?.id],
    queryFn: () =>
      TeacherAnalyticsService.getAssignedProgramLevels({
        teacherId: teacherData!.id,
      }),
    enabled: isTeacher && !!teacherData?.id,
  })

  const programOptions: { id: string; label: string }[] = isAdmin
    ? (allProgramLevels?.data ?? []).map((pl) => ({
        id: pl.id,
        label: pl.program?.name ? `${pl.program.name} — ${pl.name}` : pl.name,
      }))
    : (assignedLevels ?? []).map((pl: any) => ({
        id: String(pl.id),
        label: pl.code ? `${pl.name} (${pl.code})` : pl.name,
      }))

  const selectedProgramName = programLevelValue
    ? (programOptions.find((p) => p.id === programLevelValue)?.label ??
      "Programme")
    : "Tous"

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              GESTION DES ÉTUDIANTS
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Étudiants
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("common.tables.description_student")}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label={t("common.tables.refresh")} borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          {isAdmin && <AddStudentWithUser />}
        </HStack>
      </Flex>

      <Flex bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} boxShadow="0 1px 2px rgba(20,34,30,0.04)" p="10px" gap="10px" align="center" wrap="wrap">
        <Text fontSize="9px" fontWeight="800" letterSpacing="0.8px" textTransform="uppercase" color={C.faint} pl="3px" pr="2px">
          Filtres
        </Text>
        <Box flex="1" minW="8px" />

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("common.tables.search_student")} fontSize="13px" color={C.ink} w="170px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </HStack>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiFilter} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Année</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">
                  {yearLevelValue ? t("common.tables.year_level", { level: yearLevelValue, defaultValue: `An ${yearLevelValue}` }) : t("common.tables.all_years")}
                </Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="150px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => onYearLevelChange("")}>{t("common.tables.all_years")}</MenuItem>
            {[1, 2, 3, 4, 5].map((level) => (
              <MenuItem key={level} value={level.toString()} fontSize="13px" borderRadius="6px" onClick={() => onYearLevelChange(level.toString())}>
                {t("common.tables.year_level", { level, defaultValue: `An ${level}` })}
              </MenuItem>
            ))}
          </MenuContent>
        </MenuRoot>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }} maxW="240px">
              <Icon as={FiBookOpen} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Programme</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3" truncate>{selectedProgramName}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="280px" maxH="320px" overflowY="auto" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => onProgramLevelChange("")}>Tous les programmes</MenuItem>
            {programOptions.map((pl) => (
              <MenuItem key={pl.id} value={pl.id} fontSize="13px" borderRadius="6px" onClick={() => onProgramLevelChange(pl.id)}>
                {pl.label}
              </MenuItem>
            ))}
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Box>
  )
}


function StudentsTable({ searchTerm }: { searchTerm: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { page } = search

  // Sync debounced search to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/student", search: (prev) => ({ ...prev, q: searchTerm || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getStudentsQueryOptions(search),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/student",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const students = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (students.length === 0) {
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
                {t("common.tables.add_first_student", {
                  defaultValue: "Get started by enrolling your first student",
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
    if (statusLower.includes("active") || statusLower.includes("enrolled"))
      return "green"
    if (statusLower.includes("graduated")) return "blue"
    if (statusLower.includes("suspended") || statusLower.includes("inactive"))
      return "red"
    if (statusLower.includes("probation")) return "orange"
    return "gray"
  }

  // const _getGPAColor = ...

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
          <Table.Header>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader
                w="200px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.student_info")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                // textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.student_number")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.sex")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.dob")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.admission")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.status")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="80px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.year")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.contact")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.emergency")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.scholarship")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                flex="1"
                minW="200px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                letterSpacing="wider"
              >
                {t("common.tables.program_level")}
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
                {t("common.tables.actions")}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {students.map((student, _index) => (
              <Table.Row
                key={student.id}
                opacity={isPlaceholderData ? 0.5 : 1}
                _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                transition="background 0.1s"
              >
                <Table.Cell w="200px">
                  <VStack align="start" gap={0}>
                    <HStack gap={2}>
                      <Icon as={FiUser} color="gray.400" size="xs" />
                      <Text
                        fontSize="sm"
                        color="gray.700"
                        fontWeight="600"
                        truncate
                        maxW="160px"
                        title={`${student.user?.first_name} ${student.user?.last_name}`}
                      >
                        {student.user
                          ? `${student.user.first_name} ${student.user.last_name}`
                          : "N/A"}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" truncate maxW="180px">
                      {student.user?.email || "N/A"}
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
                      {student.user?.user_number || "-"}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <Badge colorPalette="gray" variant="subtle" size="xs">
                    {student.sex || "-"}
                  </Badge>
                </Table.Cell>

                <Table.Cell w="120px" textAlign="center">
                  <Text fontSize="xs" color="gray.600">
                    {student.date_of_birth ? formatDate(student.date_of_birth) : "-"}
                  </Text>
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
                      {formatDate(student.admission_date)}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  <Badge
                    colorPalette={getStatusColor(student.status)}
                    variant="surface"
                    size="xs"
                  >
                    {student.status
                      ? t(`status.${student.status.toLowerCase()}`)
                      : t("common.tables.unknown")}
                  </Badge>
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <HStack gap={1} justify="center">
                    <Icon as={FiBookOpen} size="xs" color="gray.400" />
                    <Badge colorPalette="blue" variant="subtle" size="xs">
                      {student.current_year_level || 1}
                    </Badge>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="180px">
                  <VStack align="start" gap={0}>
                    {student.phone_number && (
                      <HStack gap={1}>
                        <Icon as={FiPhone} size="xs" color="gray.400" />
                        <Text fontSize="xs" color="gray.600">
                          {student.phone_number}
                        </Text>
                      </HStack>
                    )}
                    {student.address && (
                      <HStack gap={1}>
                        <Icon as={FiMapPin} size="xs" color="gray.400" />
                        <Text fontSize="xs" color="gray.500" truncate maxW="160px" title={student.address}>
                          {student.address}
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                </Table.Cell>

                <Table.Cell w="180px">
                  {student.emergency_contact_name ? (
                    <VStack align="start" gap={0}>
                      <HStack gap={1}>
                        <Icon as={FiAlertCircle} size="xs" color="red.400" />
                        <Text fontSize="xs" color="gray.700" fontWeight="600">
                          {student.emergency_contact_name}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        {student.emergency_contact_phone} ({student.emergency_contact_relationship})
                      </Text>
                    </VStack>
                  ) : (
                    <Text fontSize="xs" color="gray.300">-</Text>
                  )}
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  {student.is_scholarship ? (
                    <VStack gap={0}>
                      <HStack gap={1} justify="center">
                        <Icon as={FiGift} size="xs" color="orange.400" />
                        <Badge colorPalette="yellow" variant="solid" size="xs">
                          {t("common.tables.yes", { defaultValue: "Yes" })}
                        </Badge>
                      </HStack>
                      {student.scholarship_type && (
                        <Text
                          fontSize="xs"
                          color="gray.500"
                          truncate
                          maxW="80px"
                        >
                          {student.scholarship_type}
                        </Text>
                      )}
                    </VStack>
                  ) : (
                    <Text fontSize="xs" color="gray.300">
                      -
                    </Text>
                  )}
                </Table.Cell>

                <Table.Cell flex="1" minW="200px">
                  <VStack align="start" gap={0}>
                    <HStack gap={1}>
                      <Icon as={FiFileText} size="xs" color="blue.400" />
                      <Text
                        fontSize="xs"
                        color="gray.700"
                        fontWeight="600"
                        truncate
                        title={student.program_level?.program?.name}
                      >
                        {student.program_level?.program?.name || student.program_level?.name || "-"}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      {student.program_level?.code} • {student.program_level?.program?.faculty?.name}
                    </Text>
                  </VStack>
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <StudentActionsMenu student={student} />
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
            items: t("common.students"),
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

function Students() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [searchTerm, setSearchTerm] = useState(search.q || "")

  const updateYearLevel = (value: string) => {
    navigate({
      to: "/student",
      search: (prev) => ({
        ...prev,
        yearLevel: value ? parseInt(value, 10) : undefined,
        page: 1,
      }),
    })
  }

  const updateProgramLevel = (value: string) => {
    navigate({
      to: "/student",
      search: (prev) => ({
        ...prev,
        programLevelId: value || undefined,
        page: 1,
      }),
    })
  }

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <StudentsHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          yearLevelValue={search.yearLevel?.toString() ?? ""}
          onYearLevelChange={updateYearLevel}
          programLevelValue={search.programLevelId ?? ""}
          onProgramLevelChange={updateProgramLevel}
        />
        <StudentsTable searchTerm={searchTerm} />
      </Container>
    </Box>
  )
}
