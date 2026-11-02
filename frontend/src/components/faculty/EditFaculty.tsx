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

import { FacultiesService, type FacultyPublic } from "@/client"
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

interface EditFacultyProps {
  faculty: FacultyPublic
}

interface FacultyUpdateForm {
  name: string
  code: string
  description: string
  dean_name: string
  email: string
  phone: string
  office_location: string
  established_year: number
  is_active: boolean
  department_id: string
}

const EditFaculty = ({ faculty }: EditFacultyProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FacultyUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: faculty.name,
      code: faculty.code,
      description: faculty.description ?? "",
      dean_name: faculty.dean_name ?? "",
      email: faculty.email ?? "",
      phone: faculty.phone ?? "",
      office_location: faculty.office_location ?? "",
      established_year: faculty.established_year ?? undefined,
      is_active: faculty.is_active,
      department_id: faculty.department_id,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FacultyUpdateForm) =>
      FacultiesService.updateFaculty({
        facultyId: faculty.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_update", { item: t("common.faculties") }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["faculties"] })
    },
  })

  const onSubmit: SubmitHandler<FacultyUpdateForm> = async (data) => {
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
              {t("common.forms.edit_item", { item: t("common.faculties") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              {t("common.forms.update_details_below", {
                defaultValue: "Update the faculty details below.",
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
                    item: t("common.faculties"),
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
                invalid={!!errors.dean_name}
                errorText={errors.dean_name?.message}
                label={t("common.tables.dean")}
              >
                <Input
                  {...register("dean_name", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("common.tables.dean")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.email}
                errorText={errors.email?.message}
                label={t("common.forms.email")}
              >
                <Input
                  {...register("email", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("common.forms.email")}
                  type="email"
                />
              </Field>
              <Field
                required
                invalid={!!errors.phone}
                errorText={errors.phone?.message}
                label={t("common.forms.phone")}
              >
                <Input
                  {...register("phone", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("common.forms.phone")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.office_location}
                errorText={errors.office_location?.message}
                label={t("common.tables.office_location")}
              >
                <Input
                  {...register("office_location", {
                    required: t("common.forms.required"),
                  })}
                  placeholder={t("common.tables.office_location")}
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.established_year}
                errorText={errors.established_year?.message}
                label={t("common.tables.established")}
              >
                <Input
                  {...register("established_year", {
                    required: t("common.forms.required"),
                    valueAsNumber: true,
                  })}
                  placeholder="2020"
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

export default EditFaculty
