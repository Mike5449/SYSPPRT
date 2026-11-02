import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import {
  FaBriefcase,
  FaChalkboardTeacher,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaUserShield,
} from "react-icons/fa"
import { FiPlus } from "react-icons/fi"

import { OpenAPI } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import { request as __request } from "@/client/core/request"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, handleError } from "@/utils"
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

interface TeacherWithUserForm {
  // Teacher Info
  user_number: string
  hire_date: string
  specialization: string
  academic_rank: string
  status: string // Added status
  phone_extension: string // Added phone_extension
  // User Info
  email: string
  first_name: string
  last_name: string
  password: string
  confirm_password: string
}

const AddTeacherWithUser = () => {
  // const { t } = useTranslation()
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
    formState: { errors, isValid, isSubmitting },
  } = useForm<TeacherWithUserForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      user_number: "",
      hire_date: new Date().toISOString().split("T")[0],
      specialization: "",
      academic_rank: "",
      status: "active", // Default status
      phone_extension: "", // Default phone extension
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const handleReset = () => {
    reset()
    setStep(1)
    setIsOpen(false)
  }

  const mutation = useMutation({
    mutationFn: (data: TeacherWithUserForm) => {
      const generateUserNumber = (first: string, last: string) => {
        const f = first.charAt(0).toUpperCase()
        const l = last.charAt(0).toUpperCase()
        const rand = Math.floor(100000 + Math.random() * 900000) // 6 digits
        return `${f}${l}${rand}`
      }

      const attemptCreate = async (retryCount = 0): Promise<any> => {
        const currentData = { ...data }
        currentData.user_number = generateUserNumber(
          data.first_name,
          data.last_name,
        )

        const { confirm_password, ...rest } = currentData
        // Filter out empty strings for optional fields
        const submitData = Object.fromEntries(
          Object.entries(rest).filter(([_, v]) => v !== ""),
        )

        try {
          return await __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/teachers/with-user",
            body: submitData,
            mediaType: "application/json",
          })
        } catch (error: any) {
          if (error.status === 409 && retryCount < 3) {
            console.log("Collision detected, retrying with new user_number...")
            return attemptCreate(retryCount + 1)
          }
          throw error
        }
      }

      return attemptCreate()
    },
    onSuccess: () => {
      showSuccessToast("Teacher and User created successfully.")
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit: SubmitHandler<TeacherWithUserForm> = (data) => {
    mutation.mutate(data)
  }

  const nextStep = async () => {
    let fieldsToValidate: Array<keyof TeacherWithUserForm> = []
    if (step === 1) {
      fieldsToValidate = [
        "hire_date",
        "specialization",
        "academic_rank",
        "status",
        "phone_extension",
      ]
    } else if (step === 2) {
      fieldsToValidate = [
        "email",
        "first_name",
        "last_name",
        "password",
        "confirm_password",
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
          value="add-teacher-unified"
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
              <Box bg="teal.500" p={2} borderRadius="md" color="white">
                <FaChalkboardTeacher size={20} />
              </Box>
              <VStack align="start" gap={0}>
                <DialogTitle fontSize="xl" fontWeight="bold" color="gray.800">
                  New Teacher Registration
                </DialogTitle>
                <Text fontSize="xs" color="gray.500">
                  Register a new teacher and create their user account.
                </Text>
              </VStack>
            </HStack>
          </DialogHeader>

          <DialogBody py={6}>
            {/* Custom Stepper */}
            <HStack mb={10} justify="center" gap={0} w="full">
              {[
                { id: 1, label: "Professional Info" },
                { id: 2, label: "Account Details" },
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
                      bg={step >= s.id ? "teal.500" : "gray.200"}
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
                          ? "0 0 0 2px var(--chakra-colors-teal-500)"
                          : "none"
                      }
                      transition="all 0.2s"
                    >
                      {step > s.id ? <FaCheck size={14} /> : s.id}
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight={step >= s.id ? "bold" : "medium"}
                      color={step >= s.id ? "teal.600" : "gray.400"}
                    >
                      {s.label}
                    </Text>
                  </VStack>
                  {i < arr.length - 1 && (
                    <Box
                      h="2px"
                      flex={1}
                      bg={step > s.id ? "teal.500" : "gray.200"}
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
                  borderColor="gray.200"
                  rounded="xl"
                  bg="white"
                  shadow="sm"
                >
                  <HStack mb={5} gap={2} color="teal.600">
                    <FaBriefcase />
                    <Text fontSize="md" fontWeight="bold">
                      Professional Information
                    </Text>
                  </HStack>

                  <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                    <GridItem colSpan={1}>
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
                          type="date"
                        />
                      </Field>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field
                        label="Status"
                        invalid={!!errors.status}
                        errorText={errors.status?.message}
                      >
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
                          <option value="active">Active</option>
                          <option value="on_leave">On Leave</option>
                          <option value="retired">Retired</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </Field>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field
                        label="Academic Rank"
                        invalid={!!errors.academic_rank}
                        errorText={errors.academic_rank?.message}
                      >
                        <select
                          {...register("academic_rank")}
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
                          <option value="">Select rank</option>
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">
                            Associate Professor
                          </option>
                          <option value="Assistant Professor">
                            Assistant Professor
                          </option>
                          <option value="Lecturer">Lecturer</option>
                        </select>
                      </Field>
                    </GridItem>

                    <GridItem colSpan={1}>
                      <Field
                        label="Phone Extension"
                        invalid={!!errors.phone_extension}
                        errorText={errors.phone_extension?.message}
                      >
                        <Input
                          {...register("phone_extension")}
                          placeholder="e.g., x1234"
                        />
                      </Field>
                    </GridItem>

                    <GridItem colSpan={2}>
                      <Field
                        label="Specialization"
                        invalid={!!errors.specialization}
                        errorText={errors.specialization?.message}
                      >
                        <Input
                          {...register("specialization")}
                          placeholder="e.g., Computer Science, Mathematics"
                        />
                      </Field>
                    </GridItem>
                  </Grid>
                </Box>
              </VStack>
            )}

            {step === 2 && (
              <VStack gap={6} align="stretch" animation="fade-in 0.3s">
                <Box
                  p={5}
                  border="1px solid"
                  borderColor="gray.100"
                  rounded="xl"
                  bg="teal.50/30"
                >
                  <HStack mb={5} gap={2} color="teal.600">
                    <FaUserShield />
                    <Text fontSize="md" fontWeight="bold">
                      Account Credentials
                    </Text>
                  </HStack>

                  <VStack gap={4}>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                      <GridItem colSpan={1}>
                        <Field
                          label="First Name"
                          required
                          invalid={!!errors.first_name}
                          errorText={errors.first_name?.message}
                        >
                          <Input
                            {...register("first_name", {
                              required: "Required",
                            })}
                            placeholder="Jane"
                          />
                        </Field>
                      </GridItem>
                      <GridItem colSpan={1}>
                        <Field
                          label="Last Name"
                          required
                          invalid={!!errors.last_name}
                          errorText={errors.last_name?.message}
                        >
                          <Input
                            {...register("last_name", { required: "Required" })}
                            placeholder="Smith"
                          />
                        </Field>
                      </GridItem>
                    </Grid>

                    <Field
                      required
                      invalid={!!errors.email}
                      errorText={errors.email?.message}
                      label="Email"
                    >
                      <Input
                        {...register("email", {
                          required: "Email is required",
                          pattern: emailPattern,
                        })}
                        placeholder="jane.smith@example.com"
                        type="email"
                      />
                    </Field>

                    <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                      <GridItem colSpan={1}>
                        <PasswordInput
                          {...register("password", {
                            required: "Password is required",
                            minLength: {
                              value: 8,
                              message: "Min 8 chars",
                            },
                          })}
                          placeholder="Password"
                          errors={errors}
                        />
                      </GridItem>
                      <GridItem colSpan={1}>
                        <PasswordInput
                          {...register("confirm_password", {
                            required: "Confirm Password",
                            validate: (value) =>
                              value === getValues().password ||
                              "Passwords do not match",
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
          </DialogBody>

          <Box h="1px" bg="gray.100" />

          <DialogFooter py={4} bg="gray.50">
            <HStack gap={3}>
              {step === 1 ? (
                <DialogActionTrigger asChild>
                  <Button variant="ghost" colorPalette="gray">
                    Cancel
                  </Button>
                </DialogActionTrigger>
              ) : (
                <Button
                  variant="outline"
                  colorPalette="gray"
                  onClick={prevStep}
                >
                  <FaChevronLeft size={12} style={{ marginRight: "6px" }} />{" "}
                  Back
                </Button>
              )}

              {step < 2 ? (
                <Button onClick={nextStep} colorPalette="teal" px={8}>
                  Next{" "}
                  <FaChevronRight size={12} style={{ marginLeft: "6px" }} />
                </Button>
              ) : (
                <Button
                  variant="solid"
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  loading={isSubmitting}
                  colorPalette="teal"
                  px={10}
                  shadow="md"
                >
                  Finish & Create{" "}
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

export default AddTeacherWithUser
