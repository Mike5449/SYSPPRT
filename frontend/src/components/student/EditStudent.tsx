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

import { type StudentPublic, StudentsService } from "@/client"
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

interface EditStudentProps {
  student: StudentPublic
}

interface StudentUpdateForm {
  admission_date: string
  expected_graduation_date: string
  actual_graduation_date: string
  status: string
  gpa: number
  total_credits_earned: number
  current_year_level: number
  is_scholarship: boolean
  scholarship_type: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  notes: string
  user_id: string
  program_id: string
}

const EditStudent = ({ student }: EditStudentProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      admission_date: student.admission_date,
      expected_graduation_date: student.expected_graduation_date ?? undefined,
      actual_graduation_date: student.actual_graduation_date ?? undefined,
      status: student.status ?? undefined,
      gpa: student.gpa ?? undefined,
      total_credits_earned: student.total_credits_earned,
      current_year_level: student.current_year_level,
      is_scholarship: student.is_scholarship,
      scholarship_type: student.scholarship_type ?? undefined,
      emergency_contact_name: student.emergency_contact_name ?? undefined,
      emergency_contact_phone: student.emergency_contact_phone ?? undefined,
      emergency_contact_relationship:
        student.emergency_contact_relationship ?? undefined,
      notes: student.notes ?? undefined,
      user_id: student.user_id,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: StudentUpdateForm) =>
      StudentsService.updateStudent({
        studentId: student.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_update", { item: t("common.students") }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
    },
  })

  const onSubmit: SubmitHandler<StudentUpdateForm> = async (data) => {
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
              {t("common.forms.edit_item", { item: t("common.students") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              {t("common.forms.update_details_below", {
                defaultValue: "Update the student details below.",
              })}
            </Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.admission_date}
                errorText={errors.admission_date?.message}
                label={t("common.tables.admission")}
              >
                <Input
                  {...register("admission_date", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </Field>
              <Field
                invalid={!!errors.expected_graduation_date}
                errorText={errors.expected_graduation_date?.message}
                label={t("common.forms.expected_grad")}
              >
                <Input
                  {...register("expected_graduation_date")}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </Field>
              <Field
                invalid={!!errors.actual_graduation_date}
                errorText={errors.actual_graduation_date?.message}
                label={t("common.forms.actual_grad")}
              >
                <Input
                  {...register("actual_graduation_date")}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </Field>
              <Field
                invalid={!!errors.status}
                errorText={errors.status?.message}
                label={t("common.forms.status")}
              >
                <Input
                  {...register("status")}
                  placeholder="active/inactive"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.gpa}
                errorText={errors.gpa?.message}
                label={t("common.tables.gpa")}
              >
                <Input
                  {...register("gpa", { valueAsNumber: true })}
                  placeholder="GPA"
                  type="number"
                  step="0.01"
                />
              </Field>
              <Field
                invalid={!!errors.total_credits_earned}
                errorText={errors.total_credits_earned?.message}
                label={t("common.forms.total_credits")}
              >
                <Input
                  {...register("total_credits_earned", { valueAsNumber: true })}
                  placeholder="Total Credits"
                  type="number"
                />
              </Field>
              <Field
                invalid={!!errors.current_year_level}
                errorText={errors.current_year_level?.message}
                label={t("common.forms.year_level")}
              >
                <Input
                  {...register("current_year_level", { valueAsNumber: true })}
                  placeholder="Year Level"
                  type="number"
                />
              </Field>
              <Field
                invalid={!!errors.is_scholarship}
                errorText={errors.is_scholarship?.message}
                label={t("common.tables.scholarship")}
              >
                <Input {...register("is_scholarship")} type="checkbox" />
              </Field>
              <Field
                invalid={!!errors.scholarship_type}
                errorText={errors.scholarship_type?.message}
                label={t("common.tables.scholarship")}
              >
                <Input
                  {...register("scholarship_type")}
                  placeholder={t("common.tables.scholarship")}
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.emergency_contact_name}
                errorText={errors.emergency_contact_name?.message}
                label={t("common.forms.contact_name")}
              >
                <Input
                  {...register("emergency_contact_name")}
                  placeholder="Contact Name"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.emergency_contact_phone}
                errorText={errors.emergency_contact_phone?.message}
                label={t("common.forms.contact_phone")}
              >
                <Input
                  {...register("emergency_contact_phone")}
                  placeholder="Contact Phone"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.emergency_contact_relationship}
                errorText={errors.emergency_contact_relationship?.message}
                label={t("common.forms.contact_rel")}
              >
                <Input
                  {...register("emergency_contact_relationship")}
                  placeholder="Relationship"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.notes}
                errorText={errors.notes?.message}
                label={t("common.forms.notes")}
              >
                <Input {...register("notes")} placeholder="Notes" type="text" />
              </Field>
              <Field
                required
                invalid={!!errors.user_id}
                errorText={errors.user_id?.message}
                label={t("common.forms.user_account")}
              >
                <Input
                  {...register("user_id", {
                    required: t("common.forms.required"),
                  })}
                  placeholder="UUID"
                  type="text"
                />
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

export default EditStudent
