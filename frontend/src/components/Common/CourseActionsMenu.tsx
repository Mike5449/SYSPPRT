import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { CoursePublic } from "@/client"
import DeleteCourse from "../course/DeleteCourse"
import EditCourse from "../course/EditCourse"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface CourseActionsMenuProps {
  course: CoursePublic
}

export const CourseActionsMenu = ({ course }: CourseActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditCourse course={course} />
        <DeleteCourse id={course.id} />
      </MenuContent>
    </MenuRoot>
  )
}
