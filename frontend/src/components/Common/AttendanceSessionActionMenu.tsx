import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { AttendanceSessionPublic } from "@/client"
import DeleteAttendanceSession from "../attendance_session/DeleteAttendanceSession"
import EditAttendanceSession from "../attendance_session/EditAttendanceSession"
import ShowQRCode from "../attendance_session/ShowQRCode"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface AttendanceSessionActionsMenuProps {
  attendanceSession: AttendanceSessionPublic
}

export const AttendanceSessionActionsMenu = ({
  attendanceSession,
}: AttendanceSessionActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <ShowQRCode attendanceSession={attendanceSession} />
        <EditAttendanceSession attendanceSession={attendanceSession} />
        <DeleteAttendanceSession id={attendanceSession.id} />
      </MenuContent>
    </MenuRoot>
  )
}
