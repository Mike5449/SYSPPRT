import {
  Box,
  Button,
  DialogTitle,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { FaQrcode } from "react-icons/fa"
import { FiClock } from "react-icons/fi"

import { type ApiError, AttendanceQrService } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { QRAttendanceGenerator } from "./QRAttendanceGenerator"

interface Props {
  scheduleId: string
  courseName?: string
  /** When set (admin only), today's session is completed and can be reopened. */
  reopenSessionId?: string
}

/**
 * "Take attendance" button shown on each timetable row. Resolves (or creates)
 * today's attendance session for the schedule, lets the teacher set the late
 * threshold, then shows the QR generator (with the end-session button). Once a
 * session has been completed for this schedule today, the backend blocks a new
 * one and we surface that message.
 */
export default function ScheduleAttendanceQR({
  scheduleId,
  courseName,
  reopenSessionId,
}: Props) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [threshold, setThreshold] = useState(15)
  const [session, setSession] = useState<{ id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      AttendanceQrService.startSessionForSchedule({
        scheduleId,
        lateThresholdMinutes: threshold,
      }),
    onSuccess: (data: any) => {
      setSession(data)
      setError(null)
    },
    onError: (err: ApiError) => {
      const detail = (err as any)?.body?.detail
      setError(
        detail === "Attendance for this course is already completed today"
          ? "La présence de ce cours a déjà été clôturée aujourd'hui."
          : typeof detail === "string"
            ? detail
            : "Impossible de démarrer la présence.",
      )
    },
  })

  const reopenMutation = useMutation({
    mutationFn: () =>
      AttendanceQrService.reopenSession({ sessionId: reopenSessionId! }),
    onSuccess: () => {
      setSession({ id: reopenSessionId! })
      setError(null)
    },
    onError: (err: ApiError) => {
      const detail = (err as any)?.body?.detail
      setError(
        typeof detail === "string"
          ? detail
          : "Impossible de reprendre la présence.",
      )
    },
  })

  const reset = () => {
    setSession(null)
    setError(null)
  }

  return (
    <DialogRoot
      size="md"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => {
        setIsOpen(open)
        if (!open) {
          reset()
          // refresh the timetable so a just-completed session hides the button
          queryClient.invalidateQueries({
            queryKey: ["attendance_sessions_today"],
          })
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="xs"
          variant="outline"
          colorPalette={reopenSessionId ? "orange" : undefined}
          borderRadius="4px"
          fontWeight="600"
        >
          <Box as="span" mr={1}>
            <FaQrcode />
          </Box>
          {reopenSessionId ? "Reprendre" : "Présence"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="700">
            Présence — {courseName || "cours"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody pb={6}>
          {session ? (
            <QRAttendanceGenerator sessionId={session.id} refreshInterval={60} />
          ) : reopenSessionId ? (
            <VStack gap={4} align="stretch">
              <Text fontSize="sm" color="fg.muted">
                Cette séance a été <b>clôturée</b> aujourd'hui. La reprendre
                supprimera les étudiants marqués <b>absents</b> (les présents et
                les retards sont conservés) et permettra à nouveau de scanner le
                QR code.
              </Text>
              {error && (
                <Text fontSize="sm" color="red.500" fontWeight="600">
                  {error}
                </Text>
              )}
              <Button
                colorPalette="orange"
                onClick={() => reopenMutation.mutate()}
                loading={reopenMutation.isPending}
              >
                Reprendre la présence
              </Button>
            </VStack>
          ) : (
            <VStack gap={4} align="stretch">
              <Text fontSize="sm" color="fg.muted">
                Un étudiant qui scanne au-delà de ce délai (à partir de la
                génération du 1ᵉʳ QR) sera compté <b>en retard</b>. À la fin de la
                séance, les étudiants qui n'ont pas scanné seront marqués{" "}
                <b>absents</b>.
              </Text>
              <HStack>
                <FiClock />
                <Text fontSize="sm">En retard après</Text>
                <Input
                  type="number"
                  min={0}
                  max={240}
                  w="90px"
                  textAlign="center"
                  value={threshold}
                  onChange={(e) =>
                    setThreshold(
                      e.target.value === ""
                        ? 0
                        : parseInt(e.target.value, 10),
                    )
                  }
                />
                <Text fontSize="sm">minutes</Text>
              </HStack>
              {error && (
                <Text fontSize="sm" color="red.500" fontWeight="600">
                  {error}
                </Text>
              )}
              <Button
                colorPalette="blue"
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
              >
                Générer le QR code
              </Button>
            </VStack>
          )}
        </DialogBody>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
