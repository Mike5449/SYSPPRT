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

import { UniversitiesService, type UniversityPublic } from "@/client"
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

interface EditUniversityProps {
  university: UniversityPublic
}

interface UniversityUpdateForm {
  name: string
  code: string
  description: string
  address: string
  email: string
  phone: string
  website: string
  is_active: boolean
}

const EditUniversity = ({ university }: EditUniversityProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UniversityUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: university.name,
      code: university.code,
      description: university.description ?? "",
      address: university.address ?? "",
      email: university.email ?? "",
      phone: university.phone ?? "",
      website: university.website ?? "",
      is_active: university.is_active ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UniversityUpdateForm) =>
      UniversitiesService.updateUniversity({
        universityId: university.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("University updated successfully.")
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
    },
  })

  const onSubmit: SubmitHandler<UniversityUpdateForm> = async (data) => {
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
          Edit University
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit University</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the university details below.</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.name}
                errorText={errors.name?.message}
                label="Name"
              >
                <Input
                  {...register("name", { required: "Name is required." })}
                  placeholder="University Name"
                  type="text"
                />
              </Field>
              <Field
                required
                invalid={!!errors.code}
                errorText={errors.code?.message}
                label="Code"
              >
                <Input
                  {...register("code", { required: "Code is required." })}
                  placeholder="University Code"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.description}
                errorText={errors.description?.message}
                label="Description"
              >
                <Input
                  {...register("description")}
                  placeholder="Description"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.address}
                errorText={errors.address?.message}
                label="Address"
              >
                <Input
                  {...register("address")}
                  placeholder="Address"
                  type="text"
                />
              </Field>
              <Field
                invalid={!!errors.email}
                errorText={errors.email?.message}
                label="Email"
              >
                <Input
                  {...register("email")}
                  placeholder="Email"
                  type="email"
                />
              </Field>
              <Field
                invalid={!!errors.phone}
                errorText={errors.phone?.message}
                label="Phone"
              >
                <Input {...register("phone")} placeholder="Phone" type="text" />
              </Field>
              <Field
                invalid={!!errors.website}
                errorText={errors.website?.message}
                label="Website"
              >
                <Input
                  {...register("website")}
                  placeholder="Website"
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

export default EditUniversity
