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
import { useTranslation } from "react-i18next"
import { FiPlus } from "react-icons/fi"

import {
  type AttendanceRecordCreate,
  AttendanceRecordsService,
  AttendanceSessionsService,
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

const AddAttendanceRecord = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<AttendanceRecordCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      status: "absent", // Default from schema
      arrival_time: null,
      notes: null,
      excuse_document: null,
      is_excused: false,
      attendance_session_id: "",
      student_id: "",
    },
  })

  // Load students
  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students", { all: true }],
    queryFn: () => StudentsService.readStudents({ skip: 0, limit: 1000 }),
  })

  // Load attendance sessions
  const {
    data: attendanceSessionsData,
    isLoading: isAttendanceSessionsLoading,
  } = useQuery({
    queryKey: ["attendance_sessions", { all: true }],
    queryFn: () =>
      AttendanceSessionsService.readAttendanceSessions({
        skip: 0,
        limit: 1000,
      }),
  })

  const mutation = useMutation({
    mutationFn: (data: AttendanceRecordCreate) =>
      AttendanceRecordsService.createAttendanceRecord({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", {
          item: t("attendance.record.title"),
        }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] })
    },
  })

  const onSubmit: SubmitHandler<AttendanceRecordCreate> = (data) => {
    // Format data properly based on schema requirements
    const formattedData: AttendanceRecordCreate = {
      ...data,
      arrival_time: data.arrival_time || null,
      notes: data.notes || null,
      excuse_document: data.excuse_document || null,
    }
    mutation.mutate(formattedData)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "xl" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          color="black"
          border="1px solid"
          borderColor="gray.200"
          size="sm"
        >
          <FiPlus fontSize="10px" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
              {t("attendance.record.add_title")}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} color="fg.muted" fontSize="xs" fontWeight="500">
              {t("attendance.record.add_description")}
            </Text>

            <VStack gap={6} align="stretch">
              {/* Primary Selection Section */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.student_id}
                    errorText={errors.student_id?.message}
                    label={t("attendance.record.fields.student")}
                    helperText={t("attendance.record.helpers.student")}
                  >
                    {isStudentsLoading ? (
                      <Spinner size="sm" color="blue.500" />
                    ) : (
                      <select
                        {...register("student_id", {
                          required: t(
                            "attendance.record.errors.student_required",
                          ),
                        })}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "500",
                          width: "100%",
                          backgroundColor: "white",
                        }}
                      >
                        <option value="">
                          {t("attendance.record.placeholders.select_student")}
                        </option>
                        {studentsData?.data.map((student) => (
                          <option key={student.id} value={student.id}>
                            {`${(student as any).student_number} - Year ${
                              student.current_year_level || "N/A"
                            } - ${student.status || "Active"}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.status}
                    errorText={errors.status?.message}
                    label={t("attendance.record.fields.status")}
                    helperText={t("attendance.record.helpers.status")}
                  >
                    <select
                      {...register("status")}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                        width: "100%",
                        backgroundColor: "white",
                      }}
                    >
                      <option value="present">
                        {t("attendance.record.values.present")}
                      </option>
                      <option value="absent">
                        {t("attendance.record.values.absent")}
                      </option>
                      <option value="late">
                        {t("attendance.record.values.late")}
                      </option>
                      <option value="excused">
                        {t("attendance.record.values.excused")}
                      </option>
                    </select>
                  </Field>
                </GridItem>
              </Grid>

              {/* Attendance Session - Full Width */}
              <Field
                required
                invalid={!!errors.attendance_session_id}
                errorText={errors.attendance_session_id?.message}
                label={t("attendance.record.fields.session")}
                helperText={t("attendance.record.helpers.session")}
              >
                {isAttendanceSessionsLoading ? (
                  <Spinner size="sm" color="blue.500" />
                ) : (
                  <select
                    {...register("attendance_session_id", {
                      required: t("attendance.record.errors.session_required"),
                    })}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      width: "100%",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="">
                      {t("attendance.record.placeholders.select_session")}
                    </option>
                    {attendanceSessionsData?.data.map((session) => (
                      <option key={session.id} value={session.id}>
                        {`${session.session_date} - ${session.start_time} to ${session.end_time}${session.topic ? ` - ${session.topic}` : ""}${session.actual_room ? ` (${session.actual_room})` : ""}`}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              {/* Time and Status Section */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    invalid={!!errors.arrival_time}
                    errorText={errors.arrival_time?.message}
                    label={t("attendance.record.fields.arrival_time")}
                    helperText={t("attendance.record.helpers.arrival_time")}
                  >
                    <Input
                      {...register("arrival_time")}
                      type="datetime-local"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.is_excused}
                    errorText={errors.is_excused?.message}
                    label={t("attendance.record.fields.excused")}
                    helperText={t("attendance.record.helpers.excused")}
                  >
                    <Checkbox
                      checked={watch("is_excused")}
                      onCheckedChange={(checked) =>
                        setValue("is_excused", !!checked.checked)
                      }
                      fontSize="xs"
                      fontWeight="500"
                    >
                      {t("attendance.record.fields.mark_excused")}
                    </Checkbox>
                  </Field>
                </GridItem>
              </Grid>

              {/* Documentation Section */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    invalid={!!errors.excuse_document}
                    errorText={errors.excuse_document?.message}
                    label={t("attendance.record.fields.excuse_document")}
                    helperText={t("attendance.record.helpers.excuse_document")}
                  >
                    <Input
                      {...register("excuse_document", {
                        maxLength: {
                          value: 500,
                          message: t(
                            "attendance.record.errors.document_too_long",
                          ),
                        },
                      })}
                      placeholder={t(
                        "attendance.record.placeholders.document_ref",
                      )}
                      type="text"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>

                <GridItem>{/* Spacer for alignment */}</GridItem>
              </Grid>

              {/* Notes Section - Full Width */}
              <Field
                invalid={!!errors.notes}
                errorText={errors.notes?.message}
                label={t("attendance.record.fields.notes")}
                helperText={t("attendance.record.helpers.notes")}
              >
                <Textarea
                  {...register("notes", {
                    maxLength: {
                      value: 500,
                      message: t("attendance.record.errors.notes_too_long"),
                    },
                  })}
                  placeholder={t("attendance.record.placeholders.enter_notes")}
                  rows={3}
                  fontSize="xs"
                  fontWeight="500"
                />
              </Field>
            </VStack>
          </DialogBody>

          <DialogFooter gap={3}>
            <DialogActionTrigger asChild>
              <Button
                variant="outline"
                colorPalette="gray"
                disabled={isSubmitting}
                fontSize="xs"
                fontWeight="600"
              >
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              colorPalette="blue"
              type="submit"
              disabled={!isValid}
              loading={isSubmitting}
              loadingText={t("attendance.record.buttons.creating")}
              fontSize="xs"
              fontWeight="600"
            >
              {t("attendance.record.buttons.create")}
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddAttendanceRecord
