import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  HStack,
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
  FiActivity,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiHash,
  FiPercent,
  FiPlus,
  FiUser,
} from "react-icons/fi"

import {
  CourseProgramLevelsService,
  type CourseSessionCreate,
  CourseSessionsService,
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

const AddCourseSession = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CourseSessionCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      course_program_level_id: "",
      session_id: "",
      teacher_id: "",
      year_level: 1,
      intra_percentage: undefined,
      final_percentage: undefined,
      participation_percentage: undefined,
      is_active: true,
    },
  })

  // Load sessions
  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions", { all: true }],
    queryFn: () =>
      SessionsService.readSessionsWithAcademicYear({ skip: 0, limit: 100 }),
  })

  // Load teachers
  const { data: teachersData, isLoading: isTeachersLoading } = useQuery({
    queryKey: ["teachers", { all: true }],
    queryFn: () => TeachersService.readTeachers({ skip: 0, limit: 100 }),
  })

  // Load course program levels
  const {
    data: courseProgramLevelsData,
    isLoading: isCourseProgramLevelsLoading,
  } = useQuery({
    queryKey: ["course_program_levels", { all: true }],
    queryFn: () =>
      CourseProgramLevelsService.readCourseProgramLevels({
        skip: 0,
        limit: 500,
      }),
  })

  const selectedCPLId = watch("course_program_level_id")
  const selectedCPL = courseProgramLevelsData?.data.find(
    (cpl) => cpl.id === selectedCPLId,
  )
  const maxYearLevel = selectedCPL?.program_level?.typical_duration || 1
  const yearLevels = Array.from({ length: maxYearLevel }, (_, i) => i + 1)

  // Ensure year_level is valid when course program level changes
  const currentYearLevel = watch("year_level")
  useEffect(() => {
    if (currentYearLevel && Number(currentYearLevel) > maxYearLevel) {
      setValue("year_level", 1)
    }
  }, [maxYearLevel, currentYearLevel, setValue])

  const mutation = useMutation({
    mutationFn: (data: CourseSessionCreate) => {
      // Ensure proper data types and default values for removed fields
      const submitData = {
        ...data,
        max_students: undefined,
        classroom: null,
        year_level: data.year_level ? Number(data.year_level) : 1,
        intra_percentage: data.intra_percentage
          ? Number(data.intra_percentage)
          : undefined,
        final_percentage: data.final_percentage
          ? Number(data.final_percentage)
          : undefined,
        participation_percentage: data.participation_percentage
          ? Number(data.participation_percentage)
          : undefined,
      }
      return CourseSessionsService.createCourseSession({
        requestBody: submitData,
      })
    },
    onSuccess: () => {
      showSuccessToast(t("course.session.alerts.success_create"))
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["course_sessions"] })
    },
  })

  const onSubmit: SubmitHandler<CourseSessionCreate> = (data) => {
    mutation.mutate(data)
  }

  const handleCancel = () => {
    reset()
    setIsOpen(false)
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
            <DialogTitle fontSize="xl" fontWeight="700" color="gray.800">
              {t("course.session.add_title")}
            </DialogTitle>
            <Text fontSize="sm" color="gray.500" mt={1}>
              {t("course.session.add_description")}
            </Text>
          </DialogHeader>

          <DialogBody py={6} bg="gray.50">
            <VStack gap={6} align="stretch">
              {/* Section 1: Academic Details */}
              <Box
                bg="white"
                p={6}
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color="blue.600"
                  mb={4}
                  display="flex"
                  textAlign="center"
                  gap={2}
                >
                  <Icon as={FiBookOpen} /> {t("common.forms.academic_details")}
                </Text>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Field
                      required
                      invalid={!!errors.course_program_level_id}
                      errorText={errors.course_program_level_id?.message}
                      label={t("course.session.fields.course_program_level_id")}
                    >
                      <InputGroup
                        width="full"
                        startElement={<Icon as={FiBookOpen} color="gray.400" />}
                      >
                        {isCourseProgramLevelsLoading ? (
                          <Spinner size="xs" color="blue.500" />
                        ) : (
                          <select
                            {...register("course_program_level_id", {
                              required: t(
                                "course.session.errors.course_program_level_id_required",
                              ),
                            })}
                            style={{
                              width: "100%",
                              padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                              border: "1px solid",
                              borderColor: "var(--chakra-colors-gray-200)",
                              borderRadius: "var(--chakra-radii-sm)",
                              fontSize: "0.875rem",
                              backgroundColor: "white",
                              color: "var(--chakra-colors-gray-800)",
                            }}
                          >
                            <option value="">
                              {t(
                                "course.session.placeholders.select_course_program_level",
                              )}
                            </option>
                            {courseProgramLevelsData?.data.map((cpl) => (
                              <option key={cpl.id} value={cpl.id}>
                                {cpl.course?.name || t("common.tables.course")}{" "}
                                -{" "}
                                {cpl.program_level?.name ||
                                  t("common.tables.level")}{" "}
                                (
                                {t("course.session.table.year_short", {
                                  year: cpl.year_level,
                                })}
                                )
                              </option>
                            ))}
                          </select>
                        )}
                      </InputGroup>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.session_id}
                      errorText={errors.session_id?.message}
                      label={t("course.session.fields.session")}
                    >
                      <InputGroup
                        width="full"
                        startElement={<Icon as={FiCalendar} color="gray.400" />}
                      >
                        {isSessionsLoading ? (
                          <Spinner size="xs" color="blue.500" />
                        ) : (
                          <select
                            {...register("session_id", {
                              required: t(
                                "course.session.errors.session_required",
                              ),
                            })}
                            style={{
                              width: "100%",
                              padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                              border: "1px solid",
                              borderColor: "var(--chakra-colors-gray-200)",
                              borderRadius: "var(--chakra-radii-sm)",
                              fontSize: "0.875rem",
                              backgroundColor: "white",
                              color: "var(--chakra-colors-gray-800)",
                            }}
                          >
                            <option value="">
                              {t("course.session.placeholders.select_session")}
                            </option>
                            {sessionsData?.data.map((session) => (
                              <option key={session.id} value={session.id}>
                                {session.name} ({session.code})
                              </option>
                            ))}
                          </select>
                        )}
                      </InputGroup>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.year_level}
                      label={t("course.session.fields.year_level")}
                    >
                      <InputGroup
                        width="full"
                        startElement={<Icon as={FiHash} color="gray.400" />}
                      >
                        <select
                          {...register("year_level", {
                            required: true,
                            valueAsNumber: true,
                          })}
                          style={{
                            width: "100%",
                            padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                            border: "1px solid",
                            borderColor: "var(--chakra-colors-gray-200)",
                            borderRadius: "var(--chakra-radii-sm)",
                            fontSize: "0.875rem",
                            backgroundColor: "white",
                            color: "var(--chakra-colors-gray-800)",
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
                      </InputGroup>
                    </Field>
                  </GridItem>
                </Grid>
              </Box>

              {/* Section 2: Instructor & Evaluation */}
              <Box
                bg="white"
                p={6}
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color="blue.600"
                  mb={4}
                  display="flex"
                  textAlign="center"
                  gap={2}
                >
                  <Icon as={FiUser} /> {t("common.forms.instructor_evaluation")}
                </Text>

                <VStack gap={6} align="stretch">
                  <Field
                    required
                    invalid={!!errors.teacher_id}
                    errorText={errors.teacher_id?.message}
                    label={t("course.session.fields.teacher")}
                  >
                    <InputGroup
                      width="full"
                      startElement={<Icon as={FiUser} color="gray.400" />}
                    >
                      {isTeachersLoading ? (
                        <Spinner size="xs" color="blue.500" />
                      ) : (
                        <select
                          {...register("teacher_id", {
                            required: t(
                              "course.session.errors.teacher_required",
                            ),
                          })}
                          style={{
                            width: "100%",
                            padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                            border: "1px solid",
                            borderColor: "var(--chakra-colors-gray-200)",
                            borderRadius: "var(--chakra-radii-sm)",
                            fontSize: "0.875rem",
                            backgroundColor: "white",
                            color: "var(--chakra-colors-gray-800)",
                          }}
                        >
                          <option value="">
                            {t("course.session.placeholders.select_teacher")}
                          </option>
                          {teachersData?.data.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.user?.user_number ||
                                teacher.id.slice(0, 8)}{" "}
                              -{" "}
                              {teacher.specialization ||
                                t("course.session.table.teacher")}
                            </option>
                          ))}
                        </select>
                      )}
                    </InputGroup>
                  </Field>

                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                    gap={4}
                  >
                    <GridItem>
                      <Field
                        invalid={!!errors.intra_percentage}
                        label={t("course.session.fields.intra_percentage")}
                      >
                        <InputGroup
                          width="full"
                          startElement={
                            <Icon as={FiPercent} color="gray.400" />
                          }
                        >
                          <Input
                            {...register("intra_percentage", {
                              valueAsNumber: true,
                            })}
                            placeholder="30"
                            type="number"
                            fontSize="sm"
                            borderRadius="sm"
                          />
                        </InputGroup>
                      </Field>
                    </GridItem>

                    <GridItem>
                      <Field
                        invalid={!!errors.final_percentage}
                        label={t("course.session.fields.final_percentage")}
                      >
                        <InputGroup
                          width="full"
                          startElement={
                            <Icon as={FiPercent} color="gray.400" />
                          }
                        >
                          <Input
                            {...register("final_percentage", {
                              valueAsNumber: true,
                            })}
                            placeholder="40"
                            type="number"
                            fontSize="sm"
                            borderRadius="sm"
                          />
                        </InputGroup>
                      </Field>
                    </GridItem>

                    <GridItem>
                      <Field
                        invalid={!!errors.participation_percentage}
                        label={t(
                          "course.session.fields.participation_percentage",
                        )}
                      >
                        <InputGroup
                          width="full"
                          startElement={
                            <Icon as={FiPercent} color="gray.400" />
                          }
                        >
                          <Input
                            {...register("participation_percentage", {
                              valueAsNumber: true,
                            })}
                            placeholder="30"
                            type="number"
                            fontSize="sm"
                            borderRadius="sm"
                          />
                        </InputGroup>
                      </Field>
                    </GridItem>
                  </Grid>
                </VStack>
              </Box>

              {/* Section 3: Status Selection */}
              <Box
                bg="white"
                p={4}
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <HStack justify="space-between">
                  <HStack gap={3}>
                    <Icon as={FiActivity} color="green.500" />
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        {t("course.session.fields.is_active")}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {t("course.session.helpers.is_active_checkbox")}
                      </Text>
                    </VStack>
                  </HStack>
                  <Checkbox
                    {...register("is_active")}
                    size="lg"
                    colorPalette="green"
                    borderRadius="sm"
                  />
                </HStack>
              </Box>
            </VStack>
          </DialogBody>

          <DialogFooter
            borderTop="1px solid"
            borderColor="gray.100"
            pt={4}
            bg="gray.50"
          >
            <DialogActionTrigger asChild>
              <Button
                variant="outline"
                colorPalette="gray"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              colorPalette="blue"
              type="submit"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
              shadow="md"
            >
              <FiCheckCircle />
              {t("course.session.buttons.create")}
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddCourseSession
