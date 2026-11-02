import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiInfo, FiPlus } from "react-icons/fi"

import {
  type ProgramLevelCreate,
  ProgramLevelsService,
  ProgramsService,
} from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { Checkbox } from "../ui/checkbox"
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

const AddProgramLevel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  // Load programs for the select
  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: () => ProgramsService.readPrograms({ skip: 0, limit: 1000 }),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ProgramLevelCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      description: "",
      typical_duration: null,
      duration_type: "year",
      is_active: true,
      program_id: "",
    },
  })

  const watchedIsActive = watch("is_active")
  const watchedDurationType = watch("duration_type")
  const watchedProgramId = watch("program_id")
  const watchedName = watch("name")

  // Auto-generate code based on program and level name
  useEffect(() => {
    if (watchedProgramId && watchedName) {
      const selectedProgram = programs?.data?.find(
        (p) => p.id === watchedProgramId,
      )
      if (selectedProgram) {
        const generatedCode = `${selectedProgram.code}-${watchedName.toUpperCase()}`
        setValue("code", generatedCode, { shouldValidate: true })
      }
    } else {
      setValue("code", "")
    }
  }, [watchedProgramId, watchedName, programs, setValue])

  const mutation = useMutation({
    mutationFn: (data: ProgramLevelCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        description: data.description?.trim() || null,
        typical_duration: data.typical_duration || null,
      }
      return ProgramLevelsService.createProgramLevel({
        requestBody: submitData,
      })
    },
    onSuccess: () => {
      showSuccessToast("Program level created successfully.")
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["program_levels"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<ProgramLevelCreate> = (data) => {
    mutation.mutate(data)
  }

  // Duration type options
  const durationTypeOptions = [
    { value: "year", label: "Year(s)" },
    { value: "semester", label: "Semester(s)" },
    { value: "month", label: "Month(s)" },
    { value: "week", label: "Week(s)" },
  ]

  return (
    <DialogRoot
      size={{ base: "xs", md: "lg" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button
          value="add-program-level"
          my={4}
          variant="ghost"
          color="black"
          border="1px solid"
          borderColor="gray.200"
          size="sm"
        >
          <FiPlus fontSize="16px" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Program Level</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={6} align="stretch">
              <Box
                p={4}
                border="1px solid"
                borderColor="border.subtle"
                rounded="md"
                bg="blue.50/30"
              >
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color="blue.600"
                  mb={4}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <FiInfo size={12} /> Basic Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Field
                      required
                      invalid={!!errors.program_id}
                      errorText={errors.program_id?.message}
                      label="Program"
                    >
                      <select
                        {...register("program_id", {
                          required: "Program is required.",
                        })}
                        value={watchedProgramId}
                        onChange={(e) => setValue("program_id", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          border: "1px solid",
                          borderColor: "var(--chakra-colors-border-default)",
                          borderRadius: "8px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                        }}
                      >
                        <option value="">Select a program...</option>
                        {programs?.data?.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name} ({program.code})
                          </option>
                        ))}
                      </select>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.name}
                      errorText={errors.name?.message}
                      label="Level Name"
                    >
                      <select
                        {...register("name", {
                          required: "Program level name is required.",
                        })}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          border: "1px solid",
                          borderColor: "var(--chakra-colors-border-default)",
                          borderRadius: "8px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                        }}
                      >
                        <option value="">Select a level...</option>
                        <option value="DIPLOME">DIPLOME</option>
                        <option value="CERTIFICAT">CERTIFICAT</option>
                        <option value="LICENCE">LICENCE</option>
                        <option value="DESS">DESS</option>
                        <option value="MAITRISE">MAITRISE</option>
                        <option value="MASTER">MASTER</option>
                      </select>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.code}
                      errorText={errors.code?.message}
                      label="Level Code"
                      helperText="Automatically generated from program and level"
                    >
                      <Input
                        {...register("code", {
                          required: "Level code is required.",
                        })}
                        placeholder="e.g., BSC-CS"
                        disabled
                        variant="subtle"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </Box>

              <Box
                p={4}
                border="1px solid"
                borderColor="border.subtle"
                rounded="md"
                bg="gray.50/30"
              >
                <Text fontSize="sm" fontWeight="bold" color="gray.600" mb={4}>
                  Duration & Details
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Field
                      invalid={!!errors.typical_duration}
                      errorText={errors.typical_duration?.message}
                      label="Typical Duration"
                    >
                      <Input
                        {...register("typical_duration", {
                          min: { value: 1, message: "Min 1" },
                          max: { value: 10, message: "Max 10" },
                          valueAsNumber: true,
                        })}
                        placeholder="e.g., 3"
                        type="number"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field label="Duration Type">
                      <select
                        {...register("duration_type")}
                        value={watchedDurationType}
                        onChange={(e) =>
                          setValue("duration_type", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          border: "1px solid",
                          borderColor: "var(--chakra-colors-border-default)",
                          borderRadius: "8px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                        }}
                      >
                        {durationTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </GridItem>

                  <GridItem colSpan={2}>
                    <Field
                      invalid={!!errors.description}
                      errorText={errors.description?.message}
                      label="Description"
                    >
                      <Textarea
                        {...register("description", { maxLength: 500 })}
                        placeholder="Optional description..."
                        rows={2}
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </Box>

              <Box
                p={3}
                borderLeft="4px solid"
                borderColor="blue.500"
                bg="blue.50"
                rounded="sm"
              >
                <Checkbox
                  checked={watchedIsActive}
                  onCheckedChange={(checked) =>
                    setValue("is_active", !!checked)
                  }
                  colorPalette="blue"
                >
                  <Text fontSize="sm" fontWeight="600">
                    Active Level
                  </Text>
                </Checkbox>
              </Box>
            </VStack>
          </DialogBody>

          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              type="submit"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
              colorPalette="blue"
            >
              Create Level
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddProgramLevel
