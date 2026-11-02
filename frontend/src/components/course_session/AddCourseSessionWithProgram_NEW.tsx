import {
  Badge,
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  HStack,
  Icon,
  Input,
  Separator,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { FiCheckCircle, FiFilter, FiPlus } from "react-icons/fi"

import {
  CourseProgramLevelsService,
  CourseSessionsService,
  CoursesService,
  ProgramLevelsService,
  SessionsService,
  TeachersService,
} from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { Checkbox } from "../ui/checkbox"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"
import { InputGroup } from "../ui/input-group"

interface AttributionRow {
  course_id: string
  course_name: string
  course_code: string
  selected: boolean
  teacher_id: string
  intra_percentage: number | ""
  final_percentage: number | ""
  participation_percentage: number | ""
}

const AddCourseSessionWithProgramNew = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [selectedProgramId, setSelectedProgramId] = useState<string>("")
  const [selectedYearLevel, setSelectedYearLevel] = useState<number>(1)
  const [attributionRows, setAttributionRows] = useState<AttributionRow[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  // Load contextual data
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions", { all: true }],
    queryFn: () =>
      SessionsService.readSessionsWithAcademicYear({ skip: 0, limit: 100 }),
  })

  const { data: programLevelsData } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
  })

  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => TeachersService.readTeachers({ skip: 0, limit: 1000 }),
  })

  const { data: globalCoursesData, isLoading: isGlobalCoursesLoading } =
    useQuery({
      queryKey: ["courses"],
      queryFn: () => CoursesService.readCourses({ skip: 0, limit: 1000 }),
    })

  // Calculate dynamic year levels based on selected program
  const selectedProgram = programLevelsData?.data.find(
    (p) => p.id === selectedProgramId,
  )
  const maxYearLevel = selectedProgram?.typical_duration || 1
  const yearLevels = Array.from({ length: maxYearLevel }, (_, i) => i + 1)

  // Ensure selectedYearLevel is valid when program changes
  useEffect(() => {
    if (selectedYearLevel > maxYearLevel) {
      setSelectedYearLevel(1)
    }
  }, [maxYearLevel, selectedYearLevel])

  // Initialize roster with ALL courses automatically
  useEffect(() => {
    if (globalCoursesData?.data) {
      const initialRows = globalCoursesData.data.map((c) => ({
        course_id: c.id,
        course_name: c.name,
        course_code: c.code || "",
        selected: false,
        teacher_id: "",
        intra_percentage: 30,
        final_percentage: 40,
        participation_percentage: 30,
      }))
      setAttributionRows(initialRows)
    }
  }, [globalCoursesData])

  // Reset state when opening/closing
  const handleClose = () => {
    setSelectedSessionId("")
    setSelectedProgramId("")
    setSelectedYearLevel(1)
    setSearchQuery("")
    if (globalCoursesData?.data) {
      setAttributionRows(
        globalCoursesData.data.map((c) => ({
          course_id: c.id,
          course_name: c.name,
          course_code: c.code || "",
          selected: false,
          teacher_id: "",
          intra_percentage: 30,
          final_percentage: 40,
          participation_percentage: 30,
        })),
      )
    }
  }

  useEffect(() => {
    if (!isOpen) {
      handleClose()
    }
  }, [isOpen, handleClose])

  const filteredRows = useMemo(() => {
    return attributionRows.filter(
      (r) =>
        r.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.course_code.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [attributionRows, searchQuery])

  const handleUpdateRow = (
    id: string,
    field: keyof AttributionRow,
    value: any,
  ) => {
    setAttributionRows((prev) =>
      prev.map((r) => {
        if (r.course_id !== id) return r

        const updatedRow = { ...r, [field]: value }

        if (field === "intra_percentage" || field === "final_percentage") {
          const intra = Number(updatedRow.intra_percentage) || 0
          const final = Number(updatedRow.final_percentage) || 0
          updatedRow.participation_percentage = Math.max(
            0,
            100 - (intra + final),
          )
        }

        return updatedRow
      }),
    )
  }

  const mutation = useMutation({
    mutationFn: async (payload: {
      rows: AttributionRow[]
      context: { sessionId: string; programId: string; yearLevel: number }
    }) => {
      const { rows, context } = payload

      // 1. Fetch existing CourseProgramLevels for this program level to avoid duplicates
      const existingCPLs =
        await CourseProgramLevelsService.readCourseProgramLevelsByProgramLevel({
          programLevelId: context.programId,
          skip: 0,
          limit: 1000,
        })

      const results = []

      for (const row of rows) {
        let cplId = ""
        // Find if link already exists for this course AND this specific year level context
        const existingLink = existingCPLs.data.find(
          (l) =>
            l.course_id === row.course_id &&
            l.program_level_id === context.programId &&
            l.year_level === context.yearLevel,
        )

        if (existingLink) {
          cplId = existingLink.id
        } else {
          // Create link first
          const newLink =
            await CourseProgramLevelsService.createCourseProgramLevel({
              requestBody: {
                course_id: row.course_id,
                program_level_id: context.programId,
                year_level: context.yearLevel,
                is_active: true,
              },
            })
          cplId = newLink.id
        }

        // 2. Create Course Session
        const session = await CourseSessionsService.createCourseSession({
          requestBody: {
            course_program_level_id: cplId,
            session_id: context.sessionId,
            teacher_id: row.teacher_id,
            year_level: context.yearLevel,
            intra_percentage: Number(row.intra_percentage) || 0,
            final_percentage: Number(row.final_percentage) || 0,
            participation_percentage: Number(row.participation_percentage) || 0,
            max_students: undefined,
            is_active: true,
            classroom: null,
          },
        })
        results.push(session)
      }
      return results
    },
    onSuccess: (data) => {
      showSuccessToast(
        t("course.session.alerts.bulk_success_create", {
          count: data.length,
        }),
      )
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["course_sessions"] })
      queryClient.invalidateQueries({ queryKey: ["course_program_levels"] })
    },
  })

  const handleSubmit = () => {
    if (!selectedSessionId || !selectedProgramId) return

    const selectedRows = attributionRows.filter(
      (r) => r.selected && r.teacher_id !== "",
    )

    if (selectedRows.length === 0) {
      showSuccessToast(t("course.session.alerts.select_at_least_one"))
      return
    }

    mutation.mutate({
      rows: selectedRows,
      context: {
        sessionId: selectedSessionId,
        programId: selectedProgramId,
        yearLevel: selectedYearLevel,
      },
    })
  }

  return (
    <DialogRoot
      size="xl"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="solid" colorPalette="blue" size="sm">
          <FiPlus fontSize="16px" />
          {t("common.forms.add_new")}
        </Button>
      </DialogTrigger>
      <DialogContent borderRadius="sm" boxShadow="xl" overflow="hidden">
        <DialogHeader
          borderBottom="1px solid"
          borderColor="gray.100"
          pb={4}
          bg="white"
        >
          <VStack align="stretch" gap={4}>
            <Flex justify="space-between" align="center" gap={8} pr={10}>
              <VStack align="start" gap={0} flex="1">
                <DialogTitle fontSize="xl" fontWeight="700" color="gray.800">
                  {t("course.session.bulk_add.title")}
                </DialogTitle>
                <Text fontSize="sm" color="gray.500">
                  {t("course.session.bulk_add.description")}
                </Text>
              </VStack>

              <HStack gap={4} flex="2">
                <Field
                  required
                  label={t("course.session.bulk_add.session")}
                  flex="1"
                >
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #E2E8F0",
                      fontSize: "13px",
                    }}
                  >
                    <option value="">
                      {t("course.session.placeholders.select_session")}
                    </option>
                    {sessionsData?.data
                      .filter((s) => s.is_active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field
                  required
                  label={t("course.session.bulk_add.program")}
                  flex="1"
                >
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #E2E8F0",
                      fontSize: "13px",
                    }}
                  >
                    <option value="">
                      {t("course.session.placeholders.select_program")}
                    </option>
                    {programLevelsData?.data.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.program.name} - {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  required
                  label={t("course.session.bulk_add.level")}
                  w="100px"
                >
                  <select
                    value={selectedYearLevel}
                    onChange={(e) =>
                      setSelectedYearLevel(Number(e.target.value))
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #E2E8F0",
                      fontSize: "13px",
                      backgroundColor: "white",
                    }}
                  >
                    {yearLevels.map((level) => (
                      <option key={level} value={level}>
                        {t("course.session.table.year_short", {
                          year: level,
                        })}
                      </option>
                    ))}
                  </select>
                </Field>
              </HStack>
            </Flex>

            <Separator />

            <Flex justify="space-between" align="center">
              <InputGroup
                width="300px"
                startElement={<Icon as={FiFilter} color="gray.400" />}
              >
                <Input
                  placeholder={t("course.session.bulk_add.filter")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="sm"
                  borderRadius="sm"
                  bg="gray.50"
                />
              </InputGroup>

              <HStack gap={3}>
                <Badge
                  colorPalette="blue"
                  variant="solid"
                  px={2}
                  borderRadius="sm"
                >
                  {t("course.session.bulk_add.selected_count", {
                    count: attributionRows.filter((r) => r.selected).length,
                  })}
                </Badge>
              </HStack>
            </Flex>
          </VStack>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody py={0} bg="gray.50" overflowY="auto" maxH="60vh">
          <Box
            bg="white"
            my={4}
            borderRadius="sm"
            border="1px solid"
            borderColor="gray.200"
            shadow="sm"
          >
            <Table.Root size="sm" variant="line">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader width="40px" py={4} textAlign="center">
                    <Checkbox
                      checked={
                        filteredRows.length > 0 &&
                        filteredRows.every((r) => r.selected)
                      }
                      onCheckedChange={({ checked }) => {
                        const ids = filteredRows.map((r) => r.course_id)
                        setAttributionRows((prev) =>
                          prev.map((r) =>
                            ids.includes(r.course_id)
                              ? { ...r, selected: !!checked }
                              : r,
                          ),
                        )
                      }}
                      colorPalette="blue"
                    />
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    py={4}
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.600"
                  >
                    {t("course.session.bulk_add.course")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    py={4}
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.600"
                  >
                    {t("course.session.bulk_add.teacher")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    width="80px"
                    textAlign="center"
                    py={4}
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.600"
                  >
                    {t("course.session.bulk_add.intra")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    width="80px"
                    textAlign="center"
                    py={4}
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.600"
                  >
                    {t("course.session.bulk_add.final")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    width="80px"
                    textAlign="center"
                    py={4}
                    fontSize="xs"
                    fontWeight="bold"
                    color="gray.600"
                  >
                    {t("course.session.bulk_add.part")}
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {isGlobalCoursesLoading ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} py={10} textAlign="center">
                      <Spinner />
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredRows.map((r) => (
                    <Table.Row
                      key={r.course_id}
                      bg={r.selected ? "blue.50" : "transparent"}
                    >
                      <Table.Cell py={3} textAlign="center">
                        <Checkbox
                          checked={r.selected}
                          onCheckedChange={({ checked }) =>
                            handleUpdateRow(r.course_id, "selected", !!checked)
                          }
                          colorPalette="blue"
                        />
                      </Table.Cell>
                      <Table.Cell py={3}>
                        <VStack align="start" gap={0}>
                          <Text
                            fontSize="xs"
                            fontWeight="semibold"
                            color={r.selected ? "blue.800" : "gray.800"}
                            truncate
                            maxW="200px"
                          >
                            {r.course_name}
                          </Text>
                          <Text fontSize="10px" color="gray.500">
                            {r.course_code}
                          </Text>
                        </VStack>
                      </Table.Cell>
                      <Table.Cell py={3}>
                        <select
                          disabled={!r.selected}
                          value={r.teacher_id}
                          onChange={(e) =>
                            handleUpdateRow(
                              r.course_id,
                              "teacher_id",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            border: "1px solid",
                            borderColor: r.teacher_id
                              ? "var(--chakra-colors-blue-300)"
                              : "var(--chakra-colors-gray-200)",
                            borderRadius: "4px",
                            fontSize: "12px",
                            backgroundColor: r.selected
                              ? "white"
                              : "var(--chakra-colors-gray-50)",
                          }}
                        >
                          <option value="">
                            {t("course.session.placeholders.select_teacher")}
                          </option>
                          {teachersData?.data.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.user?.first_name} {t.user?.last_name}
                            </option>
                          ))}
                        </select>
                      </Table.Cell>
                      <Table.Cell py={3} textAlign="center">
                        <Input
                          disabled={!r.selected}
                          size="xs"
                          w="50px"
                          type="number"
                          value={r.intra_percentage}
                          onChange={(e) =>
                            handleUpdateRow(
                              r.course_id,
                              "intra_percentage",
                              e.target.value,
                            )
                          }
                          textAlign="center"
                          bg={r.selected ? "white" : "gray.50"}
                        />
                      </Table.Cell>
                      <Table.Cell py={3} textAlign="center">
                        <Input
                          disabled={!r.selected}
                          size="xs"
                          w="50px"
                          type="number"
                          value={r.final_percentage}
                          onChange={(e) =>
                            handleUpdateRow(
                              r.course_id,
                              "final_percentage",
                              e.target.value,
                            )
                          }
                          textAlign="center"
                          bg={r.selected ? "white" : "gray.50"}
                        />
                      </Table.Cell>
                      <Table.Cell py={3} textAlign="center">
                        <Input
                          disabled={!r.selected}
                          size="xs"
                          w="50px"
                          type="number"
                          value={r.participation_percentage}
                          readOnly
                          textAlign="center"
                          bg="gray.100"
                          cursor="not-allowed"
                          fontWeight="bold"
                          color="blue.600"
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </DialogBody>

        <DialogFooter
          borderTop="1px solid"
          borderColor="gray.100"
          pt={4}
          bg="white"
        >
          <DialogActionTrigger asChild>
            <Button
              variant="outline"
              colorPalette="gray"
              disabled={mutation.isPending}
              size="sm"
            >
              {t("common.forms.cancel")}
            </Button>
          </DialogActionTrigger>
          <Button
            variant="solid"
            colorPalette="blue"
            onClick={handleSubmit}
            disabled={
              !selectedSessionId ||
              !selectedProgramId ||
              mutation.isPending ||
              attributionRows.filter((r) => r.selected && r.teacher_id !== "")
                .length === 0
            }
            loading={mutation.isPending}
            px={8}
            size="sm"
          >
            <FiCheckCircle />
            {t("course.session.bulk_add.assign_button", {
              count: attributionRows.filter(
                (r) => r.selected && r.teacher_id !== "",
              ).length,
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default AddCourseSessionWithProgramNew
