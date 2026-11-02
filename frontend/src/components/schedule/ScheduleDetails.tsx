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
import { FaClock, FaEye } from "react-icons/fa"
import {
  MdAccessTime,
  MdBusiness,
  MdCalendarToday,
  MdClass,
  MdLocationOn,
} from "react-icons/md"

import type { SchedulePublic } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"

interface ScheduleDetailsProps {
  schedule: SchedulePublic
}

const ScheduleDetails = ({ schedule }: ScheduleDetailsProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t("common.not_available")
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    try {
      const parts = timeString.split(":")
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`
      }
      return timeString
    } catch {
      return timeString
    }
  }

  const calculateDuration = (startTime: string, endTime: string) => {
    try {
      const start = new Date(`1970-01-01T${startTime}`)
      const end = new Date(`1970-01-01T${endTime}`)
      const diffMs = end.getTime() - start.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      return hours > 0
        ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
        : `${minutes}m`
    } catch {
      return t("common.not_available")
    }
  }

  const getWeekdayName = (dayIndex: number) => {
    const weekdays = [
      t("schedule.days.sunday"),
      t("schedule.days.monday"),
      t("schedule.days.tuesday"),
      t("schedule.days.wednesday"),
      t("schedule.days.thursday"),
      t("schedule.days.friday"),
      t("schedule.days.saturday"),
    ]
    return weekdays[dayIndex] || t("common.unknown")
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
          {t("schedule.details.view")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
            {t("schedule.details.title")}
          </DialogTitle>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          <VStack gap={6} align="stretch">
            {/* Section: Timing Information */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.subtle"
              bg="bg.subtle"
            >
              <Flex align="center" gap={2} mb={4}>
                <FaClock color="var(--chakra-colors-blue-500)" />
                <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                  {t("schedule.details.timing_info")}
                </Heading>
              </Flex>

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Flex align="center" gap={2} mb={1}>
                    <MdCalendarToday
                      size="14px"
                      color="var(--chakra-colors-fg-muted)"
                    />
                    <Text fontSize="xs" fontWeight="500" color="fg.muted">
                      {t("schedule.fields.day_of_week")}
                    </Text>
                  </Flex>
                  <Badge colorPalette="blue" size="sm">
                    {getWeekdayName(schedule.day_of_week)}
                  </Badge>
                </GridItem>

                <GridItem>
                  <Flex align="center" gap={2} mb={1}>
                    <MdAccessTime
                      size="14px"
                      color="var(--chakra-colors-fg-muted)"
                    />
                    <Text fontSize="xs" fontWeight="500" color="fg.muted">
                      {t("schedule.details.duration")}
                    </Text>
                  </Flex>
                  <Text fontSize="sm" color="fg.default" fontWeight="600">
                    {calculateDuration(schedule.start_time, schedule.end_time)}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("schedule.fields.start_time")}
                  </Text>
                  <Badge colorPalette="green" size="sm" variant="solid">
                    {formatTime(schedule.start_time)}
                  </Badge>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("schedule.fields.end_time")}
                  </Text>
                  <Badge colorPalette="red" size="sm" variant="solid">
                    {formatTime(schedule.end_time)}
                  </Badge>
                </GridItem>
              </Grid>
            </Box>

            {/* Section: Location Information */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.subtle"
              bg="bg.subtle"
            >
              <Flex align="center" gap={2} mb={4}>
                <MdLocationOn color="var(--chakra-colors-green-500)" />
                <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                  {t("schedule.details.location_info")}
                </Heading>
              </Flex>

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <Flex align="center" gap={2} mb={1}>
                    <MdLocationOn
                      size="14px"
                      color="var(--chakra-colors-fg-muted)"
                    />
                    <Text fontSize="xs" fontWeight="500" color="fg.muted">
                      {t("schedule.fields.room")}
                    </Text>
                  </Flex>
                  <Text fontSize="sm" color="fg.default" fontWeight="500">
                    {schedule.room || t("common.not_specified")}
                  </Text>
                </GridItem>

                <GridItem>
                  <Flex align="center" gap={2} mb={1}>
                    <MdBusiness
                      size="14px"
                      color="var(--chakra-colors-fg-muted)"
                    />
                    <Text fontSize="xs" fontWeight="500" color="fg.muted">
                      {t("schedule.fields.building")}
                    </Text>
                  </Flex>
                  <Text fontSize="sm" color="fg.default" fontWeight="500">
                    {schedule.building || t("common.not_specified")}
                  </Text>
                </GridItem>
              </Grid>
            </Box>

            {/* Section: Course Session */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.subtle"
              bg="bg.subtle"
            >
              <Flex align="center" gap={2} mb={4}>
                <MdClass color="var(--chakra-colors-purple-500)" />
                <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                  {t("schedule.details.course_info")}
                </Heading>
              </Flex>

              <Grid templateColumns={{ base: "1fr" }} gap={4}>
                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("schedule.fields.course_session")}
                  </Text>
                  <Text fontSize="sm" color="fg.default" fontWeight="500">
                    {(schedule as any).course_session?.course_program_level
                      ?.course?.name || t("common.not_specified")}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={1}>
                    {t("common.tables.status")}
                  </Text>
                  {schedule.is_active ? (
                    <Badge colorPalette="green" variant="solid" size="sm">
                      {t("session.status.active")}
                    </Badge>
                  ) : (
                    <Badge colorPalette="red" variant="outline" size="sm">
                      {t("session.status.inactive")}
                    </Badge>
                  )}
                </GridItem>
              </Grid>
            </Box>

            {/* Section: Metadata */}
            <Box
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.subtle"
              bg="bg.muted"
            >
              <Heading fontSize="sm" fontWeight="600" color="fg.muted" mb={3}>
                {t("common.metadata")}
              </Heading>

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                <GridItem>
                  <Text fontSize="xs" color="fg.muted" mb={0.5}>
                    {t("common.tables.created")}
                  </Text>
                  <Text fontSize="xs" color="fg.default" fontWeight="500">
                    {formatDate(schedule.created_at)}
                  </Text>
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" color="fg.muted" mb={0.5}>
                    {t("common.tables.updated")}
                  </Text>
                  <Text fontSize="xs" color="fg.default" fontWeight="500">
                    {formatDate(schedule.updated_at)}
                  </Text>
                </GridItem>

                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="xs" color="fg.muted" mb={0.5}>
                    {t("common.tables.id")}
                  </Text>
                  <Text
                    fontSize="xs"
                    color="fg.default"
                    fontFamily="mono"
                    fontWeight="500"
                  >
                    {schedule.id}
                  </Text>
                </GridItem>
              </Grid>
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" size="sm">
              {t("common.close")}
            </Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default ScheduleDetails
