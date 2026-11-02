import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"
import { AttendanceQrService } from "@/client"

interface QRAttendanceGeneratorProps {
  sessionId: string
  refreshInterval?: number
}

export const QRAttendanceGenerator = ({
  sessionId,
  refreshInterval = 60,
}: QRAttendanceGeneratorProps) => {
  const [qrData, setQrData] = useState<{
    token: string
    expires_at: string
  } | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [ended, setEnded] = useState(false)
  const [endSummary, setEndSummary] = useState<{
    total_students?: number
    present_students?: number
    late_students?: number
    absent_students?: number
  } | null>(null)

  const mutation = useMutation({
    mutationFn: (interval: number) =>
      AttendanceQrService.generateQrToken({
        sessionId,
        refreshInterval: interval,
      }),
    onSuccess: (data) => {
      setQrData(data)
      // Base the countdown on the known interval. The backend returns a naive
      // (UTC) timestamp without a "Z", which new Date() would misread as local
      // time — this keeps the countdown and the server expiry (interval s) in sync.
      setTimeLeft(refreshInterval)
    },
  })

  const endMutation = useMutation({
    mutationFn: () => AttendanceQrService.endSession({ sessionId }),
    onSuccess: (data: any) => {
      setEnded(true)
      setQrData(null)
      setEndSummary(data)
    },
  })

  useEffect(() => {
    // Generate initial QR
    mutation.mutate(refreshInterval)

    // Cleanup on unmount
    return () => {
      setQrData(null)
    }
  }, [
    refreshInterval, // Generate initial QR
    mutation.mutate,
  ])

  useEffect(() => {
    if (ended) return
    if (timeLeft <= 0) {
      if (qrData) {
        mutation.mutate(refreshInterval)
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, qrData, mutation.mutate, refreshInterval, ended])

  if (ended) {
    return (
      <Box
        p={6}
        border="1px solid"
        borderColor="border.subtle"
        borderRadius="xl"
        bg="bg.subtle"
        textAlign="center"
      >
        <VStack gap={3}>
          <Text fontWeight="bold" fontSize="lg" color="green.600">
            Séance terminée
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Les étudiants qui n'ont pas scanné ont été marqués absents.
          </Text>
          <HStack gap={6} pt={2}>
            <VStack gap={0}>
              <Text fontSize="2xl" fontWeight="800" color="green.600">
                {endSummary?.present_students ?? 0}
              </Text>
              <Text fontSize="2xs" color="fg.muted">
                PRÉSENTS
              </Text>
            </VStack>
            <VStack gap={0}>
              <Text fontSize="2xl" fontWeight="800" color="orange.500">
                {endSummary?.late_students ?? 0}
              </Text>
              <Text fontSize="2xs" color="fg.muted">
                RETARDS
              </Text>
            </VStack>
            <VStack gap={0}>
              <Text fontSize="2xl" fontWeight="800" color="red.500">
                {endSummary?.absent_students ?? 0}
              </Text>
              <Text fontSize="2xs" color="fg.muted">
                ABSENTS
              </Text>
            </VStack>
          </HStack>
        </VStack>
      </Box>
    )
  }

  if (!qrData) {
    return <Text>Génération du QR Code...</Text>
  }

  // Generate the URL or just the token for the student app to parse
  const qrValue = JSON.stringify({
    sessionId,
    token: qrData.token,
    type: "attendance_scan",
  })

  const progressValue = (timeLeft / refreshInterval) * 100

  return (
    <Box
      p={6}
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="xl"
      bg="bg.subtle"
      textAlign="center"
    >
      <VStack gap={4}>
        <Text fontWeight="bold" fontSize="lg">
          Scanner pour enregistrer votre présence
        </Text>

        <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
          <QRCodeSVG value={qrValue} size={250} level="H" includeMargin />
        </Box>

        <VStack w="full" gap={2}>
          <HStack w="full" justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Prochain rafraîchissement :
            </Text>
            <Badge colorPalette={timeLeft < 10 ? "red" : "blue"}>
              {timeLeft}s
            </Badge>
          </HStack>
          <Box
            w="full"
            h="1.5"
            bg="bg.emphasized"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              w={`${progressValue}%`}
              h="full"
              bg={timeLeft < 10 ? "red.500" : "blue.500"}
              transition="width 1s linear"
            />
          </Box>
        </VStack>

        <HStack gap={3} pt={1}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutation.mutate(refreshInterval)}
            loading={mutation.isPending}
          >
            Rafraîchir maintenant
          </Button>
          <Button
            colorPalette="red"
            variant="solid"
            size="sm"
            onClick={() => endMutation.mutate()}
            loading={endMutation.isPending}
          >
            Terminer la séance
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
