import {
  Button,
  ButtonGroup,
  DialogActionTrigger,
  DialogTitle,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FaExchangeAlt } from "react-icons/fa"

import { type AttendanceRecordPublic, AttendanceRecordsService } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
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

interface EditAttendanceRecordProps {
  attendanceRecord: AttendanceRecordPublic
}

interface AttendanceRecordUpdateForm {
  status: AttendanceStatus
  arrival_time: string
  notes: string
  is_excused: boolean
  attendance_session_id: string
  student_id: string
}
export type AttendanceStatus = "present" | "absent" | "late" | "excused"
const EditAttendanceRecord = ({
  attendanceRecord,
}: EditAttendanceRecordProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceRecordUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      status: attendanceRecord.status,
      arrival_time: attendanceRecord.arrival_time ?? "",
      notes: attendanceRecord.notes ?? undefined,
      is_excused: attendanceRecord.is_excused,
      attendance_session_id: attendanceRecord.attendance_session_id,
      student_id: attendanceRecord.student_id,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: AttendanceRecordUpdateForm) =>
      AttendanceRecordsService.updateAttendanceRecord({
        attendanceRecordId: attendanceRecord.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_update", {
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

  const onSubmit: SubmitHandler<AttendanceRecordUpdateForm> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <FaExchangeAlt fontSize="16px" />
          {t("attendance.record.buttons.edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t("attendance.record.edit_title")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>{t("attendance.record.edit_description")}</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.status}
                errorText={errors.status?.message}
                label={t("attendance.record.fields.status")}
              >
                <Input
                  {...register("status", {
                    required: t("attendance.record.errors.status_required"),
                  })}
                  placeholder={t("attendance.record.placeholders.status_hint")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.arrival_time}
                errorText={errors.arrival_time?.message}
                label={t("attendance.record.fields.arrival_time")}
              >
                <Input
                  {...register("arrival_time", {
                    required: t(
                      "attendance.record.errors.arrival_time_required",
                    ),
                  })}
                  placeholder={t("attendance.record.placeholders.time_hint")}
                  type="time"
                />
              </Field>
              <Field
                invalid={!!errors.notes}
                errorText={errors.notes?.message}
                label={t("attendance.record.fields.notes")}
              >
                <Input
                  {...register("notes")}
                  placeholder={t("attendance.record.placeholders.enter_notes")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.is_excused}
                errorText={errors.is_excused?.message}
                label={t("attendance.record.fields.excused")}
              >
                <Input {...register("is_excused")} type="checkbox" />
              </Field>
              <Field
                required
                invalid={!!errors.attendance_session_id}
                errorText={errors.attendance_session_id?.message}
                label={t("attendance.record.fields.session")}
              >
                <Input
                  {...register("attendance_session_id", {
                    required: t("attendance.record.errors.session_required"),
                  })}
                  placeholder={t("common.forms.placeholder_id")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.student_id}
                errorText={errors.student_id?.message}
                label={t("attendance.record.fields.student")}
              >
                <Input
                  {...register("student_id", {
                    required: t("attendance.record.errors.student_id_required"),
                  })}
                  placeholder={t("common.forms.placeholder_id")}
                  type="text"
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
              <Button variant="solid" type="submit" loading={isSubmitting}>
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

export default EditAttendanceRecord
