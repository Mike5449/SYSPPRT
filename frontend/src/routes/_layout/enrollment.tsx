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
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from "react-icons/fi"
import { z } from "zod"

import { EnrollmentsService } from "@/client"
import { EnrollmentActionsMenu } from "@/components/Common/EnrollmentActionMenu"
import AddEnrollment from "@/components/enrollment/AddEnrollment"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"

const enrollmentSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 10

function getEnrollmentsQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      EnrollmentsService.readEnrollments({
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["enrollments", { page }],
  }
}

export const Route = createFileRoute("/_layout/enrollment")({
  component: EnrollmentPage,
  validateSearch: (search) => enrollmentSearchSchema.parse(search),
})

function EnrollmentHeader() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["enrollments"] })
  }

  const { data } = useQuery({
    ...getEnrollmentsQueryOptions({ page }),
  })

  const totalEnrollments = data?.count ?? 0
  const activeEnrollments =
    data?.data?.filter(
      (enrollment) => enrollment.is_active && enrollment.status === "active",
    )?.length ?? 0
  const completedEnrollments =
    data?.data?.filter((enrollment) => enrollment.status === "completed")
      ?.length ?? 0
  const droppedEnrollments =
    data?.data?.filter((enrollment) => enrollment.drop_date)?.length ?? 0
  const withNotesCount =
    data?.data?.filter((enrollment) => enrollment.notes)?.length ?? 0

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
            Inscriptions des Étudiants
          </Heading>
          <Text color="fg.muted" fontSize="xs">
            {t("enrollment.subtitle")}
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
          <AddEnrollment />
        </HStack>
      </Flex>

      <Flex justify="space-between" align="center">
        <HStack gap={6}>
          <Text fontSize="xs" color="fg.muted">
            <Text as="span" fontWeight="600" color="fg.default" fontSize="xs">
              {totalEnrollments}
            </Text>{" "}
            {t("enrollment.total")}
          </Text>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("enrollment.active_label")}
            </Text>
            <Badge colorPalette="green" variant="subtle" size="sm">
              <Text fontSize="xs">{activeEnrollments}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("enrollment.completed_label")}
            </Text>
            <Badge colorPalette="blue" variant="subtle" size="sm">
              <Text fontSize="xs">{completedEnrollments}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("enrollment.dropped_label")}
            </Text>
            <Badge colorPalette="red" variant="subtle" size="sm">
              <Text fontSize="xs">{droppedEnrollments}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("enrollment.with_notes")}
            </Text>
            <Badge colorPalette="purple" variant="subtle" size="sm">
              <Text fontSize="xs">{withNotesCount}</Text>
            </Badge>
          </HStack>
        </HStack>
      </Flex>
    </Box>
  )
}

