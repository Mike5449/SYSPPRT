import {
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
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FiPlus } from "react-icons/fi"

import { type DepartmentCreate, DepartmentsService } from "@/client"
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

const AddDepartment = () => {
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
  } = useForm<DepartmentCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      description: "",
      head_of_department: "",
      email: "",
      phone: "",
      office_location: "",
      is_active: true,
    },
  })

  const watchedName = watch("name")

  // Auto-generate code from department name + current month/year
  useEffect(() => {
    if (watchedName) {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, "0") // 01-12
      const year = now.getFullYear() // 2026

      // Generate 2-4 letters from department name
      const words = watchedName.trim().split(/\s+/)
      let lettersPart = ""

      if (words.length > 1) {
        // Multi-word: take first letter of first 2-4 words
        lettersPart = words
          .slice(0, Math.min(4, words.length))
          .map((word) => word[0])
          .join("")
          .toUpperCase()
      } else {
        // Single word: take first 2-4 characters
        const cleanName = watchedName.replace(/[^A-Za-z0-9]/g, "")
        lettersPart = cleanName
          .slice(0, Math.min(4, cleanName.length))
          .toUpperCase()
      }

      // Ensure at least 2 letters
      if (lettersPart.length < 2 && lettersPart.length > 0) {
        lettersPart = lettersPart + lettersPart // Duplicate if only 1 letter
      }

      const generatedCode = `${lettersPart}${month}${year}`
      setValue("code", generatedCode)
    } else {
      setValue("code", "")
    }
  }, [watchedName, setValue])

  const mutation = useMutation({
    mutationFn: (data: DepartmentCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        description: data.description?.trim() || null,
        head_of_department: data.head_of_department?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        office_location: data.office_location?.trim() || null,
      }
      return DepartmentsService.createDepartment({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", { item: t("common.departments") }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
  })

  const handleCancel = () => {
    reset()
    setIsOpen(false)
  }

  const onSubmit: SubmitHandler<DepartmentCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "xl" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          color="black"
          border="1px solid"
          borderColor="gray.200"
          size="sm"
        >
          <FiPlus fontSize="10px" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
              {t("common.forms.add_new", { item: t("common.departments") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} color="fg.muted" fontSize="xs" fontWeight="500">
              {t("common.forms.description_department", {
                defaultValue:
                  "Create a new department with all necessary information and contact details.",
              })}
            </Text>

            <VStack gap={6} align="stretch">
              {/* Basic Information Section */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.name}
                    errorText={errors.name?.message}
                    label={t("common.tables.department_info")}
                    helperText={t("common.forms.helper_name", {
                      item: t("common.departments"),
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
                      placeholder="e.g., Computer Science"
                      type="text"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    required
                    invalid={!!errors.code}
                    errorText={errors.code?.message}
                    label={t("common.forms.code")}
                    helperText="Format: [2-4 letters][MM][YYYY] - Auto-generated"
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
                      placeholder="Auto-generated"
                      type="text"
                      disabled
                      style={{
                        textTransform: "uppercase",
                        backgroundColor: "var(--chakra-colors-bg-subtle)",
                        cursor: "not-allowed",
                      }}
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Leadership and Location */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    invalid={!!errors.head_of_department}
                    errorText={errors.head_of_department?.message}
                    label={t("common.tables.head_of_department")}
                    helperText={t("common.forms.helper_head", {
                      defaultValue: "Name of the department head",
                    })}
                  >
                    <Input
                      {...register("head_of_department", {
                        maxLength: {
                          value: 255,
                          message:
                            "Head of department name cannot exceed 255 characters.",
                        },
                      })}
                      placeholder={t("common.forms.placeholder_name", {
                        item: t("common.tables.head_of_department"),
                      })}
                      type="text"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.office_location}
                    errorText={errors.office_location?.message}
                    label={t("common.tables.office_location")}
                    helperText={t("common.forms.helper_office_location", {
                      defaultValue: "Physical location of the department",
                    })}
                  >
                    <Input
                      {...register("office_location", {
                        maxLength: {
                          value: 255,
                          message:
                            "Office location cannot exceed 255 characters.",
                        },
                      })}
                      placeholder={t(
                        "common.forms.placeholder_office_location",
                        { defaultValue: "e.g., Building A, Floor 3, Room 301" },
                      )}
                      type="text"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Contact Information */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    invalid={!!errors.email}
                    errorText={errors.email?.message}
                    label={t("common.forms.email")}
                    helperText={t("common.forms.helper_email", {
                      defaultValue: "Official department email address",
                    })}
                  >
                    <Input
                      {...register("email", {
                        maxLength: {
                          value: 255,
                          message: "Email cannot exceed 255 characters.",
                        },
                        pattern: {
                          value:
                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: "Please enter a valid email address.",
                        },
                      })}
                      placeholder="e.g., cs@university.edu"
                      type="email"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.phone}
                    errorText={errors.phone?.message}
                    label={t("common.forms.phone")}
                    helperText={t("common.forms.helper_phone", {
                      defaultValue: "Department contact phone number",
                    })}
                  >
                    <Input
                      {...register("phone", {
                        maxLength: {
                          value: 50,
                          message: "Phone number cannot exceed 50 characters.",
                        },
                      })}
                      placeholder="e.g., +1-555-123-4567"
                      type="tel"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Status Control */}
              <Field
                invalid={!!errors.is_active}
                errorText={errors.is_active?.message}
                label={t("common.forms.status")}
                helperText={t("common.forms.helper_active_dept", {
                  defaultValue:
                    "Is this department currently active and operational?",
                })}
              >
                <Checkbox
                  {...register("is_active")}
                  defaultChecked
                  fontSize="xs"
                  fontWeight="500"
                >
                  {t("common.forms.active_available", {
                    defaultValue: "Active and operational department",
                  })}
                </Checkbox>
              </Field>

              {/* Description Section - Full Width */}
              <Field
                invalid={!!errors.description}
                errorText={errors.description?.message}
                label={t("common.forms.description")}
                helperText={t("common.forms.placeholder_description")}
              >
                <Textarea
                  {...register("description", {
                    maxLength: {
                      value: 1000,
                      message: "Description cannot exceed 1000 characters.",
                    },
                  })}
                  placeholder={t("common.forms.placeholder_description")}
                  rows={3}
                  fontSize="xs"
                  fontWeight="500"
                />
              </Field>
            </VStack>
          </DialogBody>

          <DialogFooter gap={3}>
            <DialogActionTrigger asChild>
              <Button
                variant="outline"
                colorPalette="gray"
                disabled={isSubmitting}
                onClick={handleCancel}
                fontSize="xs"
                fontWeight="600"
              >
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              colorPalette="blue"
              type="submit"
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
              loadingText="Creating..."
              fontSize="xs"
              fontWeight="600"
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

export default AddDepartment
