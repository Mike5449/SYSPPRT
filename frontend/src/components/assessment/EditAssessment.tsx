import {
  Box,
  Button,
  ButtonGroup,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Grid,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FaExchangeAlt } from "react-icons/fa"

import {
  AcademicYearsService,
  type AssessmentPublic,
  AssessmentsService,
  CourseSessionsService,
  TeachersService,
} from "@/client"

// Seul le type "exam" est limité à 2 par session
const EXAM_TYPES = new Set(["exam"])
import type { ApiError } from "@/client/core/ApiError"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useUserRoles } from "@/hooks/useUserRoles"
import { handleError } from "@/utils"
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

interface EditAssessmentProps {
  assessment: AssessmentPublic
}

interface AssessmentUpdateForm {
  name: string
  description: string
  assessment_type: string
  max_score: number
  weight: number
  due_date: string
  assessment_date: string
  duration_minutes: number
  is_mandatory: boolean
  passing_score: number
  instructions: string
  is_published: boolean
  course_session_id: string
}

const EditAssessment = ({ assessment }: EditAssessmentProps) => {
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssessmentUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: assessment.name,
      description: assessment.description ?? "",
      assessment_type: assessment.assessment_type,
      max_score: assessment.max_score,
      weight: assessment.weight,
      due_date: assessment.due_date ?? "",
      assessment_date: assessment.assessment_date ?? "",
      duration_minutes: assessment.duration_minutes ?? undefined,
      is_mandatory: assessment.is_mandatory,
      passing_score: assessment.passing_score ?? undefined,
      instructions: assessment.instructions ?? "",
      is_published: assessment.is_published,
      course_session_id: assessment.course_session_id,
    },
  })

  // Load teacher data if user is a teacher
  const { data: teacherData } = useQuery({
    queryKey: ["teacher", user?.id],
    queryFn: () => TeachersService.readTeacherByUser({ userId: user!.id }),
    enabled: !!user?.id && isTeacher,
    retry: false,
  })

  // Load current academic year directly from the dedicated endpoint
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

  // Load all course sessions
  const { data: allCourseSessionsData, isLoading: isCourseSessionsLoading } =
    useQuery({
      queryKey: ["course_sessions_all"],
      queryFn: () =>
        CourseSessionsService.readCourseSessions({ skip: 0, limit: 1000 }),
    })

  // Fetch existing assessments for this course session to count exam types
  const { data: sessionAssessmentsData } = useQuery({
    queryKey: ["assessments_by_session", assessment.course_session_id],
    queryFn: () =>
      AssessmentsService.readAssessmentsByCourseSession({
        courseSessionId: assessment.course_session_id,
      }),
  })

  // Count exam-type assessments excluding the current one
  const examOtherCount = (sessionAssessmentsData?.data || []).filter(
    (a: any) =>
      a.id !== assessment.id &&
      EXAM_TYPES.has((a.assessment_type || "").toLowerCase().trim()),
  ).length
  const examLimitReached = examOtherCount >= 2
  const currentIsExamType = EXAM_TYPES.has(
    (assessment.assessment_type || "").toLowerCase().trim(),
  )

  // Filter course sessions by teacher (if teacher) AND current academic year
  const filteredSessions =
    allCourseSessionsData?.data?.filter((cs: any) => {
      // Filter by academic year using session.academic_year_id
      const matchesYear = currentAcademicYear
        ? cs.session?.academic_year_id === currentAcademicYear.id
        : true

      // Filter by teacher if teacher role
      const matchesTeacher =
        isTeacher && teacherData ? cs.teacher_id === teacherData.id : true

      return matchesYear && matchesTeacher
    }) || []

  const mutation = useMutation({
    mutationFn: (data: AssessmentUpdateForm) =>
      AssessmentsService.updateAssessment({
        assessmentId: assessment.id,
        requestBody: data as any,
      }),
    onSuccess: () => {
      showSuccessToast("Assessment updated successfully.")
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] })
    },
  })

  const onSubmit: SubmitHandler<AssessmentUpdateForm> = async (data) => {
    // Format data properly based on schema requirements
    const formattedData = {
      ...data,
      description: data.description || null,
      due_date: data.due_date || null,
      assessment_date: data.assessment_date || null,
      duration_minutes: data.duration_minutes || null,
      passing_score: data.passing_score || null,
      instructions: data.instructions || null,
    }
    mutation.mutate(formattedData as any)
  }

  return (
    <DialogRoot
      size="lg"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <FaExchangeAlt fontSize="16px" />
          {t("common.forms.edit_assessment", {
            defaultValue: "Edit Assessment",
          })}
        </Button>
      </DialogTrigger>
      <DialogContent borderRadius="sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {t("common.forms.edit_assessment", {
                defaultValue: "Edit Assessment",
              })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4} fontSize="sm" color="gray.600">
              {t("common.forms.edit_assessment_description", {
                defaultValue: "Update the assessment details below.",
              })}
            </Text>
            <VStack gap={4} align="stretch">
              <Field
                required
                invalid={!!errors.name}
                errorText={errors.name?.message}
                label={t("common.forms.assessment_name")}
              >
                <Input
                  {...register("name", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="Assessment Name"
                  fontSize="sm"
                />
              </Field>
              <Field
                required
                invalid={!!errors.description}
                errorText={errors.description?.message}
                label={t("common.forms.description")}
              >
                <Input
                  {...register("description", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="Description"
                  fontSize="sm"
                />
              </Field>

              <Grid templateColumns="1fr 1fr" gap={4}>
                <Field
                  required
                  invalid={!!errors.assessment_type}
                  errorText={errors.assessment_type?.message}
                  label={t("common.forms.assessment_type")}
                >
                  {examLimitReached && !currentIsExamType && (
                    <Box
                      mb={2}
                      px={3}
                      py={2}
                      bg="#FFF5F5"
                      border="1px solid #FC8181"
                      borderRadius="6px"
                    >
                      <Text fontSize="xs" color="#C53030">
                        ⚠ Limite : 2 évaluations de type examen déjà atteintes pour cette session. Exam et Test sont désactivés.
                      </Text>
                    </Box>
                  )}
                  <select
                    {...register("assessment_type", {
                      required: t("common.forms.required"),
                    })}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #E2E8F0",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Sélectionner un type...</option>
                    <option value="exam" disabled={examLimitReached && !currentIsExamType}>Examen{examLimitReached && !currentIsExamType ? " (limite atteinte)" : ""}</option>
                    <option value="quiz">Quiz</option>
                    <option value="devoir">Devoir</option>
                    <option value="project">Projet</option>
                    <option value="presentation">Présentation</option>
                    <option value="lab">Labo</option>
                    <option value="homework">Homework</option>
                    <option value="test">Test</option>
                  </select>
                </Field>

                <Field
                  required
                  invalid={!!errors.course_session_id}
                  errorText={errors.course_session_id?.message}
                  label={t("common.course_sessions")}
                >
                  {isCourseSessionsLoading ? (
                    <Spinner size="xs" />
                  ) : (
                    <select
                      {...register("course_session_id", {
                        required: t("common.forms.required"),
                      })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #E2E8F0",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">Select session...</option>
                      {filteredSessions.map((session: any) => (
                        <option key={session.id} value={session.id}>
                          {`${session.course_program_level.course.name} | ${session.session.name}`}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </Grid>

              <Grid templateColumns="1fr 1fr" gap={4}>
                <Field
                  required
                  invalid={!!errors.max_score}
                  errorText={errors.max_score?.message}
                  label={t("common.forms.max_score")}
                >
                  <Input
                    {...register("max_score", {
                      required: t("common.forms.required"),
                      valueAsNumber: true,
                    })}
                    placeholder="100"
                    type="number"
                    fontSize="sm"
                  />
                </Field>
                <Field
                  required
                  invalid={!!errors.weight}
                  errorText={errors.weight?.message}
                  label={t("common.forms.weight")}
                >
                  <Input
                    {...register("weight", {
                      required: t("common.forms.required"),
                      valueAsNumber: true,
                    })}
                    placeholder="0.1"
                    type="number"
                    step="0.01"
                    fontSize="sm"
                  />
                </Field>
              </Grid>

              <Grid templateColumns="1fr 1fr" gap={4}>
                <Field
                  required
                  invalid={!!errors.due_date}
                  errorText={errors.due_date?.message}
                  label={t("common.forms.due_date")}
                >
                  <Input
                    {...register("due_date", {
                      required: t("common.forms.required"),
                    })}
                    type="date"
                    fontSize="sm"
                  />
                </Field>
                <Field
                  required
                  invalid={!!errors.assessment_date}
                  errorText={errors.assessment_date?.message}
                  label={t("common.forms.assessment_date")}
                >
                  <Input
                    {...register("assessment_date", {
                      required: t("common.forms.required"),
                    })}
                    type="date"
                    fontSize="sm"
                  />
                </Field>
              </Grid>

              <Grid templateColumns="1fr 1fr" gap={4}>
                <Field
                  required
                  invalid={!!errors.duration_minutes}
                  errorText={errors.duration_minutes?.message}
                  label={t("common.forms.duration")}
                >
                  <Input
                    {...register("duration_minutes", {
                      required: t("common.forms.required"),
                      valueAsNumber: true,
                    })}
                    placeholder="60"
                    type="number"
                    fontSize="sm"
                  />
                </Field>
                <Field
                  required
                  invalid={!!errors.passing_score}
                  errorText={errors.passing_score?.message}
                  label={t("common.forms.passing_score")}
                >
                  <Input
                    {...register("passing_score", {
                      required: t("common.forms.required"),
                      valueAsNumber: true,
                    })}
                    placeholder="50"
                    type="number"
                    fontSize="sm"
                  />
                </Field>
              </Grid>

              <Flex gap={4}>
                <Field
                  invalid={!!errors.is_mandatory}
                  label={t("common.forms.mandatory")}
                >
                  <Input
                    {...register("is_mandatory")}
                    type="checkbox"
                    width="auto"
                  />
                </Field>
                <Field
                  invalid={!!errors.is_published}
                  label={t("common.forms.published")}
                >
                  <Input
                    {...register("is_published")}
                    type="checkbox"
                    width="auto"
                  />
                </Field>
              </Flex>

              <Field
                invalid={!!errors.instructions}
                errorText={errors.instructions?.message}
                label={t("common.forms.instructions")}
              >
                <Input
                  {...register("instructions")}
                  placeholder="Instructions"
                  fontSize="sm"
                />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter gap={2}>
            <ButtonGroup>
              <DialogActionTrigger asChild>
                <Button
                  variant="subtle"
                  colorPalette="gray"
                  disabled={isSubmitting}
                >
                  {t("common.forms.cancel")}
                </Button>
              </DialogActionTrigger>
              <Button
                variant="solid"
                colorPalette="blue"
                type="submit"
                loading={isSubmitting}
              >
                {t("common.forms.save")}
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditAssessment
