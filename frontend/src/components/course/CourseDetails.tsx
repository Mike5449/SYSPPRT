import {
  Badge,
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
import { useTranslation } from "react-i18next"
import { FaBook, FaEye } from "react-icons/fa"
import { MdDateRange, MdEmail, MdPerson, MdSchool } from "react-icons/md"

import type { CourseWithSessionInfo } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"

interface CourseDetailsProps {
  course: CourseWithSessionInfo
}

const CourseDetails = ({ course }: CourseDetailsProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      size={{ base: "xs", md: "xl" }}
      placement="center"
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" colorPalette="blue">
          <FaEye />
          {t("common.forms.details")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
            {t("course.details.title")}
          </DialogTitle>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          <VStack gap={6} align="stretch">
            {/* Section: Informations du cours */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.subtle"
              bg="bg.subtle"
            >
              <Flex align="center" gap={2} mb={4}>
                <FaBook color="var(--chakra-colors-blue-500)" />
                <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                  {t("course.details.basic_info")}
                </Heading>
              </Flex>

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.details.name")}
                  </Text>
                  <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                    {course.name}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("common.forms.code")}
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    fontFamily="mono"
                    color="fg.emphasized"
                  >
                    {course.code}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.details.credits")}
                  </Text>
                  <Badge colorPalette="blue" variant="subtle" size="sm">
                    {t("course.details.credits_count", {
                      count: course.credits,
                    })}
                  </Badge>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.details.hours_week")}
                  </Text>
                  <Text fontSize="sm" fontWeight="500" color="fg.default">
                    {course.hours_per_week
                      ? `${course.hours_per_week}h`
                      : t("course.details.not_defined")}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("course.details.status_type")}
                  </Text>
                  <Badge
                    colorPalette={course.is_mandatory ? "purple" : "orange"}
                    variant="subtle"
                    size="sm"
                  >
                    {course.is_mandatory
                      ? t("course.details.mandatory")
                      : t("course.details.optional")}
                  </Badge>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("common.forms.status")}
                  </Text>
                  <Badge
                    colorPalette={course.is_active ? "green" : "red"}
                    size="sm"
                  >
                    {course.is_active
                      ? t("course.details.active")
                      : t("course.details.inactive")}
                  </Badge>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("common.tables.level")}
                  </Text>
                  <Badge colorPalette="purple" variant="subtle" size="sm">
                    {t("course.details.year_level", {
                      level:
                        course.year_level || t("common.tables.not_available"),
                    })}
                  </Badge>
                </GridItem>

                {course.description && (
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("common.forms.description")}
                    </Text>
                    <Text fontSize="sm" color="fg.default" lineHeight="1.6">
                      {course.description}
                    </Text>
                  </GridItem>
                )}

                {course.prerequisites && (
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("course.details.prerequisites")}
                    </Text>
                    <Text fontSize="sm" color="fg.default" lineHeight="1.6">
                      {course.prerequisites}
                    </Text>
                  </GridItem>
                )}

                {course.syllabus && (
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("course.details.syllabus")}
                    </Text>
                    <Text
                      fontSize="sm"
                      color="fg.default"
                      lineHeight="1.6"
                      maxH="150px"
                      overflowY="auto"
                    >
                      {course.syllabus}
                    </Text>
                  </GridItem>
                )}
              </Grid>
            </Box>

            {/* Section: Professeur */}
            {course.teacher_name && (
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdPerson color="var(--chakra-colors-green-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    {t("course.details.professor")}
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("course.details.professor_name")}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                      {course.teacher_name}
                    </Text>
                  </GridItem>

                  <GridItem>
                    <Flex align="center" gap={2}>
                      <MdEmail color="var(--chakra-colors-fg-muted)" />
                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          {t("course.details.professor_email")}
                        </Text>
                        <Text fontSize="sm" color="blue.500">
                          {course.teacher_email}
                        </Text>
                      </Box>
                    </Flex>
                  </GridItem>
                </Grid>
              </Box>
            )}

            {/* Section: Session */}
            {course.session_name && (
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
                    {t("course.details.academic_session")}
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("course.details.session_name")}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                      {course.session_name}
                    </Text>
                  </GridItem>

                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("course.details.year_semester")}
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {course.session_year} - {course.session_semester}
                    </Text>
                  </GridItem>

                  {course.session_number && (
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("course.details.session_number")}
                      </Text>
                      <Badge colorPalette="orange" variant="subtle" size="sm">
                        {t("course.details.session_number_count", {
                          number: course.session_number,
                        })}
                      </Badge>
                    </GridItem>
                  )}
                </Grid>
              </Box>
            )}

            {/* Section: Programme */}
            {course.program_level_name && (
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdSchool color="var(--chakra-colors-purple-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    {t("course.details.program")}
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr" }} gap={4}>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("course.details.program_level")}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                      {course.program_level_name}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            )}
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">{t("common.forms.close")}</Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default CourseDetails
