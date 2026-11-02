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
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FaCalendarAlt, FaInfoCircle } from "react-icons/fa"
import { FiEye } from "react-icons/fi"
import { MdDateRange, MdHistory } from "react-icons/md"

import { type AcademicYearPublic, AcademicYearsService } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"

interface AcademicYearDetailsProps {
  academicYearId: string
  academicYear?: AcademicYearPublic
}

const AcademicYearDetails = ({
  academicYearId,
  academicYear: initialAcademicYear,
}: AcademicYearDetailsProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { data: academicYear, isLoading } = useQuery({
    queryKey: ["academic_years", academicYearId],
    queryFn: () =>
      AcademicYearsService.readAcademicYear({ academicYearId: academicYearId }),
    enabled: open && !!academicYearId,
  })

  // Use initialAcademicYear data if loading or if we don't have the full details yet
  const displayAcademicYear = academicYear || initialAcademicYear

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      size={{ base: "xs", md: "lg" }}
      placement="center"
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          w="full"
          justifyContent="flex-start"
          fontWeight="medium"
        >
          <FiEye />
          {t("common.actions.view_details")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
            Academic Year Details
          </DialogTitle>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          {isLoading && !displayAcademicYear ? (
            <Box textAlign="center" py={8}>
              <Text fontSize="sm" color="fg.muted">
                {t("common.loading")}
              </Text>
            </Box>
          ) : displayAcademicYear ? (
            <VStack gap={6} align="stretch">
              {/* Basic Information */}
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <FaInfoCircle color="var(--chakra-colors-blue-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    {t("common.sections.basic_info")}
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
                      Name
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                      {displayAcademicYear.name}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Code
                    </Text>
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color="fg.default"
                      fontFamily="mono"
                    >
                      {displayAcademicYear.code}
                    </Text>
                  </GridItem>
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Description
                    </Text>
                    <Text fontSize="sm" color="fg.default">
                      {displayAcademicYear.description || "No description"}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>

              {/* Period Information */}
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdDateRange color="var(--chakra-colors-purple-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Period
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
                      Start Date
                    </Text>
                    <Flex align="center" gap={2}>
                      <FaCalendarAlt
                        size="12px"
                        color="var(--chakra-colors-green-500)"
                      />
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {formatDate(displayAcademicYear.start_date)}
                      </Text>
                    </Flex>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      End Date
                    </Text>
                    <Flex align="center" gap={2}>
                      <FaCalendarAlt
                        size="12px"
                        color="var(--chakra-colors-red-500)"
                      />
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {formatDate(displayAcademicYear.end_date)}
                      </Text>
                    </Flex>
                  </GridItem>
                </Grid>
              </Box>

              {/* Status Information */}
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <FaInfoCircle color="var(--chakra-colors-teal-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Status
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
                      Current Year
                    </Text>
                    <Badge
                      colorPalette={
                        displayAcademicYear.is_current ? "blue" : "gray"
                      }
                      variant={
                        displayAcademicYear.is_current ? "solid" : "outline"
                      }
                      size="sm"
                    >
                      <Text fontSize="xs" fontWeight="600">
                        {displayAcademicYear.is_current ? "Yes" : "No"}
                      </Text>
                    </Badge>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Active Status
                    </Text>
                    <Badge
                      colorPalette={
                        displayAcademicYear.is_active ? "green" : "red"
                      }
                      variant={
                        displayAcademicYear.is_active ? "solid" : "outline"
                      }
                      size="sm"
                    >
                      <Text fontSize="xs" fontWeight="600">
                        {displayAcademicYear.is_active
                          ? t("common.status.active")
                          : t("common.status.inactive")}
                      </Text>
                    </Badge>
                  </GridItem>
                </Grid>
              </Box>

              {/* Metadata */}
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdHistory color="var(--chakra-colors-gray-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    {t("common.sections.metadata")}
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
                      {t("common.fields.created_at")}
                    </Text>
                    <Text fontSize="sm" color="fg.default">
                      {formatDateTime(displayAcademicYear.created_at)}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("common.fields.updated_at")}
                    </Text>
                    <Text fontSize="sm" color="fg.default">
                      {formatDateTime(displayAcademicYear.updated_at)}
                    </Text>
                  </GridItem>
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      ID
                    </Text>
                    <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                      {displayAcademicYear.id}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            </VStack>
          ) : (
            <Box textAlign="center" py={8}>
              <Text fontSize="sm" color="fg.muted">
                No academic year data available
              </Text>
            </Box>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" colorPalette="gray">
              {t("common.actions.close")}
            </Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default AcademicYearDetails
