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
import { FiCalendar, FiChevronDown, FiRefreshCw, FiSearch } from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { z } from "zod"

import { AcademicYearsService } from "@/client"
import AddAcademicYear from "@/components/academic_year/AddAcademicYear"
import { AcademicYearActionsMenu } from "@/components/Common/AcademicYearActionsMenu"
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

const academicYearSearchSchema = z.object({
  page: z.number().catch(1),
  name: z.string().optional(),
  code: z.string().optional(),
  is_current: z.string().optional(),
})

const PER_PAGE = 10

function getAcademicYearsQueryOptions({
  page,
  name,
  code,
  is_current,
}: {
  page: number
  name?: string
  code?: string
  is_current?: string
}) {
  return {
    queryFn: () =>
      AcademicYearsService.readAcademicYears({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
        name: name || undefined,
        code: code || undefined,
        isCurrent:
          is_current === "yes" ? true : is_current === "no" ? false : undefined,
      }),
    queryKey: ["academic_years", { page, name, code, is_current }],
  }
}

export const Route = createFileRoute("/_layout/academic_year")({
  component: AcademicYearPage,
  validateSearch: (search) => academicYearSearchSchema.parse(search),
})

function AcademicYearHeader({
  nameSearch,
  setNameSearch,
  codeSearch,
  setCodeSearch,
  isCurrentFilter,
  setIsCurrentFilter,
}: {
  nameSearch: string
  setNameSearch: (v: string) => void
  codeSearch: string
  setCodeSearch: (v: string) => void
  isCurrentFilter: string
  setIsCurrentFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })


  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["academic_years"] })
  }

  return (
    <Box mb={5}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              ANNÉES ACADÉMIQUES
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Années académiques
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("common.tables.description_academic_year", {
                defaultValue: "Gérer les années et périodes académiques",
              })}
            </Text>
          </Box>
        </Flex>
        <HStack gap={2}>
          <IconButton variant="outline" size="sm" onClick={handleRefresh} aria-label={t("common.tables.refresh")} borderColor={C.line} color={C.inkMute} borderRadius="4px" _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}>
            <FiRefreshCw />
          </IconButton>
          <AddAcademicYear />
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
          <Icon as={FiCalendar} color={C.faint} boxSize={3.5} flexShrink={0} />
          <Input border="none" bg="transparent" p={0} h="auto" placeholder={t("common.tables.code")} fontSize="13px" fontFamily={MONO} color={C.ink} w="80px" outline="none" _placeholder={{ color: C.faint, fontFamily: "body" }} _focus={{ outline: "none", boxShadow: "none" }} value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
        </HStack>

        <MenuRoot positioning={{ gutter: 6, placement: "bottom-end" }}>
          <MenuTrigger asChild>
            <HStack cursor="pointer" gap="9px" px="11px" py="7px" borderRadius="4px" border="1px solid" borderColor={C.line} bg="white" transition="border-color 0.15s, background 0.15s" _hover={{ borderColor: C.brand, bg: C.paper }}>
              <Icon as={FiCalendar} color={C.brand} boxSize={3.5} flexShrink={0} />
              <Box minW={0}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.6px" textTransform="uppercase" color={C.faint} lineHeight="1">Statut</Text>
                <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.3">{isCurrentFilter === "yes" ? t("common.tables.current", { defaultValue: "En cours" }) : isCurrentFilter === "no" ? t("common.tables.not_current", { defaultValue: "Terminée" }) : t("common.tables.all_status", { defaultValue: "Tous" })}</Text>
              </Box>
              <Icon as={FiChevronDown} boxSize={3} color={C.faint} flexShrink={0} />
            </HStack>
          </MenuTrigger>
          <MenuContent minW="150px" bg="white" borderRadius="6px" border="1px solid" borderColor={C.line} p="4px" zIndex={1500}>
            <MenuItem value="" fontSize="13px" borderRadius="6px" onClick={() => { setIsCurrentFilter(""); navigate({ to: "/academic_year", search: (prev) => ({ ...prev, is_current: undefined, page: 1 }) }) }}>{t("common.tables.all_status", { defaultValue: "Tous" })}</MenuItem>
            <MenuItem value="yes" fontSize="13px" borderRadius="6px" onClick={() => { setIsCurrentFilter("yes"); navigate({ to: "/academic_year", search: (prev) => ({ ...prev, is_current: "yes", page: 1 }) }) }}>{t("common.tables.current", { defaultValue: "En cours" })}</MenuItem>
            <MenuItem value="no" fontSize="13px" borderRadius="6px" onClick={() => { setIsCurrentFilter("no"); navigate({ to: "/academic_year", search: (prev) => ({ ...prev, is_current: "no", page: 1 }) }) }}>{t("common.tables.not_current", { defaultValue: "Terminée" })}</MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Box>
  )
}

function AcademicYearTable({
  nameSearch,
  codeSearch,
}: {
  nameSearch: string
  codeSearch: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, is_current } = Route.useSearch()

  // Sync debounced name/code searches to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({
        to: "/academic_year",
        search: (prev) => ({ ...prev, name: nameSearch || undefined, page: 1 }),
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [nameSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({
        to: "/academic_year",
        search: (prev) => ({ ...prev, code: codeSearch || undefined, page: 1 }),
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [codeSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getAcademicYearsQueryOptions({ page, name: nameSearch, code: codeSearch, is_current }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/academic_year",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const years = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (years.length === 0) {
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
                {t("common.tables.add_first_academic_year", {
                  defaultValue:
                    "Get started by adding your first academic year",
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
        <Table.Root size="sm" interactive stickyHeader minW="1000px">
          <Table.Header>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader
                w="200px"
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
                {t("common.tables.code")}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                w="240px"
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
                w="100px"
                textAlign="center"
                color="white"
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                {t("common.tables.current")}
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
                {t("common.tables.active")}
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
            {years.map((year, _index) => (
              <Table.Row
                key={year.id}
                opacity={isPlaceholderData ? 0.5 : 1}
                _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "#edf2f7" }}
                transition="background 0.1s"
              >
                <Table.Cell w="200px">
                  <HStack gap={2}>
                    <Icon as={FiCalendar} color="gray.400" size="xs" />
                    <Text
                      fontWeight="600"
                      color="#1a3a5c"
                      fontSize="sm"
                      truncate
                    >
                      {year.name}
                    </Text>
                  </HStack>
                </Table.Cell>

                <Table.Cell w="100px">
                  <Badge variant="surface" colorPalette="gray" size="xs">
                    {year.code}
                  </Badge>
                </Table.Cell>

                <Table.Cell w="240px">
                  <Text fontSize="xs" color="gray.600">
                    {year.start_date} — {year.end_date}
                  </Text>
                </Table.Cell>

                <Table.Cell flex="1" minW="200px">
                  <Text
                    fontSize="xs"
                    color="#1a3a5c"
                    truncate
                    title={year.description || undefined}
                  >
                    {year.description || "-"}
                  </Text>
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  {year.is_current ? (
                    <Badge colorPalette="blue" variant="solid" size="xs">
                      {t("common.tables.yes")}
                    </Badge>
                  ) : (
                    <Text fontSize="xs" color="gray.300">
                      -
                    </Text>
                  )}
                </Table.Cell>

                <Table.Cell w="100px" textAlign="center">
                  {year.is_active ? (
                    <Badge colorPalette="green" variant="subtle" size="xs">
                      {t("common.tables.yes")}
                    </Badge>
                  ) : (
                    <Badge colorPalette="red" variant="subtle" size="xs">
                      {t("common.tables.no")}
                    </Badge>
                  )}
                </Table.Cell>

                <Table.Cell w="80px" textAlign="center">
                  <AcademicYearActionsMenu academicYear={year} />
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
            items: t("common.academic_years"),
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

function AcademicYearPage() {
  const search = Route.useSearch()
  const [nameSearch, setNameSearch] = useState(search.name || "")
  const [codeSearch, setCodeSearch] = useState(search.code || "")
  const [isCurrentFilter, setIsCurrentFilter] = useState(search.is_current || "")

  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 8 }}>
        <AcademicYearHeader
          nameSearch={nameSearch}
          setNameSearch={setNameSearch}
          codeSearch={codeSearch}
          setCodeSearch={setCodeSearch}
          isCurrentFilter={isCurrentFilter}
          setIsCurrentFilter={setIsCurrentFilter}
        />
        <AcademicYearTable nameSearch={nameSearch} codeSearch={codeSearch} />
      </Container>
    </Box>
  )
}
