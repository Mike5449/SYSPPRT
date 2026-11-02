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
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  FiHome,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from "react-icons/fi"
import { z } from "zod"

import { DepartmentsService } from "@/client"
import { DepartmentActionsMenu } from "@/components/Common/DepartmentActionsMenu"
import AddDepartment from "@/components/department/AddDepartment"
import PendingItems from "@/components/Pending/PendingItems"
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

const departmentSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

function getDepartmentsQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      DepartmentsService.readDepartments({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["departments", { page }],
  }
}

export const Route = createFileRoute("/_layout/department")({
  component: DepartmentPage,
  validateSearch: (search) => departmentSearchSchema.parse(search),
})

function DepartmentHeader() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departments"] })
  }

  const { data } = useQuery({
    ...getDepartmentsQueryOptions({ page }),
  })

  const totalDepartments = data?.count ?? 0
  const activeDepartments =
    data?.data?.filter((department) => department.is_active)?.length ?? 0
  const inactiveDepartments =
    data?.data?.filter((department) => !department.is_active)?.length ?? 0
  const withHeadCount =
    data?.data?.filter((department) => department.head_of_department)?.length ??
    0
  const withContactCount =
    data?.data?.filter((department) => department.email || department.phone)
      ?.length ?? 0

  return (
    <Box mb={6}>
      <Flex justify="space-between" align="flex-start" mb={5} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              DÉPARTEMENTS ACADÉMIQUES
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Départements
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("common.tables.description_department", {
                defaultValue:
                  "Manage academic departments and administrative units",
              })}
            </Text>
          </Box>
        </Flex>

        <HStack gap={2}>
          <IconButton
            variant="outline"
            onClick={handleRefresh}
            aria-label={t("common.tables.refresh")}
            size="sm"
            borderColor={C.line}
            color={C.inkMute}
            borderRadius="4px"
            _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}
          >
            <FiRefreshCw />
          </IconButton>
          <AddDepartment />
        </HStack>
      </Flex>

      {/* Stats Card */}
      <Box
        bg="white"
        p={4}
        borderRadius="6px"
        border="1px solid"
        borderColor={C.line}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <HStack gap={6}>
            <Text fontSize="xs" color="gray.500">
              <Text as="span" fontWeight="bold" color="gray.800" fontSize="sm">
                {totalDepartments}
              </Text>{" "}
              {t("common.tables.total_items", {
                count: totalDepartments,
                defaultValue: "total departments",
              })}
            </Text>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.500">
                {t("common.tables.active")}:
              </Text>
              <Badge colorPalette="green" variant="subtle" size="xs">
                {activeDepartments}
              </Badge>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.500">
                {t("common.tables.inactive")}:
              </Text>
              <Badge colorPalette="red" variant="subtle" size="xs">
                {inactiveDepartments}
              </Badge>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.500">
                {t("common.tables.with_head")}:
              </Text>
              <Badge colorPalette="blue" variant="subtle" size="xs">
                {withHeadCount}
              </Badge>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.500">
                {t("common.tables.with_contact")}:
              </Text>
              <Badge colorPalette="purple" variant="subtle" size="xs">
                {withContactCount}
              </Badge>
            </HStack>
          </HStack>
        </Flex>
      </Box>
    </Box>
  )
}

function DepartmentTable() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getDepartmentsQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/department",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const departments = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (departments.length === 0) {
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
                {t("common.tables.add_first_department", {
                  defaultValue: "Get started by creating your first department",
                })}
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
                {t("common.tables.department_info")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.code")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                flex="1"
                minW="200px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.description")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="150px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.head_of_department")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.contact_info")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="140px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.office_location")}
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
                {t("common.tables.status")}
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
            {departments.map((department, _index) => (
              <Table.Row
                key={department.id}
                opacity={isPlaceholderData ? 0.5 : 1}
                _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                transition="background 0.1s"
              >
                <Table.Cell w="60px" textAlign="center">
                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    color="gray.400"
                    fontWeight="medium"
                  >
                    {department.id?.toString().slice(-4) || "N/A"}
                  </Text>
                </Table.Cell>

                <Table.Cell w="200px">
                  <HStack gap={2}>
                    <Icon as={FiHome} boxSize={3} color="gray.400" />
                    <VStack align="start" gap={0}>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color="gray.700"
                        truncate
                        maxW="160px"
                      >
                        {department.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(department.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "2-digit",
                          },
                        )}
                      </Text>
                    </VStack>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="100px">
                  <Badge colorPalette="blue" variant="outline" size="xs">
                    {department.code}
                  </Badge>
                </Table.Cell>

                <Table.Cell flex="1" minW="200px">
                  <Text
                    fontSize="xs"
                    color="gray.600"
                    lineClamp={2}
                    title={department.description || undefined}
                  >
                    {department.description || "-"}
                  </Text>
                </Table.Cell>

                <Table.Cell w="150px">
                  <HStack gap={1}>
                    <Icon as={FiUser} boxSize={3} color="gray.400" />
                    <Text
                      fontSize="xs"
                      color="gray.700"
                      fontWeight="500"
                      truncate
                      maxW="130px"
                    >
                      {department.head_of_department ||
                        t("common.tables.not_assigned")}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="180px">
                  <VStack align="start" gap={1}>
                    {department.email && (
                      <HStack gap={1.5}>
                        <Icon as={FiMail} boxSize={3} color="gray.400" />
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          truncate
                          maxW="150px"
                        >
                          {department.email}
                        </Text>
                      </HStack>
                    )}
                    {department.phone && (
                      <HStack gap={1.5}>
                        <Icon as={FiPhone} boxSize={3} color="gray.400" />
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          truncate
                          maxW="150px"
                        >
                          {department.phone}
                        </Text>
                      </HStack>
                    )}
                    {!department.email && !department.phone && (
                      <Text fontSize="xs" color="gray.400">
                        -
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>

                <Table.Cell w="140px">
                  <HStack gap={1}>
                    <Icon as={FiMapPin} boxSize={3} color="gray.400" />
                    <Text fontSize="xs" color="gray.600" truncate maxW="120px">
                      {department.office_location || "-"}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="90px" textAlign="center">
                  {department.is_active ? (
                    <Badge colorPalette="green" variant="surface" size="xs">
                      {t("common.tables.active")}
                    </Badge>
                  ) : (
                    <Badge colorPalette="red" variant="surface" size="xs">
                      {t("common.tables.inactive")}
                    </Badge>
                  )}
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <DepartmentActionsMenu department={department} />
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
            items: t("common.departments"),
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

function DepartmentPage() {
  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <DepartmentHeader />
        <DepartmentTable />
      </Container>
    </Box>
  )
}
