import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { ProgramLevelPublic } from "@/client"
import DeleteProgramLevel from "../program_level/DeleteProgramLevel"
import EditProgramLevel from "../program_level/EditProgramLevel"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface ProgramLevelActionsMenuProps {
  programLevel: ProgramLevelPublic
}

export const ProgramLevelActionsMenu = ({
  programLevel,
}: ProgramLevelActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditProgramLevel programLevel={programLevel} />
        <DeleteProgramLevel id={programLevel.id} />
      </MenuContent>
    </MenuRoot>
  )
}
