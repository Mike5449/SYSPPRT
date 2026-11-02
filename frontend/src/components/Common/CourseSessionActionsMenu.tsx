import { IconButton } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { CourseSessionPublic } from "@/client"
import CourseSessionDetails from "../course_session/CourseSessionDetails"
import DeleteCourseSession from "../course_session/DeleteCourseSession"
import EditCourseSession from "../course_session/EditCourseSession"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface CourseSessionActionsMenuProps {
  courseSession: CourseSessionPublic
}

export const CourseSessionActionsMenu = ({
  courseSession,
}: CourseSessionActionsMenuProps) => {
  const { t } = useTranslation()
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton
          variant="ghost"
          color="inherit"
          aria-label={t("course.session.table.actions")}
        >
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <CourseSessionDetails courseSession={courseSession} />
        <EditCourseSession courseSession={courseSession} />
        <DeleteCourseSession id={courseSession.id} />
      </MenuContent>
    </MenuRoot>
  )
}
