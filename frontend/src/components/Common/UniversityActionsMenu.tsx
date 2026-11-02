import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { UniversityPublic } from "@/client"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"
import DeleteUniversity from "../university/DeleteUniversity"
import EditUniversity from "../university/EditUniversity"

interface UniversityActionsMenuProps {
  university: UniversityPublic
}

export const UniversityActionsMenu = ({
  university,
}: UniversityActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditUniversity university={university} />
        <DeleteUniversity id={university.id} />
      </MenuContent>
    </MenuRoot>
  )
}
