import { IconButton } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { SessionPublic } from "@/client"
import DeleteSession from "../session/DeleteSession"
import EditSession from "../session/EditSession"
import SessionDetails from "../session/SessionDetails"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface SessionActionsMenuProps {
  session: SessionPublic
}

export const SessionActionsMenu = ({ session }: SessionActionsMenuProps) => {
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
        <SessionDetails session={session} sessionId={session.id} />
        <EditSession session={session} />
        <DeleteSession id={session.id} />
      </MenuContent>
    </MenuRoot>
  )
}
