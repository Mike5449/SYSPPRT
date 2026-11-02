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

import { type SessionPublic, SessionsService } from "@/client"
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

interface EditSessionProps {
  session: SessionPublic
}

interface SessionUpdateForm {
  name: string
  start_date: string
  end_date: string
  academic_year_id: string
  is_active: boolean
}

const EditSession = ({ session }: EditSessionProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: session.name,
      start_date: session.start_date,
      end_date: session.end_date,
      academic_year_id: session.academic_year_id,
      is_active: session.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: SessionUpdateForm) =>
      SessionsService.updateSession({
        sessionId: session.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(t("session.alerts.success_update"))
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })

  const onSubmit: SubmitHandler<SessionUpdateForm> = async (data) => {
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
          {t("session.edit_title")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t("session.edit_title")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>{t("session.edit_description")}</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.name}
                errorText={errors.name?.message}
                label={t("session.fields.name")}
              >
                <Input
                  {...register("name", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("session.placeholders.name")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.start_date}
                errorText={errors.start_date?.message}
                label={t("session.fields.start_date")}
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
                label={t("session.fields.end_date")}
              >
                <Input
                  {...register("end_date", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </Field>
              <Field
                required
                invalid={!!errors.academic_year_id}
                errorText={errors.academic_year_id?.message}
                label={t("session.fields.academic_year")}
              >
                <Input
                  {...register("academic_year_id", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="UUID"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.is_active}
                errorText={errors.is_active?.message}
                label={t("session.fields.is_active")}
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

export default EditSession
