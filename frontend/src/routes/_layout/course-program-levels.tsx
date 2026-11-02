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
import { FiBook, FiLayers, FiRefreshCw, FiSearch } from "react-icons/fi"
import { z } from "zod"

import { CourseProgramLevelsService } from "@/client"
import { CourseProgramLevelActionsMenu } from "@/components/Common/CourseProgramLevelActionsMenu"
import AddCourseProgramLevel from "@/components/course_program_level/AddCourseProgramLevel"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"

const courseProgramLevelSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

function getCourseProgramLevelsQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      CourseProgramLevelsService.readCourseProgramLevels({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["course_program_levels", { page }],
  }
}

export const Route = createFileRoute("/_layout/course-program-levels")({
  component: CourseProgramLevelsPage,
  validateSearch: (search) => courseProgramLevelSearchSchema.parse(search),
})

function CourseProgramLevelHeader() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["course_program_levels"] })
  }

  const { data } = useQuery({
    ...getCourseProgramLevelsQueryOptions({ page }),
  })

  const totalItems = data?.count ?? 0
  const activeItems = data?.data?.filter((item) => item.is_active)?.length ?? 0

  // Group by year level
  const year1 = data?.data?.filter((item) => item.year_level === 1)?.length ?? 0
  const year2 = data?.data?.filter((item) => item.year_level === 2)?.length ?? 0
  const year3 = data?.data?.filter((item) => item.year_level === 3)?.length ?? 0

  return (
    <Box borderBottom="1px solid" borderColor="border.subtle" pb={6} mb={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading
            size="lg"
            color="fg.emphasized"
            mb={2}
            fontSize="lg"
            fontWeight="600"
          >
            Course-Program Levels
          </Heading>
          <Text color="fg.muted" fontSize="xs">
            Manage course assignments to program levels and academic years
          </Text>
        </Box>

        <HStack gap={3}>
          <IconButton
            variant="outline"
            colorPalette="gray"
            onClick={handleRefresh}
            aria-label={t("common.tables.refresh")}
            size="sm"
          >
            <FiRefreshCw />
          </IconButton>
          <AddCourseProgramLevel />
        </HStack>
      </Flex>

      <Flex justify="space-between" align="center">
        <HStack gap={6}>
          <Text fontSize="xs" color="fg.muted">
            <Text as="span" fontWeight="600" color="fg.default" fontSize="xs">
              {totalItems}
            </Text>{" "}
            {t("common.tables.total_items", {
              count: totalItems,
              defaultValue: "total items",
            })}
          </Text>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("common.tables.active")}:
            </Text>
            <Badge colorPalette="green" variant="subtle" size="sm">
              <Text fontSize="xs">{activeItems}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              Year 1:
            </Text>
            <Badge colorPalette="blue" variant="subtle" size="sm">
              <Text fontSize="xs">{year1}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              Year 2:
            </Text>
            <Badge colorPalette="purple" variant="subtle" size="sm">
              <Text fontSize="xs">{year2}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              Year 3:
            </Text>
            <Badge colorPalette="orange" variant="subtle" size="sm">
              <Text fontSize="xs">{year3}</Text>
            </Badge>
          </HStack>
        </HStack>
      </Flex>
    </Box>
  )
}

function CourseProgramLevelTable() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading } = useQuery({
    ...getCourseProgramLevelsQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/course-program-levels",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const items = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (items.length === 0) {
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
                {t("common.tables.no_results")}
              </EmptyState.Title>
              <EmptyState.Description color="fg.muted" fontSize="xs">
                Get started by creating your first course-program level
                relationship
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
              <Table.ColumnHeader w="50px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  #
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader flex="1" minW="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("common.tables.course")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="150px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  Course Code
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader flex="1" minW="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  Program Level
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="100px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  Year Level
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="100px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("common.tables.status")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="100px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide">
                  {t("common.tables.actions")}
                </Text>
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
        </Table.Root>

        <Box maxH="450px" overflowY="auto">
          <Table.Root size="md" variant="outline">
            <Table.Body>
              {items.map((item, index) => (
                <Table.Row
                  key={item.id}
                  _hover={{ bg: "bg.muted" }}
                  transition="background 0.2s"
                >
                  <Table.Cell w="50px" textAlign="center">
                    <Text fontSize="xs" color="fg.muted" fontWeight="500">
                      {(page - 1) * PER_PAGE + index + 1}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <VStack align="start" gap={1}>
                      <HStack gap={2}>
                        <FiBook
                          size="14px"
                          color="var(--chakra-colors-blue-500)"
                        />
                        <Text fontSize="xs" fontWeight="600" color="fg.default">
                          {item.course?.name || "N/A"}
                        </Text>
                      </HStack>
                      {item.course?.description && (
                        <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                          {item.course.description}
                        </Text>
                      )}
                    </VStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette="blue" variant="subtle" size="sm">
                      <Text fontSize="xs">{item.course?.code || "N/A"}</Text>
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <VStack align="start" gap={1}>
                      <HStack gap={2}>
                        <FiLayers
                          size="14px"
                          color="var(--chakra-colors-purple-500)"
                        />
                        <Text fontSize="xs" fontWeight="600" color="fg.default">
                          {item.program_level?.name || "N/A"}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="fg.muted">
                        {item.program_level?.code || "N/A"}
                      </Text>
                    </VStack>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <Badge
                      colorPalette={
                        item.year_level === 1
                          ? "blue"
                          : item.year_level === 2
                            ? "purple"
                            : item.year_level === 3
                              ? "orange"
                              : "gray"
                      }
                      variant="subtle"
                      size="sm"
                    >
                      <Text fontSize="xs">Year {item.year_level}</Text>
                    </Badge>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <Badge
                      colorPalette={item.is_active ? "green" : "gray"}
                      variant="subtle"
                      size="sm"
                    >
                      <Text fontSize="xs">
                        {item.is_active
                          ? t("common.tables.active")
                          : t("common.tables.inactive")}
                      </Text>
                    </Badge>
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    <CourseProgramLevelActionsMenu courseProgramLevel={item} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* Pagination */}
      <Flex justify="space-between" align="center" mt={4}>
        <Text fontSize="xs" color="fg.muted">
          {t("common.tables.showing_items", {
            from: (page - 1) * PER_PAGE + 1,
            to: Math.min(page * PER_PAGE, count),
            total: count,
            defaultValue: `Showing ${(page - 1) * PER_PAGE + 1}-${Math.min(page * PER_PAGE, count)} of ${count} items`,
          })}
        </Text>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          page={page}
          onPageChange={(e) => setPage(e.page)}
        >
          <HStack gap={2}>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </HStack>
        </PaginationRoot>
      </Flex>
    </VStack>
  )
}

function CourseProgramLevelsPage() {
  return (
    <Container maxW="full" py={8}>
      <CourseProgramLevelHeader />
      <CourseProgramLevelTable />
    </Container>
  )
}
