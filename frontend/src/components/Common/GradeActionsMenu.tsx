import { IconButton } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { GradePublic } from "@/client"
import DeleteGrade from "../grade/DeleteGrade"
import EditGrade from "../grade/EditGrade"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface GradeActionsMenuProps {
  grade: GradePublic
}

export const GradeActionsMenu = ({ grade }: GradeActionsMenuProps) => {
  const { t } = useTranslation()
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton
          variant="ghost"
          color="inherit"
          aria-label={t("common.actions")}
        >
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditGrade grade={grade} />
        <DeleteGrade id={grade.id} />
      </MenuContent>
    </MenuRoot>
  )
}
