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

import { type ProgramLevelPublic, ProgramLevelsService } from "@/client"
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

interface EditProgramLevelProps {
  programLevel: ProgramLevelPublic
}

interface ProgramLevelUpdateForm {
  name: string
  description: string
  is_active: boolean
}

const EditProgramLevel = ({ programLevel }: EditProgramLevelProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProgramLevelUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: programLevel.name,
      description: programLevel.description ?? "",
      is_active: programLevel.is_active,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ProgramLevelUpdateForm) =>
      ProgramLevelsService.updateProgramLevel({
        levelId: programLevel.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Program level updated successfully.")
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["program_levels"] })
    },
  })

  const onSubmit: SubmitHandler<ProgramLevelUpdateForm> = async (data) => {
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
          Edit Program Level
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Program Level</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the program level details below.</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.name}
                errorText={errors.name?.message}
                label="Name"
              >
                <Input
                  {...register("name", { required: "Name is required." })}
                  placeholder="Program Level Name"
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.description}
                errorText={errors.description?.message}
                label="Description"
              >
                <Input
                  {...register("description", {
                    required: "Description is required.",
                  })}
                  placeholder="Description"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.is_active}
                errorText={errors.is_active?.message}
                label="Active"
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

export default EditProgramLevel
