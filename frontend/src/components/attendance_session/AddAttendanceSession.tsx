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
import { FiBookOpen, FiCheckCircle, FiPlus, FiTag } from "react-icons/fi"

import {
  AcademicYearsService,
  AttendanceSessionsService,
  ProgramLevelsService,
  SchedulesService,
  TeachersService,
} from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useUserRoles } from "@/hooks/useUserRoles"
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

interface AttendanceSessionRow {
  selected: boolean
  schedule_id: string
  course_name: string
  session_date: string
  start_time: string
  end_time: string
  topic: string
  late_threshold_minutes: number
}

const AddAttendanceSession = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [rows, setRows] = useState<AttendanceSessionRow[]>([])
  const [selectedProgramLevelId, setSelectedProgramLevelId] =
    useState<string>("")
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("")

  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { data: roles } = useUserRoles(user?.id)

  const isAdmin = user?.is_superuser
  const isTeacher = roles?.some((r) => r.code === "TEACHER") && !isAdmin

  // Load teacher record
  const { data: teacherData } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: user!.id }),
    enabled: !!user?.id && isTeacher,
    retry: false,
  })

  // Load current academic year
  const { data: academicYearsData } = useQuery({
    queryKey: ["academic_years"],
    queryFn: () =>
      AcademicYearsService.readAcademicYears({ skip: 0, limit: 100 }),
  })

  const currentAcademicYear = academicYearsData?.data?.find(
    (year) => year.is_current,
  )

  // Load program levels
  const { data: programLevelsData } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 100 }),
  })

  // Load schedules
  const { data: schedulesData, isLoading: isSchedulesLoading } = useQuery({
    queryKey: ["schedules", { all: true }],
    queryFn: () => SchedulesService.readSchedules({ skip: 0, limit: 1000 }),
  })

  // Filter and initialize rows
  useEffect(() => {
    if (schedulesData?.data && currentAcademicYear && isOpen) {
      const filtered = schedulesData.data.filter((schedule: any) => {
        const courseSession = schedule.course_session
        const matchesYear =
          courseSession?.session?.academic_year_id === currentAcademicYear.id

        // Filter by teacher if user is a teacher
        const matchesTeacher = isTeacher
          ? courseSession?.teacher_id === teacherData?.id
          : true

        const matchesProgramLevel = selectedProgramLevelId
          ? courseSession?.course_program_level?.program_level_id ===
            selectedProgramLevelId
          : true

        const matchesYearLevel = selectedYearLevel
          ? courseSession?.year_level === parseInt(selectedYearLevel, 10)
          : true

        return (
          matchesYear &&
          matchesTeacher &&
          matchesProgramLevel &&
          matchesYearLevel
        )
      })

      const today = new Date().toISOString().split("T")[0]

      const initialRows: AttendanceSessionRow[] = filtered.map(
        (schedule: any) => ({
          selected: false,
          schedule_id: schedule.id,
          course_name: `${schedule.course_session?.course_program_level?.course?.name} (${schedule.course_session?.course_program_level?.program_level?.code})`,
          session_date: today,
          start_time: schedule.start_time.slice(0, 5),
          end_time: schedule.end_time.slice(0, 5),
          topic: "",
          late_threshold_minutes: 15,
        }),
      )
      setRows(initialRows)
    }
  }, [
    schedulesData,
    currentAcademicYear,
    teacherData,
    isTeacher,
    selectedProgramLevelId,
    selectedYearLevel,
    isOpen,
  ])

  const updateRow = (
    index: number,
    field: keyof AttendanceSessionRow,
    value: any,
  ) => {
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

      const promises = selectedRows.map((row) =>
        AttendanceSessionsService.createAttendanceSession({
          requestBody: {
            schedule_id: row.schedule_id,
            session_date: row.session_date,
            start_time: row.start_time,
            end_time: row.end_time,
            topic: row.topic || null,
            late_threshold_minutes: Number(row.late_threshold_minutes) || 0,
            description: `Session du ${row.session_date} pour ${row.course_name}`,
            is_cancelled: false,
            attendance_taken: false,
          } as any,
        }),
      )
      return Promise.all(promises)
    },
    onSuccess: (data) => {
      showSuccessToast(
        t("common.forms.success_create", {
          count: data.length,
          defaultValue: `${data.length} sessions créées avec succès !`,
        }),
      )
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_sessions"] })
    },
  })

  const handleReset = () => {
    setIsOpen(false)
  }

  const selectedCount = rows.filter((r) => r.selected).length
  const allSelected = rows.length > 0 && rows.every((r) => r.selected)

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
              <Icon as={FiCheckCircle} color="white" fontSize="24px" />
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
                    {t("attendance.session.add_title")}
                  </DialogTitle>
                  <Text
                    fontSize="sm"
                    color="whiteAlpha.800"
                    mt={1}
                    fontWeight="500"
                  >
                    {t("attendance.session.add_description")}
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
          {isSchedulesLoading ? (
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
                <HStack gap={4}>
                  <Box flex="1">
                    <Text
                      fontSize="xs"
                      fontWeight="800"
                      color="gray.600"
                      mb={2}
                      textTransform="uppercase"
                    >
                      Filter par Niveau de Programme
                    </Text>
                    <select
                      value={selectedProgramLevelId}
                      onChange={(e) =>
                        setSelectedProgramLevelId(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "14px",
                        fontWeight: "600",
                        border: "1px solid",
                        borderColor: "#E2E8F0",
                        borderRadius: "4px",
                        backgroundColor: "white",
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
                  <Box flex="1">
                    <Text
                      fontSize="xs"
                      fontWeight="800"
                      color="gray.600"
                      mb={2}
                      textTransform="uppercase"
                    >
                      Filter par Niveau d'Année
                    </Text>
                    <select
                      value={selectedYearLevel}
                      onChange={(e) => setSelectedYearLevel(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "14px",
                        fontWeight: "600",
                        border: "1px solid",
                        borderColor: "#E2E8F0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                      }}
                    >
                      <option value="">Tous les niveaux d'année</option>
                      {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                        <option key={level} value={level}>
                          Année {level}
                        </option>
                      ))}
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
                        {t("attendance.session.table.course")}
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
                        {t("attendance.session.fields.date")}
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
                        HEURES
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        py={3}
                        color="gray.600"
                        fontWeight="800"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        w="150px"
                      >
                        SUJET / TOPIC
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
                        RETARD (MIN)
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((row, index) => (
                      <Table.Row
                        key={row.schedule_id}
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
                          <HStack gap={2}>
                            <Icon
                              as={FiBookOpen}
                              color={row.selected ? "blue.500" : "gray.400"}
                            />
                            <Text
                              fontSize="xs"
                              fontWeight="700"
                              color={row.selected ? "blue.700" : "gray.700"}
                            >
                              {row.course_name}
                            </Text>
                          </HStack>
                        </Table.Cell>
                        <Table.Cell py={3}>
                          <Input
                            type="date"
                            size="sm"
                            value={row.session_date}
                            onChange={(e) =>
                              updateRow(index, "session_date", e.target.value)
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
                          <HStack gap={1}>
                            <Input
                              type="time"
                              size="sm"
                              value={row.start_time}
                              onChange={(e) =>
                                updateRow(index, "start_time", e.target.value)
                              }
                              disabled={!row.selected}
                              fontSize="xs"
                              px={1}
                              borderRadius="4px"
                              bg={row.selected ? "white" : "#F7FAFC"}
                              borderColor={
                                row.selected ? "blue.400" : "gray.200"
                              }
                            />
                            <Text fontSize="2xs" color="gray.400">
                              -
                            </Text>
                            <Input
                              type="time"
                              size="sm"
                              value={row.end_time}
                              onChange={(e) =>
                                updateRow(index, "end_time", e.target.value)
                              }
                              disabled={!row.selected}
                              fontSize="xs"
                              px={1}
                              borderRadius="4px"
                              bg={row.selected ? "white" : "#F7FAFC"}
                              borderColor={
                                row.selected ? "blue.400" : "gray.200"
                              }
                            />
                          </HStack>
                        </Table.Cell>
                        <Table.Cell py={3}>
                          <Input
                            placeholder="Sujet du cours..."
                            size="sm"
                            value={row.topic}
                            onChange={(e) =>
                              updateRow(index, "topic", e.target.value)
                            }
                            disabled={!row.selected}
                            fontSize="xs"
                            borderRadius="4px"
                            bg={row.selected ? "white" : "#F7FAFC"}
                            borderColor={row.selected ? "blue.400" : "gray.200"}
                          />
                        </Table.Cell>
                        <Table.Cell py={3}>
                          <Input
                            type="number"
                            min={0}
                            max={240}
                            size="sm"
                            value={row.late_threshold_minutes}
                            onChange={(e) =>
                              updateRow(
                                index,
                                "late_threshold_minutes",
                                e.target.value === ""
                                  ? 0
                                  : parseInt(e.target.value, 10),
                              )
                            }
                            disabled={!row.selected}
                            fontSize="xs"
                            px={1}
                            textAlign="center"
                            borderRadius="4px"
                            bg={row.selected ? "white" : "#F7FAFC"}
                            borderColor={row.selected ? "blue.400" : "gray.200"}
                            title="Minutes après la génération du QR au-delà desquelles un scan est compté en retard"
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
                  <Icon as={FiTag} color="white" />
                </Flex>
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="800"
                    color="blue.700"
                    textTransform="uppercase"
                    letterSpacing="wider"
                  >
                    Astuce de configuration
                  </Text>
                  <Text fontSize="xs" color="blue.600" fontWeight="500">
                    Sélectionnez les emplois du temps prévus pour aujourd'hui
                    pour générer les feuilles de présence en un clic.
                  </Text>
                </Box>
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
            disabled={selectedCount === 0}
          >
            {t("common.forms.create")} ({selectedCount})
          </Button>
        </DialogFooter>
        <DialogCloseTrigger color="white" />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddAttendanceSession
