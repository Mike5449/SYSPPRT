import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  FiAlertCircle,
  FiBookOpen,
  FiClock,
  FiFileText,
  FiHash,
  FiInfo,
  FiLayers,
  FiPlus,
} from "react-icons/fi"

import { type CourseCreate, CoursesService } from "@/client"
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
import { InputGroup } from "../ui/input-group"

const AddCourse = () => {
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
  } = useForm<CourseCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      description: null,
      credits: 1,
      hours_per_week: null,
      is_mandatory: true,
      prerequisites: null,
      syllabus: null,
      is_active: true,
    },
  })

  // Watch name to auto-generate code
  const watchName = watch("name")

  useEffect(() => {
    if (watchName && watchName.length > 0) {
      // Générer le code: COURS- + 2 premières lettres + 2 numéros
      const words = watchName.trim().split(/\s+/)

      // Prendre les 2 premières lettres du premier mot
      const firstWord = words[0]
      const letters = firstWord.substring(0, 2).toUpperCase()

      // Générer 2 numéros basés sur la longueur du nom (01-99)
      const nameLength = watchName.replace(/\s+/g, "").length
      const numbers = String(((nameLength * 7) % 99) + 1).padStart(2, "0")

      const code = `COURS-${letters}${numbers}`
      setValue("code", code)
    }
  }, [watchName, setValue])

  const mutation = useMutation({
    mutationFn: (data: CourseCreate) =>
      CoursesService.createCourse({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", { item: t("common.courses") }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
    },
  })

  const onSubmit: SubmitHandler<CourseCreate> = (data) => {
    // Format data properly based on schema requirements
    const formattedData: CourseCreate = {
      ...data,
      description: data.description || null,
      hours_per_week: data.hours_per_week || null,
      prerequisites: data.prerequisites || null,
      syllabus: data.syllabus || null,
    }
    mutation.mutate(formattedData)
  }

  return (
    <DialogRoot
      size="lg"
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
          <FiPlus />
        </Button>
      </DialogTrigger>
      <DialogContent borderRadius="sm" boxShadow="xl" overflow="hidden">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
            <DialogTitle fontSize="xl" fontWeight="700" color="gray.800">
              {t("common.forms.add_new", { item: t("common.courses") })}
            </DialogTitle>
            <Text fontSize="sm" color="gray.500" mt={1}>
              {t("course.description")}
            </Text>
          </DialogHeader>

          <DialogBody py={6} bg="gray.50">
            <VStack gap={6} align="stretch">
              {/* Section 1: Basic Information */}
              <Box
                bg="white"
                p={6}
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <HStack gap={2} mb={4} color="blue.600">
                  <Icon as={FiInfo} />
                  <Text fontSize="sm" fontWeight="bold">
                    {t("common.forms.basic_info", {
                      defaultValue: "Basic Information",
                    })}
                  </Text>
                </HStack>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.name}
                      errorText={errors.name?.message}
                      label={t("common.forms.name")}
                    >
                      <InputGroup
                        startElement={<Icon as={FiBookOpen} color="gray.400" />}
                      >
                        <Input
                          {...register("name", {
                            required: t("common.forms.required"),
                            minLength: { value: 1, message: "Required" },
                            maxLength: { value: 255, message: "Too long" },
                          })}
                          placeholder="e.g., Introduction to Programming"
                          bg="white"
                        />
                      </InputGroup>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.code}
                      errorText={errors.code?.message}
                      label={t("common.forms.code")}
                      helperText={t("course.details.auto_generated")}
                    >
                      <InputGroup
                        startElement={<Icon as={FiHash} color="gray.400" />}
                      >
                        <Input
                          {...register("code", {
                            required: t("common.forms.required"),
                          })}
                          placeholder="COURS-XX00"
                          readOnly
                          variant="subtle"
                          bg="gray.50"
                          cursor="not-allowed"
                        />
                      </InputGroup>
                    </Field>
                  </GridItem>
                </Grid>
              </Box>

              {/* Section 2: Academic Configuration */}
              <Box
                bg="white"
                p={6}
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <HStack gap={2} mb={4} color="blue.600">
                  <Icon as={FiLayers} />
                  <Text fontSize="sm" fontWeight="bold">
                    {t("common.forms.academic_config", {
                      defaultValue: "Academic Configuration",
                    })}
                  </Text>
                </HStack>

                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                  gap={6}
                  mb={6}
                >
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.credits}
                      errorText={errors.credits?.message}
                      label={t("common.tables.credits")}
                    >
                      <InputGroup
                        startElement={<Icon as={FiLayers} color="gray.400" />}
                      >
                        <Input
                          {...register("credits", {
                            required: t("common.forms.required"),
                            valueAsNumber: true,
                            min: { value: 1, message: "Min 1" },
                            max: { value: 10, message: "Max 10" },
                          })}
                          type="number"
                          bg="white"
                        />
                      </InputGroup>
                    </Field>
                  </GridItem>

                  <GridItem>
                    <Field
                      invalid={!!errors.hours_per_week}
                      errorText={errors.hours_per_week?.message}
                      label={t("common.tables.hours_week")}
                    >
                      <InputGroup
                        startElement={<Icon as={FiClock} color="gray.400" />}
                      >
                        <Input
                          {...register("hours_per_week", {
                            valueAsNumber: true,
                            min: { value: 1, message: "Min 1" },
                          })}
                          placeholder="3"
                          type="number"
                          bg="white"
                        />
                      </InputGroup>
                    </Field>
                  </GridItem>
                </Grid>

                <Field label={t("course.details.status_type")}>
                  <HStack gap={8} mt={1}>
                    <Checkbox
                      checked={!!watch("is_mandatory")}
                      onCheckedChange={({ checked }) =>
                        setValue("is_mandatory", !!checked)
                      }
                    >
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium" fontSize="sm">
                          {t("course.details.mandatory")}
                        </Text>
                        <Text fontSize="10px" color="gray.500">
                          {t("course.details.mandatory_helper")}
                        </Text>
                      </VStack>
                    </Checkbox>

                    <Checkbox
                      checked={!!watch("is_active")}
                      onCheckedChange={({ checked }) =>
                        setValue("is_active", !!checked)
                      }
                    >
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium" fontSize="sm">
                          {t("course.details.active")}
                        </Text>
                        <Text fontSize="10px" color="gray.500">
                          {t("course.details.active_helper")}
                        </Text>
                      </VStack>
                    </Checkbox>
                  </HStack>
                </Field>
              </Box>

              {/* Section 3: Course Content */}
              <Box
                bg="white"
                p={6}
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <HStack gap={2} mb={4} color="blue.600">
                  <Icon as={FiFileText} />
                  <Text fontSize="sm" fontWeight="bold">
                    {t("course.details.content")}
                  </Text>
                </HStack>

                <VStack gap={4} align="stretch">
                  <Field
                    invalid={!!errors.prerequisites}
                    errorText={errors.prerequisites?.message}
                    label={t("common.tables.prerequisites")}
                  >
                    <InputGroup
                      width="full"
                      startElement={
                        <Icon as={FiAlertCircle} color="gray.400" />
                      }
                    >
                      <Input
                        {...register("prerequisites", { maxLength: 500 })}
                        placeholder="e.g., CS100, Basic Math"
                        bg="white"
                      />
                    </InputGroup>
                  </Field>

                  <Field
                    invalid={!!errors.description}
                    errorText={errors.description?.message}
                    label={t("common.forms.description")}
                  >
                    <Textarea
                      {...register("description", { maxLength: 2000 })}
                      placeholder={t("common.forms.placeholder_description")}
                      rows={3}
                      bg="white"
                    />
                  </Field>

                  <Field
                    invalid={!!errors.syllabus}
                    errorText={errors.syllabus?.message}
                    label={t("common.forms.syllabus")}
                  >
                    <Textarea
                      {...register("syllabus", { maxLength: 5000 })}
                      placeholder={t("course.details.syllabus_placeholder")}
                      rows={4}
                      bg="white"
                    />
                  </Field>
                </VStack>
              </Box>
            </VStack>
          </DialogBody>

          <DialogFooter
            borderTop="1px solid"
            borderColor="gray.100"
            bg="gray.50"
            py={4}
          >
            <DialogActionTrigger asChild>
              <Button
                variant="outline"
                colorPalette="gray"
                disabled={isSubmitting}
              >
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              colorPalette="blue"
              type="submit"
              disabled={!isValid}
              loading={isSubmitting}
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

export default AddCourse
