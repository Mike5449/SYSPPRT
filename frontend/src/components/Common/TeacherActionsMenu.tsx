import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { TeacherPublic } from "@/client"
import DeleteTeacher from "../teacher/DeleteTeacher"
import EditTeacher from "../teacher/EditTeacher"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface TeacherActionsMenuProps {
  teacher: TeacherPublic
}

export const TeacherActionsMenu = ({ teacher }: TeacherActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditTeacher teacher={teacher} />
        <DeleteTeacher id={teacher.id} />
      </MenuContent>
    </MenuRoot>
  )
}
