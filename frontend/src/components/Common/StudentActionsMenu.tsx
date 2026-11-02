import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { StudentPublic } from "@/client"
import DeleteStudent from "../student/DeleteStudent"
import EditStudent from "../student/EditStudent"
import StudentDetails from "../student/StudentDetails"
import ChangeYearLevel from "../student/ChangeYearLevel"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface StudentActionsMenuProps {
  student: StudentPublic
}

export const StudentActionsMenu = ({ student }: StudentActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <StudentDetails student={student} />
        <EditStudent student={student} />
        <ChangeYearLevel student={student} />
        <DeleteStudent id={student.id} />
      </MenuContent>
    </MenuRoot>
  )
}
