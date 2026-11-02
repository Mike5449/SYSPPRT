import { Box, Container, Heading, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { QRAttendanceScanner } from "@/components/attendance_session/QRAttendanceScanner"

export const Route = createFileRoute("/_layout/scan-attendance")({
  component: ScanAttendance,
})

function ScanAttendance() {
  const { t } = useTranslation()
  const [scannedStudent, setScannedStudent] = useState<string | null>(null)

  return (
    <Container maxW="full" py={8}>
      <VStack gap={4} align="stretch" w="full">
        <Heading size="2xl" mb={4}>
          {t("common.scan_attendance")}
        </Heading>

        {scannedStudent && (
          <Box
            p={6}
            bg="green.50"
            border="2px solid"
            borderColor="green.500"
            borderRadius="lg"
            textAlign="center"
          >
            <Text fontSize="xs" fontWeight="600" color="green.600" mb={2}>
              {t("common.student_scanned")}
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="green.800">
              {scannedStudent}
            </Text>
          </Box>
        )}

        <QRAttendanceScanner onStudentScanned={setScannedStudent} />
      </VStack>
    </Container>
  )
}
