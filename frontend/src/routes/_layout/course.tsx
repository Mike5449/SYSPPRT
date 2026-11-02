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
import { FiActivity, FiChevronDown, FiClock, FiRefreshCw, FiSearch, FiTag } from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import { CoursesService } from "@/client"
import { CourseActionsMenu } from "@/components/Common/CourseActionsMenu"
import AddCourse from "@/components/course/AddCourse"
import PendingItems from "@/components/Pending/PendingItems"
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

const courseSearchSchema = z.object({
  page: z.number().catch(1),
  name: z.string().optional(),
  code: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
})

const PER_PAGE = 10

function getCoursesQueryOptions({
  page,
  name,
  code,
  type,
  status,
}: {
  page: number
  name?: string
  code?: string
  type?: string
  status?: string
}) {
  return {
    queryFn: () =>
      CoursesService.readCourses({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        name: name || undefined,
        code: code || undefined,
        isMandatory:
          type === "mandatory" ? true : type === "optional" ? false : undefined,
        isActive:
          status === "active" ? true : status === "inactive" ? false : undefined,
      }),
    queryKey: ["courses", { page, name, code, type, status }],
  }
}

export const Route = createFileRoute("/_layout/course")({
  component: CoursePage,
  validateSearch: (search) => courseSearchSchema.parse(search),
})

function CourseHeader({
  nameSearch,
  setNameSearch,
  codeSearch,
  setCodeSearch,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
}: {
  nameSearch: string
  setNameSearch: (v: string) => void
  codeSearch: string
  setCodeSearch: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })


  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["courses"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              CATALOGUE DES COURS
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Cours
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("course.description")}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label={t("common.tables.refresh")} borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          <AddCourse />
        </HStack>
      </Flex>

      <Flex bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} boxShadow="0 1px 2px rgba(20,34,30,0.04)" p="10px" gap="10px" align="center" wrap="wrap">
        <Text fontSize="9px" fontWeight="800" letterSpacing="0.8px" textTransform="uppercase" color={C.faint} pl="3px" pr="2px">
          Filtres
        </Text>
        <Box flex="1" minW="8px" />

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("common.tables.name")} fontSize="13px" color={C.ink} w="130px" outline="none" _placeholder={{ color: C.faint }} _focus={{ outline: "none", boxShadow: "none" }} value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} />
        </HStack>

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiTag} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("common.tables.code")} fontSize="13px" fontFamily={MONO} color={C.ink} w="80px" outline="none" _placeholder={{ color: C.faint, fontFamily: "body" }} _focus={{ outline: "none", boxShadow: "none" }} value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
        </HStack>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiTag} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Type</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{typeFilter === "mandatory" ? t("common.tables.mandatory", { defaultValue: "Obligatoire" }) : typeFilter === "optional" ? t("common.tables.optional", { defaultValue: "Optionnel" }) : t("common.tables.all_types", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="150px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setTypeFilter(""); navigate({ to: "/course", search: (prev) => ({ ...prev, type: undefined, page: 1 }) }) }}>{t("common.tables.all_types", { defaultValue: "Tous types" })}</MenuItem>
            <MenuItem value="mandatory" fontSize="13px" borderRadius="6px" onClick={() => { setTypeFilter("mandatory"); navigate({ to: "/course", search: (prev) => ({ ...prev, type: "mandatory", page: 1 }) }) }}>{t("common.tables.mandatory", { defaultValue: "Obligatoire" })}</MenuItem>
            <MenuItem value="optional" fontSize="13px" borderRadius="6px" onClick={() => { setTypeFilter("optional"); navigate({ to: "/course", search: (prev) => ({ ...prev, type: "optional", page: 1 }) }) }}>{t("common.tables.optional", { defaultValue: "Optionnel" })}</MenuItem>
          </MenuContent>
        </MenuRoot>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiActivity} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Statut</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{statusFilter === "active" ? t("common.tables.active", { defaultValue: "Actif" }) : statusFilter === "inactive" ? t("common.tables.inactive", { defaultValue: "Inactif" }) : t("common.tables.all_status", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="140px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter(""); navigate({ to: "/course", search: (prev) => ({ ...prev, status: undefined, page: 1 }) }) }}>{t("common.tables.all_status", { defaultValue: "Tous" })}</MenuItem>
            <MenuItem value="active" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter("active"); navigate({ to: "/course", search: (prev) => ({ ...prev, status: "active", page: 1 }) }) }}>{t("common.tables.active", { defaultValue: "Actif" })}</MenuItem>
            <MenuItem value="inactive" fontSize="13px" borderRadius="6px" onClick={() => { setStatusFilter("inactive"); navigate({ to: "/course", search: (prev) => ({ ...prev, status: "inactive", page: 1 }) }) }}>{t("common.tables.inactive", { defaultValue: "Inactif" })}</MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Box>
  )
}

function CourseTable({
  nameSearch,
  codeSearch,
}: {
  nameSearch: string
  codeSearch: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, type, status } = Route.useSearch()
  const name = nameSearch
  const code = codeSearch

  // Sync debounced searches to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/course", search: (prev) => ({ ...prev, name: nameSearch || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [nameSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/course", search: (prev) => ({ ...prev, code: codeSearch || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [codeSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getCoursesQueryOptions({ page, name, code, type, status }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/course",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const courses = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (courses.length === 0) {
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
              <FiSearch />
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
                {t("common.tables.add_first_course", {
                  defaultValue: "Get started by creating your first course",
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
          <Table.Header>
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
                w="180px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.table.course_info")}
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
              {/* <Table.ColumnHeader w="80px" textAlign="center" color="black" fontWeight="bold" fontSize="xs" textTransform="uppercase" letterSpacing="wider">{t("common.tables.credits")}</Table.ColumnHeader> */}
              <Table.ColumnHeader
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.table.hours_per_week")}
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
                {t("course.table.type")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="120px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("course.table.prerequisites")}
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
            {courses.map((course, _index) => (
              <Table.Row
                key={course.id}
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
                    {course.id?.toString().slice(-4) || "N/A"}
                  </Text>
                </Table.Cell>

                <Table.Cell w="180px">
                  <VStack align="start" gap={0}>
                    <Text
                      fontSize="sm"
                      color="gray.700"
                      fontWeight="600"
                      truncate
                      maxW="160px"
                    >
                      {course.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {new Date(course.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })}
                    </Text>
                  </VStack>
                </Table.Cell>

                <Table.Cell w="100px">
                  <Badge colorPalette="blue" variant="outline" size="xs">
                    {course.code}
                  </Badge>
                </Table.Cell>

                <Table.Cell flex="1" minW="200px">
                  <Text fontSize="xs" color="gray.600" lineClamp={1} maxW="250px">
                    {course.description || "-"}
                  </Text>
                </Table.Cell>
                {/* 
                <Table.Cell w="80px" textAlign="center">
                  <HStack gap={1} justify="center">
                    <Icon as={FiAward} boxSize={3} color="gray.400" />
                    <Text fontSize="sm" color="gray.700" fontFamily="mono" fontWeight="600">
                      {course.credits}
                    </Text>
                  </HStack>
                </Table.Cell> */}

                <Table.Cell w="100px" textAlign="center">
                  <HStack gap={1} justify="center">
                    <Icon as={FiClock} boxSize={3} color="gray.400" />
                    <Text fontSize="sm" color="gray.700" fontFamily="mono">
                      {course.hours_per_week || 0}h
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  {course.is_mandatory ? (
                    <Badge colorPalette="blue" variant="surface" size="xs">
                      {t("common.tables.mandatory")}
                    </Badge>
                  ) : (
                    <Badge colorPalette="gray" variant="outline" size="xs">
                      {t("common.tables.optional")}
                    </Badge>
                  )}
                </Table.Cell>

                <Table.Cell w="120px">
                  <VStack align="start" gap={0}>
                    {course.prerequisites ? (
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        truncate
                        maxW="100px"
                        title={course.prerequisites}
                      >
                        {course.prerequisites}
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="gray.400">
                        -
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>

                <Table.Cell w="90px" textAlign="center">
                  {course.is_active ? (
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
                  <CourseActionsMenu course={course} />
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
            items: t("common.courses"),
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

function CoursePage() {
  const search = Route.useSearch()
  const [nameSearch, setNameSearch] = useState(search.name || "")
  const [codeSearch, setCodeSearch] = useState(search.code || "")
  const [typeFilter, setTypeFilter] = useState(search.type || "")
  const [statusFilter, setStatusFilter] = useState(search.status || "")

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <CourseHeader
          nameSearch={nameSearch}
          setNameSearch={setNameSearch}
          codeSearch={codeSearch}
          setCodeSearch={setCodeSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        <CourseTable nameSearch={nameSearch} codeSearch={codeSearch} />
      </Container>
    </Box>
  )
}
