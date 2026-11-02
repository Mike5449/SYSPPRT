import {
  Badge,
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Grid,
  GridItem,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPercent,
  FiPlus,
  FiTarget,
  FiZap,
} from "react-icons/fi"

import {
  AcademicYearsService,
  type AssessmentCreate,
  AssessmentsService,
  CourseSessionsService,
  ProgramLevelsService,
  SessionsService,
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
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"
import { InputGroup } from "../ui/input-group"

// Assessment types with labels and colors
const ASSESSMENT_TYPES = [
  { value: "exam", label: "Examen", color: "#E53E3E", bg: "#FFF5F5", isExamType: true },
  { value: "quiz", label: "Quiz", color: "#D69E2E", bg: "#FFFFF0", isExamType: false },
  { value: "devoir", label: "Devoir", color: "#38A169", bg: "#F0FFF4", isExamType: false },
  { value: "project", label: "Projet", color: "#3182CE", bg: "#EBF8FF", isExamType: false },
  {
    value: "presentation",
    label: "Présentation",
    color: "#805AD5",
    bg: "#FAF5FF",
    isExamType: false,
  },
  { value: "lab", label: "Labo", color: "#DD6B20", bg: "#FFFAF0", isExamType: false },
  { value: "homework", label: "Homework", color: "#319795", bg: "#E6FFFA", isExamType: false },
  { value: "test", label: "Test", color: "#E53E3E", bg: "#FFF5F5", isExamType: false },
]

// Seul le type "exam" est limité à 2 par session
const EXAM_TYPES = new Set(["exam"])

const selectStyle = {
  width: "100%",
  padding: "0.55rem 0.85rem 0.55rem 2.5rem",
  border: "1.5px solid #E2E8F0",
  borderRadius: "8px",
  fontSize: "0.875rem",
  backgroundColor: "white",
  color: "#2D3748",
  outline: "none",
  cursor: "pointer",
  transition: "border-color 0.2s",
}

const sectionCard = {
  bg: "white",
  p: 5,
  borderRadius: "12px",
  border: "1.5px solid",
  borderColor: "gray.100",
  shadow: "sm",
}

const AddAssessment = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { user } = useAuth()
  const { data: userRoles } = useUserRoles(user?.id)
  const isAdmin = user?.is_superuser
  const isTeacher =
    (userRoles || []).some(
      (r: any) => (r.code || "").toUpperCase() === "TEACHER",
    ) && !isAdmin

  const [programLevelId, setProgramLevelId] = useState<string>("")
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>("")

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<AssessmentCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      description: null,
      assessment_type: "",
      max_score: 100,
      weight: 0,
      due_date: new Date().toISOString().split("T")[0],
      assessment_date: new Date().toISOString().split("T")[0],
      duration_minutes: null,
      is_mandatory: true,
      passing_score: null,
      instructions: null,
      is_published: true,
      course_session_id: "",
    },
  })

  const today = new Date().toISOString().split("T")[0]

  const watchAssessmentType = watch("assessment_type")
  const watchCourseSessionId = watch("course_session_id")
  const watchDueDate = watch("due_date")
  const watchAssessmentDate = watch("assessment_date")
  const selectedTypeInfo = ASSESSMENT_TYPES.find(
    (t) => t.value === watchAssessmentType,
  )

  // Load teacher data if user is a teacher
  const { data: teacherData } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: user!.id }),
    enabled: !!user?.id && isTeacher,
    retry: false,
  })

  // Load current academic year from API
  const { data: currentAcademicYearData } = useQuery({
    queryKey: ["current_academic_year"],
    queryFn: () => AcademicYearsService.readCurrentAcademicYear(),
  })

  // Fallback: if no "current" year set, try date-range search
  const { data: academicYears } = useQuery({
    queryKey: ["academic_years"],
    queryFn: () =>
      AcademicYearsService.readAcademicYears({ skip: 0, limit: 1000 }),
    enabled: !currentAcademicYearData,
  })

  const currentAcademicYear =
    currentAcademicYearData ||
    (() => {
      const today = new Date()
      return (
        academicYears?.data?.find((y: any) => {
          try {
            const start = y.start_date ? new Date(y.start_date) : null
            const end = y.end_date ? new Date(y.end_date) : null
            if (start && end) return start <= today && today <= end
            return false
          } catch (_e) {
            return false
          }
        }) || academicYears?.data?.[0]
      )
    })()

  // Load current active session
  const { data: activeSessionsData } = useQuery({
    queryKey: ["sessions_active"],
    queryFn: () => SessionsService.readSessions({ isActive: true, limit: 10 }),
  })
  const currentSession = activeSessionsData?.data?.[0] ?? null

  // Load all course sessions
  const { data: allCourseSessionsData, isLoading: isCourseSessionsLoading } =
    useQuery({
      queryKey: ["course_sessions_all"],
      queryFn: () =>
        CourseSessionsService.readCourseSessions({ skip: 0, limit: 1000 }),
    })

  // Filter sessions by active session + teacher
  const filteredSessions =
    allCourseSessionsData?.data?.filter((cs: any) => {
      const matchesSession = currentSession
        ? cs.session_id === currentSession.id
        : currentAcademicYear
          ? cs.session?.academic_year_id === currentAcademicYear.id
          : true
      const matchesTeacher =
        isTeacher && teacherData ? cs.teacher_id === teacherData.id : true
      return matchesSession && matchesTeacher
    }) || []

  // Get unique program level IDs present in filteredSessions
  const uniqueProgramLevelIds = Array.from(
    new Set(
      filteredSessions
        .map((cs: any) => cs.course_program_level?.program_level?.id)
        .filter(Boolean),
    ),
  )

  // Load program levels
  const { data: allProgramLevelsData } = useQuery({
    queryKey: ["program_levels_all"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
  })

  const programLevelsForFilter = allProgramLevelsData?.data
    ? allProgramLevelsData.data.filter((pl: any) =>
        uniqueProgramLevelIds.includes(pl.id),
      )
    : []

  // typical_duration of selected program level → available year levels
  const selectedProgramLevel = allProgramLevelsData?.data?.find(
    (pl: any) => pl.id === programLevelId,
  )
  const maxYearLevel = selectedProgramLevel?.typical_duration ?? 7
  const availableYearLevels = Array.from({ length: maxYearLevel }, (_, i) => i + 1)

  // Filter by selected program level + year level
  const courseSessionsData = {
    data: filteredSessions.filter((cs: any) => {
      const matchesProgramLevel = programLevelId
        ? cs.course_program_level?.program_level?.id === programLevelId
        : true
      const matchesYearLevel = selectedYearLevel
        ? cs.year_level === parseInt(selectedYearLevel, 10)
        : true
      return matchesProgramLevel && matchesYearLevel
    }),
  }

  // Get the selected session object for display
  const selectedSession = courseSessionsData?.data.find(
    (s: any) => s.id === watchCourseSessionId,
  ) as any | undefined

  // Fetch existing assessments for selected course session to count exam types
  const { data: sessionAssessmentsData } = useQuery({
    queryKey: ["assessments_by_session", watchCourseSessionId],
    queryFn: () =>
      AssessmentsService.readAssessmentsByCourseSession({
        courseSessionId: watchCourseSessionId!,
      }),
    enabled: !!watchCourseSessionId,
  })

  const examTypeCount = (sessionAssessmentsData?.data || []).filter(
    (a: any) => EXAM_TYPES.has((a.assessment_type || "").toLowerCase().trim()),
  ).length

  const examLimitReached = examTypeCount >= 2

  // Auto-generate name: "Type | Cours | Date"
  useEffect(() => {
    if (watchAssessmentType && watchCourseSessionId && selectedSession) {
      const typeLabel =
        ASSESSMENT_TYPES.find((t) => t.value === watchAssessmentType)?.label ||
        watchAssessmentType
      const courseName =
        selectedSession?.course_program_level?.course?.name || ""
      const dateStr = watchAssessmentDate
        ? new Date(watchAssessmentDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : new Date().toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })

      const autoName = `${typeLabel} | ${courseName} | ${dateStr}`
      setValue("name", autoName)
    }
  }, [
    watchAssessmentType,
    watchCourseSessionId,
    watchAssessmentDate,
    selectedSession,
    setValue,
  ])

  // Auto-generate description
  useEffect(() => {
    if (watchAssessmentType && selectedSession) {
      const typeLabel =
        ASSESSMENT_TYPES.find((t) => t.value === watchAssessmentType)?.label ||
        watchAssessmentType
      let description = `${typeLabel}`
      if (selectedSession?.course_program_level?.course?.name) {
        description += ` — ${selectedSession.course_program_level.course.name}`
      }
      if (selectedSession?.course_program_level?.program_level?.name) {
        description += ` | ${selectedSession.course_program_level.program_level.name}`
      }
      if (selectedSession?.session?.name) {
        description += ` | ${selectedSession.session.name}`
      }
      if (watchAssessmentDate) {
        description += ` | ${new Date(watchAssessmentDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
      }
      if (watchDueDate) {
        description += ` | À rendre le ${new Date(watchDueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
      }
      setValue("description", description)
    }
  }, [
    watchAssessmentType,
    watchAssessmentDate,
    watchDueDate,
    selectedSession,
    setValue,
  ])

  const mutation = useMutation({
    mutationFn: (data: AssessmentCreate) =>
      AssessmentsService.createAssessment({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", { item: t("common.assessments") }),
      )
      reset()
      setProgramLevelId("")
      setSelectedYearLevel("")
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] })
    },
  })

  const onSubmit: SubmitHandler<AssessmentCreate> = (data) => {
    const formattedData: AssessmentCreate = {
      ...data,
      description: data.description || null,
      due_date: data.due_date || null,
      assessment_date: data.assessment_date || null,
      duration_minutes: data.duration_minutes || null,
      passing_score: data.passing_score || null,
      instructions: data.instructions || null,
    }
    mutation.mutate(formattedData)
  }

  return (
    <DialogRoot
      size="xl"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        setIsOpen(open)
        if (!open) {
          reset()
          setProgramLevelId("")
          setSelectedYearLevel("")
        }
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
          <FiPlus fontSize="12px" />
        </Button>
      </DialogTrigger>

      <DialogContent
        borderRadius="6px"
        boxShadow="2xl"
        overflow="hidden"
        maxH={{ base: "95vh", md: "90vh" }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ─── Premium Header ─── */}
          <DialogHeader
            p={0}
            background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)"
          >
            <Box px={7} pt={7} pb={6}>
              <Flex align="center" gap={3} mb={2}>
                <Flex
                  w={10}
                  h={10}
                  bg="rgba(255,255,255,0.15)"
                  borderRadius="10px"
                  align="center"
                  justify="center"
                  backdropFilter="blur(4px)"
                >
                  <Icon as={FiAward} color="white" fontSize="18px" />
                </Flex>
                <Box>
                  <DialogTitle
                    fontSize="xl"
                    fontWeight="700"
                    color="white"
                    lineHeight="1.2"
                  >
                    Nouvelle Évaluation
                  </DialogTitle>
                  <Text fontSize="xs" color="whiteAlpha.700" mt={0.5}>
                    Configurez et publiez une évaluation pour vos étudiants
                  </Text>
                </Box>
              </Flex>

              {/* Live preview badge */}
              {selectedSession && watchAssessmentType && (
                <Flex
                  mt={4}
                  p={3}
                  bg="rgba(255,255,255,0.1)"
                  borderRadius="10px"
                  backdropFilter="blur(6px)"
                  border="1px solid rgba(255,255,255,0.15)"
                  gap={3}
                  align="center"
                  flexWrap="wrap"
                >
                  <Badge
                    colorPalette="whiteAlpha"
                    variant="solid"
                    bg={selectedTypeInfo?.color}
                    color="white"
                    borderRadius="6px"
                    px={2}
                    fontSize="xs"
                  >
                    {selectedTypeInfo?.label}
                  </Badge>
                  <Text fontSize="xs" color="white" fontWeight="600">
                    {selectedSession?.course_program_level?.course?.name}
                  </Text>
                  {selectedSession?.session?.name && (
                    <>
                      <Text color="whiteAlpha.500" fontSize="xs">
                        ·
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.800">
                        {selectedSession.session.name}
                      </Text>
                    </>
                  )}
                </Flex>
              )}
            </Box>
          </DialogHeader>

          <DialogBody
            py={5}
            px={6}
            overflowY="auto"
            maxH={{ base: "calc(95vh - 240px)", md: "calc(90vh - 260px)" }}
            bg="#f7f8fc"
          >
            <VStack gap={5} align="stretch">
              {/* ─── Section 1: Course Selection ─── */}
              <Box {...sectionCard}>
                <Flex align="center" gap={2} mb={3}>
                  <Flex
                    w={7}
                    h={7}
                    bg="#EBF8FF"
                    borderRadius="8px"
                    align="center"
                    justify="center"
                  >
                    <Icon as={FiBookOpen} color="#3182CE" fontSize="14px" />
                  </Flex>
                  <Text fontSize="sm" fontWeight="700" color="#2D3748">
                    Sélection du cours
                  </Text>
                  {currentSession && (
                    <Flex ml="auto" align="center" gap={2}>
                      <Badge colorPalette="green" variant="surface" size="sm" borderRadius="4px" px={2}>
                        Session actuelle
                      </Badge>
                      <Text fontSize="xs" fontWeight="600" color="gray.600">
                        {currentSession.name}
                      </Text>
                    </Flex>
                  )}
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  {/* Programme */}
                  <GridItem>
                    <Field label="Programme / Niveau">
                      <InputGroup
                        width="full"
                        startElement={
                          <Icon as={FiTarget} color="gray.400" fontSize="13px" />
                        }
                      >
                        <select
                          value={programLevelId}
                          onChange={(e) => {
                            setProgramLevelId(e.target.value)
                            setSelectedYearLevel("")
                            setValue("course_session_id", "")
                          }}
                          style={selectStyle}
                        >
                          <option value="">Sélectionner un programme...</option>
                          {programLevelsForFilter.map((pl: any) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.program?.name ? `${pl.program.name} — ` : ""}{pl.name}
                            </option>
                          ))}
                        </select>
                      </InputGroup>
                    </Field>
                  </GridItem>

                  {/* Niveau d'année — visible seulement après avoir choisi le programme */}
                  {programLevelId && (
                    <GridItem>
                      <Field label="Niveau d'année">
                        <InputGroup
                          width="full"
                          startElement={
                            <Icon as={FiTarget} color="gray.400" fontSize="13px" />
                          }
                        >
                          <select
                            value={selectedYearLevel}
                            onChange={(e) => {
                              setSelectedYearLevel(e.target.value)
                              setValue("course_session_id", "")
                            }}
                            style={selectStyle}
                          >
                            <option value="">Toutes les années</option>
                            {availableYearLevels.map((level) => (
                              <option key={level} value={level}>
                                Année {level}
                              </option>
                            ))}
                          </select>
                        </InputGroup>
                      </Field>
                    </GridItem>
                  )}

                  {/* Cours (séance) */}
                  <GridItem colSpan={programLevelId ? 2 : 2}>
                    <Field
                      required
                      invalid={!!errors.course_session_id}
                      errorText={errors.course_session_id?.message}
                      label="Cours"
                    >
                      <InputGroup
                        width="full"
                        startElement={
                          <Icon as={FiBookOpen} color="gray.400" fontSize="13px" />
                        }
                      >
                        {isCourseSessionsLoading ? (
                          <Flex align="center" gap={2} p={2}>
                            <Spinner size="xs" color="blue.500" />
                            <Text fontSize="xs" color="gray.500">
                              Chargement...
                            </Text>
                          </Flex>
                        ) : (
                          <select
                            {...register("course_session_id", {
                              required: t("common.forms.required"),
                            })}
                            style={selectStyle}
                          >
                            <option value="">Sélectionner un cours...</option>
                            {courseSessionsData.data.map((session: any) => (
                              <option key={session.id} value={session.id}>
                                {session.course_program_level?.course?.name || "—"}
                              </option>
                            ))}
                          </select>
                        )}
                      </InputGroup>
                    </Field>
                  </GridItem>
                </Grid>
              </Box>

              {/* ─── Section 2: Type d'évaluation (visual picker) ─── */}
              <Box {...sectionCard}>
                <Flex align="center" gap={2} mb={4}>
                  <Flex
                    w={7}
                    h={7}
                    bg="#FAF5FF"
                    borderRadius="8px"
                    align="center"
                    justify="center"
                  >
                    <Icon as={FiZap} color="#805AD5" fontSize="14px" />
                  </Flex>
                  <Text fontSize="sm" fontWeight="700" color="#2D3748">
                    Type d'évaluation
                  </Text>
                  {watchAssessmentType && (
                    <Badge
                      ml="auto"
                      px={2}
                      borderRadius="6px"
                      fontSize="xs"
                      bg={selectedTypeInfo?.color || "gray.500"}
                      color="white"
                    >
                      {selectedTypeInfo?.label}
                    </Badge>
                  )}
                </Flex>

                {/* Warning when exam limit reached */}
                {examLimitReached && watchCourseSessionId && (
                  <Flex
                    mb={3}
                    p={3}
                    bg="#FFF5F5"
                    border="1.5px solid #FC8181"
                    borderRadius="8px"
                    align="center"
                    gap={2}
                  >
                    <Text fontSize="xs" color="#C53030" fontWeight="600">
                      ⚠ Limite atteinte :
                    </Text>
                    <Text fontSize="xs" color="#C53030">
                      Cette session a déjà {examTypeCount} évaluation{examTypeCount > 1 ? "s" : ""} de type examen (maximum 2). Les types Examen et Test sont désactivés.
                    </Text>
                  </Flex>
                )}

                <input
                  type="hidden"
                  {...register("assessment_type", {
                    required: t("common.forms.required"),
                  })}
                />
                <Grid templateColumns="repeat(4, 1fr)" gap={2}>
                  {ASSESSMENT_TYPES.map((type) => {
                    const isSelected = watchAssessmentType === type.value
                    const isDisabled = type.isExamType && examLimitReached
                    return (
                      <Button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) {
                            setValue("assessment_type", type.value, {
                              shouldValidate: true,
                            })
                          }
                        }}
                        p={2.5}
                        borderRadius="4px"
                        border="2px solid"
                        borderColor={isDisabled ? "gray.200" : isSelected ? type.color : "gray.150"}
                        bg={isDisabled ? "gray.50" : isSelected ? type.bg : "white"}
                        cursor={isDisabled ? "not-allowed" : "pointer"}
                        transition="all 0.15s"
                        _hover={isDisabled ? {} : { borderColor: type.color, bg: type.bg }}
                        textAlign="center"
                        flex="1"
                        variant="ghost"
                        color="inherit"
                        justifyContent="center"
                        opacity={isDisabled ? 0.45 : 1}
                        title={isDisabled ? "Limite de 2 évaluations de type examen atteinte" : undefined}
                      >
                        <Text
                          fontSize="xs"
                          fontWeight={isSelected ? "700" : "500"}
                          color={isDisabled ? "gray.400" : isSelected ? type.color : "gray.600"}
                        >
                          {type.label}
                        </Text>
                      </Button>
                    )
                  })}
                </Grid>
                {errors.assessment_type && (
                  <Text fontSize="xs" color="red.500" mt={2}>
                    {errors.assessment_type.message}
                  </Text>
                )}
              </Box>

              {/* ─── Section 4: Dates & Durée ─── */}
              <Box {...sectionCard}>
                <Flex align="center" gap={2} mb={4}>
                  <Flex
                    w={7}
                    h={7}
                    bg="#FFFFF0"
                    borderRadius="8px"
                    align="center"
                    justify="center"
                  >
                    <Icon as={FiCalendar} color="#D69E2E" fontSize="14px" />
                  </Flex>
                  <Text fontSize="sm" fontWeight="700" color="#2D3748">
                    Dates & Durée
                  </Text>
                </Flex>

                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={4}
                >
                  <Field label="Date de l'évaluation">
                    <InputGroup
                      width="full"
                      startElement={
                        <Icon as={FiCalendar} color="gray.400" fontSize="12px" />
                      }
                      endElement={
                        <Badge colorPalette="blue" variant="surface" size="xs" borderRadius="4px" mr={1}>
                          Aujourd'hui
                        </Badge>
                      }
                    >
                      <Input
                        {...register("assessment_date")}
                        type="date"
                        value={today}
                        readOnly
                        fontSize="sm"
                        borderRadius="8px"
                        borderColor="gray.200"
                        bg="gray.50"
                        color="gray.500"
                        cursor="default"
                      />
                    </InputGroup>
                  </Field>

                  <Field
                    label="Date limite (rendu)"
                    invalid={!!errors.due_date}
                    errorText={errors.due_date?.message}
                  >
                    <InputGroup
                      width="full"
                      startElement={
                        <Icon as={FiCalendar} color="gray.400" fontSize="12px" />
                      }
                    >
                      <Input
                        {...register("due_date", {
                          validate: (val) =>
                            !val || val >= today || "La date limite ne peut pas être antérieure à aujourd'hui",
                        })}
                        type="date"
                        min={today}
                        fontSize="sm"
                        borderRadius="8px"
                        borderColor={errors.due_date ? "red.400" : "gray.200"}
                      />
                    </InputGroup>
                  </Field>

                  <Field label="Durée (min)">
                    <InputGroup
                      width="full"
                      startElement={
                        <Icon as={FiClock} color="gray.400" fontSize="12px" />
                      }
                    >
                      <Input
                        {...register("duration_minutes", {
                          valueAsNumber: true,
                          min: { value: 0, message: "≥ 0" },
                        })}
                        placeholder="ex: 90"
                        type="number"
                        fontSize="sm"
                        borderRadius="8px"
                        borderColor="gray.200"
                      />
                    </InputGroup>
                  </Field>
                </Grid>
              </Box>

              {/* ─── Section 5: Notes & Paramètres ─── */}
              <Box {...sectionCard}>
                <Flex align="center" gap={2} mb={4}>
                  <Flex
                    w={7}
                    h={7}
                    bg="#FFF5F5"
                    borderRadius="8px"
                    align="center"
                    justify="center"
                  >
                    <Icon as={FiTarget} color="#E53E3E" fontSize="14px" />
                  </Flex>
                  <Text fontSize="sm" fontWeight="700" color="#2D3748">
                    Barème & Options
                  </Text>
                </Flex>

                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={4}
                >
                  <Field
                    label="Note maximale"
                    invalid={!!errors.max_score}
                    errorText={errors.max_score?.message}
                  >
                    <InputGroup
                      width="full"
                      startElement={
                        <Icon as={FiPercent} color="gray.400" fontSize="12px" />
                      }
                    >
                      <Input
                        {...register("max_score", {
                          valueAsNumber: true,
                          min: { value: 0.01, message: "Doit être > 0" },
                        })}
                        placeholder="100"
                        type="number"
                        step="0.01"
                        fontSize="sm"
                        borderRadius="8px"
                        borderColor="gray.200"
                      />
                    </InputGroup>
                  </Field>

                  <Field
                    label="Note de passage"
                    invalid={!!errors.passing_score}
                    errorText={errors.passing_score?.message}
                  >
                    <InputGroup
                      width="full"
                      startElement={
                        <Icon
                          as={FiCheckCircle}
                          color="gray.400"
                          fontSize="12px"
                        />
                      }
                    >
                      <Input
                        {...register("passing_score", {
                          valueAsNumber: true,
                          min: { value: 0, message: "≥ 0" },
                        })}
                        placeholder="60"
                        type="number"
                        step="0.01"
                        fontSize="sm"
                        borderRadius="8px"
                        borderColor="gray.200"
                      />
                    </InputGroup>
                  </Field>
                </Grid>

                <Flex gap={6} mt={4} align="center">
                  <Checkbox
                    {...register("is_mandatory")}
                    size="sm"
                    colorPalette="blue"
                  >
                    <Text fontSize="xs" fontWeight="medium">
                      Obligatoire pour tous
                    </Text>
                  </Checkbox>
                  <Checkbox
                    {...register("is_published")}
                    size="sm"
                    colorPalette="green"
                  >
                    <Text fontSize="xs" fontWeight="medium">
                      Visible par les étudiants
                    </Text>
                  </Checkbox>
                </Flex>
              </Box>
            </VStack>
          </DialogBody>

          {/* ─── Footer ─── */}
          <DialogFooter
            borderTop="1.5px solid"
            borderColor="gray.100"
            pt={4}
            pb={4}
            px={6}
            bg="white"
          >
            <Flex justify="space-between" w="full" align="center">
              <Text fontSize="xs" color="gray.400">
                {selectedSession
                  ? `✓ Cours sélectionné: ${selectedSession?.course_program_level?.course?.name}`
                  : "Sélectionnez un cours pour commencer"}
              </Text>
              <Flex gap={3}>
                <DialogActionTrigger asChild>
                  <Button
                    variant="outline"
                    colorPalette="gray"
                    size="sm"
                    disabled={isSubmitting}
                    borderRadius="8px"
                  >
                    Annuler
                  </Button>
                </DialogActionTrigger>
                <Button
                  variant="solid"
                  type="submit"
                  size="sm"
                  disabled={!isValid || isSubmitting}
                  loading={isSubmitting}
                  borderRadius="8px"
                  background="linear-gradient(135deg, #2c5282, #2b6cb0)"
                  color="white"
                  _hover={{
                    background: "linear-gradient(135deg, #2a4365, #2c5282)",
                    shadow: "md",
                  }}
                  shadow="sm"
                  px={5}
                >
                  <FiPlus />
                  Créer l'évaluation
                </Button>
              </Flex>
            </Flex>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddAssessment
