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
  FiCalendar,
  FiClock,
  FiInfo,
  FiLayers,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi"
import { z } from "zod"

import { ProgramLevelsService } from "@/client"
import { ProgramLevelActionsMenu } from "@/components/Common/ProgramLevelActionsMenu"
import PendingItems from "@/components/Pending/PendingItems"
import AddProgramLevel from "@/components/program_level/AddProgramLevel"
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

const programLevelSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

function getProgramLevelsQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["program_levels", { page }],
  }
}

export const Route = createFileRoute("/_layout/program_level")({
  component: ProgramLevelPage,
  validateSearch: (search) => programLevelSearchSchema.parse(search),
})

function ProgramLevelHeader() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["program_levels"] })
  }

  const { data } = useQuery({
    ...getProgramLevelsQueryOptions({ page }),
  })

  const totalLevels = data?.count ?? 0
  const activeLevels =
    data?.data?.filter((level) => level.is_active)?.length ?? 0
  const inactiveLevels =
    data?.data?.filter((level) => !level.is_active)?.length ?? 0
  const withDurationCount =
    data?.data?.filter((level) => level.typical_duration)?.length ?? 0
  const avgDuration =
    (data?.data ?? [])
      ?.filter((level) => level.typical_duration)
      .reduce((sum, level) => sum + (level.typical_duration || 0), 0) /
    Math.max(
      (data?.data ?? [])?.filter((level) => level.typical_duration)?.length ??
      1,
      1,
    )

  return (
    <Box borderBottom="1px solid" borderColor={C.line} pb={6} mb={6}>
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} wrap="wrap">
        <Flex gap="14px" align="stretch">
          <Box w="3px" borderRadius="full" bg={C.brand} flexShrink={0} />
          <Box>
            <Text fontFamily={MONO} fontSize="10px" fontWeight="700" letterSpacing="2px" color={C.brand} mb="5px">
              NIVEAUX DE FORMATION
            </Text>
            <Heading fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color={C.ink} letterSpacing="-0.5px" lineHeight="1.05">
              Niveaux de formation
            </Heading>
            <Text color={C.inkMute} fontSize="13px" mt="5px">
              {t("program_level_page.subtitle")}
            </Text>
          </Box>
        </Flex>

        <HStack gap={2}>
          <IconButton
            variant="outline"
            onClick={handleRefresh}
            aria-label="Refresh data"
            size="sm"
            borderColor={C.line}
            color={C.inkMute}
            borderRadius="4px"
            _hover={{ color: C.brandDeep, borderColor: C.brand, bg: "white" }}
          >
            <FiRefreshCw />
          </IconButton>
          <AddProgramLevel />
        </HStack>
      </Flex>

      <Flex justify="space-between" align="center">
        <HStack gap={6}>
          <Text fontSize="xs" color="fg.muted">
            <Text as="span" fontWeight="600" color="fg.default" fontSize="xs">
              {totalLevels}
            </Text>{" "}
            {t("program_level_page.total")}
          </Text>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("common.active_label")}
            </Text>
            <Badge colorPalette="green" variant="subtle" size="sm">
              <Text fontSize="xs">{activeLevels}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("common.inactive_label")}
            </Text>
            <Badge colorPalette="red" variant="subtle" size="sm">
              <Text fontSize="xs">{inactiveLevels}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("program_level_page.with_duration")}
            </Text>
            <Badge colorPalette="blue" variant="subtle" size="sm">
              <Text fontSize="xs">{withDurationCount}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("program_level_page.avg_duration")}
            </Text>
            <Badge colorPalette="purple" variant="subtle" size="sm">
              <Text fontSize="xs">{Math.round(avgDuration) || "N/A"}</Text>
            </Badge>
          </HStack>
        </HStack>
      </Flex>
    </Box>
  )
}

function ProgramLevelTable() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getProgramLevelsQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/program_level",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const levels = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (levels.length === 0) {
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
                {t("program_level_page.no_found")}
              </EmptyState.Title>
              <EmptyState.Description color="fg.muted" fontSize="xs">
                {t("program_level_page.no_found_desc")}
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      </Box>
    )
  }

  const getDurationTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "years":
        return "blue"
      case "months":
        return "green"
      case "semesters":
        return "purple"
      default:
        return "gray"
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
        overflow="hidden"
      >
        <Table.Root size="md" variant="outline">
          <Table.Header position="sticky" top={0} zIndex={1}>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader w="60px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.id")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("program_level_page.columns.level_info")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="80px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("student_courses_page.columns.code")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("program_level_page.columns.program")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader flex="1" minW="180px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.description")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="100px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("program_level_page.columns.duration")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="90px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.type")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="100px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("program_level_page.columns.updated")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="80px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.status")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="80px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
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
              {levels.map((level, index) => (
                <Table.Row
                  key={level.id}
                  opacity={isPlaceholderData ? 0.5 : 1}
                  _hover={{ bg: "#edf2f7" }}
                  transition="background 0.1s"
                  bg={index % 2 === 0 ? "white" : "#f7f9fc"}
                >
                  <Table.Cell w="60px" textAlign="center">
                    <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                      {level.id?.toString().slice(-4) || "N/A"}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="200px">
                    <VStack align="start" gap={0.5}>
                      <HStack gap={1}>
                        <FiLayers
                          size="10px"
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text
                          fontSize="xs"
                          color="#1a3a5c"
                          fontWeight="600"
                          truncate
                        >
                          {level.name}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="fg.muted">
                        {t("program_level_page.created")}{" "}
                        {new Date(level.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "2-digit",
                          },
                        )}
                      </Text>
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="80px">
                    <Badge colorPalette="blue" variant="outline" size="sm">
                      <Text fontSize="xs" fontWeight="500" fontFamily="mono">
                        {level.code}
                      </Text>
                    </Badge>
                  </Table.Cell>

                  <Table.Cell w="200px">
                    {level.program ? (
                      <VStack align="start" gap={0.5}>
                        <Text
                          fontSize="xs"
                          color="#1a3a5c"
                          fontWeight="600"
                          truncate
                        >
                          {level.program.name}
                        </Text>
                        <HStack gap={1}>
                          <Badge
                            colorPalette="purple"
                            variant="subtle"
                            size="sm"
                          >
                            <Text fontSize="xs" fontFamily="mono">
                              {level.program.code}
                            </Text>
                          </Badge>
                        </HStack>
                      </VStack>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        {t("program_level_page.no_program")}
                      </Text>
                    )}
                  </Table.Cell>

                  <Table.Cell flex="1" minW="180px">
                    <HStack gap={1}>
                      <FiInfo
                        size="10px"
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text
                        fontSize="xs"
                        color="#1a3a5c"
                        lineClamp={2}
                        title={level.description || undefined}
                      >
                        {level.description || t("program_level_page.no_description")}
                      </Text>
                    </HStack>
                  </Table.Cell>

                  <Table.Cell w="100px" textAlign="center">
                    {level.typical_duration ? (
                      <VStack gap={0.5}>
                        <HStack gap={1} justify="center">
                          <FiClock
                            size="10px"
                            color="var(--chakra-colors-fg-muted)"
                          />
                          <Text
                            fontSize="xs"
                            color="#1a3a5c"
                            fontFamily="mono"
                            fontWeight="600"
                          >
                            {level.typical_duration}
                          </Text>
                        </HStack>
                        <Text
                          fontSize="xs"
                          color="fg.muted"
                          textTransform="capitalize"
                        >
                          {level.duration_type || "units"}
                        </Text>
                      </VStack>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        {t("enrollment.not_set")}
                      </Text>
                    )}
                  </Table.Cell>

                  <Table.Cell w="90px" textAlign="center">
                    {level.duration_type ? (
                      <Badge
                        colorPalette={getDurationTypeColor(level.duration_type)}
                        variant="subtle"
                        size="sm"
                      >
                        <Text fontSize="xs" textTransform="capitalize">
                          {level.duration_type}
                        </Text>
                      </Badge>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        N/A
                      </Text>
                    )}
                  </Table.Cell>

                  <Table.Cell w="100px">
                    <VStack gap={0.5} align="start">
                      <HStack gap={1}>
                        <FiCalendar
                          size="10px"
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text fontSize="xs" color="fg.muted">
                          {new Date(level.updated_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "2-digit",
                            },
                          )}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="fg.muted">
                        {new Date(level.updated_at).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="80px" textAlign="center">
                    {level.is_active ? (
                      <Badge colorPalette="green" variant="solid" size="sm">
                        <Text fontSize="xs">{t("common.tables.active")}</Text>
                      </Badge>
                    ) : (
                      <Badge colorPalette="red" variant="outline" size="sm">
                        <Text fontSize="xs">{t("common.tables.inactive")}</Text>
                      </Badge>
                    )}
                  </Table.Cell>

                  <Table.Cell w="80px" textAlign="center">
                    <ProgramLevelActionsMenu
                      programLevel={{
                        ...level,
                        program_id: level.program?.id || "",
                      }}
                    />
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
          {t("program_level_page.showing", {
            from: (page - 1) * PER_PAGE + 1,
            to: Math.min(page * PER_PAGE, count),
            total: count,
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

function ProgramLevelPage() {
  return (
    <Box minH="100vh" bg={C.paper}>
      <Container maxW="full" py={{ base: 5, md: 6 }}>
        <ProgramLevelHeader />
        <ProgramLevelTable />
      </Container>
    </Box>
  )
}

// import {
//   Container,
//   EmptyState,
//   Flex,
//   Heading,
//   Table,
//   VStack,
//   Badge,
// } from "@chakra-ui/react"
// import { useQuery } from "@tanstack/react-query"
// import { createFileRoute, useNavigate } from "@tanstack/react-router"
// import { FiSearch } from "react-icons/fi"
// import { z } from "zod"

// import { ProgramLevelsService } from "@/client"
// import { ItemActionsMenu } from "@/components/Common/ItemActionsMenu"
// import AddProgramLevel from "@/components/program_level/AddProgramLevel"
// import PendingItems from "@/components/Pending/PendingItems"
// import {
//   PaginationItems,
//   PaginationNextTrigger,
//   PaginationPrevTrigger,
//   PaginationRoot,
// } from "@/components/ui/pagination"

// const programLevelSearchSchema = z.object({
//   page: z.number().catch(1),
// })

// const PER_PAGE = 5

// function getProgramLevelsQueryOptions({ page }: { page: number }) {
//   return {
//     queryFn: () =>
//       ProgramLevelsService.readProgramLevels({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
//     queryKey: ["program_levels", { page }],
//   }
// }

// export const Route = createFileRoute("/_layout/program_level")({
//   component: ProgramLevelPage,
//   validateSearch: (search) => programLevelSearchSchema.parse(search),
// })

// function ProgramLevelTable() {
//   const navigate = useNavigate({ from: Route.fullPath })
//   const { page } = Route.useSearch()

//   const { data, isLoading, isPlaceholderData } = useQuery({
//     ...getProgramLevelsQueryOptions({ page }),
//     placeholderData: (prevData) => prevData,
//   })

//   const setPage = (page: number) => {
//     navigate({
//       to: "/program_level",
//       search: (prev) => ({ ...prev, page }),
//     })
//   }

//   const levels = data?.data.slice(0, PER_PAGE) ?? []
//   const count = data?.count ?? 0

//   if (isLoading) {
//     return <PendingItems />
//   }

//   if (levels.length === 0) {
//     return (
//       <EmptyState.Root>
//         <EmptyState.Content>
//           <EmptyState.Indicator>
//             <FiSearch />
//           </EmptyState.Indicator>
//           <VStack textAlign="center">
//             <EmptyState.Title>No program levels found</EmptyState.Title>
//             <EmptyState.Description>
//               Add a new program level to get started
//             </EmptyState.Description>
//           </VStack>
//         </EmptyState.Content>
//       </EmptyState.Root>
//     )
//   }

//   return (
//     <>
//       <Table.Root size={{ base: "sm", md: "md" }}>
//         <Table.Header>
//           <Table.Row>
//             <Table.ColumnHeader w="sm">ID</Table.ColumnHeader>
//             <Table.ColumnHeader w="sm">Name</Table.ColumnHeader>
//             <Table.ColumnHeader w="sm">Code</Table.ColumnHeader>
//             <Table.ColumnHeader w="sm">Description</Table.ColumnHeader>
//             <Table.ColumnHeader w="sm">Active</Table.ColumnHeader>
//             <Table.ColumnHeader w="sm">Actions</Table.ColumnHeader>
//           </Table.Row>
//         </Table.Header>
//         <Table.Body>
//           {levels.map((level) => (
//             <Table.Row key={level.id} opacity={isPlaceholderData ? 0.5 : 1}>
//               <Table.Cell truncate maxW="sm">
//                 {level.id}
//               </Table.Cell>
//               <Table.Cell truncate maxW="sm">
//                 {level.name}
//               </Table.Cell>
//               <Table.Cell truncate maxW="sm">
//                 {level.code}
//               </Table.Cell>
//               <Table.Cell truncate maxW="sm">
//                 {level.description}
//               </Table.Cell>
//               <Table.Cell>
//                 <Badge colorScheme={level.is_active ? "green" : "red"}>
//                   {level.is_active ? "Active" : "Inactive"}
//                 </Badge>
//               </Table.Cell>
//               <Table.Cell>
//                 <ItemActionsMenu item={level} />
//               </Table.Cell>
//             </Table.Row>
//           ))}
//         </Table.Body>
//       </Table.Root>
//       <Flex justifyContent="flex-end" mt={4}>
//         <PaginationRoot
//           count={count}
//           pageSize={PER_PAGE}
//           onPageChange={({ page }) => setPage(page)}
//         >
//           <Flex>
//             <PaginationPrevTrigger />
//             <PaginationItems />
//             <PaginationNextTrigger />
//           </Flex>
//         </PaginationRoot>
//       </Flex>
//     </>
//   )
// }

// function ProgramLevelPage() {
//   return (
//     <Container maxW="full">
//       <Heading size="lg" pt={12}>
//         Program Levels Management
//       </Heading>
//       <AddProgramLevel />
//       <ProgramLevelTable />
//     </Container>
//   )
// }

// // import React, { useState } from "react";
// // import { ProgramLevelsService } from "@/client";
// // import type {
// //   ProgramLevelCreate,
// //   ProgramLevelPublic,
// //   ProgramLevelsPublic,
// //   ProgramLevelUpdate,
// // } from "@/client/types.gen";
// // import { createFileRoute } from '@tanstack/react-router';

// // type ResultState = {
// //   operation: string;
// //   data?: any;
// //   error?: string;
// // } | null;

// // function ProgramLevelCRUD() {
// //   const [loading, setLoading] = useState(false);
// //   const [result, setResult] = useState<ResultState>(null);

// //   // CREATE
// //   const createProgramLevel = async () => {
// //     setLoading(true);
// //     try {
// //       const newLevel = await ProgramLevelsService.createProgramLevel({
// //         requestBody: {
// //           name: "Bachelor",
// //           code: "BSC",
// //           description: "Bachelor level",
// //           is_active: true,
// //         } as ProgramLevelCreate,
// //       });
// //       setResult({ operation: "CREATE", data: newLevel });
// //     } catch (error) {
// //       setResult({
// //         operation: "CREATE",
// //         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
// //       });
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // READ ALL
// //   const readAllProgramLevels = async () => {
// //     setLoading(true);
// //     try {
// //       const levels = await ProgramLevelsService.readProgramLevels({
// //         skip: 0,
// //         limit: 20,
// //       });
// //       setResult({ operation: "READ ALL", data: levels });
// //     } catch (error) {
// //       setResult({
// //         operation: "READ ALL",
// //         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
// //       });
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // READ ONE
// //   const readOneProgramLevel = async (id: string) => {
// //     setLoading(true);
// //     try {
// //       const level = await ProgramLevelsService.readProgramLevel({
// //         levelId: id,
// //       });
// //       setResult({ operation: "READ ONE", data: level });
// //     } catch (error) {
// //       setResult({
// //         operation: "READ ONE",
// //         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
// //       });
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // UPDATE
// //   const updateProgramLevel = async (id: string) => {
// //     setLoading(true);
// //     try {
// //       const updated = await ProgramLevelsService.updateProgramLevel({
// //         levelId: id,
// //         requestBody: {
// //           name: "Bachelor Updated",
// //           description: "Updated description",
// //           is_active: true,
// //         } as ProgramLevelUpdate,
// //       });
// //       setResult({ operation: "UPDATE", data: updated });
// //     } catch (error) {
// //       setResult({
// //         operation: "UPDATE",
// //         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
// //       });
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // DELETE
// //   const deleteProgramLevel = async (id: string) => {
// //     setLoading(true);
// //     try {
// //       const deleted = await ProgramLevelsService.deleteProgramLevel({
// //         levelId: id,
// //       });
// //       setResult({ operation: "DELETE", data: deleted });
// //     } catch (error) {
// //       setResult({
// //         operation: "DELETE",
// //         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
// //       });
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div className="p-6 max-w-4xl mx-auto">
// //       <h1 className="text-3xl font-bold mb-6">Program Levels CRUD Operations</h1>

// //       <div className="space-y-4 mb-6">
// //         <div className="bg-white p-4 rounded-lg shadow">
// //           <h2 className="text-xl font-semibold mb-3">Create</h2>
// //           <button
// //             onClick={createProgramLevel}
// //             disabled={loading}
// //             className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
// //           >
// //             CREATE Program Level
// //           </button>
// //         </div>

// //         <div className="bg-white p-4 rounded-lg shadow">
// //           <h2 className="text-xl font-semibold mb-3">Read Operations</h2>
// //           <div className="grid grid-cols-2 gap-2">
// //             <button
// //               onClick={readAllProgramLevels}
// //               disabled={loading}
// //               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
// //             >
// //               READ ALL Program Levels
// //             </button>
// //             <button
// //               onClick={() => readOneProgramLevel("uuid-level")}
// //               disabled={loading}
// //               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
// //             >
// //               READ ONE by ID
// //             </button>
// //           </div>
// //         </div>

// //         <div className="bg-white p-4 rounded-lg shadow">
// //           <h2 className="text-xl font-semibold mb-3">Update</h2>
// //           <button
// //             onClick={() => updateProgramLevel("uuid-level")}
// //             disabled={loading}
// //             className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
// //           >
// //             UPDATE Program Level
// //           </button>
// //         </div>

// //         <div className="bg-white p-4 rounded-lg shadow">
// //           <h2 className="text-xl font-semibold mb-3">Delete</h2>
// //           <button
// //             onClick={() => deleteProgramLevel("uuid-level")}
// //             disabled={loading}
// //             className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
// //           >
// //             DELETE Program Level
// //           </button>
// //         </div>
// //       </div>

// //       {loading && (
// //         <div className="text-center py-4">
// //           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
// //           <p className="mt-2">Loading...</p>
// //         </div>
// //       )}

// //       {result && (
// //         <div className="bg-gray-100 p-4 rounded-lg">
// //           <h2 className="text-xl font-semibold mb-2">Result - {result.operation}</h2>
// //           <pre className="bg-white p-4 rounded overflow-auto max-h-96">
// //             {JSON.stringify(result, null, 2)}
// //           </pre>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default ProgramLevelCRUD;

// // export const Route = createFileRoute('/_layout/program_level')({
// //   component: ProgramLevelCRUD,
// // });
