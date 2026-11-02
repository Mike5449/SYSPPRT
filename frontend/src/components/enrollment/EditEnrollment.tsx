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
import { FaExchangeAlt } from "react-icons/fa"

import { type EnrollmentPublic, EnrollmentsService } from "@/client"
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

interface EditEnrollmentProps {
  enrollment: EnrollmentPublic
}

interface EnrollmentUpdateForm {
  student_id: string
  course_session_id: string
  enrollment_date: string
  status: string
}

const EditEnrollment = ({ enrollment }: EditEnrollmentProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnrollmentUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      student_id: enrollment.student_id,
      course_session_id: enrollment.course_session_id,
      enrollment_date: enrollment.enrollment_date,
      status: enrollment.status,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EnrollmentUpdateForm) =>
      EnrollmentsService.updateEnrollment({
        enrollmentId: enrollment.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Enrollment updated successfully.")
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
    },
  })

  const onSubmit: SubmitHandler<EnrollmentUpdateForm> = async (data) => {
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
          Edit Enrollment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Enrollment</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the enrollment details below.</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.student_id}
                errorText={errors.student_id?.message}
                label="Student ID"
              >
                <Input
                  {...register("student_id", {
                    required: "Student ID is required.",
                  })}
                  placeholder="UUID"
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.course_session_id}
                errorText={errors.course_session_id?.message}
                label="Course Session ID"
              >
                <Input
                  {...register("course_session_id", {
                    required: "Course Session ID is required.",
                  })}
                  placeholder="UUID"
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.enrollment_date}
                errorText={errors.enrollment_date?.message}
                label="Enrollment Date"
              >
                <Input
                  {...register("enrollment_date", {
                    required: "Enrollment date is required.",
                  })}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </Field>
              <Field
                required
                invalid={!!errors.status}
                errorText={errors.status?.message}
                label="Status"
              >
                <Input
                  {...register("status", { required: "Status is required." })}
                  placeholder="active/inactive"
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
                  Cancel
                </Button>
              </DialogActionTrigger>
              <Button variant="solid" type="submit" loading={isSubmitting}>
                Save
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditEnrollment
