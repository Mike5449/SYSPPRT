import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  Input,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiPlus } from "react-icons/fi"

import { UniversitiesService, type UniversityCreate } from "@/client"
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

const AddUniversity = () => {
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
  } = useForm<UniversityCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      country: "",
      city: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      logo_url: "",
      description: "",
      is_active: true,
    },
  })

  const watchedIsActive = watch("is_active")

  const mutation = useMutation({
    mutationFn: (data: UniversityCreate) => {
      // Clean up data - convert empty strings to null for optional fields
      const submitData = {
        ...data,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        website: data.website?.trim() || null,
        logo_url: data.logo_url?.trim() || null,
        description: data.description?.trim() || null,
      }
      return UniversitiesService.createUniversity({ requestBody: submitData })
    },
    onSuccess: () => {
      showSuccessToast("University created successfully.")
      handleReset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
    },
  })

  const handleReset = () => {
    reset()
    setIsOpen(false)
  }

  const handleCancel = () => {
    handleReset()
  }

  const onSubmit: SubmitHandler<UniversityCreate> = (data) => {
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
          value="add-university"
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
            <DialogTitle>Add University</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} fontSize="xs" fontWeight="500" color="fg.muted">
              Register a new university with complete institutional information
              and contact details.
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
                      label="University Name"
                      helperText="Full official name of the university"
                    >
                      <Input
                        {...register("name", {
                          required: "University name is required.",
                          minLength: {
                            value: 1,
                            message: "Name must be at least 1 character.",
                          },
                          maxLength: {
                            value: 255,
                            message: "Name cannot exceed 255 characters.",
                          },
                        })}
                        placeholder="e.g., Harvard University, Stanford University"
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
                      label="University Code"
                      helperText="Short code or abbreviation for the university"
                    >
                      <Input
                        {...register("code", {
                          required: "University code is required.",
                          minLength: {
                            value: 2,
                            message: "Code must be at least 2 characters.",
                          },
                          maxLength: {
                            value: 20,
                            message: "Code cannot exceed 20 characters.",
                          },
                        })}
                        placeholder="e.g., HARV, STAN, MIT"
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

              {/* Location Information Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  Location Information
                </Text>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                  gap={4}
                  mb={4}
                >
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.country}
                      errorText={errors.country?.message}
                      label="Country"
                      helperText="Country where the university is located"
                    >
                      <Input
                        {...register("country", {
                          required: "Country is required.",
                          maxLength: {
                            value: 100,
                            message: "Country cannot exceed 100 characters.",
                          },
                        })}
                        placeholder="e.g., United States, France, Germany"
                        type="text"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.city}
                      errorText={errors.city?.message}
                      label="City"
                      helperText="City where the university is located"
                    >
                      <Input
                        {...register("city", {
                          required: "City is required.",
                          maxLength: {
                            value: 100,
                            message: "City cannot exceed 100 characters.",
                          },
                        })}
                        placeholder="e.g., Cambridge, Palo Alto, Boston"
                        type="text"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>

                <Field
                  invalid={!!errors.address}
                  errorText={errors.address?.message}
                  label="Address"
                  helperText="Full postal address (optional)"
                >
                  <Textarea
                    {...register("address", {
                      maxLength: {
                        value: 500,
                        message: "Address cannot exceed 500 characters.",
                      },
                    })}
                    placeholder="Enter complete address with street, postal code, etc."
                    rows={3}
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
                      invalid={!!errors.phone}
                      errorText={errors.phone?.message}
                      label="Phone Number"
                      helperText="Main contact phone number (optional)"
                    >
                      <Input
                        {...register("phone", {
                          maxLength: {
                            value: 50,
                            message:
                              "Phone number cannot exceed 50 characters.",
                          },
                        })}
                        placeholder="e.g., +1-617-495-1000"
                        type="tel"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.email}
                      errorText={errors.email?.message}
                      label="Email Address"
                      helperText="Main institutional email (optional)"
                    >
                      <Input
                        {...register("email", {
                          maxLength: {
                            value: 255,
                            message: "Email cannot exceed 255 characters.",
                          },
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Please enter a valid email address.",
                          },
                        })}
                        placeholder="e.g., info@university.edu"
                        type="email"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>
                </Grid>
              </GridItem>

              {/* Web Presence Section */}
              <GridItem>
                <Text
                  mb={4}
                  fontSize="xs"
                  fontWeight="600"
                  color="fg.emphasized"
                >
                  Web Presence
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Field
                      invalid={!!errors.website}
                      errorText={errors.website?.message}
                      label="Website URL"
                      helperText="Official university website (optional)"
                    >
                      <Input
                        {...register("website", {
                          maxLength: {
                            value: 255,
                            message:
                              "Website URL cannot exceed 255 characters.",
                          },
                          pattern: {
                            value:
                              /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                            message: "Please enter a valid website URL.",
                          },
                        })}
                        placeholder="e.g., https://www.university.edu"
                        type="url"
                        fontSize="xs"
                      />
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.logo_url}
                      errorText={errors.logo_url?.message}
                      label="Logo URL"
                      helperText="URL to university logo image (optional)"
                    >
                      <Input
                        {...register("logo_url", {
                          maxLength: {
                            value: 500,
                            message: "Logo URL cannot exceed 500 characters.",
                          },
                          pattern: {
                            value:
                              /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                            message: "Please enter a valid URL.",
                          },
                        })}
                        placeholder="e.g., https://www.university.edu/logo.png"
                        type="url"
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
                  Description
                </Text>
                <Field
                  invalid={!!errors.description}
                  errorText={errors.description?.message}
                  label="Description"
                  helperText="Brief description of the university (optional)"
                >
                  <Textarea
                    {...register("description", {
                      maxLength: {
                        value: 1000,
                        message: "Description cannot exceed 1000 characters.",
                      },
                    })}
                    placeholder="Enter university description, history, notable achievements, mission statement..."
                    rows={4}
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
                  Status
                </Text>
                <Field label="University Status">
                  <Checkbox
                    checked={watchedIsActive}
                    onCheckedChange={(checked) =>
                      setValue("is_active", !!checked)
                    }
                    fontSize="xs"
                    fontWeight="500"
                    colorPalette="blue"
                  >
                    Active University
                  </Checkbox>
                  <Text fontSize="xs" color="fg.muted" mt={2}>
                    University is currently active and operational
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
              Create University
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddUniversity
