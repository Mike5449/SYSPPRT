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
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FiPlus } from "react-icons/fi"

import {
  ProgramLevelsService,
  type StudentCreate,
  StudentsService,
  UsersService,
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

const AddStudent = () => {
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
  } = useForm<StudentCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      admission_date: new Date().toISOString().split("T")[0],
      expected_graduation_date: "",
      actual_graduation_date: "",
      status: "active",
      gpa: null,
      total_credits_earned: 0,
      current_year_level: 1,
      is_scholarship: false,
      scholarship_type: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      notes: "",
      user_id: "",
      program_level_id: "",
    },
  })

  const watchedIsScholarship = watch("is_scholarship")
  const watchedStatus = watch("status")

  // Load users
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users", { all: true }],
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 100 }),
  })

  // Load program levels
  const { data: programLevelsData, isLoading: isProgramLevelsLoading } =
    useQuery({
      queryKey: ["program_levels", { all: true }],
      queryFn: () =>
        ProgramLevelsService.readProgramLevels({ skip: 0, limit: 100 }),
    })

  const mutation = useMutation({
    mutationFn: (data: StudentCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        expected_graduation_date: data.expected_graduation_date?.trim() || null,
        actual_graduation_date: data.actual_graduation_date?.trim() || null,
        scholarship_type: data.scholarship_type?.trim() || null,
        emergency_contact_name: data.emergency_contact_name?.trim() || null,
        emergency_contact_phone: data.emergency_contact_phone?.trim() || null,
        emergency_contact_relationship:
          data.emergency_contact_relationship?.trim() || null,
        notes: data.notes?.trim() || null,
      }
      return StudentsService.createStudent({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", { item: t("common.students") }),
      )
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<StudentCreate> = (data) => {
    mutation.mutate(data)
  }

  // Status options
  const statusOptions = [
    { value: "active", label: t("common.tables.active") },
    { value: "inactive", label: t("common.tables.inactive") },
    {
      value: "graduated",
      label: t("common.tables.graduated", { defaultValue: "Graduated" }),
    },
    {
      value: "suspended",
      label: t("common.tables.suspended", { defaultValue: "Suspended" }),
    },
    {
      value: "withdrawn",
      label: t("common.tables.withdrawn", { defaultValue: "Withdrawn" }),
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
          value="add-student"
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
            <DialogTitle>
              {t("common.forms.add_new", { item: t("common.students") })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} fontSize="xs" fontWeight="500" color="fg.muted">
              {t("common.forms.description_student_reg", {
                defaultValue:
                  "Register a new student with complete academic and contact information.",
              })}
            </Text>
            <Grid gap={6}>
              {/* Basic Information Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("common.forms.basic_info", {
                    defaultValue: "Basic Information",
                  })}
                </Text>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={4}
                >
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.user_id}
                      errorText={errors.user_id?.message}
                      label={t("common.forms.user_account", {
                        defaultValue: "User Account",
                      })}
                      helperText={t("common.forms.helper_user_account", {
                        defaultValue: "Link to the user account for login",
                      })}
                    >
                      {isUsersLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        <select
                          {...register("user_id", {
                            required: t("common.forms.required"),
                          })}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "12px",
                            fontWeight: "500",
                            border: "1px solid",
                            borderColor: "var(--chakra-colors-border-default)",
                            borderRadius: "6px",
                            backgroundColor: "var(--chakra-colors-bg-default)",
                            color: "var(--chakra-colors-fg-default)",
                          }}
                        >
                          <option value="">
                            {t("common.forms.placeholder_select", {
                              item: t("common.forms.user_account"),
                            })}
                          </option>
                          {usersData?.data?.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.email || `User ${user.id}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.program_level_id}
                      errorText={errors.program_level_id?.message}
                      label={t("common.program_levels")}
                      helperText={t("common.forms.helper_program_level", {
                        defaultValue:
                          "Academic level the student is enrolled in",
                      })}
                    >
                      {isProgramLevelsLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        <select
                          {...register("program_level_id", {
                            required: t("common.forms.required"),
                          })}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "12px",
                            fontWeight: "500",
                            border: "1px solid",
                            borderColor: "var(--chakra-colors-border-default)",
                            borderRadius: "6px",
                            backgroundColor: "var(--chakra-colors-bg-default)",
                            color: "var(--chakra-colors-fg-default)",
                          }}
                        >
                          <option value="">
                            {t("common.forms.placeholder_select", {
                              item: t("common.program_levels"),
                            })}
                          </option>
                          {programLevelsData?.data?.map((level) => (
                            <option key={level.id} value={level.id}>
                              {level.name} ({level.code})
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Academic Dates Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("common.forms.academic_dates", {
                    defaultValue: "Academic Dates",
                  })}
                </Text>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={4}
                >
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.admission_date}
                      errorText={errors.admission_date?.message}
                      label={t("common.tables.admission")}
                      helperText={t("common.forms.helper_admission_date", {
                        defaultValue: "Date when the student was admitted",
                      })}
                    >
                      <Input
                        {...register("admission_date", {
                          required: t("common.forms.required"),
                        })}
                        type="date"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.expected_graduation_date}
                      errorText={errors.expected_graduation_date?.message}
                      label={t("common.forms.expected_grad", {
                        defaultValue: "Expected Graduation Date",
                      })}
                      helperText={t("common.forms.helper_expected_grad", {
                        defaultValue: "Anticipated graduation date (optional)",
                      })}
                    >
                      <Input
                        {...register("expected_graduation_date")}
                        type="date"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.actual_graduation_date}
                      errorText={errors.actual_graduation_date?.message}
                      label={t("common.forms.actual_grad", {
                        defaultValue: "Actual Graduation Date",
                      })}
                      helperText={t("common.forms.helper_actual_grad", {
                        defaultValue:
                          "Actual graduation date if already graduated (optional)",
                      })}
                    >
                      <Input
                        {...register("actual_graduation_date")}
                        type="date"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Academic Status & Performance Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("common.forms.academic_performance", {
                    defaultValue: "Academic Status & Performance",
                  })}
                </Text>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr 1fr" }}
                  gap={4}
                >
                  <GridItem>
                    <Field
                      invalid={!!errors.status}
                      errorText={errors.status?.message}
                      label={t("common.tables.status")}
                      helperText={t("common.forms.helper_status", {
                        defaultValue: "Current enrollment status",
                      })}
                    >
                      <select
                        {...register("status", {
                          maxLength: {
                            value: 20,
                            message: "Status cannot exceed 20 characters.",
                          },
                        })}
                        value={watchedStatus}
                        onChange={(e) => setValue("status", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: "1px solid",
                          borderColor: "var(--chakra-colors-border-default)",
                          borderRadius: "6px",
                          backgroundColor: "var(--chakra-colors-bg-default)",
                          color: "var(--chakra-colors-fg-default)",
                        }}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.gpa}
                      errorText={errors.gpa?.message}
                      label={t("common.tables.gpa")}
                      helperText={t("common.forms.helper_gpa", {
                        defaultValue:
                          "Grade Point Average (0.0 - 4.0, optional)",
                      })}
                    >
                      <Input
                        {...register("gpa", {
                          min: {
                            value: 0,
                            message: "GPA must be at least 0.0.",
                          },
                          max: {
                            value: 4,
                            message: "GPA cannot exceed 4.0.",
                          },
                          valueAsNumber: true,
                        })}
                        placeholder="e.g., 3.75"
                        type="number"
                        step="0.01"
                        min={0}
                        max={4}
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.total_credits_earned}
                      errorText={errors.total_credits_earned?.message}
                      label={t("common.forms.total_credits", {
                        defaultValue: "Total Credits Earned",
                      })}
                      helperText={t("common.forms.helper_total_credits", {
                        defaultValue: "Number of academic credits completed",
                      })}
                    >
                      <Input
                        {...register("total_credits_earned", {
                          min: {
                            value: 0,
                            message: "Credits must be at least 0.",
                          },
                          valueAsNumber: true,
                        })}
                        placeholder="e.g., 60"
                        type="number"
                        min={0}
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.current_year_level}
                      errorText={errors.current_year_level?.message}
                      label={t("common.forms.year_level", {
                        defaultValue: "Current Year Level",
                      })}
                      helperText={t("common.forms.helper_year_level", {
                        defaultValue: "Academic year level (1, 2, 3, 4...)",
                      })}
                    >
                      <Input
                        {...register("current_year_level", {
                          min: {
                            value: 1,
                            message: "Year level must be at least 1.",
                          },
                          valueAsNumber: true,
                        })}
                        placeholder="e.g., 2"
                        type="number"
                        min={1}
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Scholarship Information Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("common.forms.scholarship_info", {
                    defaultValue: "Scholarship Information",
                  })}
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4}>
                  <GridItem>
                    <Field
                      invalid={!!errors.scholarship_type}
                      errorText={errors.scholarship_type?.message}
                      label={t("common.tables.scholarship")}
                      helperText={t("common.forms.helper_scholarship", {
                        defaultValue: "Type or name of scholarship (optional)",
                      })}
                    >
                      <Input
                        {...register("scholarship_type", {
                          maxLength: {
                            value: 100,
                            message:
                              "Scholarship type cannot exceed 100 characters.",
                          },
                        })}
                        placeholder="e.g., Merit Scholarship, Athletic Scholarship"
                        type="text"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field label={t("common.tables.scholarship")}>
                      <Checkbox
                        checked={watchedIsScholarship}
                        onCheckedChange={(checked) =>
                          setValue("is_scholarship", !!checked)
                        }
                        fontSize="xs"
                        fontWeight="500"
                        colorPalette="blue"
                      >
                        {t("common.forms.has_scholarship", {
                          defaultValue: "Student has a scholarship",
                        })}
                      </Checkbox>
                      <Text fontSize="xs" color="fg.muted" mt={2}>
                        {t("common.forms.helper_has_scholarship", {
                          defaultValue:
                            "Check if the student receives any form of scholarship",
                        })}
                      </Text>
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Emergency Contact Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("common.forms.emergency_contact", {
                    defaultValue: "Emergency Contact Information",
                  })}
                </Text>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={4}
                >
                  <GridItem>
                    <Field
                      invalid={!!errors.emergency_contact_name}
                      errorText={errors.emergency_contact_name?.message}
                      label={t("common.forms.contact_name", {
                        defaultValue: "Emergency Contact Name",
                      })}
                      helperText={t("common.forms.helper_contact_name", {
                        defaultValue:
                          "Primary emergency contact person (optional)",
                      })}
                    >
                      <Input
                        {...register("emergency_contact_name", {
                          maxLength: {
                            value: 255,
                            message:
                              "Contact name cannot exceed 255 characters.",
                          },
                        })}
                        placeholder="e.g., John Doe"
                        type="text"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.emergency_contact_phone}
                      errorText={errors.emergency_contact_phone?.message}
                      label={t("common.forms.contact_phone", {
                        defaultValue: "Emergency Contact Phone",
                      })}
                      helperText={t("common.forms.helper_contact_phone", {
                        defaultValue:
                          "Phone number for emergency contact (optional)",
                      })}
                    >
                      <Input
                        {...register("emergency_contact_phone", {
                          maxLength: {
                            value: 50,
                            message:
                              "Phone number cannot exceed 50 characters.",
                          },
                        })}
                        placeholder="e.g., +1-555-123-4567"
                        type="tel"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.emergency_contact_relationship}
                      errorText={errors.emergency_contact_relationship?.message}
                      label={t("common.forms.contact_rel", {
                        defaultValue: "Emergency Contact Relationship",
                      })}
                      helperText={t("common.forms.helper_contact_rel", {
                        defaultValue: "Relationship to the student (optional)",
                      })}
                    >
                      <Input
                        {...register("emergency_contact_relationship", {
                          maxLength: {
                            value: 100,
                            message:
                              "Relationship cannot exceed 100 characters.",
                          },
                        })}
                        placeholder="e.g., Parent, Guardian, Spouse"
                        type="text"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Additional Notes Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("common.forms.additional_notes", {
                    defaultValue: "Additional Notes",
                  })}
                </Text>
                <Field
                  invalid={!!errors.notes}
                  errorText={errors.notes?.message}
                  label={t("common.forms.notes", { defaultValue: "Notes" })}
                  helperText={t("common.forms.helper_notes", {
                    defaultValue:
                      "Additional information about the student (optional)",
                  })}
                >
                  <Textarea
                    {...register("notes", {
                      maxLength: {
                        value: 2000,
                        message: "Notes cannot exceed 2000 characters.",
                      },
                    })}
                    placeholder={t("common.forms.placeholder_notes", {
                      defaultValue: "Enter any additional notes...",
                    })}
                    rows={3}
                    fontSize="xs"
                  />
                </Field>
              </GridItem>
            </Grid>
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

export default AddStudent
