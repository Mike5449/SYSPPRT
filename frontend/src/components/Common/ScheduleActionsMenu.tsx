import { IconButton } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { SchedulePublic } from "@/client"
import DeleteSchedule from "../schedule/DeleteSchedule"
import EditSchedule from "../schedule/EditSchedule"
import ScheduleDetails from "../schedule/ScheduleDetails"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface ScheduleActionsMenuProps {
  schedule: SchedulePublic
}

export const ScheduleActionsMenu = ({ schedule }: ScheduleActionsMenuProps) => {
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
        <ScheduleDetails schedule={schedule} />
        <EditSchedule schedule={schedule} />
        <DeleteSchedule id={schedule.id} />
      </MenuContent>
    </MenuRoot>
  )
}
