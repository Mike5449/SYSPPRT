import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { AttendanceRecordPublic } from "@/client"
import DeleteAttendanceRecord from "../attendance_record/DeleteAttendanceRecord"
import EditAttendanceRecord from "../attendance_record/EditAttendanceRecord"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface AttendanceRecordActionsMenuProps {
  attendanceRecord: AttendanceRecordPublic
}

export const AttendanceRecordActionsMenu = ({
  attendanceRecord,
}: AttendanceRecordActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditAttendanceRecord attendanceRecord={attendanceRecord} />
        <DeleteAttendanceRecord id={attendanceRecord.id} />
      </MenuContent>
    </MenuRoot>
  )
}
