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

import { type GradePublic, GradesService } from "@/client"
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

interface EditGradeProps {
  grade: GradePublic
}

interface GradeUpdateForm {
  assessment_id: string
  score: number
  exam_type: string
  is_published: boolean
}

const EditGrade = ({ grade }: EditGradeProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GradeUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      assessment_id: grade.assessment_id,
      score: grade.score,
      exam_type: grade.exam_type || "REGULAR",
      is_published: grade.is_published,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: GradeUpdateForm) =>
      GradesService.updateGrade({
        gradeId: grade.id,
        requestBody: {
          score: data.score,
          exam_type: data.exam_type.toLowerCase() as any,
          is_published: data.is_published,
        },
      }),
    onSuccess: () => {
      showSuccessToast(t("grade.alerts.success_update"))
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] })
    },
  })

  const onSubmit: SubmitHandler<GradeUpdateForm> = async (data) => {
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
          {t("grade.edit_title")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t("grade.edit_title")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>{t("grade.edit_description")}</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.assessment_id}
                errorText={errors.assessment_id?.message}
                label={t("grade.fields.assessment_id", {
                  defaultValue: "Assessment ID",
                })}
              >
                <Input
                  {...register("assessment_id", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="UUID"
                  type="text"
                  disabled
                />
              </Field>
              <Field
                required
                invalid={!!errors.score}
                errorText={errors.score?.message}
                label={t("grade.fields.score")}
              >
                <Input
                  {...register("score", {
                    required: t("common.forms.required"),
                    valueAsNumber: true,
                  })}
                  placeholder={t("grade.placeholders.score")}
                  type="number"
                />
              </Field>
              <Field
                required
                invalid={!!errors.exam_type}
                errorText={errors.exam_type?.message}
                label={t("grade.fields.exam_type")}
              >
                <select
                  {...register("exam_type", {
                    required: t("common.forms.required"),
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
                  <option value="REGULAR">
                    {t("grade.exam_types.regular")}
                  </option>
                  <option value="INTRA">{t("grade.exam_types.intra")}</option>
                  <option value="FINAL">{t("grade.exam_types.final")}</option>
                </select>
              </Field>
              <Field
                invalid={!!errors.is_published}
                errorText={errors.is_published?.message}
                label={t("grade.fields.is_published")}
              >
                <Input {...register("is_published")} type="checkbox" />
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
                {t("common.forms.save", { defaultValue: "Save" })}
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditGrade
