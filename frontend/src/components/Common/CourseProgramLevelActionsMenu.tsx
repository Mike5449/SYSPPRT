import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { CourseProgramLevelPublicWithDetails } from "@/client"
import DeleteCourseProgramLevel from "../course_program_level/DeleteCourseProgramLevel"
import EditCourseProgramLevel from "../course_program_level/EditCourseProgramLevel"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface CourseProgramLevelActionsMenuProps {
  courseProgramLevel: CourseProgramLevelPublicWithDetails
}

export const CourseProgramLevelActionsMenu = ({
  courseProgramLevel,
}: CourseProgramLevelActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit" size="sm">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditCourseProgramLevel courseProgramLevel={courseProgramLevel} />
        <DeleteCourseProgramLevel id={courseProgramLevel.id} />
      </MenuContent>
    </MenuRoot>
  )
}
