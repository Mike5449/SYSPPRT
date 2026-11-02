import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { AcademicYearPublic } from "@/client"
import AcademicYearDetails from "../academic_year/AcademicYearDetails"
import DeleteAcademicYear from "../academic_year/DeleteAcademicYear"
import EditAcademicYear from "../academic_year/EditAcademicYear"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface AcademicYearActionsMenuProps {
  academicYear: AcademicYearPublic
}

export const AcademicYearActionsMenu = ({
  academicYear,
}: AcademicYearActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <AcademicYearDetails
          academicYearId={academicYear.id}
          academicYear={academicYear}
        />
        <EditAcademicYear academicYear={academicYear} />
        <DeleteAcademicYear id={academicYear.id} />
      </MenuContent>
    </MenuRoot>
  )
}
