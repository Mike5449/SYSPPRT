import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiPlus } from "react-icons/fi"

import {
  CourseSessionsService,
  type EnrollmentCreate,
  EnrollmentsService,
  StudentsService,
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

const AddEnrollment = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<EnrollmentCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      student_id: "",
      course_session_id: "",
      enrollment_date: new Date().toISOString().split("T")[0], // Today's date
      drop_date: "",
      status: "enrolled",
      is_active: true,
      notes: "",
    },
  })

  const watchedIsActive = watch("is_active")
  const watchedStatus = watch("status")

  // Load students
  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students", { all: true }],
    queryFn: () => StudentsService.readStudents({ skip: 0, limit: 100 }),
  })

  // Load course sessions
  const { data: courseSessionsData, isLoading: isCourseSessionsLoading } =
    useQuery({
      queryKey: ["course-sessions", { all: true }],
      queryFn: () =>
        CourseSessionsService.readCourseSessions({ skip: 0, limit: 100 }),
    })

  const mutation = useMutation({
    mutationFn: (data: EnrollmentCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        enrollment_date:
          data.enrollment_date || new Date().toISOString().split("T")[0],
        drop_date: data.drop_date?.trim() || null,
        notes: data.notes?.trim() || null,
      }
      return EnrollmentsService.createEnrollment({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast("Enrollment created successfully.")
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<EnrollmentCreate> = (data) => {
    mutation.mutate(data)
  }

  // Status options based on common enrollment statuses
  const statusOptions = [
    { value: "enrolled", label: "Enrolled" },
    { value: "pending", label: "Pending" },
    { value: "waitlisted", label: "Waitlisted" },
    { value: "dropped", label: "Dropped" },
    { value: "completed", label: "Completed" },
    { value: "withdrawn", label: "Withdrawn" },
  ]

  return (
    <DialogRoot
      size={{ base: "xs", md: "lg" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button
          value="add-enrollment"
          my={4}
          variant="ghost"
          color="black"
          border="1px solid"
          borderColor="gray.200"
          size="sm"
        >
          <FiPlus fontSize="16px" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
              Add Enrollment
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} fontSize="xs" color="fg.muted" lineHeight="1.6">
              Enroll a student in a course session with the appropriate
              enrollment details.
            </Text>

            <VStack gap={6}>
              {/* Main Information Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.student_id}
                    errorText={errors.student_id?.message}
                    label="Student"
                    helperText="Select the student to enroll"
                  >
                    {isStudentsLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <select
                        {...register("student_id", {
                          required: "Student is required.",
                        })}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          border: "1px solid",
                          borderColor: "var(--chakra-colors-border-emphasized)",
                          borderRadius: "0.375rem",
                          fontSize: "0.875rem",
                          backgroundColor: "var(--chakra-colors-bg-panel)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        <option value="">Select student</option>
                        {studentsData?.data?.map((student) => (
                          <option key={student.id} value={student.id}>
                            {(student as any).user?.user_number &&
                              ` (${(student as any).user?.user_number})`}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    required
                    invalid={!!errors.course_session_id}
                    errorText={errors.course_session_id?.message}
                    label="Course Session"
                    helperText="Select the course session"
                  >
                    {isCourseSessionsLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <select
                        {...register("course_session_id", {
                          required: "Course session is required.",
                        })}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          border: "1px solid",
                          borderColor: "var(--chakra-colors-border-emphasized)",
                          borderRadius: "0.375rem",
                          fontSize: "0.875rem",
                          backgroundColor: "var(--chakra-colors-bg-panel)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        <option value="">Select course session</option>
                        {courseSessionsData?.data?.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.classroom &&
                              ` - Room: ${session.classroom}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </GridItem>
              </Grid>

              {/* Date Information Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    invalid={!!errors.enrollment_date}
                    errorText={errors.enrollment_date?.message}
                    label="Enrollment Date"
                    helperText="Date when the student enrolled"
                  >
                    <Input
                      {...register("enrollment_date")}
                      type="date"
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.drop_date}
                    errorText={errors.drop_date?.message}
                    label="Drop Date"
                    helperText="Date when student dropped (optional)"
                  >
                    <Input
                      {...register("drop_date")}
                      type="date"
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Status and Details Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    invalid={!!errors.status}
                    errorText={errors.status?.message}
                    label="Enrollment Status"
                    helperText="Current status of enrollment"
                  >
                    <select
                      {...register("status", {
                        maxLength: {
                          value: 20,
                          message: "Status cannot exceed 20 characters.",
                        },
                      })}
                      value={watchedStatus}
                      onChange={(e) => setValue("status", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        border: "1px solid",
                        borderColor: "var(--chakra-colors-border-emphasized)",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                        backgroundColor: "var(--chakra-colors-bg-panel)",
                        color: "var(--chakra-colors-fg-default)",
                      }}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </GridItem>

                <GridItem>
                  <Field label="Active Status">
                    <Checkbox
                      checked={watchedIsActive}
                      onCheckedChange={(checked) =>
                        setValue("is_active", !!checked.checked)
                      }
                      size="sm"
                      colorPalette="blue"
                      {...register("is_active")}
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                      >
                        Active Enrollment
                      </Text>
                    </Checkbox>
                    <Text
                      fontSize="xs"
                      color="fg.muted"
                      mt={1}
                      lineHeight="1.4"
                    >
                      Enrollment is currently active and student can participate
                    </Text>
                  </Field>
                </GridItem>
              </Grid>

              {/* Notes Section */}
              <Field
                invalid={!!errors.notes}
                errorText={errors.notes?.message}
                label="Additional Notes"
                helperText="Optional notes about the enrollment"
              >
                <Textarea
                  {...register("notes", {
                    maxLength: {
                      value: 1000,
                      message: "Notes cannot exceed 1000 characters.",
                    },
                  })}
                  placeholder="Enter any additional notes about this enrollment..."
                  rows={3}
                  fontSize="xs"
                />
              </Field>
            </VStack>
          </DialogBody>

          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              type="submit"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
              colorPalette="blue"
            >
              Create Enrollment
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddEnrollment
