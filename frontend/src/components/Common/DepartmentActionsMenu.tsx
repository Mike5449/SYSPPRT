import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { DepartmentPublic } from "@/client"
import DeleteDepartment from "../department/DeleteDepartment"
import EditDepartment from "../department/EditDepartment"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface DepartmentActionsMenuProps {
  department: DepartmentPublic
}

export const DepartmentActionsMenu = ({
  department,
}: DepartmentActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditDepartment department={department} />
        <DeleteDepartment id={department.id} />
      </MenuContent>
    </MenuRoot>
  )
}
