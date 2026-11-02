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

import { type SchedulePublic, SchedulesService } from "@/client"
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

interface EditScheduleProps {
  schedule: SchedulePublic
}

interface ScheduleUpdateForm {
  course_session_id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string
  building: string
  is_active: boolean
}

const EditSchedule = ({ schedule }: EditScheduleProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      course_session_id: schedule.course_session_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      room: schedule.room ?? "",
      building: schedule.building ?? "",
      is_active: schedule.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ScheduleUpdateForm) =>
      SchedulesService.updateSchedule({
        scheduleId: schedule.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(t("schedule.alerts.success_update"))
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] })
    },
  })

  const onSubmit: SubmitHandler<ScheduleUpdateForm> = async (data) => {
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
          {t("schedule.edit_title")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t("schedule.edit_title")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>{t("schedule.edit_description")}</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.course_session_id}
                errorText={errors.course_session_id?.message}
                label={t("schedule.fields.course_session")}
              >
                <Input
                  {...register("course_session_id", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="UUID"
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.day_of_week}
                errorText={errors.day_of_week?.message}
                label={t("schedule.fields.day_of_week")}
              >
                <Input
                  {...register("day_of_week", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("schedule.days.monday")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.start_time}
                errorText={errors.start_time?.message}
                label={t("schedule.fields.start_time")}
              >
                <Input
                  {...register("start_time", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="08:00"
                  type="time"
                />
              </Field>
              <Field
                required
                invalid={!!errors.end_time}
                errorText={errors.end_time?.message}
                label={t("schedule.fields.end_time")}
              >
                <Input
                  {...register("end_time", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="10:00"
                  type="time"
                />
              </Field>
              <Field
                required
                invalid={!!errors.room}
                errorText={errors.room?.message}
                label={t("schedule.fields.room")}
              >
                <Input
                  {...register("room", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("schedule.placeholders.room")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.building}
                errorText={errors.building?.message}
                label={t("schedule.fields.building")}
              >
                <Input
                  {...register("building", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("schedule.placeholders.building")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.is_active}
                errorText={errors.is_active?.message}
                label={t("schedule.fields.is_active")}
              >
                <Input {...register("is_active")} type="checkbox" />
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

export default EditSchedule
