import {
  Badge,
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Grid,
  GridItem,
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
import {
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiInfo,
  FiList,
  FiPlus,
  FiTag,
  FiTarget,
} from "react-icons/fi"

import {
  AssessmentsService,
  CourseSessionsService,
  type GradeCreate,
  GradesService,
  StudentsService,
  TeachersService,
  UsersService,
} from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useAuth from "@/hooks/useAuth"
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

interface StudentGrade {
  student_id: string
  student_number: string
  student_name: string
  score: number
  letter_grade: string
  is_passing: boolean
  is_published: boolean
  isSelected: boolean
}

const AddGrade = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProgramLevelId, setSelectedProgramLevelId] =
    useState<string>("")
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("")
  const [selectedExamType, setSelectedExamType] = useState<string>("intra")
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user } = useAuth()

  // Get current user (teacher)
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => UsersService.readUserMe(),
  })

  // Get teacher data
  const { data: teacherData } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: user!.id }),
    enabled: !!user?.id,
  })

  // Get teacher's course sessions
  const { data: courseSessionsData } = useQuery({
    queryKey: ["courseSessions", teacherData?.id],
    queryFn: () =>
      CourseSessionsService.readCourseSessions({ skip: 0, limit: 1000 }),
    enabled: !!teacherData?.id,
  })

  // Load unique program levels for teacher
  const { data: allProgramLevelsData } = useQuery({
    queryKey: ["programLevels", teacherData?.id],
    queryFn: () => {
      const levels =
        courseSessionsData?.data
          ?.filter((cs: any) => cs.teacher_id === teacherData?.id)
          ?.map((cs: any) => cs.course_program_level?.program_level)
          ?.reduce((acc: any[], current: any) => {
            if (current && !acc.find((p: any) => p.id === current.id)) {
              acc.push(current)
            }
            return acc
          }, []) || []
      return { data: levels }
    },
    enabled: !!teacherData?.id && !!courseSessionsData,
  })

  // Load assessments filtered by teacher and program_level
  const { data: assessmentsData, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: [
      "assessments",
      { teacherId: teacherData?.id, programLevelId: selectedProgramLevelId },
    ],
    queryFn: async () => {
      if (!teacherData?.id) return { data: [] }

      const allSessions = courseSessionsData?.data || []
      const teacherSessions = allSessions.filter(
        (cs: any) => cs.teacher_id === teacherData?.id,
      )

      const filteredSessions = selectedProgramLevelId
        ? teacherSessions.filter(
            (cs: any) =>
              cs.course_program_level?.program_level_id ===
              selectedProgramLevelId,
          )
        : teacherSessions

      const allAssessments: any[] = []
      for (const session of filteredSessions) {
        const result = await AssessmentsService.readAssessmentsByCourseSession({
          courseSessionId: session.id,
          skip: 0,
          limit: 1000,
        })
        allAssessments.push(...result.data)
      }

      return { data: allAssessments }
    },
    enabled: !!teacherData?.id && !!courseSessionsData,
  })

  // Get selected assessment details
  const {
    data: selectedAssessmentData,
    isLoading: isSelectedAssessmentLoading,
  } = useQuery({
    queryKey: ["assessment", selectedAssessmentId],
    queryFn: () =>
      AssessmentsService.readAssessment({ assessmentId: selectedAssessmentId }),
    enabled: !!selectedAssessmentId,
  })

  // Extract program_level_id and year_level from selected assessment
  const programLevelId =
    selectedAssessmentData?.course_session?.course_program_level
      ?.program_level_id
  const yearLevel =
    selectedAssessmentData?.course_session?.course_program_level?.year_level

  // Load students filtered by program_level and year_level
  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students", programLevelId, yearLevel],
    queryFn: () =>
      StudentsService.readStudentsByProgramLevelAndYear({
        programLevelId: programLevelId!,
        yearLevel: yearLevel!,
        skip: 0,
        limit: 1000,
      }),
    enabled: !!programLevelId && !!yearLevel && !!selectedExamType,
  })

  // Initialize student grades when students data changes
  useEffect(() => {
    if (studentsData?.data) {
      const initialGrades: StudentGrade[] = studentsData.data.map(
        (student: any) => ({
          student_id: student.id,
          student_number: student.user?.user_number,
          student_name:
            `${student.user?.first_name || ""} ${student.user?.last_name || ""}`.trim() ||
            student.user?.user_number,
          score: 0,
          letter_grade: "F",
          is_passing: false,
          is_published: false,
          isSelected: true,
        }),
      )
      setStudentGrades(initialGrades)
    }
  }, [studentsData])

  // Function to calculate letter grade based on score
  const calculateLetterGrade = (score: number): string => {
    if (score >= 97) return "A+"
    if (score >= 93) return "A"
    if (score >= 90) return "A-"
    if (score >= 87) return "B+"
    if (score >= 83) return "B"
    if (score >= 80) return "B-"
    if (score >= 77) return "C+"
    if (score >= 73) return "C"
    if (score >= 70) return "C-"
    if (score >= 67) return "D+"
    if (score >= 63) return "D"
    if (score >= 60) return "D-"
    return "F"
  }

  // Function to update student score
  const updateStudentScore = (studentId: string, score: number) => {
    setStudentGrades((prev) =>
      prev.map((sg) =>
        sg.student_id === studentId
          ? {
              ...sg,
              score,
              letter_grade: calculateLetterGrade(score),
              is_passing: score >= 60,
            }
          : sg,
      ),
    )
  }

  // Function to toggle is_published for a student
  const togglePublished = (studentId: string) => {
    setStudentGrades((prev) =>
      prev.map((sg) =>
        sg.student_id === studentId
          ? { ...sg, is_published: !sg.is_published }
          : sg,
      ),
    )
  }

  // Function to toggle selection for a student
  const toggleSelection = (studentId: string) => {
    setStudentGrades((prev) =>
      prev.map((sg) =>
        sg.student_id === studentId
          ? { ...sg, isSelected: !sg.isSelected }
          : sg,
      ),
    )
  }

  const allSelected =
    studentGrades.length > 0 && studentGrades.every((sg) => sg.isSelected)
  const toggleAllSelected = () => {
    setStudentGrades((prev) =>
      prev.map((sg) => ({ ...sg, isSelected: !allSelected })),
    )
  }

  const selectedCount = studentGrades.filter((sg) => sg.isSelected).length

  const mutation = useMutation({
    mutationFn: async () => {
      // Create grades for all students
      const currentDate = new Date().toISOString().split("T")[0]
      const gradedBy =
        `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() ||
        currentUser?.email ||
        t("common.roles.teacher", { defaultValue: "Teacher" })

      const selectedGrades = studentGrades.filter((sg) => sg.isSelected)
      const gradesPromises = selectedGrades.map((sg) => {
        const gradeData: GradeCreate = {
          score: sg.score,
          letter_grade: sg.letter_grade,
          grade_points: null,
          is_passing: sg.is_passing,
          graded_date: currentDate,
          graded_by: gradedBy,
          comments: null,
          is_published: sg.is_published,
          exam_type: selectedExamType as "intra" | "final",
          student_id: sg.student_id,
          assessment_id: selectedAssessmentId,
        }
        return GradesService.createGrade({ requestBody: gradeData })
      })

      return Promise.all(gradesPromises)
    },
    onSuccess: () => {
      showSuccessToast(
        `${studentGrades.length} ${t("common.forms.success_create_multiple", { defaultValue: "grades created successfully!" })}`,
      )
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
      showErrorToast(t("common.forms.error_generic"))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
    },
  })

  const handleReset = () => {
    setSelectedAssessmentId("")
    setSelectedExamType("intra")
    setStudentGrades([])
    setIsOpen(false)
  }

  const handleSubmit = () => {
    if (!selectedAssessmentId) {
      showErrorToast(t("grade.placeholders.select_assessment"))
      return
    }
    if (studentGrades.length === 0) {
      showErrorToast(t("common.tables.no_results"))
      return
    }
    mutation.mutate()
  }

  const allPublished =
    studentGrades.length > 0 && studentGrades.every((sg) => sg.is_published)
  const toggleAllPublished = () => {
    setStudentGrades((prev) =>
      prev.map((sg) => ({ ...sg, is_published: !allPublished })),
    )
  }

  return (
    <DialogRoot
      size="xl"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        setIsOpen(open)
        if (!open) handleReset()
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
        borderRadius="6px"
        boxShadow="2xl"
        overflow="hidden"
        maxH={{ base: "95vh", md: "90vh" }}
      >
        {/* ─── Premium Header ─── */}
        <DialogHeader
          p={0}
          background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)"
        >
          <Box px={6} pt={6} pb={5}>
            <Flex align="center" gap={3} mb={1}>
              <Flex
                w={9}
                h={9}
                bg="whiteAlpha.200"
                borderRadius="8px"
                align="center"
                justify="center"
                flexShrink={0}
              >
                <Icon as={FiAward} color="white" fontSize="16px" />
              </Flex>
              <Box>
                <DialogTitle
                  fontSize="lg"
                  fontWeight="700"
                  color="white"
                  lineHeight={1.2}
                >
                  {t("grade.add_title")}
                </DialogTitle>
                <Text fontSize="xs" color="whiteAlpha.800" mt={0.5}>
                  {t("grade.description_bulk", {
                    defaultValue:
                      "Attribuer les notes à tous les étudiants de cette évaluation.",
                  })}
                </Text>
              </Box>
            </Flex>
            {/* Live assessment badge */}
            {selectedAssessmentData && (
              <Flex mt={3} gap={2}>
                <Badge
                  bg="whiteAlpha.200"
                  color="white"
                  borderRadius="6px"
                  px={2}
                  fontSize="xs"
                >
                  {selectedAssessmentData.course_session?.course_program_level
                    ?.course?.name || "—"}
                </Badge>
                {selectedAssessmentData.max_score && (
                  <Badge
                    bg="whiteAlpha.200"
                    color="white"
                    borderRadius="6px"
                    px={2}
                    fontSize="xs"
                  >
                    /{selectedAssessmentData.max_score} pts
                  </Badge>
                )}
              </Flex>
            )}
          </Box>
        </DialogHeader>

        <DialogBody
          py={5}
          px={5}
          bg="#f7f8fc"
          overflowY="auto"
          maxH={{ base: "calc(95vh - 200px)", md: "calc(90vh - 200px)" }}
        >
          <VStack gap={4} align="stretch">
            {/* Section 1 : Cible d'évaluation */}
            <Box
              bg="white"
              p={5}
              borderRadius="6px"
              border="1px solid"
              borderColor="gray.100"
              shadow="sm"
            >
              <Flex align="center" gap={2} mb={4}>
                <Flex
                  w={7}
                  h={7}
                  bg="#EBF8FF"
                  borderRadius="6px"
                  align="center"
                  justify="center"
                >
                  <Icon as={FiTarget} color="#3182CE" fontSize="13px" />
                </Flex>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  {t("grade.labels.target", {
                    defaultValue: "Cible d'évaluation",
                  })}
                </Text>
              </Flex>

              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                gap={4}
              >
                <GridItem>
                  <Field
                    required
                    label={t("program.level", {
                      defaultValue: "Programme / Niveau",
                    })}
                  >
                    <InputGroup
                      width="full"
                      startElement={<Icon as={FiBriefcase} color="gray.400" />}
                    >
                      <select
                        value={selectedProgramLevelId}
                        onChange={(e) => {
                          setSelectedProgramLevelId(e.target.value)
                          setSelectedAssessmentId("")
                          setStudentGrades([])
                        }}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                          border: "1px solid var(--chakra-colors-gray-200)",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          backgroundColor: "white",
                          color: "var(--chakra-colors-gray-800)",
                        }}
                      >
                        <option value="">
                          {t("common.forms.select", {
                            defaultValue: "Select...",
                          })}
                        </option>
                        {allProgramLevelsData?.data?.map(
                          (programLevel: any) => (
                            <option
                              key={programLevel.id}
                              value={programLevel.id}
                            >
                              {programLevel.program?.name ?? "—"}
                              {programLevel.name
                                ? ` — ${programLevel.name}`
                                : ""}
                              {programLevel.typical_duration
                                ? ` (${programLevel.typical_duration} ${t("common.duration_year.years", { defaultValue: "years" })})`
                                : ""}
                            </option>
                          ),
                        )}
                      </select>
                    </InputGroup>
                  </Field>
                </GridItem>

                <GridItem>
                  <Field required label={t("grade.fields.assessment")}>
                    {isAssessmentsLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <InputGroup
                        width="full"
                        startElement={<Icon as={FiAward} color="gray.400" />}
                      >
                        <select
                          value={selectedAssessmentId}
                          onChange={(e) => {
                            setSelectedAssessmentId(e.target.value)
                            setStudentGrades([])
                          }}
                          disabled={!selectedProgramLevelId}
                          style={{
                            width: "100%",
                            padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                            border: "1px solid var(--chakra-colors-gray-200)",
                            borderRadius: "4px",
                            fontSize: "0.875rem",
                            backgroundColor: selectedProgramLevelId
                              ? "white"
                              : "var(--chakra-colors-gray-50)",
                            color: "var(--chakra-colors-gray-800)",
                            opacity: selectedProgramLevelId ? 1 : 0.6,
                            cursor: selectedProgramLevelId
                              ? "default"
                              : "not-allowed",
                          }}
                        >
                          <option value="">
                            {t("grade.placeholders.select_assessment")}
                          </option>
                          {assessmentsData?.data?.map((assessment) => (
                            <option key={assessment.id} value={assessment.id}>
                              {assessment.name}
                            </option>
                          ))}
                        </select>
                      </InputGroup>
                    )}
                  </Field>
                </GridItem>

                <GridItem>
                  <Field required label={t("grade.fields.exam_type")}>
                    <InputGroup
                      width="full"
                      startElement={<Icon as={FiTag} color="gray.400" />}
                    >
                      <select
                        value={selectedExamType}
                        onChange={(e) => setSelectedExamType(e.target.value)}
                        disabled={!selectedAssessmentId}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                          border: "1px solid var(--chakra-colors-gray-200)",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          backgroundColor: selectedAssessmentId
                            ? "white"
                            : "var(--chakra-colors-gray-50)",
                          color: "var(--chakra-colors-gray-800)",
                          opacity: selectedAssessmentId ? 1 : 0.6,
                          cursor: selectedAssessmentId
                            ? "default"
                            : "not-allowed",
                        }}
                      >
                        <option value="intra">
                          {t("grade.exam_types.intra", { defaultValue: "Intra" })}
                        </option>
                        <option value="final">
                          {t("grade.exam_types.final", { defaultValue: "Final" })}
                        </option>
                      </select>
                    </InputGroup>
                  </Field>
                </GridItem>
              </Grid>
            </Box>

            {/* Section 2: Tableau des étudiants */}
            <Box
              bg="white"
              borderRadius="6px"
              border="1px solid"
              borderColor="gray.100"
              shadow="sm"
              overflow="hidden"
            >
              <Flex
                bg="gray.50"
                px={4}
                py={3}
                borderBottom="1px solid"
                borderColor="gray.100"
                justify="space-between"
                align="center"
              >
                <HStack gap={2}>
                  <Flex
                    w={6}
                    h={6}
                    bg="#EBF8FF"
                    borderRadius="6px"
                    align="center"
                    justify="center"
                  >
                    <Icon as={FiList} color="#3182CE" fontSize="11px" />
                  </Flex>
                  <Text fontSize="sm" fontWeight="700" color="gray.800">
                    {t("grade.labels.roster", {
                      defaultValue: "Liste des étudiants",
                    })}
                    {studentGrades.length > 0 && (
                      <Badge
                        ml={2}
                        colorPalette="blue"
                        variant="subtle"
                        size="xs"
                        borderRadius="full"
                      >
                        {studentGrades.length}
                      </Badge>
                    )}
                  </Text>
                </HStack>
                {studentGrades.length > 0 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="blue"
                    onClick={toggleAllPublished}
                  >
                    {allPublished
                      ? t("grade.actions.unpublish_all", {
                          defaultValue: "Unpublish All",
                        })
                      : t("grade.actions.publish_all", {
                          defaultValue: "Publish All",
                        })}
                  </Button>
                )}
              </Flex>

              {isStudentsLoading || isSelectedAssessmentLoading ? (
                <Box textAlign="center" py={12}>
                  <Spinner size="lg" color="blue.500" />
                  <Text mt={4} fontSize="sm" color="gray.500">
                    {t("common.loading")}
                  </Text>
                </Box>
              ) : studentGrades.length > 0 ? (
                <Box maxH="400px" overflowY="auto">
                  <Table.Root size="sm" interactive stickyHeader>
                    <Table.Header
                      bg="gray.25"
                      borderBottom="2px solid"
                      borderColor="gray.100"
                    >
                      <Table.Row>
                        <Table.ColumnHeader w="40px" py={3}>
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAllSelected}
                            size="sm"
                            colorPalette="blue"
                          />
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          color="gray.600"
                          fontWeight="bold"
                          fontSize="xs"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          py={3}
                        >
                          {t("common.tables.student_number", {
                            defaultValue: "Matricule",
                          })}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          color="gray.600"
                          fontWeight="bold"
                          fontSize="xs"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          py={3}
                        >
                          {t("common.forms.name")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          color="gray.600"
                          fontWeight="bold"
                          fontSize="xs"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          py={3}
                          w="120px"
                        >
                          {t("grade.fields.score")} /
                          {selectedAssessmentData?.max_score ?? 100}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          color="gray.600"
                          fontWeight="bold"
                          fontSize="xs"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          py={3}
                          w="80px"
                          textAlign="center"
                        >
                          {t("grade.fields.letter")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          color="gray.600"
                          fontWeight="700"
                          fontSize="xs"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          py={3}
                          w="70px"
                          textAlign="center"
                        >
                          {t("grade.fields.published", {
                            defaultValue: "Publié",
                          })}
                        </Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {studentGrades.map((sg) => (
                        <Table.Row
                          key={sg.student_id}
                          _hover={{ bg: "blue.50" }}
                        >
                          <Table.Cell>
                            <Checkbox
                              checked={sg.isSelected}
                              onCheckedChange={() =>
                                toggleSelection(sg.student_id)
                              }
                              size="sm"
                              colorPalette="blue"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Text
                              fontSize="xs"
                              fontFamily="mono"
                              fontWeight="bold"
                              color="blue.700"
                            >
                              {sg.student_number}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text
                              fontSize="xs"
                              fontWeight="600"
                              color="gray.800"
                            >
                              {sg.student_name}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={sg.score}
                              onChange={(e) =>
                                updateStudentScore(
                                  sg.student_id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              size="sm"
                              bg="white"
                              borderRadius="sm"
                              fontSize="xs"
                              fontWeight="bold"
                              textAlign="center"
                              borderColor={
                                sg.score > 0 ? "blue.200" : "gray.200"
                              }
                              _focus={{ borderColor: "blue.500", shadow: "sm" }}
                            />
                          </Table.Cell>
                          <Table.Cell textAlign="center">
                            <Badge
                              colorPalette={sg.is_passing ? "green" : "red"}
                              variant="solid"
                              borderRadius="full"
                              px={2}
                            >
                              {sg.letter_grade}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell textAlign="center">
                            <Checkbox
                              checked={sg.is_published}
                              onCheckedChange={() =>
                                togglePublished(sg.student_id)
                              }
                              size="sm"
                              colorPalette="blue"
                            />
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              ) : (
                <Box textAlign="center" py={12} bg="white">
                  <Icon as={FiInfo} boxSize={8} color="gray.200" mb={3} />
                  <Text fontSize="sm" color="gray.500">
                    {selectedAssessmentId
                      ? t("common.tables.no_results")
                      : t("grade.placeholders.select_to_load", {
                          defaultValue: "Select an assessment to view students",
                        })}
                  </Text>
                </Box>
              )}
            </Box>

            {/* Section 3 : Contexte de la notation */}
            <Box
              bg="white"
              p={4}
              borderRadius="6px"
              border="1px solid"
              borderColor="gray.100"
              shadow="sm"
            >
              <Flex justify="space-between" align="center" gap={4} wrap="wrap">
                <HStack gap={6}>
                  <HStack gap={2}>
                    <Icon as={FiCalendar} color="blue.400" fontSize="13px" />
                    <VStack align="start" gap={0}>
                      <Text
                        fontSize="9px"
                        color="gray.400"
                        fontWeight="bold"
                        textTransform="uppercase"
                        letterSpacing="wider"
                      >
                        {t("grade.fields.graded_date")}
                      </Text>
                      <Text fontSize="xs" fontWeight="600" color="gray.700">
                        {new Date().toLocaleDateString(
                          t("common.language") === "French" ? "fr-FR" : "en-US",
                        )}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack gap={2}>
                    <Icon as={FiBriefcase} color="blue.400" fontSize="13px" />
                    <VStack align="start" gap={0}>
                      <Text
                        fontSize="9px"
                        color="gray.400"
                        fontWeight="bold"
                        textTransform="uppercase"
                        letterSpacing="wider"
                      >
                        {t("grade.fields.graded_by")}
                      </Text>
                      <Text fontSize="xs" fontWeight="600" color="gray.700">
                        {`${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() ||
                          currentUser?.email ||
                          t("common.roles.teacher", {
                            defaultValue: "Teacher",
                          })}
                      </Text>
                    </VStack>
                  </HStack>
                </HStack>
                {selectedAssessmentData && (
                  <Badge
                    colorPalette="blue"
                    variant="surface"
                    size="sm"
                    borderRadius="6px"
                  >
                    {
                      selectedAssessmentData.course_session
                        ?.course_program_level?.course?.name
                    }
                  </Badge>
                )}
              </Flex>
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter
          borderTop="1.5px solid"
          borderColor="gray.100"
          bg="white"
          py={4}
          px={5}
        >
          <Flex justify="space-between" w="full" align="center">
            <Text fontSize="xs" color="gray.400">
              {studentGrades.length > 0
                ? t("grade.actions.submit_bulk_full", {
                    count: selectedCount,
                    plural_s: selectedCount > 1 ? "s" : "",
                    published: studentGrades.filter(
                      (s) => s.isSelected && s.is_published,
                    ).length,
                    published_plural_s:
                      studentGrades.filter(
                        (s) => s.isSelected && s.is_published,
                      ).length > 1
                        ? "s"
                        : "",
                    defaultValue: `${selectedCount} étudiant${selectedCount > 1 ? "s" : ""} · ${studentGrades.filter((s) => s.isSelected && s.is_published).length} publié${studentGrades.filter((s) => s.isSelected && s.is_published).length > 1 ? "s" : ""}`,
                  })
                : t("common.placeholders.select_evaluation", {
                    defaultValue: "Select an evaluation",
                  })}
            </Text>
            <Flex gap={3}>
              <DialogActionTrigger asChild>
                <Button
                  variant="outline"
                  colorPalette="gray"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={handleReset}
                  borderRadius="6px"
                >
                  {t("common.forms.cancel")}
                </Button>
              </DialogActionTrigger>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={
                  !selectedAssessmentId ||
                  studentGrades.length === 0 ||
                  mutation.isPending
                }
                loading={mutation.isPending}
                borderRadius="6px"
                background="linear-gradient(135deg, #2c5282, #2b6cb0)"
                color="white"
                _hover={{
                  background: "linear-gradient(135deg, #2a4365, #2c5282)",
                  shadow: "md",
                }}
                shadow="sm"
                px={5}
              >
                {t("grade.actions.submit_bulk", {
                  count: selectedCount,
                  defaultValue: `Enregistrer les notes (${selectedCount})`,
                })}
              </Button>
            </Flex>
          </Flex>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddGrade
