import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Grid,
  GridItem,
  Input,
  Text,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiCheck, FiChevronLeft, FiChevronRight, FiPlus } from "react-icons/fi"

import {
  type ApiError,
  type CourseProgramLevelCreate,
  CourseProgramLevelsService,
  type CourseSessionCreate,
  CourseSessionsService,
  CoursesService,
  ProgramLevelsService,
  SessionsService,
  TeachersService,
} from "@/client"
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
import { toaster } from "../ui/toaster"

// Step 1: Common Information (Program Level, Session, Year Level)
interface Step1Data {
  program_level_id: string
  course_id: string
  year_level: number
  is_active: boolean
}

// Step 2: Course Session Details
interface Step2Data {
  session_id: string
  teacher_id: string
  classroom: string
  max_students: number | undefined
  year_level: number
  intra_percentage: number | undefined
  final_percentage: number | undefined
  participation_percentage: number | undefined
  is_active: boolean
}

// Course Item with all its details
interface CourseItem {
  id: string // Temporary ID for the list
  course_id: string
  teacher_id: string
  classroom: string
  max_students: number | undefined
  intra_percentage: number | undefined
  final_percentage: number | undefined
  participation_percentage: number | undefined
  is_active: boolean
}

const AddCourseSessionWithProgram = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [_coursesList, _setCoursesList] = useState<CourseItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [_createdCourseProgramLevelId, setCreatedCourseProgramLevelId] =
    useState<string | null>(null)

  // Form for Step 1 (Common Information)
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    reset: resetStep1,
    watch: watchStep1,
    setValue: setValueStep1,
    formState: { errors: errorsStep1 },
  } = useForm<Step1Data>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      year_level: 1,
    },
  })

  // Form for Step 2 (Course Session)
  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    reset: resetStep2,
    watch: watchStep2,
    setValue: setValueStep2,
    formState: { errors: errorsStep2 },
  } = useForm<Step2Data>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      is_active: true,
    },
  })

  // Fetch courses
  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => CoursesService.readCourses({ skip: 0, limit: 1000 }),
  })

  // Fetch program levels
  const { data: programLevels } = useQuery({
    queryKey: ["program_levels"],
    queryFn: () =>
      ProgramLevelsService.readProgramLevels({ skip: 0, limit: 1000 }),
  })

  // Fetch sessions
  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => SessionsService.readSessions({ skip: 0, limit: 1000 }),
  })

  // Filter only active sessions
  const activeSessions =
    sessions?.data.filter((session) => session.is_active) || []

  // Fetch teachers
  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => TeachersService.readTeachers({ skip: 0, limit: 1000 }),
  })

  // Mutation to create course_program_level
  const createCourseProgramLevelMutation = useMutation({
    mutationFn: (data: CourseProgramLevelCreate) =>
      CourseProgramLevelsService.createCourseProgramLevel({
        requestBody: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_program_levels"] })
    },
  })

  // Mutation to create course_session
  const createCourseSessionMutation = useMutation({
    mutationFn: (data: CourseSessionCreate) =>
      CourseSessionsService.createCourseSession({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_sessions"] })
    },
  })

  // Mutation to delete course_program_level (for rollback)
  const deleteCourseProgramLevelMutation = useMutation({
    mutationFn: (id: string) =>
      CourseProgramLevelsService.deleteCourseProgramLevel({ cplId: id }),
  })

  // Handle Step 1 submission (go to step 2)
  const onSubmitStep1: SubmitHandler<Step1Data> = (data) => {
    setStep1Data(data)
    setCurrentStep(2)
  }

  // Handle Step 2 submission (create both records)
  const onSubmitStep2: SubmitHandler<Step2Data> = async (data) => {
    if (!step1Data) return

    setIsSubmitting(true)
    let courseProgramLevelId: string | null = null

    try {
      // Step 1: Create course_program_level
      toaster.create({
        title: "Création en cours...",
        description: "Création du lien cours-programme",
        type: "info",
      })

      const courseProgramLevel =
        await createCourseProgramLevelMutation.mutateAsync({
          course_id: step1Data.course_id,
          program_level_id: step1Data.program_level_id,
          year_level: step1Data.year_level,
          is_active: step1Data.is_active,
        })

      courseProgramLevelId = courseProgramLevel.id
      setCreatedCourseProgramLevelId(courseProgramLevelId)

      // Step 2: Create course_session with the created course_program_level_id
      toaster.create({
        title: "Création en cours...",
        description: "Création de la session de cours",
        type: "info",
      })

      await createCourseSessionMutation.mutateAsync({
        course_program_level_id: courseProgramLevelId,
        session_id: data.session_id,
        teacher_id: data.teacher_id,
        classroom: data.classroom || undefined,
        max_students: data.max_students || undefined,
        year_level: data.year_level,
        intra_percentage: data.intra_percentage || undefined,
        final_percentage: data.final_percentage || undefined,
        participation_percentage: data.participation_percentage || undefined,
        is_active: data.is_active,
      })

      // Success!
      toaster.create({
        title: "Succès",
        description: "Session de cours créée avec succès",
        type: "success",
      })

      // Reset and close
      resetStep1()
      resetStep2()
      setStep1Data(null)
      setCreatedCourseProgramLevelId(null)
      setCurrentStep(1)
      setOpen(false)
    } catch (error) {
      // Rollback: Delete course_program_level if it was created
      if (courseProgramLevelId) {
        try {
          await deleteCourseProgramLevelMutation.mutateAsync(
            courseProgramLevelId,
          )
          toaster.create({
            title: "Annulation",
            description:
              "Transaction annulée - aucune donnée n'a été enregistrée",
            type: "warning",
          })
        } catch (_rollbackError) {
          toaster.create({
            title: "Erreur critique",
            description:
              "Impossible d'annuler la transaction. Contactez l'administrateur.",
            type: "error",
          })
        }
      } else {
        const apiError = error as ApiError
        const errDetail =
          apiError.body &&
          typeof apiError.body === "object" &&
          apiError.body !== null &&
          "detail" in apiError.body
            ? (apiError.body as { detail?: string }).detail
            : undefined
        toaster.create({
          title: "Erreur",
          description: errDetail || "Une erreur s'est produite",
          type: "error",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
  }

  const handleClose = () => {
    resetStep1()
    resetStep2()
    setStep1Data(null)
    setCreatedCourseProgramLevelId(null)
    setCurrentStep(1)
    setOpen(false)
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          handleClose()
        }
        setOpen(e.open)
      }}
      size={{ base: "xs", md: "lg" }}
      placement="center"
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

      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
            Ajouter une session de cours complète
          </DialogTitle>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Étape {currentStep} sur 2
          </Text>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          {/* Progress Indicator */}
          <Flex mb={6} align="center" justify="center" gap={2}>
            <Box
              w="40px"
              h="40px"
              borderRadius="full"
              bg={currentStep >= 1 ? "blue.500" : "gray.200"}
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="600"
              fontSize="sm"
            >
              {currentStep > 1 ? <FiCheck /> : "1"}
            </Box>
            <Box
              w="60px"
              h="2px"
              bg={currentStep >= 2 ? "blue.500" : "gray.200"}
            />
            <Box
              w="40px"
              h="40px"
              borderRadius="full"
              bg={currentStep >= 2 ? "blue.500" : "gray.200"}
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="600"
              fontSize="sm"
            >
              2
            </Box>
          </Flex>

          {/* Step 1: Course Program Level */}
          {currentStep === 1 && (
            <form onSubmit={handleSubmitStep1(onSubmitStep1)}>
              <Grid gap={6}>
                <GridItem>
                  <Text
                    mb={4}
                    fontSize="xs"
                    fontWeight="600"
                    color="fg.emphasized"
                  >
                    LIEN COURS - PROGRAMME
                  </Text>
                  <Grid templateColumns={{ base: "1fr", md: "1fr" }} gap={4}>
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Cours{" "}
                        <Text as="span" color="red.500">
                          *
                        </Text>
                      </Text>
                      <select
                        {...registerStep1("course_id", {
                          required: "Le cours est requis",
                        })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: "1px solid",
                          borderColor: errorsStep1.course_id
                            ? "var(--chakra-colors-red-500)"
                            : "var(--chakra-colors-border-default)",
                          borderRadius: "6px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        <option value="">Sélectionner un cours</option>
                        {courses?.data.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name} {course.code && `(${course.code})`}
                          </option>
                        ))}
                      </select>
                      {errorsStep1.course_id && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep1.course_id.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Niveau de programme{" "}
                        <Text as="span" color="red.500">
                          *
                        </Text>
                      </Text>
                      <select
                        {...registerStep1("program_level_id", {
                          required: "Le niveau de programme est requis",
                        })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: "1px solid",
                          borderColor: errorsStep1.program_level_id
                            ? "var(--chakra-colors-red-500)"
                            : "var(--chakra-colors-border-default)",
                          borderRadius: "6px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        <option value="">Sélectionner un niveau</option>
                        {programLevels?.data.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                      {errorsStep1.program_level_id && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep1.program_level_id.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Niveau d'année (1-7){" "}
                        <Text as="span" color="red.500">
                          *
                        </Text>
                      </Text>
                      <Input
                        type="number"
                        {...registerStep1("year_level", {
                          required: "Le niveau d'année est requis",
                          min: { value: 1, message: "Minimum 1" },
                          max: { value: 7, message: "Maximum 7" },
                          valueAsNumber: true,
                        })}
                        fontSize="xs"
                        fontWeight="500"
                        placeholder="Ex: 1"
                      />
                      {errorsStep1.year_level && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep1.year_level.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Checkbox
                        checked={watchStep1("is_active")}
                        onCheckedChange={(checked) =>
                          setValueStep1("is_active", !!checked.checked)
                        }
                      >
                        <Text fontSize="xs" fontWeight="500">
                          Actif
                        </Text>
                      </Checkbox>
                    </GridItem>
                  </Grid>
                </GridItem>
              </Grid>

              <Flex mt={6} justify="flex-end">
                <Button
                  type="submit"
                  variant="solid"
                  colorScheme="blue"
                  size="sm"
                >
                  Suivant
                  <FiChevronRight />
                </Button>
              </Flex>
            </form>
          )}

          {/* Step 2: Course Session */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmitStep2(onSubmitStep2)}>
              <Grid gap={6}>
                <GridItem>
                  <Text
                    mb={4}
                    fontSize="xs"
                    fontWeight="600"
                    color="fg.emphasized"
                  >
                    DÉTAILS DE LA SESSION
                  </Text>
                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                  >
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Session académique{" "}
                        <Text as="span" color="red.500">
                          *
                        </Text>
                      </Text>
                      <select
                        {...registerStep2("session_id", {
                          required: "La session est requise",
                        })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: "1px solid",
                          borderColor: errorsStep2.session_id
                            ? "var(--chakra-colors-red-500)"
                            : "var(--chakra-colors-border-default)",
                          borderRadius: "6px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        <option value="">Sélectionner une session</option>
                        {activeSessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.name}
                          </option>
                        ))}
                      </select>
                      {errorsStep2.session_id && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep2.session_id.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Enseignant{" "}
                        <Text as="span" color="red.500">
                          *
                        </Text>
                      </Text>
                      <select
                        {...registerStep2("teacher_id", {
                          required: "L'enseignant est requis",
                        })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: "1px solid",
                          borderColor: errorsStep2.teacher_id
                            ? "var(--chakra-colors-red-500)"
                            : "var(--chakra-colors-border-default)",
                          borderRadius: "6px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        <option value="">Sélectionner un enseignant</option>
                        {teachers?.data.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.user?.first_name} {teacher.user?.last_name}{" "}
                            ({(teacher as any).employee_number})
                          </option>
                        ))}
                      </select>
                      {errorsStep2.teacher_id && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep2.teacher_id.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Salle de classe
                      </Text>
                      <Input
                        {...registerStep2("classroom")}
                        fontSize="xs"
                        fontWeight="500"
                        placeholder="Ex: A-101"
                      />
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Capacité maximale
                      </Text>
                      <Input
                        type="number"
                        {...registerStep2("max_students", {
                          min: { value: 1, message: "Minimum 1" },
                          valueAsNumber: true,
                        })}
                        fontSize="xs"
                        fontWeight="500"
                        placeholder="Ex: 30"
                      />
                      {errorsStep2.max_students && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep2.max_students.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        Niveau d'année (1-15){" "}
                        <Text as="span" color="red.500">
                          *
                        </Text>
                      </Text>
                      <Input
                        type="number"
                        {...registerStep2("year_level", {
                          required: "Le niveau d'année est requis",
                          min: { value: 1, message: "Minimum 1" },
                          max: { value: 15, message: "Maximum 15" },
                          valueAsNumber: true,
                        })}
                        fontSize="xs"
                        fontWeight="500"
                        placeholder="Ex: 1"
                      />
                      {errorsStep2.year_level && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep2.year_level.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        % Intra
                      </Text>
                      <Input
                        type="number"
                        {...registerStep2("intra_percentage", {
                          min: { value: 0, message: "Minimum 0" },
                          max: { value: 100, message: "Maximum 100" },
                          valueAsNumber: true,
                        })}
                        fontSize="xs"
                        fontWeight="500"
                        placeholder="Ex: 30"
                        step={0.01}
                      />
                      {errorsStep2.intra_percentage && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep2.intra_percentage.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        % Final
                      </Text>
                      <Input
                        type="number"
                        {...registerStep2("final_percentage", {
                          min: { value: 0, message: "Minimum 0" },
                          max: { value: 100, message: "Maximum 100" },
                          valueAsNumber: true,
                        })}
                        fontSize="xs"
                        fontWeight="500"
                        placeholder="Ex: 40"
                        step={0.01}
                      />
                      {errorsStep2.final_percentage && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep2.final_percentage.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                        mb={2}
                      >
                        % Participation
                      </Text>
                      <Input
                        type="number"
                        {...registerStep2("participation_percentage", {
                          min: { value: 0, message: "Minimum 0" },
                          max: { value: 100, message: "Maximum 100" },
                          valueAsNumber: true,
                        })}
                        fontSize="xs"
                        fontWeight="500"
                        placeholder="Ex: 30"
                        step={0.01}
                      />
                      {errorsStep2.participation_percentage && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                          {errorsStep2.participation_percentage.message}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <Checkbox
                        checked={watchStep2("is_active")}
                        onCheckedChange={(checked) =>
                          setValueStep2("is_active", !!checked.checked)
                        }
                      >
                        <Text fontSize="xs" fontWeight="500">
                          Actif
                        </Text>
                      </Checkbox>
                    </GridItem>
                  </Grid>
                </GridItem>
              </Grid>

              <Flex mt={6} justify="space-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  <FiChevronLeft />
                  Retour
                </Button>
                <Button
                  type="submit"
                  variant="solid"
                  colorScheme="green"
                  size="sm"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Finish & Create
                  <FiCheck />
                </Button>
              </Flex>
            </form>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isSubmitting}>
              Annuler
            </Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default AddCourseSessionWithProgram
