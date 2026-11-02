import {
  Button,
  ButtonGroup,
  DialogActionTrigger,
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
  type AcademicYearPublic,
  AcademicYearsService,
  type ApiError,
} from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface EditAcademicYearProps {
  academicYear: AcademicYearPublic
}

interface AcademicYearUpdateForm {
  name: string
  start_date: string
  end_date: string
}

const EditAcademicYear = ({ academicYear }: EditAcademicYearProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AcademicYearUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: academicYear.name,
      start_date: academicYear.start_date,
      end_date: academicYear.end_date,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: AcademicYearUpdateForm) =>
      AcademicYearsService.updateAcademicYear({
        academicYearId: academicYear.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_update", { item: t("common.academic_year") }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["academic_years"] })
    },
  })

  const onSubmit: SubmitHandler<AcademicYearUpdateForm> = async (data) => {
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
              {t("common.forms.edit_item", { item: t("common.academic_year") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              {t("common.forms.update_details_below", {
                defaultValue: "Update the academic year details below.",
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
                    item: t("common.academic_year"),
                  })}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.start_date}
                errorText={errors.start_date?.message}
                label={t("common.tables.start_date")}
              >
                <Input
                  {...register("start_date", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </Field>
              <Field
                required
                invalid={!!errors.end_date}
                errorText={errors.end_date?.message}
                label={t("common.tables.end_date")}
              >
                <Input
                  {...register("end_date", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="YYYY-MM-DD"
                  type="date"
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

export default EditAcademicYear
