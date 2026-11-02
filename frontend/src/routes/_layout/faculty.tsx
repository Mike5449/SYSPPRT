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
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from "react-icons/fi"
import { z } from "zod"

import { FacultiesService } from "@/client"
import { FacultyActionsMenu } from "@/components/Common/FacultyActionsMenu"
import AddFaculty from "@/components/faculty/AddFaculty"
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

const facultySearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

function getFacultiesQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      FacultiesService.readFaculties({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["faculties", { page }],
  }
}

export const Route = createFileRoute("/_layout/faculty")({
  component: FacultyPage,
  validateSearch: (search) => facultySearchSchema.parse(search),
})

function FacultyHeader() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["faculties"] })
  }

  const { data } = useQuery({
    ...getFacultiesQueryOptions({ page }),
  })

  const totalFaculties = data?.count ?? 0
  const activeFaculties =
    data?.data?.filter((faculty) => faculty.is_active)?.length ?? 0
  const inactiveFaculties =
    data?.data?.filter((faculty) => !faculty.is_active)?.length ?? 0
  const withDeanCount =
    data?.data?.filter((faculty) => faculty.dean_name)?.length ?? 0

  return (
    <Box mb={6}>
      <Flex justify="space-between" align="flex-start" mb={5} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              GESTION DES FACULTÉS
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Facultés
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("common.tables.description_faculty")}
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
          <AddFaculty />
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
                {totalFaculties}
              </Text>{" "}
              {t("common.tables.total_items", { count: totalFaculties })}
            </Text>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.500">
                {t("common.tables.active")}:
              </Text>
              <Badge colorPalette="green" variant="subtle" size="xs">
                {activeFaculties}
              </Badge>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.500">
                {t("common.tables.inactive")}:
              </Text>
              <Badge colorPalette="red" variant="subtle" size="xs">
                {inactiveFaculties}
              </Badge>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="xs" color="gray.500">
                {t("common.tables.with_dean")}:
              </Text>
              <Badge colorPalette="blue" variant="subtle" size="xs">
                {withDeanCount}
              </Badge>
            </HStack>
          </HStack>
        </Flex>
      </Box>
    </Box>
  )
}

function FacultyTable() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getFacultiesQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/faculty",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const faculties = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (faculties.length === 0) {
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
                {t("common.tables.add_first_faculty")}
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
          <Table.Header
          >
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.faculty_info")}
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
                {t("common.tables.dean")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="140px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.contact_info")}
              </Table.ColumnHeader>
              {/* <Table.ColumnHeader w="120px" color="black" fontWeight="bold" fontSize="xs" textTransform="uppercase" letterSpacing="wider">{t("common.tables.office_location")}</Table.ColumnHeader> */}
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.established")}
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
            {faculties.map((faculty) => (
              <Table.Row
                key={faculty.id}
                opacity={isPlaceholderData ? 0.5 : 1}
                _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                transition="background 0.1s"
              >
                <Table.Cell w="180px">
                  <VStack align="start" gap={0.5}>
                    <HStack gap={1}>
                      <Icon as={FiHome} boxSize={3} color="gray.400" />
                      <Text
                        fontSize="sm"
                        color="gray.700"
                        fontWeight="600"
                        truncate
                      >
                        {faculty.name}
                      </Text>
                    </HStack>
                  </VStack>
                </Table.Cell>

                <Table.Cell w="100px">
                  <Badge colorPalette="blue" variant="outline" size="xs">
                    {faculty.code}
                  </Badge>
                </Table.Cell>

                <Table.Cell flex="1" minW="200px">
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    truncate
                    title={faculty.description || undefined}
                  >
                    {faculty.description || t("common.tables.no_description")}
                  </Text>
                </Table.Cell>

                <Table.Cell w="150px">
                  <HStack gap={1}>
                    <Icon as={FiUser} boxSize={3} color="gray.400" />
                    <Text fontSize="xs" color="gray.600" truncate>
                      {faculty.dean_name || t("common.tables.not_assigned")}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="140px">
                  <VStack align="start" gap={0.5}>
                    {faculty.email && (
                      <HStack gap={1}>
                        <Icon as={FiMail} boxSize={3} color="gray.400" />
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          truncate
                          maxW="120px"
                        >
                          {faculty.email}
                        </Text>
                      </HStack>
                    )}
                    {faculty.phone && (
                      <HStack gap={1}>
                        <Icon as={FiPhone} boxSize={3} color="gray.400" />
                        <Text fontSize="xs" color="gray.600" truncate>
                          {faculty.phone}
                        </Text>
                      </HStack>
                    )}
                    {!faculty.email && !faculty.phone && (
                      <Text fontSize="xs" color="gray.400">
                        {t("common.tables.no_contact")}
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>

                {/* <Table.Cell w="120px">
                  <HStack gap={1}>
                    <Icon as={FiMapPin} boxSize={3} color="gray.400" />
                    <Text fontSize="xs" color="gray.600" truncate>
                      {faculty.office_location || t("common.tables.not_specified")}
                    </Text>
                  </HStack>
                </Table.Cell> */}

                <Table.Cell w="100px" textAlign="center">
                  {faculty.established_year ? (
                    <Text
                      fontSize="xs"
                      color="gray.600"
                      fontFamily="mono"
                      fontWeight="medium"
                    >
                      {faculty.established_year}
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="gray.400">
                      -
                    </Text>
                  )}
                </Table.Cell>

                <Table.Cell w="90px" textAlign="center">
                  {faculty.is_active ? (
                    <Badge colorPalette="green" variant="subtle" size="xs">
                      {t("common.tables.active")}
                    </Badge>
                  ) : (
                    <Badge colorPalette="red" variant="subtle" size="xs">
                      {t("common.tables.inactive")}
                    </Badge>
                  )}
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <FacultyActionsMenu
                    faculty={{
                      ...faculty,
                      department_id: faculty.department.id,
                    }}
                  />
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
            items: t("common.faculties"),
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

function FacultyPage() {
  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <FacultyHeader />
        <FacultyTable />
      </Container>
    </Box>
  )
}
