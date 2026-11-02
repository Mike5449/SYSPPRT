import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { ProgramPublic } from "@/client"
import DeleteProgram from "../program/DeleteProgram"
import EditProgram from "../program/EditProgram"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface ProgramActionsMenuProps {
  program: ProgramPublic
}

export const ProgramActionsMenu = ({ program }: ProgramActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditProgram program={program} />
        <DeleteProgram id={program.id} />
      </MenuContent>
    </MenuRoot>
  )
}
