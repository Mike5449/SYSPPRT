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

import { type ProgramPublic, ProgramsService } from "@/client"
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

interface EditProgramProps {
  program: ProgramPublic
}

interface ProgramUpdateForm {
  name: string
  code: string
  description: string
  is_active: boolean
  faculty_id: string
}

const EditProgram = ({ program }: EditProgramProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProgramUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: program.name,
      code: program.code,
      description: program.description ?? "",
      is_active: program.is_active,
      faculty_id: program.faculty_id,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ProgramUpdateForm) =>
      ProgramsService.updateProgram({
        programId: program.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_update", { item: t("common.programs") }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] })
    },
  })

  const onSubmit: SubmitHandler<ProgramUpdateForm> = async (data) => {
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
              {t("common.forms.edit_item", { item: t("common.programs") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              {t("common.forms.update_details_below", {
                defaultValue: "Update the program details below.",
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
                    item: t("common.programs"),
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
                invalid={!!errors.is_active}
                errorText={errors.is_active?.message}
                label={t("common.forms.status")}
              >
                <Input {...register("is_active")} type="checkbox" />
              </Field>
              <Field
                required
                invalid={!!errors.faculty_id}
                errorText={errors.faculty_id?.message}
                label={t("common.faculties")}
              >
                <Input
                  {...register("faculty_id", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="UUID"
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

export default EditProgram