function EnrollmentTable() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getEnrollmentsQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/enrollment",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const enrollments = data?.data?.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (enrollments.length === 0) {
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
                {t("enrollment.no_found")}
              </EmptyState.Title>
              <EmptyState.Description color="fg.muted" fontSize="xs">
                {t("enrollment.no_found_desc")}
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      </Box>
    )
  }

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return "gray"
    switch (status?.toLowerCase()) {
      case "active":
        return "green"
      case "completed":
        return "blue"
      case "dropped":
        return "red"
      case "withdrawn":
        return "orange"
      default:
        return "gray"
    }
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box
        borderRadius="sm"
        border="1px solid"
        borderColor="gray.200"
        overflow="hidden"
        bg="white"
      >
        <Table.Root size="sm" variant="outline">
          <Table.Header position="sticky" top={0} zIndex={1}>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader w="60px" textAlign="center">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("common.tables.id")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="140px">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("enrollment.columns.student")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="140px">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("common.tables.course_session")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="120px">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("enrollment.columns.enrollment_date")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="120px">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("enrollment.columns.drop_date")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="100px" textAlign="center">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("common.tables.status")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="90px" textAlign="center">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("common.tables.active")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader flex="1" minW="150px">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("enrollment.columns.notes")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="120px">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
                  {t("enrollment.columns.created")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="80px" textAlign="center">
                <Text fontSize="xs" fontWeight="700" color="white" letterSpacing="wide">
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
              {enrollments.map((enrollment, index) => (
                <Table.Row
                  key={enrollment.id}
                  opacity={isPlaceholderData ? 0.5 : 1}
                  _hover={{ bg: "bg.subtle" }}
                  bg={index % 2 === 0 ? "white" : "#f7f9fc"}
                >
                  <Table.Cell w="60px" textAlign="center">
                    <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                      {enrollment.id?.toString().slice(-4) || "N/A"}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="140px">
                    <HStack gap={1}>
                      <FiUser
                        size="10px"
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text
                        fontSize="xs"
                        color="fg.default"
                        truncate
                        title={`${enrollment.student?.user?.first_name} ${enrollment.student?.user?.last_name}`}
                      >
                        {enrollment.student?.user
                          ? `${enrollment.student.user.first_name} ${enrollment.student.user.last_name}`
                          : "N/A"}
                      </Text>
                    </HStack>
                  </Table.Cell>

                  <Table.Cell w="140px">
                    <HStack gap={1}>
                      <FiBookOpen
                        size="10px"
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text
                        fontSize="xs"
                        color="fg.default"
                        truncate
                        title={
                          enrollment.course_session?.course_program_level
                            ?.course?.name
                        }
                      >
                        {enrollment.course_session?.course_program_level?.course
                          ?.name || "N/A"}
                      </Text>
                    </HStack>
                  </Table.Cell>

                  <Table.Cell w="120px">
                    <VStack align="start" gap={0.5}>
                      <HStack gap={1}>
                        <FiCalendar
                          size="10px"
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text fontSize="xs" color="fg.default">
                          {enrollment.enrollment_date
                            ? new Date(
                                enrollment.enrollment_date,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "2-digit",
                              })
                            : t("enrollment.not_set")}
                        </Text>
                      </HStack>
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="120px">
                    {enrollment.drop_date ? (
                      <VStack align="start" gap={0.5}>
                        <HStack gap={1}>
                          <FiClock
                            size="10px"
                            color="var(--chakra-colors-red-500)"
                          />
                          <Text fontSize="xs" color="red.500">
                            {new Date(enrollment.drop_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "2-digit",
                              },
                            )}
                          </Text>
                        </HStack>
                      </VStack>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        {t("common.tables.active")}
                      </Text>
                    )}
                  </Table.Cell>

                  <Table.Cell w="100px" textAlign="center">
                    <Badge
                      colorPalette={getStatusColor(
                        enrollment.status || "",
                        enrollment.is_active ?? true,
                      )}
                      variant="solid"
                      size="sm"
                    >
                      <Text fontSize="xs" textTransform="capitalize">
                        {enrollment.status || "pending"}
                      </Text>
                    </Badge>
                  </Table.Cell>

                  <Table.Cell w="90px" textAlign="center">
                    {enrollment.is_active ? (
                      <Badge colorPalette="green" variant="outline" size="sm">
                        <Text fontSize="xs">{t("common.tables.yes")}</Text>
                      </Badge>
                    ) : (
                      <Badge colorPalette="gray" variant="outline" size="sm">
                        <Text fontSize="xs">{t("common.tables.no")}</Text>
                      </Badge>
                    )}
                  </Table.Cell>

                  <Table.Cell flex="1" minW="150px">
                    {enrollment.notes ? (
                      <VStack align="start" gap={0.5}>
                        <HStack gap={1}>
                          <FiFileText
                            size="10px"
                            color="var(--chakra-colors-fg-muted)"
                          />
                          <Text
                            fontSize="xs"
                            color="fg.default"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                            title={enrollment.notes}
                          >
                            {enrollment.notes}
                          </Text>
                        </HStack>
                      </VStack>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        {t("enrollment.no_notes")}
                      </Text>
                    )}
                  </Table.Cell>

                  <Table.Cell w="120px">
                    <Text fontSize="xs" color="fg.muted">
                      {new Date(enrollment.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "2-digit",
                        },
                      )}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="80px" textAlign="center">
                    <EnrollmentActionsMenu enrollment={enrollment} />
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
          {t("enrollment.showing", {
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

function EnrollmentPage() {
  return (
    <Container maxW="full" py={8}>
      <EnrollmentHeader />
      <EnrollmentTable />
    </Container>
  )
}

// import React, { useState } from "react";
// import { EnrollmentsService } from "@/client";
// import type {
//   EnrollmentCreate,
//   EnrollmentPublic,
//   EnrollmentsPublic,
//   EnrollmentUpdate,
// } from "@/client/types.gen";
// import { createFileRoute } from '@tanstack/react-router';

// type ResultState = {
//   operation: string;
//   data?: any;
//   error?: string;
// } | null;

// function EnrollmentCRUD() {
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState<ResultState>(null);

//   // CREATE
//   const createEnrollment = async () => {
//     setLoading(true);
//     try {
//       const newEnrollment = await EnrollmentsService.createEnrollment({
//         requestBody: {
//           student_id: "uuid-student",
//           course_session_id: "uuid-session",
//           enrollment_date: "2024-11-01",
//           status: "active",
//         } as EnrollmentCreate,
//       });
//       setResult({ operation: "CREATE", data: newEnrollment });
//     } catch (error) {
//       setResult({
//         operation: "CREATE",
//         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // READ ALL
//   const readAllEnrollments = async () => {
//     setLoading(true);
//     try {
//       const enrollments = await EnrollmentsService.readEnrollments({
//         skip: 0,
//         limit: 20,
//       });
//       setResult({ operation: "READ ALL", data: enrollments });
//     } catch (error) {
//       setResult({
//         operation: "READ ALL",
//         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // READ ONE
//   const readOneEnrollment = async (id: string) => {
//     setLoading(true);
//     try {
//       const enrollment = await EnrollmentsService.readEnrollment({
//         enrollmentId: id,
//       });
//       setResult({ operation: "READ ONE", data: enrollment });
//     } catch (error) {
//       setResult({
//         operation: "READ ONE",
//         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // UPDATE
//   const updateEnrollment = async (id: string) => {
//     setLoading(true);
//     try {
//       const updated = await EnrollmentsService.updateEnrollment({
//         enrollmentId: id,
//         requestBody: {
//           status: "inactive",
//         } as EnrollmentUpdate,
//       });
//       setResult({ operation: "UPDATE", data: updated });
//     } catch (error) {
//       setResult({
//         operation: "UPDATE",
//         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // DELETE
//   const deleteEnrollment = async (id: string) => {
//     setLoading(true);
//     try {
//       const deleted = await EnrollmentsService.deleteEnrollment({
//         enrollmentId: id,
//       });
//       setResult({ operation: "DELETE", data: deleted });
//     } catch (error) {
//       setResult({
//         operation: "DELETE",
//         error: typeof error === "object" && error !== null && "message" in error ? String((error as any).message) : String(error),
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6">Enrollments CRUD Operations</h1>

//       <div className="space-y-4 mb-6">
//         <div className="bg-white p-4 rounded-lg shadow">
//           <h2 className="text-xl font-semibold mb-3">Create</h2>
//           <button
//             onClick={createEnrollment}
//             disabled={loading}
//             className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
//           >
//             CREATE Enrollment
//           </button>
//         </div>

//         <div className="bg-white p-4 rounded-lg shadow">
//           <h2 className="text-xl font-semibold mb-3">Read Operations</h2>
//           <div className="grid grid-cols-2 gap-2">
//             <button
//               onClick={readAllEnrollments}
//               disabled={loading}
//               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
//             >
//               READ ALL Enrollments
//             </button>
//             <button
//               onClick={() => readOneEnrollment("uuid-enrollment")}
//               disabled={loading}
//               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
//             >
//               READ ONE by ID
//             </button>
//           </div>
//         </div>

//         <div className="bg-white p-4 rounded-lg shadow">
//           <h2 className="text-xl font-semibold mb-3">Update</h2>
//           <button
//             onClick={() => updateEnrollment("uuid-enrollment")}
//             disabled={loading}
//             className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
//           >
//             UPDATE Enrollment
//           </button>
//         </div>

//         <div className="bg-white p-4 rounded-lg shadow">
//           <h2 className="text-xl font-semibold mb-3">Delete</h2>
//           <button
//             onClick={() => deleteEnrollment("uuid-enrollment")}
//             disabled={loading}
//             className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
//           >
//             DELETE Enrollment
//           </button>
//         </div>
//       </div>

//       {loading && (
//         <div className="text-center py-4">
//           <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
//           <p className="mt-2">Loading...</p>
//         </div>
//       )}

//       {result && (
//         <div className="bg-gray-100 p-4 rounded-lg">
//           <h2 className="text-xl font-semibold mb-2">Result - {result.operation}</h2>
//           <pre className="bg-white p-4 rounded overflow-auto max-h-96">
//             {JSON.stringify(result, null, 2)}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }

// export default EnrollmentCRUD;

// export const Route = createFileRoute('/_layout/enrollment')({
//   component: EnrollmentCRUD,
// });
