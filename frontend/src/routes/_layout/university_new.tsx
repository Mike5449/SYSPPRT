import {
  Badge,
  Box,
  Container,
  EmptyState,
  Flex,
  Heading,
  HStack,
  IconButton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi"
import { z } from "zod"

import { UniversitiesService } from "@/client"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import AddUniversity from "@/components/university/AddUniversity"

const universitySearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

function getUniversitiesQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      UniversitiesService.readUniversities({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["universities", { page }],
  }
}

export const Route = createFileRoute("/_layout/university_new")({
  component: UniversityPage,
  validateSearch: (search) => universitySearchSchema.parse(search),
})

function UniversityHeader() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["universities"] })
  }

  const { data } = useQuery({
    ...getUniversitiesQueryOptions({ page }),
  })

  const totalUniversities = data?.count ?? 0
  const activeUniversities =
    data?.data?.filter((university) => university.is_active)?.length ?? 0

  return (
    <Box borderBottom="1px solid" borderColor="border.subtle" pb={0} mb={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading
            size="lg"
            color="fg.emphasized"
            mb={2}
            fontSize="lg"
            fontWeight="600"
          >
            {t("university_page.title")}
          </Heading>
          <Text color="fg.muted" fontSize="xs">
            {t("university_page.subtitle")}
          </Text>
        </Box>

        <HStack gap={3}>
          <IconButton
            variant="outline"
            colorPalette="gray"
            onClick={handleRefresh}
            aria-label="Refresh data"
            size="sm"
          >
            <FiRefreshCw />
          </IconButton>
          <AddUniversity />
        </HStack>
      </Flex>

      <Flex justify="space-between" align="center">
        <HStack gap={6}>
          <Text fontSize="xs" color="fg.muted">
            <Text as="span" fontWeight="600" color="fg.default" fontSize="xs">
              {totalUniversities}
            </Text>{" "}
            {t("university_page.total")}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            <Text as="span" fontWeight="600" color="fg.default" fontSize="xs">
              {activeUniversities}
            </Text>{" "}
            {t("common.tables.active")}
          </Text>
        </HStack>
      </Flex>
    </Box>
  )
}

function UniversityTable() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getUniversitiesQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/university_new",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const universities = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (universities.length === 0) {
    return (
      <Box py={12}>
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <FiSearch size="48px" />
            </EmptyState.Indicator>
            <VStack textAlign="center" gap={2}>
              <EmptyState.Title
                fontSize="sm"
                color="fg.emphasized"
                fontWeight="600"
              >
                {t("university_page.no_found")}
              </EmptyState.Title>
              <EmptyState.Description color="fg.muted" fontSize="xs">
                {t("university_page.no_found_desc")}
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
        borderRadius="lg"
        border="1px solid"
        borderColor="border.subtle"
        overflow="hidden"
      >
        <Table.Root size="md" variant="outline">
          <Table.Header bg="bg.subtle" position="sticky" top={0} zIndex={1}>
            <Table.Row>
              <Table.ColumnHeader w="60px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("common.tables.id")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("university_page.columns.university")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="120px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("university_page.columns.location")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="150px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("university_page.columns.contact")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="120px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("university_page.columns.website")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader flex="1" minW="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("common.tables.description")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="80px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("common.tables.status")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="80px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("common.tables.actions")}
                </Text>
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
        </Table.Root>

        {/* Scrollable Body Container */}
        <Box maxH="450px" overflowY="auto" overflowX="hidden">
          <Table.Root size="md" variant="outline">
            <Table.Body>
              {universities.map((university, index) => (
                <Table.Row
                  key={university.id}
                  opacity={isPlaceholderData ? 0.5 : 1}
                  _hover={{ bg: "bg.subtle" }}
                  bg={index % 2 === 0 ? "transparent" : "bg.subtle/50"}
                >
                  <Table.Cell w="60px" textAlign="center">
                    <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                      {university.id?.toString().slice(-4) || "N/A"}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="200px">
                    <VStack align="start" gap={1}>
                      <Text
                        fontWeight="500"
                        color="fg.emphasized"
                        fontSize="xs"
                        lineClamp={1}
                      >
                        {university.name}
                      </Text>
                      <Badge variant="outline" size="sm" colorPalette="gray">
                        <Text fontSize="xs">{university.code}</Text>
                      </Badge>
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="120px">
                    <VStack align="start" gap={1}>
                      <HStack gap={1}>
                        <FiMapPin size={10} />
                        <Text fontSize="xs" color="fg.default" lineClamp={1}>
                          {university.city}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                        {university.country}
                      </Text>
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="150px">
                    <VStack align="start" gap={1}>
                      {university.email && (
                        <HStack gap={1}>
                          <FiMail size={10} />
                          <Text fontSize="xs" color="fg.default" lineClamp={1}>
                            {university.email}
                          </Text>
                        </HStack>
                      )}
                      {university.phone && (
                        <HStack gap={1}>
                          <FiPhone size={10} />
                          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                            {university.phone}
                          </Text>
                        </HStack>
                      )}
                      {!university.email && !university.phone && (
                        <Text fontSize="xs" color="fg.muted">
                          -
                        </Text>
                      )}
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="120px">
                    {university.website ? (
                      <HStack gap={1}>
                        <FiGlobe size={10} />
                        <Text
                          fontSize="xs"
                          color="blue.500"
                          lineClamp={1}
                          as="a"
                          {...({
                            href: university.website,
                            target: "_blank",
                            rel: "noopener noreferrer",
                          } as any)}
                          _hover={{ textDecoration: "underline" }}
                        >
                          Visit
                        </Text>
                      </HStack>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        -
                      </Text>
                    )}
                  </Table.Cell>

                  <Table.Cell flex="1" minW="200px">
                    <Text
                      fontSize="xs"
                      color="fg.muted"
                      lineClamp={1}
                      title={university.description || undefined}
                    >
                      {university.description || "No description"}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="80px" textAlign="center">
                    <Badge
                      colorPalette={university.is_active ? "green" : "gray"}
                      variant={university.is_active ? "solid" : "outline"}
                      size="sm"
                    >
                      <Text fontSize="xs">
                        {university.is_active ? "Active" : "Inactive"}
                      </Text>
                    </Badge>
                  </Table.Cell>

                  <Table.Cell w="80px" textAlign="center">
                    <HStack gap={1} justify="center">
                      <IconButton
                        variant="ghost"
                        size="xs"
                        colorPalette="blue"
                        aria-label="Edit university"
                      >
                        <FiRefreshCw size={12} />
                      </IconButton>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* Pagination - Always visible */}
      <Flex justify="space-between" align="center" mt={4}>
        <Text fontSize="xs" color="fg.muted">
          Showing {(page - 1) * PER_PAGE + 1} to{" "}
          {Math.min(page * PER_PAGE, count)} of {count} universities
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

function UniversityPage() {
  return (
    <Container maxW="full" py={6}>
      <UniversityHeader />
      <UniversityTable />
    </Container>
  )
}
