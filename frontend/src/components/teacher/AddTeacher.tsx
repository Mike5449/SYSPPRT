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
import { FiPlus } from "react-icons/fi"

import { type TeacherCreate, TeachersService, UsersService } from "@/client"
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

const AddTeacher = () => {
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
  } = useForm<TeacherCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      hire_date: new Date().toISOString().split("T")[0],
      status: "active",
      specialization: "",
      office_location: "",
      phone_extension: "",
      research_interests: "",
      academic_rank: "",
      max_course_load: 4,
      user_id: "",
    },
  })

  const watchedStatus = watch("status")
  const watchedAcademicRank = watch("academic_rank")

  // Load users
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users", { all: true }],
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 100 }),
  })

  const mutation = useMutation({
    mutationFn: (data: TeacherCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        specialization: data.specialization?.trim() || null,
        office_location: data.office_location?.trim() || null,
        phone_extension: data.phone_extension?.trim() || null,
        research_interests: data.research_interests?.trim() || null,
        academic_rank: data.academic_rank?.trim() || null,
      }
      return TeachersService.createTeacher({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast("Teacher created successfully.")
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<TeacherCreate> = (data) => {
    mutation.mutate(data)
  }

  // Status options
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "on_leave", label: "On Leave" },
    { value: "retired", label: "Retired" },
    { value: "terminated", label: "Terminated" },
  ]

  // Academic rank options
  const academicRankOptions = [
    { value: "", label: "Select rank" },
    { value: "Professor", label: "Professor" },
    { value: "Associate Professor", label: "Associate Professor" },
    { value: "Assistant Professor", label: "Assistant Professor" },
    { value: "Lecturer", label: "Lecturer" },
    { value: "Senior Lecturer", label: "Senior Lecturer" },
    { value: "Adjunct Professor", label: "Adjunct Professor" },
    { value: "Visiting Professor", label: "Visiting Professor" },
    { value: "Emeritus Professor", label: "Emeritus Professor" },
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
          value="add-teacher"
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
            <DialogTitle>Add Teacher</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} fontSize="xs" fontWeight="500" color="fg.muted">
              Register a new teacher with professional and academic information.
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
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={4}
                >
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.user_id}
                      errorText={errors.user_id?.message}
                      label="User Account"
                      helperText="Link to the user account for login"
                    >
                      {isUsersLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        <select
                          {...register("user_id", {
                            required: "User account is required.",
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
                          <option value="">Select user account</option>
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
                      invalid={!!errors.hire_date}
                      errorText={errors.hire_date?.message}
                      label="Hire Date"
                      helperText="Date when the teacher was hired"
                    >
                      <Input
                        {...register("hire_date", {
                          required: "Hire date is required.",
                        })}
                        type="date"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Employment & Academic Information Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  Employment & Academic Information
                </Text>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={4}
                >
                  <GridItem>
                    <Field
                      invalid={!!errors.status}
                      errorText={errors.status?.message}
                      label="Employment Status"
                      helperText="Current employment status"
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
                      invalid={!!errors.academic_rank}
                      errorText={errors.academic_rank?.message}
                      label="Academic Rank"
                      helperText="Academic position and rank (optional)"
                    >
                      <select
                        {...register("academic_rank", {
                          maxLength: {
                            value: 50,
                            message:
                              "Academic rank cannot exceed 50 characters.",
                          },
                        })}
                        value={watchedAcademicRank || ""}
                        onChange={(e) =>
                          setValue("academic_rank", e.target.value)
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
                        {academicRankOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.max_course_load}
                      errorText={errors.max_course_load?.message}
                      label="Maximum Course Load"
                      helperText="Maximum number of courses per semester"
                    >
                      <Input
                        {...register("max_course_load", {
                          min: {
                            value: 1,
                            message: "Course load must be at least 1.",
                          },
                          max: {
                            value: 20,
                            message: "Course load cannot exceed 20.",
                          },
                          valueAsNumber: true,
                        })}
                        placeholder="e.g., 4"
                        type="number"
                        min={1}
                        max={20}
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Specialization Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  Specialization
                </Text>
                <Field
                  invalid={!!errors.specialization}
                  errorText={errors.specialization?.message}
                  label="Specialization"
                  helperText="Academic specialization or field of expertise (optional)"
                >
                  <Input
                    {...register("specialization", {
                      maxLength: {
                        value: 200,
                        message: "Specialization cannot exceed 200 characters.",
                      },
                    })}
                    placeholder="e.g., Computer Science, Mathematics, Physics"
                    type="text"
                    fontSize="xs"
                  />
                </Field>
              </GridItem>

              {/* Research Interests Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  Research Interests
                </Text>
                <Field
                  invalid={!!errors.research_interests}
                  errorText={errors.research_interests?.message}
                  label="Research Interests"
                  helperText="Areas of research and academic interests (optional)"
                >
                  <Textarea
                    {...register("research_interests", {
                      maxLength: {
                        value: 1000,
                        message:
                          "Research interests cannot exceed 1000 characters.",
                      },
                    })}
                    placeholder="Describe research areas, publications, ongoing projects, areas of academic interest..."
                    rows={4}
                    fontSize="xs"
                  />
                </Field>
              </GridItem>

              {/* Contact Information Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  Contact Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Field
                      invalid={!!errors.office_location}
                      errorText={errors.office_location?.message}
                      label="Office Location"
                      helperText="Physical office location (optional)"
                    >
                      <Input
                        {...register("office_location", {
                          maxLength: {
                            value: 100,
                            message:
                              "Office location cannot exceed 100 characters.",
                          },
                        })}
                        placeholder="e.g., Building A, Room 201, Science Block 3rd Floor"
                        type="text"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.phone_extension}
                      errorText={errors.phone_extension?.message}
                      label="Phone Extension"
                      helperText="Internal phone extension (optional)"
                    >
                      <Input
                        {...register("phone_extension", {
                          maxLength: {
                            value: 20,
                            message:
                              "Phone extension cannot exceed 20 characters.",
                          },
                        })}
                        placeholder="e.g., 1234, ext. 5678"
                        type="text"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
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
              Create Teacher
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddTeacher
