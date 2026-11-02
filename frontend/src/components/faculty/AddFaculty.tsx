import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  Input,
  NumberInput,
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
// import { FiHome, FiMapPin } from "react-icons/fi"

import {
  DepartmentsService,
  FacultiesService,
  type FacultyCreate,
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

const AddFaculty = () => {
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
  } = useForm<FacultyCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      description: "",
      dean_name: "",
      email: "",
      phone: "",
      office_location: "",
      established_year: new Date().getFullYear(),
      is_active: true,
      department_id: "",
    },
  })

  const watchedIsActive = watch("is_active")
  const watchedEstablishedYear = watch("established_year")

  // Fetch departments for select
  const { data: departmentsData, isLoading: isDepartmentsLoading } = useQuery({
    queryKey: ["departments", { all: true }],
    queryFn: () => DepartmentsService.readDepartments({ skip: 0, limit: 100 }),
  })

  const mutation = useMutation({
    mutationFn: (data: FacultyCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        description: data.description?.trim() || null,
        dean_name: data.dean_name?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        office_location: data.office_location?.trim() || null,
        established_year: data.established_year || null,
      }
      return FacultiesService.createFaculty({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", { item: t("common.faculties") }),
      )
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["faculties"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<FacultyCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "lg" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button
          value="add-faculty"
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
              {t("common.forms.add_new", { item: t("common.faculties") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} fontSize="xs" color="fg.muted" lineHeight="1.6">
              {t("common.forms.description_faculty", {
                defaultValue:
                  "Create a new faculty with complete information and department association.",
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
                    label={t("common.tables.faculty_info")}
                    helperText={t("common.forms.helper_name", {
                      item: t("common.faculties"),
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
                      placeholder="e.g., Faculty of Engineering"
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
                      item: t("common.faculties"),
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
                      placeholder="e.g., ENG, SCI, MED"
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

              {/* Department and Year Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.department_id}
                    errorText={errors.department_id?.message}
                    label={t("common.departments")}
                    helperText={t("common.forms.helper_department_assoc", {
                      defaultValue: "Department this faculty belongs to",
                    })}
                  >
                    {isDepartmentsLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <select
                        {...register("department_id", {
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
                            item: t("common.departments"),
                          })}
                        </option>
                        {departmentsData?.data?.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.established_year}
                    errorText={errors.established_year?.message}
                    label={t("common.tables.established")}
                    helperText={t("common.forms.helper_established", {
                      defaultValue: "Year faculty was established",
                    })}
                  >
                    <NumberInput.Root
                      min={1900}
                      max={2100}
                      value={String(
                        watchedEstablishedYear || new Date().getFullYear(),
                      )}
                      onValueChange={(valueString) =>
                        setValue(
                          "established_year",
                          parseInt(valueString.value, 10) || null,
                        )
                      }
                    >
                      <NumberInput.Input
                        {...register("established_year", {
                          min: {
                            value: 1900,
                            message: "Year must be at least 1900.",
                          },
                          max: {
                            value: 2100,
                            message: "Year cannot exceed 2100.",
                          },
                          valueAsNumber: true,
                        })}
                        placeholder="e.g., 1985"
                        fontSize="xs"
                      />
                    </NumberInput.Root>
                  </Field>
                </GridItem>
              </Grid>

              {/* Leadership Information Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    invalid={!!errors.dean_name}
                    errorText={errors.dean_name?.message}
                    label={t("common.tables.dean")}
                    helperText={t("common.forms.helper_dean", {
                      defaultValue: "Name of faculty dean (optional)",
                    })}
                  >
                    <Input
                      {...register("dean_name", {
                        maxLength: {
                          value: 255,
                          message: "Dean name cannot exceed 255 characters.",
                        },
                      })}
                      placeholder={t("common.forms.placeholder_name", {
                        item: t("common.tables.dean"),
                      })}
                      type="text"
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.office_location}
                    errorText={errors.office_location?.message}
                    label={t("common.tables.office_location")}
                    helperText={t("common.forms.helper_office_location", {
                      defaultValue: "Faculty office location (optional)",
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
                        { defaultValue: "e.g., Engineering Building, Floor 5" },
                      )}
                      type="text"
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Contact Information Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
                  <Field
                    invalid={!!errors.email}
                    errorText={errors.email?.message}
                    label={t("common.forms.email")}
                    helperText={t("common.forms.helper_email", {
                      defaultValue: "Official email address (optional)",
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
                      placeholder="e.g., engineering@university.edu"
                      type="email"
                      fontSize="xs"
                    />
                  </Field>
                </GridItem>

                <GridItem>
                  <Field
                    invalid={!!errors.phone}
                    errorText={errors.phone?.message}
                    label={t("common.forms.phone")}
                    helperText={t("common.forms.helper_phone", {
                      defaultValue: "Faculty contact number (optional)",
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
                    />
                  </Field>
                </GridItem>
              </Grid>

              {/* Description and Status Section */}
              <Grid
                templateColumns={{ base: "1fr", md: "2fr 1fr" }}
                gap={4}
                width="100%"
              >
                <GridItem>
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
                    />
                  </Field>
                </GridItem>

                <GridItem>
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
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.emphasized"
                      >
                        {t("common.tables.active")}
                      </Text>
                    </Checkbox>
                    <Text
                      fontSize="xs"
                      color="fg.muted"
                      mt={1}
                      lineHeight="1.4"
                    >
                      {t("common.forms.active_available", {
                        defaultValue:
                          "Faculty is currently active and operational",
                      })}
                    </Text>
                  </Field>
                </GridItem>
              </Grid>
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

export default AddFaculty
