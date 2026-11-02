import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FiPlus } from "react-icons/fi"

import {
  type CourseProgramLevelCreate,
  CourseProgramLevelsService,
  CoursesService,
  ProgramLevelsService,
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

const AddCourseProgramLevel = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CourseProgramLevelCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      course_id: "",
      program_level_id: "",
      year_level: 1,
      is_active: true,
    },
  })

  const isActive = watch("is_active")

  // Load courses
  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["courses", { all: true }],
    queryFn: () => CoursesService.readCourses({ skip: 0, limit: 500 }),
  })

  // Load program levels
  const { data: programLevelsData, isLoading: isProgramLevelsLoading } =
    useQuery({
      queryKey: ["program_levels", { all: true }],
      queryFn: () =>
        ProgramLevelsService.readProgramLevels({ skip: 0, limit: 500 }),
    })

  const mutation = useMutation({
    mutationFn: (data: CourseProgramLevelCreate) =>
      CourseProgramLevelsService.createCourseProgramLevel({
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_create", { item: "Course-Program Level" }),
      )
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["course_program_levels"] })
    },
  })

  const onSubmit: SubmitHandler<CourseProgramLevelCreate> = (data) => {
    const formattedData: CourseProgramLevelCreate = {
      ...data,
      year_level: Number(data.year_level),
    }
    mutation.mutate(formattedData)
  }

  const handleCancel = () => {
    reset()
    setIsOpen(false)
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
              {t("common.forms.add_new", { item: "Course-Program Level" })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={6} color="fg.muted" fontSize="xs" fontWeight="500">
              Link a course to a specific program level and year.
            </Text>

            <VStack gap={6} align="stretch">
              {/* Course and Program Level Selection */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.course_id}
                    errorText={errors.course_id?.message}
                    label={t("common.tables.course")}
                    helperText="Select the course"
                  >
                    {isCoursesLoading ? (
                      <Spinner size="sm" color="blue.500" />
                    ) : (
                      <select
                        {...register("course_id", {
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
                        <option value="">Select a course</option>
                        {coursesData?.data.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
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
                    label="Program Level"
                    helperText="Select the program level"
                  >
                    {isProgramLevelsLoading ? (
                      <Spinner size="sm" color="blue.500" />
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
                        <option value="">Select a program level</option>
                        {programLevelsData?.data.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.code} - {level.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </GridItem>
              </Grid>

              {/* Year Level and Status */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Field
                    required
                    invalid={!!errors.year_level}
                    errorText={errors.year_level?.message}
                    label="Year Level"
                    helperText="Academic year (1-7)"
                  >
                    <Input
                      {...register("year_level", {
                        required: t("common.forms.required"),
                        valueAsNumber: true,
                        min: { value: 1, message: "Must be at least 1" },
                        max: { value: 7, message: "Cannot exceed 7" },
                      })}
                      type="number"
                      placeholder="1"
                      fontSize="xs"
                      fontWeight="500"
                    />
                  </Field>
                </GridItem>

                <GridItem display="flex" alignItems="flex-end" pb={2}>
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={(checked) =>
                      setValue("is_active", !!checked.checked)
                    }
                  >
                    <Text fontSize="xs" fontWeight="500">
                      {t("common.tables.active")}
                    </Text>
                  </Checkbox>
                </GridItem>
              </Grid>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button
                variant="outline"
                colorPalette="gray"
                onClick={handleCancel}
                size="sm"
                fontSize="xs"
                fontWeight="500"
              >
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              type="submit"
              colorPalette="blue"
              loading={isSubmitting}
              disabled={!isValid || isSubmitting}
              size="sm"
              fontSize="xs"
              fontWeight="500"
            >
              {t("common.forms.create")}
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default AddCourseProgramLevel
