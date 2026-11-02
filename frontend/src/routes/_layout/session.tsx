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
  FiActivity,
  FiBook,
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import { SessionsService } from "@/client"
import { SessionActionsMenu } from "@/components/Common/SessionActionsMenu"
import PendingItems from "@/components/Pending/PendingItems"
import AddSession from "@/components/session/AddSession"
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

const sessionSearchSchema = z.object({
  page: z.number().catch(1),
  code: z.string().optional(),
  academicYearId: z.string().optional(),
  is_active: z.string().optional(),
})

const PER_PAGE = 10

function getSessionsQueryOptions({
  page,
  code,
  academicYearId,
  is_active,
}: {
  page: number
  code?: string
  academicYearId?: string
  is_active?: string
}) {
  return {
    queryFn: () =>
      SessionsService.readSessionsWithAcademicYear({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        code: code || undefined,
        academicYearId: academicYearId || undefined,
        isActive:
          is_active === "yes" ? true : is_active === "no" ? false : undefined,
      }),
    queryKey: ["sessions", { page, code, academicYearId, is_active }],
  }
}

export const Route = createFileRoute("/_layout/session")({
  component: SessionPage,
  validateSearch: (search) => sessionSearchSchema.parse(search),
})

function SessionHeader({
  codeSearch,
  setCodeSearch,
  isActiveFilter,
  setIsActiveFilter,
}: {
  codeSearch: string
  setCodeSearch: (v: string) => void
  isActiveFilter: string
  setIsActiveFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })


  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              SESSIONS ACADÉMIQUES
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Sessions
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("session.description", { defaultValue: "Gérer les sessions et trimestres académiques" })}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label={t("common.tables.refresh")} borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          <AddSession />
        </HStack>
      </Flex>

      <Flex bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} boxShadow="0 1px 2px rgba(20,34,30,0.04)" p="10px" gap="10px" align="center" wrap="wrap">
        <Text fontSize="9px" fontWeight="800" letterSpacing="0.8px" textTransform="uppercase" color={C.faint} pl="3px" pr="2px">
          Filtres
        </Text>
        <Box flex="1" minW="8px" />

        <HStack gap="8px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s" _focusWithin={{ borderColor: C.brand }}>
          <Icon as={FiSearch} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("session.fields.code")} fontSize="13px" fontFamily={MONO} color={C.ink} w="140px" outline="none" _placeholder={{ color: C.faint, fontFamily: "body" }} _focus={{ outline: "none", boxShadow: "none" }} value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
        </HStack>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiActivity} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Statut</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{isActiveFilter === "yes" ? t("common.tables.active", { defaultValue: "Active" }) : isActiveFilter === "no" ? t("common.tables.inactive", { defaultValue: "Inactive" }) : t("common.tables.all_status", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="140px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setIsActiveFilter(""); navigate({ to: "/session", search: (prev) => ({ ...prev, is_active: undefined, page: 1 }) }) }}>{t("common.tables.all_status", { defaultValue: "Tous" })}</MenuItem>
            <MenuItem value="yes" fontSize="13px" borderRadius="6px" onClick={() => { setIsActiveFilter("yes"); navigate({ to: "/session", search: (prev) => ({ ...prev, is_active: "yes", page: 1 }) }) }}>{t("common.tables.active", { defaultValue: "Active" })}</MenuItem>
            <MenuItem value="no" fontSize="13px" borderRadius="6px" onClick={() => { setIsActiveFilter("no"); navigate({ to: "/session", search: (prev) => ({ ...prev, is_active: "no", page: 1 }) }) }}>{t("common.tables.inactive", { defaultValue: "Inactive" })}</MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Box>
  )
}

function SessionTable({ codeSearch }: { codeSearch: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, academicYearId, is_active } = Route.useSearch()
  const code = codeSearch

  // Sync debounced code search to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/session", search: (prev) => ({ ...prev, code: codeSearch || undefined, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [codeSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getSessionsQueryOptions({ page, code, academicYearId, is_active }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/session",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const sessions = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (sessions.length === 0) {
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
                {t("session.add_description", {
                  defaultValue: "Get started by adding your first session",
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
        year: "numeric",
      })
    } catch {
      return dateString
    }
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
                {t("common.tables.name")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="100px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("session.fields.code")}
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
                {t("session.fields.number")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="240px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.duration")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                flex="1"
                minW="150px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("session.fields.description")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="140px"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("session.fields.academic_year")}
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
            {sessions.map((session) => {
              const isActive = session.is_active

              return (
                <Table.Row
                  key={session.id}
                  opacity={isPlaceholderData ? 0.5 : 1}
                  _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                  transition="background 0.1s"
                >
                  <Table.Cell w="180px">
                    <HStack gap={2}>
                      <Icon as={FiCalendar} color="gray.400" size="xs" />
                      <Text
                        fontSize="sm"
                        color="gray.800"
                        fontWeight="600"
                        truncate
                      >
                        {session.name}
                      </Text>
                    </HStack>
                  </Table.Cell>

                  <Table.Cell w="100px">
                    <Badge colorPalette="purple" variant="surface" size="xs">
                      {session.code}
                    </Badge>
                  </Table.Cell>

                  <Table.Cell w="80px" textAlign="center">
                    <Text
                      fontSize="xs"
                      color="gray.600"
                      fontFamily="mono"
                      fontWeight="bold"
                    >
                      {session.session_number}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="240px" textAlign="center">
                    <HStack gap={1} justify="center">
                      <Icon as={FiClock} size="xs" color="gray.400" />
                      <Text
                        fontSize="xs"
                        color="gray.600"
                        fontWeight="medium"
                        whiteSpace="nowrap"
                      >
                        {formatDate(session.start_date)} -{" "}
                        {formatDate(session.end_date)}
                      </Text>
                    </HStack>
                  </Table.Cell>

                  <Table.Cell flex="1" minW="150px">
                    <Text
                      fontSize="xs"
                      color="black"
                      truncate
                      title={session.description || undefined}
                    >
                      {session.description || "-"}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="140px">
                    <HStack gap={1}>
                      <Icon as={FiBook} boxSize={3} color="gray.400" />
                      <Text
                        fontSize="xs"
                        color="gray.700"
                        truncate
                        title={session.academic_year?.name}
                      >
                        {session.academic_year?.name || "-"}
                      </Text>
                    </HStack>
                  </Table.Cell>

                  <Table.Cell w="100px" textAlign="center">
                    {isActive ? (
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
                    <SessionActionsMenu session={session} />
                  </Table.Cell>
                </Table.Row>
              )
            })}
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
            items: t("common.sessions"),
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

function SessionPage() {
  const search = Route.useSearch()
  const [codeSearch, setCodeSearch] = useState(search.code || "")
  const [isActiveFilter, setIsActiveFilter] = useState(search.is_active || "")

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <SessionHeader
          codeSearch={codeSearch}
          setCodeSearch={setCodeSearch}
          isActiveFilter={isActiveFilter}
          setIsActiveFilter={setIsActiveFilter}
        />
        <SessionTable codeSearch={codeSearch} />
      </Container>
    </Box>
  )
}
