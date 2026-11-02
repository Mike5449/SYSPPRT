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

import {
  type AttendanceSessionPublic,
  AttendanceSessionsService,
} from "@/client"
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

interface EditAttendanceSessionProps {
  attendanceSession: AttendanceSessionPublic
}

interface AttendanceSessionUpdateForm {
  session_date: string
  start_time: string
  end_time: string
  actual_room: string
  actual_building: string
  topic: string
  description: string
  is_cancelled: boolean
  attendance_taken: boolean
  schedule_id: string
}

const EditAttendanceSession = ({
  attendanceSession,
}: EditAttendanceSessionProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceSessionUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      session_date: attendanceSession.session_date,
      start_time: attendanceSession.start_time,
      end_time: attendanceSession.end_time,
      actual_room: attendanceSession.actual_room ?? undefined,
      actual_building: attendanceSession.actual_building ?? undefined,
      topic: attendanceSession.topic ?? undefined,
      description: attendanceSession.description ?? undefined,
      is_cancelled: attendanceSession.is_cancelled,
      attendance_taken: attendanceSession.attendance_taken,
      schedule_id: attendanceSession.schedule_id,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: AttendanceSessionUpdateForm) =>
      AttendanceSessionsService.updateAttendanceSession({
        attendanceSessionId: attendanceSession.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_update", {
          item: t("attendance.session.title"),
        }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_sessions"] })
    },
  })

  const onSubmit: SubmitHandler<AttendanceSessionUpdateForm> = async (data) => {
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
          {t("attendance.session.buttons.edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t("attendance.session.edit_title")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>{t("attendance.session.edit_description")}</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.session_date}
                errorText={errors.session_date?.message}
                label={t("attendance.session.fields.date")}
              >
                <Input
                  {...register("session_date", {
                    required: t("attendance.session.errors.date_required"),
                  })}
                  placeholder={t("attendance.session.placeholders.date_hint")}
                  type="date"
                />
              </Field>
              <Field
                required
                invalid={!!errors.start_time}
                errorText={errors.start_time?.message}
                label={t("attendance.session.fields.start_time")}
              >
                <Input
                  {...register("start_time", {
                    required: t(
                      "attendance.session.errors.start_time_required",
                    ),
                  })}
                  placeholder={t("attendance.session.placeholders.time_hint")}
                  type="time"
                />
              </Field>
              <Field
                required
                invalid={!!errors.end_time}
                errorText={errors.end_time?.message}
                label={t("attendance.session.fields.end_time")}
              >
                <Input
                  {...register("end_time", {
                    required: t("attendance.session.errors.end_time_required"),
                  })}
                  placeholder={t("attendance.session.placeholders.time_hint")}
                  type="time"
                />
              </Field>
              <Field
                invalid={!!errors.actual_room}
                errorText={errors.actual_room?.message}
                label={t("attendance.session.fields.room")}
              >
                <Input
                  {...register("actual_room")}
                  placeholder={t("attendance.session.placeholders.room")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.actual_building}
                errorText={errors.actual_building?.message}
                label={t("attendance.session.fields.building")}
              >
                <Input
                  {...register("actual_building")}
                  placeholder={t("attendance.session.placeholders.building")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.topic}
                errorText={errors.topic?.message}
                label={t("attendance.session.fields.topic")}
              >
                <Input
                  {...register("topic")}
                  placeholder={t("attendance.session.placeholders.topic")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.description}
                errorText={errors.description?.message}
                label={t("attendance.session.fields.description")}
              >
                <Input
                  {...register("description")}
                  placeholder={t("attendance.session.placeholders.description")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.is_cancelled}
                errorText={errors.is_cancelled?.message}
                label={t("attendance.session.fields.status")}
              >
                <Input {...register("is_cancelled")} type="checkbox" />
              </Field>
              <Field
                invalid={!!errors.attendance_taken}
                errorText={errors.attendance_taken?.message}
                label={t("attendance.session.fields.attendance_status")}
              >
                <Input {...register("attendance_taken")} type="checkbox" />
              </Field>
              <Field
                required
                invalid={!!errors.schedule_id}
                errorText={errors.schedule_id?.message}
                label={t("attendance.session.fields.schedule")}
              >
                <Input
                  {...register("schedule_id", {
                    required: t(
                      "attendance.session.errors.schedule_id_required",
                    ),
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

export default EditAttendanceSession
