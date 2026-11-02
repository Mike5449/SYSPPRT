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

import { type CourseSessionPublic, CourseSessionsService } from "@/client"
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

interface EditCourseSessionProps {
  courseSession: CourseSessionPublic
}

interface CourseSessionUpdateForm {
  teacher_id: string
  classroom: string
  max_students: number
  is_active: boolean
}

const EditCourseSession = ({ courseSession }: EditCourseSessionProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CourseSessionUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      teacher_id: courseSession.teacher_id,
      classroom: courseSession.classroom ?? "",
      max_students: courseSession.max_students ?? 0,
      is_active: courseSession.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: CourseSessionUpdateForm) =>
      CourseSessionsService.updateCourseSession({
        courseSessionId: courseSession.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(t("course.session.alerts.success_update"))
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

  const onSubmit: SubmitHandler<CourseSessionUpdateForm> = (data) => {
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
          {t("course.session.buttons.edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t("course.session.edit_title")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>{t("course.session.edit_description")}</Text>
            <VStack gap={4}>
              <Field
                invalid={!!errors.teacher_id}
                errorText={errors.teacher_id?.message}
                label={t("course.session.fields.teacher_id")}
              >
                <Input
                  {...register("teacher_id", {
                    required: t("course.session.errors.teacher_id_required"),
                  })}
                  placeholder={t("common.tables.id")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.classroom}
                errorText={errors.classroom?.message}
                label={t("course.session.fields.classroom")}
              >
                <Input
                  {...register("classroom")}
                  placeholder={t("course.session.placeholders.classroom")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.max_students}
                errorText={errors.max_students?.message}
                label={t("course.session.fields.max_students")}
              >
                <Input
                  {...register("max_students", { valueAsNumber: true })}
                  placeholder="Ex: 30"
                  type="number"
                />
              </Field>
              <Field
                invalid={!!errors.is_active}
                errorText={errors.is_active?.message}
                label={t("course.session.fields.is_active")}
              >
                <Checkbox
                  checked={watch("is_active")}
                  onCheckedChange={(checked) =>
                    setValue("is_active", !!checked.checked)
                  }
                >
                  {t("common.forms.active")}
                </Checkbox>
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

export default EditCourseSession
