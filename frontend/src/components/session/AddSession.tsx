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
  AcademicYearsService,
  type SessionCreate,
  SessionsService,
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

const AddSession = () => {
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
  } = useForm<SessionCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      session_number: 1,
      start_date: "",
      end_date: "",
      description: "",
      academic_year_id: "",
      is_active: true,
    },
  })

  const watchedIsActive = watch("is_active")
  const watchedSessionNumber = watch("session_number")

  // Load academic years
  const { data: academicYearsData, isLoading: isAcademicYearsLoading } =
    useQuery({
      queryKey: ["academic_years", { all: true }],
      queryFn: () =>
        AcademicYearsService.readAcademicYears({ skip: 0, limit: 100 }),
    })

  const mutation = useMutation({
    mutationFn: (data: SessionCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        description: data.description?.trim() || null,
      }
      return SessionsService.createSession({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast(t("session.alerts.success_create"))
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<SessionCreate> = (data) => {
    mutation.mutate(data)
  }

  // Session number options (1 or 2)
  const sessionNumberOptions = [
    { value: 1, label: t("session.options.session_1") },
    { value: 2, label: t("session.options.session_2") },
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
          value="add-session"
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
            <DialogTitle>{t("session.add_title")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} fontSize="xs" fontWeight="500" color="fg.muted">
              {t("session.add_description")}
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
                  Basic Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.name}
                      errorText={errors.name?.message}
                      label="Session Name"
                      helperText="Full name of the academic session"
                    >
                      <Input
                        {...register("name", {
                          required: "Session name is required.",
                          minLength: {
                            value: 1,
                            message: "Name must be at least 1 character.",
                          },
                          maxLength: {
                            value: 100,
                            message: "Name cannot exceed 100 characters.",
                          },
                        })}
                        placeholder={t("session.placeholders.name")}
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
                      label={t("session.fields.code")}
                      helperText={t("session.fields.code_helper")}
                    >
                      <Input
                        {...register("code", {
                          required: "Session code is required.",
                          minLength: {
                            value: 1,
                            message: "Code must be at least 1 character.",
                          },
                          maxLength: {
                            value: 20,
                            message: "Code cannot exceed 20 characters.",
                          },
                        })}
                        placeholder={t("session.placeholders.code")}
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
              </GridItem>

              {/* Academic Structure Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("session.academic_structure")}
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.session_number}
                      errorText={errors.session_number?.message}
                      label={t("session.fields.session_number")}
                      helperText={t("session.fields.session_number_helper")}
                    >
                      <select
                        {...register("session_number", {
                          required: "Session number is required.",
                          min: {
                            value: 1,
                            message: "Session number must be 1 or 2.",
                          },
                          max: {
                            value: 2,
                            message: "Session number must be 1 or 2.",
                          },
                          valueAsNumber: true,
                        })}
                        value={watchedSessionNumber}
                        onChange={(e) =>
                          setValue(
                            "session_number",
                            parseInt(e.target.value, 10),
                          )
                        }
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
                        {sessionNumberOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.academic_year_id}
                      errorText={errors.academic_year_id?.message}
                      label={t("session.fields.academic_year")}
                      helperText={t("session.fields.academic_year_helper")}
                    >
                      {isAcademicYearsLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        <select
                          {...register("academic_year_id", {
                            required: "Academic year is required.",
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
                            {t("session.placeholders.select_year")}
                          </option>
                          {academicYearsData?.data?.map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name} ({year.code})
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Period Information Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("session.period_info")}
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.start_date}
                      errorText={errors.start_date?.message}
                      label={t("session.fields.start_date")}
                      helperText={t("session.fields.start_date_helper")}
                    >
                      <Input
                        {...register("start_date", {
                          required: "Start date is required.",
                        })}
                        placeholder="YYYY-MM-DD"
                        type="date"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.end_date}
                      errorText={errors.end_date?.message}
                      label={t("session.fields.end_date")}
                      helperText={t("session.fields.end_date_helper")}
                    >
                      <Input
                        {...register("end_date", {
                          required: "End date is required.",
                        })}
                        placeholder="YYYY-MM-DD"
                        type="date"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Description Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("session.fields.description")}
                </Text>
                <Field
                  invalid={!!errors.description}
                  errorText={errors.description?.message}
                  label={t("session.fields.description")}
                  helperText={t("session.fields.description_helper")}
                >
                  <Textarea
                    {...register("description", {
                      maxLength: {
                        value: 1000,
                        message: "Description cannot exceed 1000 characters.",
                      },
                    })}
                    placeholder={t("session.placeholders.description")}
                    rows={3}
                    fontSize="xs"
                  />
                </Field>
              </GridItem>

              {/* Status Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  {t("session.status_info")}
                </Text>
                <Field label={t("session.fields.status")}>
                  <Checkbox
                    checked={watchedIsActive}
                    onCheckedChange={(checked) =>
                      setValue("is_active", !!checked)
                    }
                    fontSize="xs"
                    fontWeight="500"
                    colorPalette="blue"
                  >
                    {t("session.fields.is_active")}
                  </Checkbox>
                  <Text fontSize="xs" color="fg.muted" mt={2}>
                    {t("session.fields.is_active_helper")}
                  </Text>
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
              {t("session.add_title")}
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddSession
