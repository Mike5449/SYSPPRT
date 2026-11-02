import {
  Badge,
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FiCalendar, FiCheck, FiLayers, FiPlus } from "react-icons/fi"

import {
  type AcademicYearCreate,
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

interface SessionRow {
  id: number
  name: string
  code: string
  session_number: number
  start_date: string
  end_date: string
  description?: string
}

const AddAcademicYear = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Academic Year Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AcademicYearCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      code: "",
      description: null,
      start_date: "",
      end_date: "",
      is_current: true,
      is_active: true,
    },
  })

  // Watch AY dates
  const watchedStartDate = watch("start_date")
  const watchedEndDate = watch("end_date")

  // Local state for Sessions
  const [sessions, setSessions] = useState<SessionRow[]>([
    {
      id: 1,
      name: "Session 1",
      code: "S1",
      session_number: 1,
      start_date: "",
      end_date: "",
    },
    {
      id: 2,
      name: "Session 2",
      code: "S2",
      session_number: 2,
      start_date: "",
      end_date: "",
    },
  ])

  // Effect: Auto-generate AY details and propose Session dates
  useEffect(() => {
    if (watchedStartDate && watchedEndDate) {
      const start = new Date(watchedStartDate)
      const end = new Date(watchedEndDate)
      const startYear = start.getFullYear()
      const endYear = end.getFullYear()

      // 1. Auto-fill AY Name/Code
      const name = `Année Académique ${startYear}-${endYear}`
      const code = `AY${startYear}-${String(endYear).slice(-2)}`
      const description = `Année académique ${startYear}-${endYear}`

      setValue("name", name)
      setValue("code", code)
      setValue("description", description)

      // 2. Propose Session Dates (Naive logic: Split year in half roughly)
      // Only update if sessions are empty to avoid overwriting user manual edits?
      // For now, let's just pre-fill if they are empty or if we want to be helpful.
      // Let's being helpful: Reset sessions based on new AY dates.

      // Session 1: Starts with AY, Ends ~Jan/Feb (approx 5 months?)
      // Let's say S1 is Sep -> Jan, S2 is Feb -> Jun
      // But we will just use the exact start date for S1 start

      const s1Start = watchedStartDate
      // Guess S1 End: Start + 4 months?
      const s1EndObj = new Date(start)
      s1EndObj.setMonth(s1EndObj.getMonth() + 4)
      const s1End = s1EndObj.toISOString().split("T")[0]

      // Session 2: Starts S1 End + 1 day?
      const s2StartObj = new Date(s1EndObj)
      s2StartObj.setDate(s2StartObj.getDate() + 1) // Next day
      const s2Start = s2StartObj.toISOString().split("T")[0]

      const s2End = watchedEndDate

      // Generate Names/Codes
      const s1Name = `Session 1 - ${start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
      const s1Code = `S1-${startYear}`

      const s2Name = `Session 2 - ${s2StartObj.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
      const s2Code = `S2-${s2StartObj.getFullYear()}`

      setSessions([
        {
          id: 1,
          name: s1Name,
          code: s1Code,
          session_number: 1,
          start_date: s1Start,
          end_date: s1End,
          description: `Première session de l'année ${startYear}-${endYear}`,
        },
        {
          id: 2,
          name: s2Name,
          code: s2Code,
          session_number: 2,
          start_date: s2Start,
          end_date: s2End,
          description: `Deuxième session de l'année ${startYear}-${endYear}`,
        },
      ])
    }
  }, [watchedStartDate, watchedEndDate, setValue])

  // Update session field handler
  const handleSessionChange = (
    id: number,
    field: keyof SessionRow,
    value: string,
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const updated = { ...s, [field]: value }

        // Auto-update Name/Code if date changes? Maybe too aggressive.
        // Let's just update the value.
        return updated
      }),
    )
  }

  // API Mutations
  const createAcademicYearMutation = useMutation({
    mutationFn: (data: AcademicYearCreate) =>
      AcademicYearsService.createAcademicYear({ requestBody: data }),
  })

  // We need a way to run these sequentially: AY -> Session 1 -> Session 2
  const handleSubmitAll: SubmitHandler<AcademicYearCreate> = async (ayData) => {
    try {
      // 1. Create Academic Year
      const formattedAyData = {
        ...ayData,
        description: ayData.description || null,
      }
      const createdAy =
        await createAcademicYearMutation.mutateAsync(formattedAyData)

      if (!createdAy?.id) throw new Error("Failed to create Academic Year")

      // 2. Create Sessions
      for (const session of sessions) {
        const sessionData: SessionCreate = {
          academic_year_id: createdAy.id,
          name: session.name,
          code: session.code,
          session_number: session.session_number,
          start_date: session.start_date,
          end_date: session.end_date,
          description: session.description || null,
          is_active: true, // Default to active
        }
        await SessionsService.createSession({ requestBody: sessionData })
      }

      // Success
      showSuccessToast(
        t("common.forms.success_create", { item: "Academic Year & Sessions" }),
      )
      handleReset()
    } catch (error) {
      handleError(error as ApiError)
      // Ideally we would rollback here (delete AY), but for now we error out.
      showErrorToast("Error creating academic year or sessions.")
    }
  }

  const handleReset = () => {
    reset()
    setSessions([
      {
        id: 1,
        name: "Session 1",
        code: "S1",
        session_number: 1,
        start_date: "",
        end_date: "",
      },
      {
        id: 2,
        name: "Session 2",
        code: "S2",
        session_number: 2,
        start_date: "",
        end_date: "",
      },
    ])
    setIsOpen(false)
    queryClient.invalidateQueries({ queryKey: ["academic_years"] })
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
  }

  return (
    <DialogRoot
      size="xl"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        setIsOpen(open)
        if (!open) handleReset()
      }}
    >
      <DialogTrigger asChild>
        <Button
          value="add-academic-year"
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
      <DialogContent borderRadius="sm" boxShadow="xl">
        <form onSubmit={handleSubmit(handleSubmitAll)}>
          <DialogHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
            <DialogTitle fontSize="xl" fontWeight="700" color="gray.800">
              {t("common.forms.add_academic_year", {
                defaultValue: "New Academic Year Setup",
              })}
            </DialogTitle>
            <Text fontSize="sm" color="gray.500" mt={1}>
              Configure the academic year and its associated sessions in one go.
            </Text>
          </DialogHeader>

          <DialogBody py={6} bg="gray.50">
            <VStack gap={6} align="stretch">
              {/* Section 1: Academic Year Config */}
              <Box
                bg="white"
                p={6}
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color="blue.600"
                  mb={4}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <Icon as={FiCalendar} /> 1. Academic Year Configuration
                </Text>

                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}
                  gap={6}
                >
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.start_date}
                      errorText={errors.start_date?.message}
                      label={t("common.tables.start_date")}
                    >
                      <Input
                        {...register("start_date", { required: "Required" })}
                        type="date"
                      />
                    </Field>
                  </GridItem>
                  <GridItem>
                    <Field
                      required
                      invalid={!!errors.end_date}
                      errorText={errors.end_date?.message}
                      label={t("common.tables.end_date")}
                    >
                      <Input
                        {...register("end_date", { required: "Required" })}
                        type="date"
                      />
                    </Field>
                  </GridItem>
                  <GridItem>
                    <Field label="Status">
                      <HStack gap={4} mt={3}>
                        <Checkbox {...register("is_current")}>Current</Checkbox>
                        <Checkbox {...register("is_active")}>Active</Checkbox>
                      </HStack>
                    </Field>
                  </GridItem>
                </Grid>

                {/* Read-Only Generated Info */}
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                  gap={6}
                  mt={4}
                >
                  <Field label="Generated Name">
                    <Input
                      {...register("name")}
                      readOnly
                      variant="subtle"
                      size="sm"
                    />
                  </Field>
                  <Field label="Generated Code">
                    <Input
                      {...register("code")}
                      readOnly
                      variant="subtle"
                      size="sm"
                    />
                  </Field>
                </Grid>
              </Box>

              {/* Section 2: Sessions Table */}
              <Box
                bg="white"
                borderRadius="sm"
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
                overflow="hidden"
              >
                <Box
                  p={4}
                  borderBottom="1px solid"
                  borderColor="gray.100"
                  bg="gray.25"
                >
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color="blue.600"
                    display="flex"
                    alignItems="center"
                    gap={2}
                  >
                    <Icon as={FiLayers} /> 2. Sessions Configuration
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Adjust the start and end dates for each session relative to
                    the academic year.
                  </Text>
                </Box>

                <Table.Root size="sm" interactive>
                  <Table.Header bg="gray.50">
                    <Table.Row>
                      <Table.ColumnHeader width="50px">#</Table.ColumnHeader>
                      <Table.ColumnHeader>
                        Session Name / Code
                      </Table.ColumnHeader>
                      <Table.ColumnHeader width="180px">
                        Start Date
                      </Table.ColumnHeader>
                      <Table.ColumnHeader width="180px">
                        End Date
                      </Table.ColumnHeader>
                      <Table.ColumnHeader width="100px">
                        Duration
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {sessions.map((session) => {
                      // Calculate approximate duration for visual feedback
                      let duration = "-"
                      if (session.start_date && session.end_date) {
                        const start = new Date(session.start_date)
                        const end = new Date(session.end_date)
                        const months =
                          (end.getFullYear() - start.getFullYear()) * 12 +
                          (end.getMonth() - start.getMonth())
                        duration = `~${months} mo`
                      }

                      return (
                        <Table.Row key={session.id}>
                          <Table.Cell fontWeight="bold">
                            {session.session_number}
                          </Table.Cell>
                          <Table.Cell>
                            <VStack align="start" gap={0}>
                              <Text fontSize="sm" fontWeight="medium">
                                {session.name}
                              </Text>
                              <Badge
                                size="sm"
                                variant="outline"
                                colorPalette="gray"
                              >
                                {session.code}
                              </Badge>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              type="date"
                              size="sm"
                              value={session.start_date}
                              onChange={(e) =>
                                handleSessionChange(
                                  session.id,
                                  "start_date",
                                  e.target.value,
                                )
                              }
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              type="date"
                              size="sm"
                              value={session.end_date}
                              onChange={(e) =>
                                handleSessionChange(
                                  session.id,
                                  "end_date",
                                  e.target.value,
                                )
                              }
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette="blue" variant="subtle">
                              {duration}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            </VStack>
          </DialogBody>

          <DialogFooter
            borderTop="1px solid"
            borderColor="gray.100"
            pt={4}
            bg="gray.50"
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
              type="submit"
              variant="solid"
              colorPalette="blue"
              loading={isSubmitting || createAcademicYearMutation.isPending}
              disabled={isSubmitting}
            >
              <FiCheck /> Create Academic Year & Sessions
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddAcademicYear
