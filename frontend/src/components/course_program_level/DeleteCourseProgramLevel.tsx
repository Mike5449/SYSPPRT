import { Button, DialogTitle, Text } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FiTrash2 } from "react-icons/fi"

import { CourseProgramLevelsService } from "@/client"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"

interface DeleteCourseProgramLevelProps {
  id: string
}

const DeleteCourseProgramLevel = ({ id }: DeleteCourseProgramLevelProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm()

  const deleteCourseProgramLevel = async (id: string) => {
    await CourseProgramLevelsService.deleteCourseProgramLevel({ cplId: id })
  }

  const mutation = useMutation({
    mutationFn: deleteCourseProgramLevel,
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_delete", { item: "Course-Program Level" }),
      )
      setIsOpen(false)
    },
    onError: () => {
      showErrorToast(
        t("common.forms.error_delete", {
          item: "Course-Program Level",
          defaultValue:
            "An error occurred while deleting the course-program level",
        }),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["course_program_levels"] })
    },
  })

  const onSubmit = async () => {
    mutation.mutate(id)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      role="alertdialog"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" colorPalette="red">
          <FiTrash2 fontSize="14px" />
          {t("common.forms.delete")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
              {t("common.forms.delete_item", { item: "Course-Program Level" })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text fontSize="xs" color="fg.muted">
              {t("common.forms.confirm_delete", {
                item: "Course-Program Level",
                defaultValue:
                  "This course-program level relationship will be permanently deleted. Are you sure? You will not be able to undo this action.",
              })}
            </Text>
          </DialogBody>

          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
                size="sm"
                fontSize="xs"
                fontWeight="500"
              >
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              colorPalette="red"
              type="submit"
              loading={isSubmitting}
              size="sm"
              fontSize="xs"
              fontWeight="500"
            >
              {t("common.forms.delete")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default DeleteCourseProgramLevel
