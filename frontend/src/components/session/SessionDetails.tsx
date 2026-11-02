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
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FaInfoCircle } from "react-icons/fa"
import { FiEye } from "react-icons/fi"
import { MdDateRange, MdHistory, MdSchool } from "react-icons/md"

import {
  type SessionPublic,
  type SessionPublicWithAcademicYear,
  SessionsService,
} from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"

interface SessionDetailsProps {
  sessionId: string
  session?: SessionPublic
}

const SessionDetails = ({
  sessionId,
  session: initialSession,
}: SessionDetailsProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { data: session, isLoading } = useQuery({
    queryKey: ["sessions", sessionId, "with-academic-year"],
    queryFn: () =>
      SessionsService.readSessionWithAcademicYear({
        sessionId,
      }) as Promise<SessionPublicWithAcademicYear>,
    enabled: open && !!sessionId,
  })

  // Use initialSession data if loading or if we don't have the full details yet
  const displaySession = session || initialSession

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
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
            {t("session.details_title")}
          </DialogTitle>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          {isLoading && !displaySession ? (
            <Box textAlign="center" py={8}>
              <Text fontSize="sm" color="fg.muted">
                {t("common.loading")}
              </Text>
            </Box>
          ) : displaySession ? (
            <VStack gap={6} align="stretch">
              {/* Informations de base */}
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
                      {t("session.fields.name")}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                      {displaySession.name}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("session.fields.code")}
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {displaySession.code}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("session.fields.session_number")}
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {t("session.session_number_label", {
                        number: displaySession.session_number,
                      })}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("session.fields.is_active")}
                    </Text>
                    <Box
                      display="inline-block"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      bg={displaySession.is_active ? "green.100" : "red.100"}
                      color={displaySession.is_active ? "green.700" : "red.700"}
                    >
                      <Text fontSize="xs" fontWeight="600">
                        {displaySession.is_active
                          ? t("common.status.active")
                          : t("common.status.inactive")}
                      </Text>
                    </Box>
                  </GridItem>
                </Grid>
              </Box>

              {/* Dates */}
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
                    {t("common.sections.dates")}
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
                      {t("session.fields.start_date")}
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {formatDate(displaySession.start_date)}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      {t("session.fields.end_date")}
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {formatDate(displaySession.end_date)}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>

              {/* Année académique */}
              {session?.academic_year && (
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="bg.subtle"
                >
                  <Flex align="center" gap={2} mb={4}>
                    <MdSchool color="var(--chakra-colors-purple-500)" />
                    <Heading
                      fontSize="md"
                      fontWeight="600"
                      color="fg.emphasized"
                    >
                      {t("academic_year.title")}
                    </Heading>
                  </Flex>

                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                  >
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("academic_year.fields.name")}
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color="fg.emphasized"
                      >
                        {session.academic_year.name}
                      </Text>
                    </GridItem>
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("academic_year.fields.code")}
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {session.academic_year.code}
                      </Text>
                    </GridItem>
                  </Grid>
                  {session.academic_year.description && (
                    <Box mt={4}>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        {t("common.fields.description")}
                      </Text>
                      <Text fontSize="sm" fontWeight="400" color="fg.default">
                        {session.academic_year.description}
                      </Text>
                    </Box>
                  )}
                </Box>
              )}

              {/* Description */}
              {displaySession.description && (
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="bg.subtle"
                >
                  <Text
                    mb={2}
                    fontSize="xs"
                    fontWeight="600"
                    color="fg.emphasized"
                  >
                    {t("common.fields.description")}
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="400"
                    color="fg.default"
                    lineHeight="1.6"
                  >
                    {displaySession.description}
                  </Text>
                </Box>
              )}

              {/* Métadonnées */}
              <Box
                p={3}
                borderRadius="md"
                bg="bg.muted"
                borderTop="1px solid"
                borderColor="border.subtle"
              >
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                  <GridItem>
                    <Flex align="center" gap={1}>
                      <MdHistory
                        size={12}
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text fontSize="2xs" color="fg.muted">
                        {t("common.fields.created_at")}:{" "}
                        {new Date(displaySession.created_at).toLocaleString()}
                      </Text>
                    </Flex>
                  </GridItem>
                  <GridItem>
                    <Text fontSize="2xs" color="fg.muted">
                      {t("common.fields.updated_at")}:{" "}
                      {new Date(displaySession.updated_at).toLocaleString()}
                    </Text>
                  </GridItem>
                  <GridItem colSpan={2}>
                    <Text fontSize="2xs" color="fg.muted" fontFamily="mono">
                      ID: {displaySession.id}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            </VStack>
          ) : (
            <Box textAlign="center" py={8}>
              <Text fontSize="sm" color="fg.muted">
                {t("common.no_data")}
              </Text>
            </Box>
          )}
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

export default SessionDetails
