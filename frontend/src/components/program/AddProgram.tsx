import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FiPlus } from "react-icons/fi"

import { FacultiesService, type ProgramCreate, ProgramsService } from "@/client"
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

const AddProgram = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ProgramCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      description: "",
      credits_required: 120,
      tuition_fee: 0,
      language: "French",
      admission_requirements: "",
      career_prospects: "",
      is_active: true,
      faculty_id: "",
    },
  })

  const watchedIsActive = watch("is_active")
  const watchedLanguage = watch("language")

  // Load faculties
  const { data: facultiesData, isLoading: isFacultiesLoading } = useQuery({
    queryKey: ["faculties", { all: true }],
    queryFn: () => FacultiesService.readFaculties({ skip: 0, limit: 100 }),
  })

  const mutation = useMutation({
    mutationFn: (data: ProgramCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        description: data.description?.trim() || null,
        credits_required: data.credits_required || null,
        tuition_fee: data.tuition_fee || null,
        admission_requirements: data.admission_requirements?.trim() || null,
        career_prospects: data.career_prospects?.trim() || null,
      }
      return ProgramsService.createProgram({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", { item: t("common.programs") }),
      )
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<ProgramCreate> = (data) => {
    mutation.mutate(data)
  }

  // Language options
  const languageOptions = [
    {
      value: "French",
      label: t("common.languages.french", { defaultValue: "French" }),
    },
    {
      value: "English",
      label: t("common.languages.english", { defaultValue: "English" }),
    },
    {
      value: "Spanish",
      label: t("common.languages.spanish", { defaultValue: "Spanish" }),
    },
    {
      value: "German",
      label: t("common.languages.german", { defaultValue: "German" }),
    },
    {
      value: "Italian",
      label: t("common.languages.italian", { defaultValue: "Italian" }),
    },
    {
      value: "Arabic",
      label: t("common.languages.arabic", { defaultValue: "Arabic" }),
    },
    {
      value: "Portuguese",
      label: t("common.languages.portuguese", { defaultValue: "Portuguese" }),
    },
    {
      value: "Chinese",
      label: t("common.languages.chinese", { defaultValue: "Chinese" }),
    },
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
          value="add-program"
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
            <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
              {t("common.forms.add_new", { item: t("common.programs") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} fontSize="xs" color="fg.muted" lineHeight="1.6">
              {t("common.forms.description_program", {
                defaultValue:
                  "Create a new academic program with complete details and requirements.",
              })}
            </Text>

            <VStack gap={6}>
              {/* Basic Information Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.name}
                    errorText={errors.name?.message}
                    label={t("common.tables.program_info")}
                    helperText={t("common.forms.helper_name", {
                      item: t("common.programs"),
                    })}
                  >
                    <Input
                      {...register("name", {
                        required: t("common.forms.required"),
                        minLength: {
                          value: 1,
                          message: "Name must be at least 1 character.",
                        },
                        maxLength: {
                          value: 255,
                          message: "Name cannot exceed 255 characters.",
                        },
                      })}
                      placeholder={t("common.forms.placeholder_name", {
                        item: t("common.programs"),
                      })}
                      type="text"
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    required
                    invalid={!!errors.code}
                    errorText={errors.code?.message}
                    label={t("common.forms.code")}
                    helperText={t("common.forms.helper_code", {
                      item: t("common.programs"),
                    })}
                  >
                    <Input
                      {...register("code", {
                        required: t("common.forms.required"),
                        minLength: {
                          value: 2,
                          message: "Code must be at least 2 characters.",
                        },
                        maxLength: {
                          value: 20,
                          message: "Code cannot exceed 20 characters.",
                        },
                      })}
                      placeholder={t("common.forms.placeholder_code")}
                      type="text"
                      fontSize="xs"
                      style={{ textTransform: "uppercase" }}
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase()
                        register("code").onChange(e)
                      }}
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Academic Structure Section */}
              <Grid templateColumns={{ base: "1fr" }} gap={4} width="100%">
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.faculty_id}
                    errorText={errors.faculty_id?.message}
                    label={t("common.faculties")}
                    helperText={t("common.forms.helper_select_faculty", {
                      defaultValue: "Select the faculty",
                    })}
                  >
                    {isFacultiesLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <select
                        {...register("faculty_id", {
                          required: t("common.forms.required"),
                        })}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          border: "1px solid",
                          borderColor: "var(--chakra-colors-border-emphasized)",
                          borderRadius: "0.375rem",
                          fontSize: "0.75rem",
                          backgroundColor: "var(--chakra-colors-bg-panel)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        <option value="">
                          {t("common.forms.placeholder_select", {
                            item: t("common.faculties"),
                          })}
                        </option>
                        {facultiesData?.data?.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name} ({faculty.code})
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </GridItem>
              </Grid>

              {/* Program Requirements Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    invalid={!!errors.credits_required}
                    errorText={errors.credits_required?.message}
                    label={t("common.forms.total_credits")}
                    helperText={t("common.forms.helper_credits_total", {
                      defaultValue: "Total credits to complete",
                    })}
                  >
                    <Input
                      {...register("credits_required", {
                        min: {
                          value: 0,
                          message: "Credits must be at least 0.",
                        },
                        valueAsNumber: true,
                      })}
                      placeholder="e.g., 120"
                      type="number"
                      min={0}
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.tuition_fee}
                    errorText={errors.tuition_fee?.message}
                    label={t("common.forms.tuition_fee", {
                      defaultValue: "Tuition Fee",
                    })}
                    helperText={t("common.forms.helper_tuition", {
                      defaultValue: "Annual fee in local currency",
                    })}
                  >
                    <Input
                      {...register("tuition_fee", {
                        min: {
                          value: 0,
                          message: "Tuition fee must be at least 0.",
                        },
                        valueAsNumber: true,
                      })}
                      placeholder="e.g., 5000"
                      type="number"
                      min={0}
                      step="0.01"
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.language}
                    errorText={errors.language?.message}
                    label={t("common.forms.language")}
                    helperText={t("common.forms.helper_language", {
                      defaultValue: "Primary language of instruction",
                    })}
                  >
                    <select
                      {...register("language", {
                        maxLength: {
                          value: 50,
                          message: "Language cannot exceed 50 characters.",
                        },
                      })}
                      value={watchedLanguage}
                      onChange={(e) => setValue("language", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        border: "1px solid",
                        borderColor: "var(--chakra-colors-border-emphasized)",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        backgroundColor: "var(--chakra-colors-bg-panel)",
                        color: "var(--chakra-colors-fg-default)",
                      }}
                    >
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </GridItem>
              </Grid>

              {/* Description Section */}
              <Field
                invalid={!!errors.description}
                errorText={errors.description?.message}
                label={t("common.forms.description")}
                helperText={t("common.forms.placeholder_description")}
              >
                <Textarea
                  {...register("description", {
                    maxLength: {
                      value: 2000,
                      message: "Description cannot exceed 2000 characters.",
                    },
                  })}
                  placeholder={t("common.forms.placeholder_description")}
                  rows={4}
                  fontSize="xs"
                />
              </Field>

              {/* Requirements and Prospects Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    invalid={!!errors.admission_requirements}
                    errorText={errors.admission_requirements?.message}
                    label={t("common.forms.admission_requirements", {
                      defaultValue: "Admission Requirements",
                    })}
                    helperText={t("common.forms.helper_admission_req", {
                      defaultValue: "Prerequisites and requirements",
                    })}
                  >
                    <Textarea
                      {...register("admission_requirements", {
                        maxLength: {
                          value: 2000,
                          message:
                            "Admission requirements cannot exceed 2000 characters.",
                        },
                      })}
                      placeholder={t("common.forms.placeholder_admission_req", {
                        defaultValue:
                          "Enter admission requirements, prerequisites, exam requirements...",
                      })}
                      rows={3}
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.career_prospects}
                    errorText={errors.career_prospects?.message}
                    label={t("common.forms.career_prospects", {
                      defaultValue: "Career Prospects",
                    })}
                    helperText={t("common.forms.helper_career_prospects", {
                      defaultValue: "Career opportunities and jobs",
                    })}
                  >
                    <Textarea
                      {...register("career_prospects", {
                        maxLength: {
                          value: 2000,
                          message:
                            "Career prospects cannot exceed 2000 characters.",
                        },
                      })}
                      placeholder={t(
                        "common.forms.placeholder_career_prospects",
                        {
                          defaultValue:
                            "Enter career opportunities, job prospects, industry connections...",
                        },
                      )}
                      rows={3}
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Status Section */}
              <Field label={t("common.forms.status")}>
                <Checkbox
                  checked={watchedIsActive}
                  onCheckedChange={(checked) =>
                    setValue("is_active", !!checked.checked)
                  }
                  size="sm"
                  colorPalette="blue"
                  {...register("is_active")}
                >
                  <Text fontSize="xs" fontWeight="500" color="fg.emphasized">
                    {t("common.tables.active")}
                  </Text>
                </Checkbox>
                <Text fontSize="xs" color="fg.muted" mt={1} lineHeight="1.4">
                  {t("common.forms.active_available", {
                    defaultValue:
                      "Program is currently active and accepting students",
                  })}
                </Text>
              </Field>
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
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              type="submit"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
              colorPalette="blue"
            >
              {t("common.forms.create")}
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddProgram
