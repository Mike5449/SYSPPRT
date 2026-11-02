import { Button, DialogTitle, Text } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FiTrash2 } from "react-icons/fi"

import { DepartmentsService } from "@/client"
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

interface DeleteDepartmentProps {
  id: string
}

const DeleteDepartment = ({ id }: DeleteDepartmentProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm()

  const deleteDepartment = async (id: string) => {
    await DepartmentsService.deleteDepartment({ departmentId: id })
  }

  const mutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      showSuccessToast(
        t("common.forms.success_delete", { item: t("common.departments") }),
      )
      setIsOpen(false)
    },
    onError: () => {
      showErrorToast(
        t("common.forms.error_delete", {
          item: t("common.departments"),
          defaultValue: "An error occurred while deleting the department",
        }),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries()
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
          <FiTrash2 fontSize="16px" />
          {t("common.forms.delete_item", {
            item: t("common.departments"),
            defaultValue: "Delete Department",
          })}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>
              {t("common.forms.delete_item", {
                item: t("common.departments"),
                defaultValue: "Delete Department",
              })}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>
              {t("common.forms.confirm_delete", {
                item: t("common.departments"),
                defaultValue:
                  "This department will be permanently deleted. Are you sure? You will not be able to undo this action.",
              })}
            </Text>
          </DialogBody>

          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
              >
                {t("common.forms.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              colorPalette="red"
              type="submit"
              loading={isSubmitting}
            >
              {t("common.forms.delete")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default DeleteDepartment
