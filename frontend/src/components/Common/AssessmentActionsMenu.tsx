import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { AssessmentPublic } from "@/client"
import AssessmentDetails from "../assessment/AssessmentDetails"
import DeleteAssessment from "../assessment/DeleteAssessment"
import EditAssessment from "../assessment/EditAssessment"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

interface AssessmentActionsMenuProps {
  assessment: AssessmentPublic
}

export const AssessmentActionsMenu = ({
  assessment,
}: AssessmentActionsMenuProps) => {
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <AssessmentDetails assessment={assessment as any} />
        <EditAssessment assessment={assessment} />
        <DeleteAssessment id={assessment.id} />
      </MenuContent>
    </MenuRoot>
  )
}
