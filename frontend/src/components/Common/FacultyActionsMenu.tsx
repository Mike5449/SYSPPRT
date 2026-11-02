import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { FacultyPublic } from "@/client"
import DeleteFaculty from "../faculty/DeleteFaculty"
import EditFaculty from "../faculty/EditFaculty"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface FacultyActionsMenuProps {
  faculty: FacultyPublic
}

export const FacultyActionsMenu = ({ faculty }: FacultyActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditFaculty faculty={faculty} />
        <DeleteFaculty id={faculty.id} />
      </MenuContent>
    </MenuRoot>
  )
}
