import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { FaChalkboardTeacher, FaEye } from "react-icons/fa"
import { MdBook, MdClass, MdDateRange, MdInfo, MdPeople } from "react-icons/md"

import type { CourseSessionPublic } from "@/client"

// Extended type with nested relations (adjust based on actual backend response)
interface CourseSessionWithRelations extends CourseSessionPublic {
  course_program_level?: {
    course?: {
      name: string
      code?: string
      description?: string
      credits?: number
    }
    program_level?: {
      name: string
      program?: {
        name: string
        code?: string
        faculty?: {
          name: string
          department?: {
            name: string
            university?: {
              name: string
              acronym?: string
            }
          }
        }
      }
    }
  }
  session?: {
    name: string
    start_date?: string
    end_date?: string
    academic_year?: string
  }
  teacher?: {
    employee_number?: string
    specialization?: string
    user?: {
      first_name: string
      last_name: string
      email: string
    }
    department?: {
      name: string
    }
  }
}

import { useTranslation } from "react-i18next"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"

interface CourseSessionDetailsProps {
  courseSession: CourseSessionWithRelations
}

const CourseSessionDetails = ({ courseSession }: CourseSessionDetailsProps) => {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t("common.tables.not_available")
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return t("common.tables.not_available")
    return new Date(dateString).toLocaleString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "green.500" : "red.500"
  }

  const getStatusLabel = (isActive: boolean) => {
    return isActive
      ? t("course.session.table.active")
      : t("course.session.table.inactive")
  }

  const getYearLevelLabel = (level: number) => {
    return t("course.details.year_level", { level })
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      size={{ base: "xs", md: "xl" }}
      placement="center"
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" w="full" justifyContent="flex-start">
          <FaEye />
          {t("common.forms.details")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
            {t("course.session.details.title")}
          </DialogTitle>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          <VStack gap={6} align="stretch">
            {/* Section: Informations générales */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.subtle"
              bg="bg.subtle"
            >
              <Flex align="center" gap={2} mb={4}>
                <MdInfo color="var(--chakra-colors-blue-500)" />
                <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                  {t("course.session.details.basic_info")}
                </Heading>
              </Flex>

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.session.details.id")}
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight="500"
                    color="fg.muted"
                    fontFamily="mono"
                  >
                    {courseSession.id}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.session.details.year_level")}
                  </Text>
                  <Text fontSize="sm" fontWeight="500" color="fg.default">
                    {getYearLevelLabel(courseSession.year_level || 1)}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.session.details.status")}
                  </Text>
                  <Box
                    display="inline-block"
                    px={3}
                    py={1}
                    borderRadius="full"
                    bg={getStatusColor(courseSession.is_active ?? true)}
                    color="white"
                  >
                    <Text fontSize="xs" fontWeight="600">
                      {getStatusLabel(courseSession.is_active ?? true)}
                    </Text>
                  </Box>
                </GridItem>

                {courseSession.classroom && (
                  <GridItem>
                    <Flex align="center" gap={2} mb={1}>
                      <MdClass
                        size={14}
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text fontSize="xs" fontWeight="500" color="fg.muted">
                        {t("course.session.details.classroom")}
                      </Text>
                    </Flex>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {courseSession.classroom}
                    </Text>
                  </GridItem>
                )}

                {courseSession.max_students && (
                  <GridItem>
                    <Flex align="center" gap={2} mb={1}>
                      <MdPeople
                        size={14}
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text fontSize="xs" fontWeight="500" color="fg.muted">
                        {t("course.session.details.capacity")}
                      </Text>
                    </Flex>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {t("course.session.details.students_count", {
                        count: courseSession.max_students,
                      })}
                    </Text>
                  </GridItem>
                )}

                {courseSession.intra_percentage !== null &&
                  courseSession.intra_percentage !== undefined && (
                    <GridItem>
                      <Flex align="center" gap={2} mb={1}>
                        <Text fontSize="xs" fontWeight="500" color="fg.muted">
                          {t("course.session.details.percentage_intra")}
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="600" color="purple.500">
                        {courseSession.intra_percentage}%
                      </Text>
                    </GridItem>
                  )}

                {courseSession.final_percentage !== null &&
                  courseSession.final_percentage !== undefined && (
                    <GridItem>
                      <Flex align="center" gap={2} mb={1}>
                        <Text fontSize="xs" fontWeight="500" color="fg.muted">
                          {t("course.session.details.percentage_final")}
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="600" color="red.500">
                        {courseSession.final_percentage}%
                      </Text>
                    </GridItem>
                  )}

                {courseSession.participation_percentage !== null &&
                  courseSession.participation_percentage !== undefined && (
                    <GridItem>
                      <Flex align="center" gap={2} mb={1}>
                        <Text fontSize="xs" fontWeight="500" color="fg.muted">
                          {t("course.session.details.percentage_participation")}
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="600" color="blue.500">
                        {courseSession.participation_percentage}%
                      </Text>
                    </GridItem>
                  )}
              </Grid>
            </Box>

            {/* Section: Cours et programme */}
            {courseSession.course_program_level && (
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdBook color="var(--chakra-colors-purple-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    {t("course.session.details.course_program")}
                  </Heading>
                </Flex>

                <VStack align="stretch" gap={3}>
                  {courseSession.course_program_level.course && (
                    <>
                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          {t("course.details.name")}
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="fg.emphasized"
                        >
                          {courseSession.course_program_level.course.name}
                        </Text>
                      </Box>

                      {courseSession.course_program_level.course.code && (
                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="500"
                            color="fg.muted"
                            mb={1}
                          >
                            {t("common.forms.code")}
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="500"
                            color="fg.default"
                            fontFamily="mono"
                          >
                            {courseSession.course_program_level.course.code}
                          </Text>
                        </Box>
                      )}

                      {courseSession.course_program_level.course
                        .description && (
                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="500"
                            color="fg.muted"
                            mb={1}
                          >
                            {t("common.forms.description")}
                          </Text>
                          <Text fontSize="sm" color="fg.default">
                            {
                              courseSession.course_program_level.course
                                .description
                            }
                          </Text>
                        </Box>
                      )}

                      {courseSession.course_program_level.course.credits && (
                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="500"
                            color="fg.muted"
                            mb={1}
                          >
                            {t("course.details.credits")}
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="500"
                            color="fg.default"
                          >
                            {t("course.details.credits_count", {
                              count:
                                courseSession.course_program_level.course
                                  .credits,
                            })}
                          </Text>
                        </Box>
                      )}
                    </>
                  )}

                  {courseSession.course_program_level.program_level && (
                    <>
                      <Box
                        mt={2}
                        pt={3}
                        borderTop="1px solid"
                        borderColor="border.subtle"
                      >
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          {t("course.details.program_level")}
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="fg.emphasized"
                        >
                          {
                            courseSession.course_program_level.program_level
                              .name
                          }
                        </Text>
                      </Box>

                      {courseSession.course_program_level.program_level
                        .program && (
                        <>
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="500"
                              color="fg.muted"
                              mb={1}
                            >
                              {t("course.details.program")}
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color="fg.default"
                            >
                              {
                                courseSession.course_program_level.program_level
                                  .program.name
                              }
                            </Text>
                          </Box>

                          {courseSession.course_program_level.program_level
                            .program.code && (
                            <Box>
                              <Text
                                fontSize="xs"
                                fontWeight="500"
                                color="fg.muted"
                                mb={1}
                              >
                                {t("common.forms.code")}
                              </Text>
                              <Text
                                fontSize="sm"
                                fontWeight="500"
                                color="fg.default"
                                fontFamily="mono"
                              >
                                {
                                  courseSession.course_program_level
                                    .program_level.program.code
                                }
                              </Text>
                            </Box>
                          )}

                          {courseSession.course_program_level.program_level
                            .program.faculty && (
                            <Box>
                              <Text
                                fontSize="xs"
                                fontWeight="500"
                                color="fg.muted"
                                mb={1}
                              >
                                {t("common.faculties")}
                              </Text>
                              <Text
                                fontSize="sm"
                                fontWeight="500"
                                color="fg.default"
                              >
                                {
                                  courseSession.course_program_level
                                    .program_level.program.faculty.name
                                }
                              </Text>
                            </Box>
                          )}

                          {courseSession.course_program_level.program_level
                            .program.faculty?.department && (
                            <Box>
                              <Text
                                fontSize="xs"
                                fontWeight="500"
                                color="fg.muted"
                                mb={1}
                              >
                                {t("common.departments")}
                              </Text>
                              <Text
                                fontSize="sm"
                                fontWeight="500"
                                color="fg.default"
                              >
                                {
                                  courseSession.course_program_level
                                    .program_level.program.faculty.department
                                    .name
                                }
                              </Text>
                            </Box>
                          )}

                          {courseSession.course_program_level.program_level
                            .program.faculty?.department?.university && (
                            <Box>
                              <Text
                                fontSize="xs"
                                fontWeight="500"
                                color="fg.muted"
                                mb={1}
                              >
                                {t("common.university")}
                              </Text>
                              <Text
                                fontSize="sm"
                                fontWeight="600"
                                color="fg.emphasized"
                              >
                                {
                                  courseSession.course_program_level
                                    .program_level.program.faculty.department
                                    .university.name
                                }
                              </Text>
                              {courseSession.course_program_level.program_level
                                .program.faculty.department.university
                                .acronym && (
                                <Text
                                  fontSize="xs"
                                  fontWeight="500"
                                  color="fg.muted"
                                >
                                  (
                                  {
                                    courseSession.course_program_level
                                      .program_level.program.faculty.department
                                      .university.acronym
                                  }
                                  )
                                </Text>
                              )}
                            </Box>
                          )}
                        </>
                      )}
                    </>
                  )}
                </VStack>
              </Box>
            )}

            {/* Section: Session académique */}
            {courseSession.session && (
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdDateRange color="var(--chakra-colors-orange-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    {t("course.session.details.academic_session")}
                  </Heading>
                </Flex>

                <VStack align="stretch" gap={3}>
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("course.session.details.session_name")}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                      {courseSession.session.name}
                    </Text>
                  </Box>

                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={3}
                  >
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("course.session.fields.start_date")}
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {formatDate(courseSession.session.start_date)}
                      </Text>
                    </GridItem>

                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("course.session.fields.end_date")}
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {formatDate(courseSession.session.end_date)}
                      </Text>
                    </GridItem>
                  </Grid>

                  {courseSession.session.academic_year && (
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("common.tables.academic_year")}
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {courseSession.session.academic_year}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}

            {/* Section: Enseignant */}
            {courseSession.teacher && (
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <FaChalkboardTeacher color="var(--chakra-colors-green-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    {t("course.session.details.teacher")}
                  </Heading>
                </Flex>

                <VStack align="stretch" gap={3}>
                  {courseSession.teacher.user && (
                    <>
                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          {t("common.forms.name")}
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color="fg.emphasized"
                        >
                          {courseSession.teacher.user.first_name}{" "}
                          {courseSession.teacher.user.last_name}
                        </Text>
                      </Box>

                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          {t("common.forms.email")}
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {courseSession.teacher.user.email}
                        </Text>
                      </Box>
                    </>
                  )}

                  {courseSession.teacher.employee_number && (
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("course.session.details.id")}
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="500"
                        color="fg.default"
                        fontFamily="mono"
                      >
                        {courseSession.teacher.employee_number}
                      </Text>
                    </Box>
                  )}

                  {courseSession.teacher.specialization && (
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("common.specialization")}
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {courseSession.teacher.specialization}
                      </Text>
                    </Box>
                  )}

                  {courseSession.teacher.department && (
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("common.departments")}
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {courseSession.teacher.department.name}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}

            {/* Section: Métadonnées */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.subtle"
              bg="bg.subtle"
            >
              <Flex align="center" gap={2} mb={4}>
                <MdDateRange color="var(--chakra-colors-gray-500)" />
                <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                  {t("course.session.details.metadata")}
                </Heading>
              </Flex>

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.session.details.created_at")}
                  </Text>
                  <Text fontSize="sm" fontWeight="500" color="fg.default">
                    {formatDateTime(courseSession.created_at)}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.session.details.updated_at")}
                  </Text>
                  <Text fontSize="sm" fontWeight="500" color="fg.default">
                    {formatDateTime(courseSession.updated_at)}
                  </Text>
                </GridItem>
              </Grid>
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" size="sm">
              {t("common.forms.close")}
            </Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default CourseSessionDetails
