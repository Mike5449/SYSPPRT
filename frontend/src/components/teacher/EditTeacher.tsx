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

import { type TeacherPublic, TeachersService } from "@/client"
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

interface EditTeacherProps {
  teacher: TeacherPublic
}

interface TeacherUpdateForm {
  hire_date: string
  status: string
  specialization: string
  office_location: string
  phone_extension: string
  research_interests: string
  academic_rank: string
  max_course_load: number
  user_id: string
}

const EditTeacher = ({ teacher }: EditTeacherProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      hire_date: teacher.hire_date,
      status: teacher.status ?? "",
      specialization: teacher.specialization ?? "",
      office_location: teacher.office_location ?? "",
      phone_extension: teacher.phone_extension ?? "",
      research_interests: teacher.research_interests ?? "",
      academic_rank: teacher.academic_rank ?? "",
      max_course_load: teacher.max_course_load ?? 0,
      user_id: teacher.user.id,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: TeacherUpdateForm) =>
      TeachersService.updateTeacher({
        teacherId: teacher.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Teacher updated successfully.")
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
    },
  })

  const onSubmit: SubmitHandler<TeacherUpdateForm> = async (data) => {
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
          Edit Teacher
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the teacher details below.</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.hire_date}
                errorText={errors.hire_date?.message}
                label="Hire Date"
              >
                <Input
                  {...register("hire_date", {
                    required: "Hire date is required.",
                  })}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </Field>
              <Field
                invalid={!!errors.status}
                errorText={errors.status?.message}
                label="Status"
              >
                <Input
                  {...register("status")}
                  placeholder="Status"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.specialization}
                errorText={errors.specialization?.message}
                label="Specialization"
              >
                <Input
                  {...register("specialization")}
                  placeholder="Specialization"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.office_location}
                errorText={errors.office_location?.message}
                label="Office Location"
              >
                <Input
                  {...register("office_location")}
                  placeholder="Office Location"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.phone_extension}
                errorText={errors.phone_extension?.message}
                label="Phone Extension"
              >
                <Input
                  {...register("phone_extension")}
                  placeholder="Phone Extension"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.research_interests}
                errorText={errors.research_interests?.message}
                label="Research Interests"
              >
                <Input
                  {...register("research_interests")}
                  placeholder="Research Interests"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.academic_rank}
                errorText={errors.academic_rank?.message}
                label="Academic Rank"
              >
                <Input
                  {...register("academic_rank")}
                  placeholder="Academic Rank"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.max_course_load}
                errorText={errors.max_course_load?.message}
                label="Max Course Load"
              >
                <Input
                  {...register("max_course_load", { valueAsNumber: true })}
                  placeholder="Max Course Load"
                  type="number"
                />
              </Field>
              <Field
                required
                invalid={!!errors.user_id}
                errorText={errors.user_id?.message}
                label="User ID"
              >
                <Input
                  {...register("user_id", { required: "User ID is required." })}
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

export default EditTeacher
