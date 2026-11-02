import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { EnrollmentPublic } from "@/client"
import DeleteEnrollment from "../enrollment/DeleteEnrollment"
import EditEnrollment from "../enrollment/EditEnrollment"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface EnrollmentActionsMenuProps {
  enrollment: EnrollmentPublic
}

export const EnrollmentActionsMenu = ({
  enrollment,
}: EnrollmentActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditEnrollment enrollment={enrollment} />
        <DeleteEnrollment id={enrollment.id} />
      </MenuContent>
    </MenuRoot>
  )
}
