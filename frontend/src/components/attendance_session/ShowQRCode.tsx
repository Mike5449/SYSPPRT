import { Box, Button, DialogTitle } from "@chakra-ui/react"
import { useState } from "react"
import { FaQrcode } from "react-icons/fa"
import type { AttendanceSessionPublic } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { QRAttendanceGenerator } from "./QRAttendanceGenerator"

interface ShowQRCodeProps {
  attendanceSession: AttendanceSessionPublic
}

const ShowQRCode = ({ attendanceSession }: ShowQRCodeProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DialogRoot
      size="md"
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          w="full"
          justifyContent="start"
          fontWeight="normal"
          fontSize="sm"
          px={2}
          h="8"
        >
          <Box as="span" mr={2}>
            <FaQrcode />
          </Box>
          Show QR Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600">
            QR Code - {attendanceSession.topic || "Attendance Session"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody pb={6}>
          <QRAttendanceGenerator
            sessionId={attendanceSession.id}
            refreshInterval={attendanceSession.qr_code_refresh_interval || 60}
          />
        </DialogBody>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default ShowQRCode
