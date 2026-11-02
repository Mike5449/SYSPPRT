import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FiFileText } from "react-icons/fi"

import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import StudentTranscript from "./StudentTranscript"

interface StudentTranscriptDialogProps {
  studentNumber: string
  studentName: string
}

const StudentTranscriptDialog = ({
  studentNumber,
  studentName,
}: StudentTranscriptDialogProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [yearLevel, setYearLevel] = useState(1)
  const [sessionNumber, setSessionNumber] = useState<number | undefined>(
    undefined,
  )

  return (
    <DialogRoot
      size={{ base: "xs", md: "full" }}
      placement="center"
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FiFileText />
          {t("transcript.view_bulletin", { defaultValue: "Voir le bulletin" })}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("transcript.bulletin_for", { defaultValue: "Bulletin de" })}{" "}
            {studentName}
          </DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <VStack align="stretch" gap={4} mb={4}>
            <Box
              p={4}
              bg="bg.subtle"
              borderRadius="md"
              border="1px solid"
              borderColor="border.subtle"
            >
              <Text fontSize="xs" fontWeight="600" color="fg.emphasized" mb={3}>
                {t("transcript.filter_options", {
                  defaultValue: "Options de filtrage",
                })}
              </Text>

              <HStack gap={4}>
                <Box flex={1}>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={2}>
                    {t("transcript.year_level", { defaultValue: "Année" })}
                  </Text>
                  <select
                    value={yearLevel}
                    onChange={(e) => setYearLevel(Number(e.target.value))}
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
                    <option value={1}>Année 1</option>
                    <option value={2}>Année 2</option>
                    <option value={3}>Année 3</option>
                    <option value={4}>Année 4</option>
                    <option value={5}>Année 5</option>
                  </select>
                </Box>

                <Box flex={1}>
                  <Text fontSize="xs" fontWeight="500" color="fg.muted" mb={2}>
                    {t("transcript.session", { defaultValue: "Session" })}
                  </Text>
                  <select
                    value={sessionNumber ?? ""}
                    onChange={(e) =>
                      setSessionNumber(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
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
                    <option value="">Toutes</option>
                    <option value={1}>Session 1</option>
                    <option value={2}>Session 2</option>
                  </select>
                </Box>
              </HStack>
            </Box>

            <Box
              maxH="500px"
              overflowY="auto"
              p={4}
              bg="bg.panel"
              borderRadius="md"
              border="1px solid"
              borderColor="border.subtle"
            >
              <StudentTranscript
                studentNumber={studentNumber}
                yearLevel={yearLevel}
                sessionNumber={sessionNumber}
              />
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">
              {t("common.close", { defaultValue: "Fermer" })}
            </Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default StudentTranscriptDialog
