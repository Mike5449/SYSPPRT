import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  HStack,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
  Icon,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  FaAward,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaNotesMedical,
  FaRegAddressCard,
  FaUserGraduate,
  FaUserShield,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaCalendarAlt,
  FaVenusMars,
} from "react-icons/fa"
import { FiPlus } from "react-icons/fi"

import { OpenAPI, ProgramLevelsService } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import { request as __request } from "@/client/core/request"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, handleError } from "@/utils"
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
import { PasswordInput } from "../ui/password-input"

interface StudentWithUserForm {
  // User/Account Info (Prioritized)
  email: string
  first_name: string
  last_name: string
  password: string
  confirm_password: string

  // Profile Info (New Fields)
  sex: string
  date_of_birth: string
  address: string
  phone_number: string

  // Academic Info
  user_number: string
  admission_date: string
  expected_graduation_date: string
  program_level_id: string
  current_year_level: number
  status: string

  // Scholarship & Emergency
  is_scholarship: boolean
  scholarship_type: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
  notes: string
}

const AddStudentWithUser = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<StudentWithUserForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      confirm_password: "",
      sex: "",
      date_of_birth: "",
      address: "",
      phone_number: "",
      user_number: "",
      admission_date: new Date().toISOString().split("T")[0],
      expected_graduation_date: "",
      program_level_id: "",
      current_year_level: 1,
      status: "active",
      is_scholarship: false,
      scholarship_type: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      notes: "",
    },
  })

  const isScholarship = watch("is_scholarship")

  // Load program levels
  const { data: programLevelsData, isLoading: isProgramLevelsLoading } =
    useQuery({
      queryKey: ["program_levels", { all: true }],
      queryFn: () =>
        ProgramLevelsService.readProgramLevels({ skip: 0, limit: 100 }),
    })

  const handleReset = () => {
    reset()
    setStep(1)
    setIsOpen(false)
  }

  const mutation = useMutation({
    mutationFn: (data: StudentWithUserForm) => {
      const generateUserNumber = (first: string, last: string) => {
        const f = first.charAt(0).toUpperCase()
        const l = last.charAt(0).toUpperCase()
        const rand = Math.floor(100000 + Math.random() * 900000) // 6 digits
        return `${f}${l}${rand}`
      }

      const attemptCreate = async (retryCount = 0): Promise<any> => {
        const currentData = { ...data }
        // Generate user_number if not present (or always, if we want to enforce it)
        // Since we removed the input, we always generate it here.
        currentData.user_number = generateUserNumber(
          data.first_name,
          data.last_name,
        )

        const { confirm_password, ...rest } = currentData
        // Filter empty strings for optional fields and convert dates
        const submitData = Object.fromEntries(
          Object.entries(rest).map(([k, v]) => {
            if (v === "") return [k, null]
            return [k, v]
          }),
        )

        try {
          return await __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/students/with-user",
            body: submitData,
            mediaType: "application/json",
          })
        } catch (error: any) {
          if (error.status === 409 && retryCount < 3) {
            // Check if it's specifically about user_number?
            // The API might return generic 409 for email too.
            // But if email exists, regenerating user_number won't help.
            // However, for now, let's assume if it's a conflict we might retry user_number
            // IF the error message indicates user_number.
            // If we can't parse it easily, we might just retry once or twice with a new number.
            // A simple heuristic: regenerate and retry.
            console.log("Collision detected, retrying with new user_number...")
            return attemptCreate(retryCount + 1)
          }
          throw error
        }
      }

      return attemptCreate()
    },
    onSuccess: () => {
      // ... existing success logic
      showSuccessToast(
        t("common.forms.success_create", {
          item: t("common.students"),
        }),
      )
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit: SubmitHandler<StudentWithUserForm> = (data) => {
    mutation.mutate(data)
  }

  const nextStep = async () => {
    let fieldsToValidate: Array<keyof StudentWithUserForm> = []
    if (step === 1) {
      fieldsToValidate = [
        "email",
        "first_name",
        "last_name",
        "password",
        "confirm_password",
      ]
    } else if (step === 2) {
      fieldsToValidate = ["sex", "date_of_birth", "address", "phone_number"]
    } else if (step === 3) {
      fieldsToValidate = [
        "program_level_id",
        "current_year_level",
      ]
    }

    const isStepValid = await trigger(fieldsToValidate)
    if (isStepValid) {
      setStep(step + 1)
    }
  }

  const prevStep = () => setStep(step - 1)

  return (
    <DialogRoot
      size="xl"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
      motionPreset="slide-in-bottom"
    >
      <DialogTrigger asChild>
        <Button
          value="add-student-unified"
          my={4}
          variant="ghost"
          color="black"
          border="1px solid"
          borderColor="gray.200"
          size="sm"
        >
          <FiPlus size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent borderRadius="lg" overflow="hidden">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader
            bg="gray.50"
            borderBottom="1px solid"
            borderColor="gray.100"
            py={4}
          >
            <HStack gap={3}>
              <Box bg="blue.500" p={2} borderRadius="md" color="white">
                <FaUserGraduate size={20} />
              </Box>
              <VStack align="start" gap={0}>
                <DialogTitle fontSize="xl" fontWeight="bold" color="gray.800">
                  {t("student.new_registration")}
                </DialogTitle>
                <Text fontSize="xs" color="gray.500">
                  {t("common.tables.description_student")}
                </Text>
              </VStack>
            </HStack>
          </DialogHeader>

          <DialogBody py={6}>
            {/* Custom Stepper */}
            <HStack mb={10} justify="center" gap={0} w="full">
              {[
                { id: 1, label: t("student.step_account") },
                { id: 2, label: t("student.step_profile") },
                { id: 3, label: t("student.step_academic") },
              ].map((s, i, arr) => (
                <HStack
                  key={s.id}
                  gap={0}
                  flex={i < arr.length - 1 ? 1 : "initial"}
                >
                  <VStack gap={2} position="relative" zIndex={1}>
                    <Box
                      w={10}
                      h={10}
                      rounded="full"
                      bg={step >= s.id ? "blue.500" : "gray.200"}
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="md"
                      fontWeight="bold"
                      border="4px solid"
                      borderColor="white"
                      shadow={
                        step === s.id
                          ? "0 0 0 2px var(--chakra-colors-blue-500)"
                          : "none"
                      }
                      transition="all 0.2s"
                    >
                      {step > s.id ? <FaCheck size={14} /> : s.id}
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight={step >= s.id ? "bold" : "medium"}
                      color={step >= s.id ? "blue.600" : "gray.400"}
                    >
                      {s.label}
                    </Text>
                  </VStack>
                  {i < arr.length - 1 && (
                    <Box
                      h="2px"
                      flex={1}
                      bg={step > s.id ? "blue.500" : "gray.200"}
                      mt={-6}
                      transition="all 0.3s"
                    />
                  )}
                </HStack>
              ))}
            </HStack>

            {step === 1 && (
              <VStack gap={6} align="stretch" animation="fade-in 0.3s">
                <Box
                  p={5}
                  border="1px solid"
                  borderColor="gray.100"
                  rounded="xl"
                  bg="blue.50/30"
                >
                  <HStack mb={5} gap={2} color="blue.600">
                    <FaUserShield />
                    <Text fontSize="md" fontWeight="bold">
                      {t("student.account_credentials")}
                    </Text>
                  </HStack>

                  <VStack gap={4}>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                      <GridItem colSpan={1}>
                        <Field
                          label={t("common.forms.first_name", {
                            defaultValue: "First Name",
                          })}
                          required
                          invalid={!!errors.first_name}
                          errorText={errors.first_name?.message}
                        >
                          <Input
                            {...register("first_name", { required: true })}
                            placeholder="John"
                          />
                        </Field>
                      </GridItem>
                      <GridItem colSpan={1}>
                        <Field
                          label={t("common.forms.last_name", {
                            defaultValue: "Last Name",
                          })}
                          required
                          invalid={!!errors.last_name}
                          errorText={errors.last_name?.message}
                        >
                          <Input
                            {...register("last_name", { required: true })}
                            placeholder="Doe"
                          />
                        </Field>
                      </GridItem>
                    </Grid>

                    <Field
                      required
                      invalid={!!errors.email}
                      errorText={errors.email?.message}
                      label={t("common.forms.email")}
                    >
                      <Input
                        {...register("email", {
                          required: true,
                          pattern: emailPattern,
                        })}
                        placeholder="john.doe@example.com"
                        type="email"
                      />
                    </Field>

                    <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                      <GridItem colSpan={1}>
                        <PasswordInput
                          {...register("password", {
                            required: true,
                            minLength: 8,
                          })}
                          placeholder="Password"
                          errors={errors}
                        />
                      </GridItem>
                      <GridItem colSpan={1}>
                        <PasswordInput
                          {...register("confirm_password", {
                            required: true,
                            validate: (value) =>
                              value === getValues().password || "Not match",
                          })}
                          placeholder="Confirm"
                          errors={errors}
                        />
                      </GridItem>
                    </Grid>
                  </VStack>
                </Box>
              </VStack>
            )}

            {step === 2 && (
              <VStack gap={6} align="stretch" animation="fade-in 0.3s">
                <Box
                  p={5}
                  border="1px solid"
                  borderColor="gray.200"
                  rounded="xl"
                  bg="white"
                  shadow="sm"
                >
                  <HStack mb={5} gap={2} color="purple.600">
                    <FaUserGraduate />
                    <Text fontSize="md" fontWeight="bold">
                      {t("student.personal_profile")}
                    </Text>
                  </HStack>

                  <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                    <GridItem colSpan={1}>
                      <Field label={t("student.sex") || "Sex"}>
                        <HStack gap={2} w="full">
                          <Icon color="gray.400"><FaVenusMars /></Icon>
                          <select
                            {...register("sex")}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              fontSize: "14px",
                              border: "1px solid",
                              borderColor: "var(--chakra-colors-border-default)",
                              borderRadius: "6px",
                              backgroundColor: "white",
                            }}
                          >
                            <option value="">{t("sex.select")}</option>
                            <option value="M">{t("sex.m")}</option>
                            <option value="F">{t("sex.f")}</option>
                            <option value="O">{t("sex.o")}</option>
                          </select>
                        </HStack>
                      </Field>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field label={t("student.dob") || "Date of Birth"}>
                        <HStack gap={2}>
                          <Icon color="gray.400"><FaCalendarAlt /></Icon>
                          <Input {...register("date_of_birth")} type="date" />
                        </HStack>
                      </Field>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field label={t("student.phone") || "Phone Number"}>
                        <HStack gap={2}>
                          <Icon color="gray.400"><FaPhoneAlt /></Icon>
                          <Input {...register("phone_number")} placeholder="+1..." />
                        </HStack>
                      </Field>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field label={t("student.address") || "Address"}>
                        <HStack gap={2}>
                          <Icon color="gray.400"><FaMapMarkerAlt /></Icon>
                          <Textarea {...register("address")} placeholder="123 Street..." rows={1} />
                        </HStack>
                      </Field>
                    </GridItem>
                  </Grid>
                </Box>
              </VStack>
            )}

            {step === 3 && (
              <VStack gap={6} align="stretch" animation="fade-in 0.3s">
                <Box
                  p={5}
                  border="1px solid"
                  borderColor="gray.200"
                  rounded="xl"
                  bg="white"
                  shadow="sm"
                >
                  <HStack mb={5} gap={2} color="blue.600">
                    <FaRegAddressCard />
                    <Text fontSize="md" fontWeight="bold">
                      {t("student.academic_identity")}
                    </Text>
                  </HStack>

                  <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                    <GridItem colSpan={1}>
                      <Field
                        required
                        invalid={!!errors.program_level_id}
                        errorText={errors.program_level_id?.message}
                        label={t("common.program_level")}
                      >
                        {isProgramLevelsLoading ? (
                          <Spinner size="sm" />
                        ) : (
                          <select
                            {...register("program_level_id", {
                              required: t("common.forms.required"),
                            })}
                            className="chakra-select"
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              fontSize: "14px",
                              border: "1px solid",
                              borderColor:
                                "var(--chakra-colors-border-default)",
                              borderRadius: "6px",
                              backgroundColor: "white",
                            }}
                          >
                            <option value="">
                              {t("common.forms.placeholder_select", {
                                item: t("common.program_level"),
                              })}
                            </option>
                            {programLevelsData?.data?.map((level) => (
                              <option key={level.id} value={level.id}>
                                {level.program.name} - {level.code} (
                                {level.typical_duration}y)
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field
                        label={t("common.tables.year")}
                        required
                        invalid={!!errors.current_year_level}
                        errorText={errors.current_year_level?.message}
                      >
                        <select
                          {...register("current_year_level", {
                            required: t("common.forms.required"),
                            valueAsNumber: true,
                          })}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid",
                            borderColor: "var(--chakra-colors-border-default)",
                            borderRadius: "6px",
                            backgroundColor: "white",
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <option key={num} value={num}>
                              {t("common.year")} {num}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </GridItem>


                    <GridItem colSpan={1}>
                      <Field label={t("common.tables.status")}>
                        <select
                          {...register("status")}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid",
                            borderColor: "var(--chakra-colors-border-default)",
                            borderRadius: "6px",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="active">{t("status.active")}</option>
                          <option value="suspended">{t("status.suspended")}</option>
                          <option value="graduated">{t("status.graduated")}</option>
                        </select>
                      </Field>
                    </GridItem>
                  </Grid>
                </Box>

                <Box
                  p={5}
                  border="1px solid"
                  borderColor="gray.200"
                  rounded="xl"
                  bg="white"
                  shadow="sm"
                >
                  <HStack mb={5} gap={2} color="green.600">
                    <FaAward />
                    <Text fontSize="md" fontWeight="bold">
                      {t("student.scholarship_info")}
                    </Text>
                  </HStack>

                  <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                    <GridItem colSpan={1}>
                      <HStack gap={4} h="full" align="center">
                        <Checkbox
                          id="scholarship-switch"
                          checked={isScholarship}
                          onCheckedChange={(e: {
                            checked: boolean | "indeterminate"
                          }) => setValue("is_scholarship", !!e.checked)}
                          colorPalette="blue"
                        >
                          <Text fontSize="sm" fontWeight="medium">
                            {t("student.is_scholarship")}
                          </Text>
                        </Checkbox>
                      </HStack>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field label={t("student.scholarship_type")}>
                        <select
                          {...register("scholarship_type")}
                          disabled={!isScholarship}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid",
                            borderColor: "var(--chakra-colors-border-default)",
                            borderRadius: "6px",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="">{t("common.forms.placeholder_select", { item: t("student.scholarship_type") })}</option>
                          <option value="Bourse">{t("scholarship.full")}</option>
                          <option value="Demie Bourse">{t("scholarship.half")}</option>
                        </select>
                      </Field>
                    </GridItem>
                  </Grid>
                </Box>

                <Box
                  p={5}
                  border="1px solid"
                  borderColor="gray.200"
                  rounded="xl"
                  bg="white"
                  shadow="sm"
                >
                  <HStack mb={5} gap={2} color="red.600">
                    <FaNotesMedical />
                    <Text fontSize="md" fontWeight="bold">
                      {t("student.emergency_contact")}
                    </Text>
                  </HStack>

                  <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                    <GridItem colSpan={1}>
                      <Field label={t("student.emergency_name")}>
                        <Input
                          {...register("emergency_contact_name")}
                          placeholder="Full Name"
                        />
                      </Field>
                    </GridItem>
                    <GridItem colSpan={1}>
                      <Field label={t("student.emergency_phone")}>
                        <Input
                          {...register("emergency_contact_phone")}
                          placeholder="+1 234..."
                        />
                      </Field>
                    </GridItem>
                    <GridItem colSpan={1}>
                      <Field label={t("student.emergency_relation")}>
                        <Input
                          {...register("emergency_contact_relationship")}
                          placeholder="Parent, Spouse..."
                        />
                      </Field>
                    </GridItem>
                  </Grid>
                </Box>

                <Box p={4}>
                  <Field label={t("student.notes")}>
                    <Textarea
                      {...register("notes")}
                      placeholder="Special requirements, medical notes..."
                      rows={2}
                      fontSize="sm"
                    />
                  </Field>
                </Box>
              </VStack>
            )}
          </DialogBody>

          <Box h="1px" bg="gray.100" />

          <DialogFooter py={4} bg="gray.50">
            <HStack gap={3}>
              {step === 1 ? (
                <DialogActionTrigger asChild>
                  <Button variant="ghost" colorPalette="gray">
                    {t("common.forms.cancel")}
                  </Button>
                </DialogActionTrigger>
              ) : (
                <Button
                  variant="outline"
                  colorPalette="gray"
                  onClick={prevStep}
                >
                  <FaChevronLeft size={12} style={{ marginRight: "6px" }} />{" "}
                  {t("student.back") || "Back"}
                </Button>
              )}

              {step < 3 ? (
                <Button onClick={nextStep} colorPalette="blue" px={8}>
                  {t("student.next") || "Next"}{" "}
                  <FaChevronRight size={12} style={{ marginLeft: "6px" }} />
                </Button>
              ) : (
                <Button
                  variant="solid"
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  loading={isSubmitting}
                  colorPalette="blue"
                  px={10}
                  shadow="md"
                >
                  {t("student.finish") || "Finish"}{" "}
                  <FaCheck size={12} style={{ marginLeft: "6px" }} />
                </Button>
              )}
            </HStack>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddStudentWithUser
