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

import { type CoursePublic, CoursesService } from "@/client"
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

interface EditCourseProps {
  course: CoursePublic
}

interface CourseUpdateForm {
  name: string
  code: string
  description: string
  credits: number
  is_active: boolean
  program_id: string
  department_id: string
  level: number
}

const EditCourse = ({ course }: EditCourseProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: course.name,
      code: course.code,
      description: course.description ?? "",
      credits: course.credits,
      is_active: course.is_active,
      //   program_id: course.program_id,
      //   department_id: course.department_id ?? "",
      level: 1,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: CourseUpdateForm) =>
      CoursesService.updateCourse({
        courseId: course.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_update", { item: t("common.courses") }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
    },
  })

  const onSubmit: SubmitHandler<CourseUpdateForm> = async (data) => {
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
          {t("common.forms.edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {t("common.forms.edit_item", { item: t("common.courses") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              {t("common.forms.update_details_below", {
                defaultValue: "Update the course details below.",
              })}
            </Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.name}
                errorText={errors.name?.message}
                label={t("common.forms.name")}
              >
                <Input
                  {...register("name", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("common.forms.placeholder_name", {
                    item: t("common.courses"),
                  })}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.code}
                errorText={errors.code?.message}
                label={t("common.forms.code")}
              >
                <Input
                  {...register("code", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("common.forms.placeholder_code")}
                  type="text"
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
                  placeholder={t("common.forms.placeholder_description")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.credits}
                errorText={errors.credits?.message}
                label={t("common.tables.credits")}
              >
                <Input
                  {...register("credits", {
                    required: t("common.forms.required"),
                    valueAsNumber: true,
                  })}
                  placeholder="3"
                  type="number"
                />
              </Field>
              <Field
                invalid={!!errors.is_active}
                errorText={errors.is_active?.message}
                label={t("common.forms.status")}
              >
                <Input {...register("is_active")} type="checkbox" />
              </Field>
              <Field
                required
                invalid={!!errors.program_id}
                errorText={errors.program_id?.message}
                label={t("common.programs")}
              >
                <Input
                  {...register("program_id", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="UUID"
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.department_id}
                errorText={errors.department_id?.message}
                label={t("common.departments")}
              >
                <Input
                  {...register("department_id", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="UUID"
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.level}
                errorText={errors.level?.message}
                label={t("common.tables.year")}
              >
                <Input
                  {...register("level", {
                    required: t("common.forms.required"),
                    valueAsNumber: true,
                  })}
                  placeholder="1"
                  type="number"
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
                {t("common.forms.update")}
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditCourse
