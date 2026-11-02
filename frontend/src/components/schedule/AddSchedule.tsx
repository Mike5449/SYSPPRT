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
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { FiCalendar, FiClock, FiPlus } from "react-icons/fi"

import {
  AcademicYearsService,
  CourseSessionsService,
  ProgramLevelsService,
  SchedulesService,
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
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"

interface ScheduleRow {
  selected: boolean
  course_session_id: string
  course_session_name: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  notes: string
}

const AddSchedule = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [selectedProgramLevelId, setSelectedProgramLevelId] =
    useState<string>("")
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("")
  const [selectedSessionNumber, setSelectedSessionNumber] = useState<string>("")

  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  // Load current academic year
  const { data: academicYearsData } = useQuery({
    queryKey: ["academic_years"],
    queryFn: () =>
      AcademicYearsService.readAcademicYears({ skip: 0, limit: 100 }),
  })

  const currentAcademicYear = academicYearsData?.data?.find(
    (year) => year.is_current,
  )

  // Load course sessions
  const { data: courseSessionsData, isLoading: isCourseSessionsLoading } =
    useQuery({
      queryKey: ["course_sessions", { all: true }],
      queryFn: () =>
        CourseSessionsService.readCourseSessions({ skip: 0, limit: 1000 }),
    })

  // Load program levels
  const { data: programLevelsData } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 100 }),
  })

  const selectedProgramLevel = programLevelsData?.data?.find(
    (pl) => pl.id === selectedProgramLevelId,
  )
  const maxYearLevel = selectedProgramLevel?.typical_duration ?? 7
  const availableYearLevels = Array.from({ length: maxYearLevel }, (_, i) => i + 1)

  // Filter and initialize rows
  useEffect(() => {
    if (courseSessionsData?.data && currentAcademicYear) {
      const filtered = courseSessionsData.data.filter((session: any) => {
        const matchesYear =
          session.session?.academic_year_id === currentAcademicYear.id
        const matchesProgramLevel = selectedProgramLevelId
          ? session.course_program_level?.program_level_id ===
            selectedProgramLevelId
          : true
        const matchesYearLevel = selectedYearLevel
          ? session.year_level === parseInt(selectedYearLevel, 10)
          : true
        const matchesSessionNumber = selectedSessionNumber
          ? session.session?.session_number === parseInt(selectedSessionNumber, 10)
          : true
        return matchesYear && matchesProgramLevel && matchesYearLevel && matchesSessionNumber
      })

      const initialRows: ScheduleRow[] = filtered.map((session: any) => ({
        selected: false,
        course_session_id: session.id,
        course_session_name: session.course_program_level?.course?.name ?? "—",
        day_of_week: 1,
        start_time: "08:00",
        end_time: "10:00",
        is_active: true,
        notes: "",
      }))
      setRows(initialRows)
    }
  }, [
    courseSessionsData,
    currentAcademicYear,
    selectedProgramLevelId,
    selectedYearLevel,
    selectedSessionNumber,
  ])

  // Reset year level if it exceeds the new program's duration
  useEffect(() => {
    if (selectedYearLevel && parseInt(selectedYearLevel, 10) > maxYearLevel) {
      setSelectedYearLevel("")
    }
  }, [selectedProgramLevelId, maxYearLevel, selectedYearLevel])

  const updateRow = (index: number, field: keyof ScheduleRow, value: any) => {
    const newRows = [...rows]
    newRows[index] = { ...newRows[index], [field]: value }
    setRows(newRows)
  }

  const toggleSelectAll = (selected: boolean) => {
    setRows(rows.map((row) => ({ ...row, selected })))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const selectedRows = rows.filter((r) => r.selected)

      // Time validation check
      for (const row of selectedRows) {
        if (row.end_time <= row.start_time) {
          throw new Error(
            t("schedule.alerts.end_time_error", {
              defaultValue: "L'heure de fin doit être après l'heure de début.",
            }),
          )
        }
      }

      const promises = selectedRows.map((row) =>
        SchedulesService.createSchedule({
          requestBody: {
            course_session_id: row.course_session_id,
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time,
            is_active: row.is_active,
            notes: row.notes || null,
            room: null,
            building: null,
          } as any,
        }),
      )
      return Promise.all(promises)
    },
    onSuccess: (data) => {
      showSuccessToast(
        t("schedule.alerts.success_create", {
          count: data.length,
          defaultValue: `${data.length} horaires créés avec succès !`,
        }),
      )
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] })
    },
  })

  const handleReset = () => {
    setIsOpen(false)
  }

  const daysOfWeek = [
    { value: 0, label: t("schedule.days.sunday") },
    { value: 1, label: t("schedule.days.monday") },
    { value: 2, label: t("schedule.days.tuesday") },
    { value: 3, label: t("schedule.days.wednesday") },
    { value: 4, label: t("schedule.days.thursday") },
    { value: 5, label: t("schedule.days.friday") },
    { value: 6, label: t("schedule.days.saturday") },
  ]

  const selectedCount = rows.filter((r) => r.selected).length
  const allSelected = rows.length > 0 && rows.every((r) => r.selected)
  const hasTimeError = rows.some(
    (r) => r.selected && r.end_time && r.end_time <= r.start_time,
  )

  return (
    <DialogRoot
      size="xl"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        setIsOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          color="black"
          border="1px solid"
          borderColor="gray.200"
          size="sm"
          my={4}
        >
          <FiPlus />
        </Button>
      </DialogTrigger>
      <DialogContent
        borderRadius="4px"
        boxShadow="2xl"
        overflow="hidden"
        maxH="90vh"
      >
        {/* Premium Header */}
        <Box
          p={6}
          background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)"
        >
          <Flex align="center" gap={4}>
            <Flex
              w={12}
              h={12}
              bg="whiteAlpha.200"
              borderRadius="12px"
              align="center"
              justify="center"
              flexShrink={0}
              shadow="inner"
            >
              <Icon as={FiCalendar} color="white" fontSize="24px" />
            </Flex>
            <Box flex="1">
              <HStack justify="space-between">
                <VStack align="start" gap={0}>
                  <DialogTitle
                    fontSize="xl"
                    fontWeight="800"
                    color="white"
                    letterSpacing="tight"
                  >
                    {t("schedule.add_title")}
                  </DialogTitle>
                  <Text
                    fontSize="sm"
                    color="whiteAlpha.800"
                    mt={1}
                    fontWeight="500"
                  >
                    {t("schedule.add.step_description")}
                  </Text>
                </VStack>
                {selectedCount > 0 && (
                  <Badge
                    colorPalette="blue"
                    size="lg"
                    borderRadius="full"
                    px={4}
                    py={1}
                    shadow="lg"
                    border="1px solid"
                    borderColor="whiteAlpha.400"
                  >
                    {selectedCount} SÉLECTIONNÉS
                  </Badge>
                )}
              </HStack>
            </Box>
          </Flex>
        </Box>

        <DialogBody py={6} px={6} bg="gray.50" overflowY="auto">
          {isCourseSessionsLoading ? (
            <Flex justify="center" align="center" py={20}>
              <Spinner size="xl" color="blue.500" />
            </Flex>
          ) : (
            <VStack gap={6} align="stretch">
              {/* Filter Section */}
              <Box
                bg="white"
                p={4}
                borderRadius="4px"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <HStack gap={4} wrap="wrap">
                  <Box flex="1" minW="140px">
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      color="gray.500"
                      mb={2}
                      textTransform="uppercase"
                      letterSpacing="0.5px"
                    >
                      Niveau de programme
                    </Text>
                    <select
                      value={selectedProgramLevelId}
                      onChange={(e) =>
                        setSelectedProgramLevelId(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "13px",
                        border: "1px solid #CBD5E0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Tous les niveaux</option>
                      {programLevelsData?.data?.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} ({pl.code})
                        </option>
                      ))}
                    </select>
                  </Box>
                  <Box flex="1" minW="140px">
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      color="gray.500"
                      mb={2}
                      textTransform="uppercase"
                      letterSpacing="0.5px"
                    >
                      Niveau d'année
                    </Text>
                    <select
                      value={selectedYearLevel}
                      onChange={(e) => setSelectedYearLevel(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "13px",
                        border: "1px solid #CBD5E0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Toutes les années</option>
                      {availableYearLevels.map((level) => (
                        <option key={level} value={level}>
                          Année {level}
                        </option>
                      ))}
                    </select>
                  </Box>
                  <Box flex="1" minW="120px">
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      color="gray.500"
                      mb={2}
                      textTransform="uppercase"
                      letterSpacing="0.5px"
                    >
                      Session
                    </Text>
                    <select
                      value={selectedSessionNumber}
                      onChange={(e) => setSelectedSessionNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "13px",
                        border: "1px solid #CBD5E0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Toutes</option>
                      <option value="1">Session 1</option>
                      <option value="2">Session 2</option>
                    </select>
                  </Box>
                </HStack>
              </Box>

              <Box
                bg="white"
                borderRadius="4px"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
                overflow="hidden"
              >
                <Table.Root
                  size="sm"
                  variant="outline"
                  interactive
                  stickyHeader
                >
                  <Table.Header bg="gray.50">
                    <Table.Row height="48px">
                      <Table.ColumnHeader
                        py={3}
                        px={4}
                        w="50px"
                        textAlign="center"
                      >
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(c) => toggleSelectAll(!!c.checked)}
                          colorPalette="blue"
                        />
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        py={3}
                        color="gray.600"
                        fontWeight="800"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="widest"
                      >
                        {t("schedule.fields.course_session")}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        py={3}
                        color="gray.600"
                        fontWeight="800"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        w="140px"
                      >
                        {t("schedule.fields.day_of_week")}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        py={3}
                        color="gray.600"
                        fontWeight="800"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        w="110px"
                      >
                        {t("schedule.fields.start_time")}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        py={3}
                        color="gray.600"
                        fontWeight="800"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        w="110px"
                      >
                        {t("schedule.fields.end_time")}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        py={3}
                        color="gray.600"
                        fontWeight="800"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        w="60px"
                        textAlign="center"
                      >
                        ACTIF
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((row, index) => (
                      <Table.Row
                        key={row.course_session_id}
                        _hover={{ bg: row.selected ? "blue.50" : "gray.50" }}
                        bg={row.selected ? "blue.50/40" : "transparent"}
                        transition="all 0.2s"
                      >
                        <Table.Cell py={3} px={4} textAlign="center">
                          <Checkbox
                            checked={row.selected}
                            onCheckedChange={(c) =>
                              updateRow(index, "selected", !!c.checked)
                            }
                            colorPalette="blue"
                          />
                        </Table.Cell>
                        <Table.Cell py={3}>
                          <Text
                            fontSize="xs"
                            fontWeight="700"
                            color={row.selected ? "blue.700" : "gray.700"}
                          >
                            {row.course_session_name}
                          </Text>
                        </Table.Cell>
                        <Table.Cell py={row.selected ? 3 : 2}>
                          <select
                            value={row.day_of_week}
                            onChange={(e) =>
                              updateRow(
                                index,
                                "day_of_week",
                                parseInt(e.target.value, 10),
                              )
                            }
                            disabled={!row.selected}
                            style={{
                              width: "100%",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              border: "1px solid",
                              borderColor: row.selected ? "#3182ce" : "#E2E8F0",
                              borderRadius: "6px",
                              backgroundColor: row.selected
                                ? "white"
                                : "#F7FAFC",
                              opacity: row.selected ? 1 : 0.6,
                            }}
                          >
                            {daysOfWeek.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </Table.Cell>
                        <Table.Cell py={3}>
                          <Input
                            type="time"
                            size="sm"
                            value={row.start_time}
                            onChange={(e) =>
                              updateRow(index, "start_time", e.target.value)
                            }
                            disabled={!row.selected}
                            fontSize="xs"
                            fontWeight="bold"
                            borderRadius="4px"
                            bg={row.selected ? "white" : "#F7FAFC"}
                            borderColor={row.selected ? "blue.400" : "gray.200"}
                          />
                        </Table.Cell>
                        <Table.Cell py={3}>
                          <Box>
                            <Input
                              type="time"
                              size="sm"
                              value={row.end_time}
                              onChange={(e) =>
                                updateRow(index, "end_time", e.target.value)
                              }
                              disabled={!row.selected}
                              fontSize="xs"
                              fontWeight="bold"
                              borderRadius="4px"
                              bg={row.selected ? "white" : "#F7FAFC"}
                              borderColor={
                                row.selected && row.end_time && row.end_time <= row.start_time
                                  ? "red.400"
                                  : row.selected
                                  ? "blue.400"
                                  : "gray.200"
                              }
                            />
                            {row.selected && row.end_time && row.end_time <= row.start_time && (
                              <Text fontSize="10px" color="red.500" mt="2px" fontWeight="600">
                                Fin &gt; Début requis
                              </Text>
                            )}
                          </Box>
                        </Table.Cell>
                        <Table.Cell py={3} textAlign="center">
                          <Checkbox
                            checked={row.is_active}
                            onCheckedChange={(c) =>
                              updateRow(index, "is_active", !!c.checked)
                            }
                            disabled={!row.selected}
                            colorPalette="blue"
                            size="sm"
                          />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Helper Section */}
              <HStack
                bg="blue.50"
                p={4}
                borderRadius="4px"
                gap={4}
                border="1px solid"
                borderColor="blue.100"
              >
                <Flex
                  w={10}
                  h={10}
                  bg="blue.500"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  shadow="md"
                >
                  <Icon as={FiClock} color="white" />
                </Flex>
                <VStack align="start" gap={0}>
                  <Text fontSize="xs" fontWeight="800" color="blue.900">
                    {t("schedule.add.section_timing").toUpperCase()}
                  </Text>
                  <Text fontSize="10px" color="blue.700" fontWeight="500">
                    Cochez les sessions pour configurer et ajouter les horaires.
                    Les lignes non cochées seront ignorées.
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          )}
        </DialogBody>

        <DialogFooter
          bg="white"
          borderTop="1px solid"
          borderColor="gray.100"
          p={4}
          gap={3}
        >
          <DialogActionTrigger asChild>
            <Button
              variant="subtle"
              colorPalette="gray"
              size="sm"
              borderRadius="4px"
              fontWeight="700"
            >
              {t("common.forms.cancel")}
            </Button>
          </DialogActionTrigger>
          <Button
            colorPalette="blue"
            size="sm"
            px={6}
            borderRadius="4px"
            fontWeight="800"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={selectedCount === 0 || hasTimeError}
          >
            {t("common.forms.create")} ({selectedCount})
          </Button>
        </DialogFooter>
        <DialogCloseTrigger color="white" />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddSchedule
