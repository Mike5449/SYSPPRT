import {
    Button,
    VStack,
    Text,
    Circle,
    SimpleGrid,
    Box,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FiTrendingUp, FiCheck } from "react-icons/fi"

import { type StudentPublic, StudentsService } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import {
    DialogActionTrigger,
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"


interface ChangeYearLevelProps {
    student: StudentPublic
}

const ChangeYearLevel = ({ student }: ChangeYearLevelProps) => {
    const { t } = useTranslation()
    const [targetLevel, setTargetLevel] = useState<number>(student.current_year_level || 1)
    const [isOpen, setIsOpen] = useState(false)
    const queryClient = useQueryClient()
    const { showSuccessToast } = useCustomToast()

    // Get max levels from program typical duration
    const maxLevels = student.program_level?.typical_duration || 5
    // Current level
    const currentLevel = student.current_year_level || 1

    // Available levels up to typical duration
    const availableLevels = Array.from({ length: maxLevels }, (_, i) => i + 1)

    const mutation = useMutation({
        mutationFn: (newLevel: number) =>
            StudentsService.updateStudent({
                studentId: student.id,
                requestBody: {
                    current_year_level: newLevel,
                },
            }),
        onSuccess: () => {
            showSuccessToast(
                t("common.forms.success_update", { item: t("common.tables.year") }),
            )
            setIsOpen(false)
        },
        onError: (err: ApiError) => {
            handleError(err)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] })
        },
    })

    const handleConfirm = () => {
        mutation.mutate(targetLevel)
    }

    return (
        <DialogRoot
            open={isOpen}
            onOpenChange={({ open }) => {
                setIsOpen(open)
                if (open) setTargetLevel(student.current_year_level || 1)
            }}
            size="md"
            placement="center"
        >
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    w="full"
                    justifyContent="flex-start"
                    gap={2}
                    fontWeight="medium"
                    _hover={{ bg: "teal.50", color: "ui.main" }}
                >
                    <FiTrendingUp />
                    {t("common.forms.change_level", { defaultValue: "Changer le Niveau" })}
                </Button>
            </DialogTrigger>
            <DialogContent borderRadius="xl" shadow="2xl" border="1px solid" borderColor="teal.100">
                <DialogHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
                    <DialogTitle fontSize="lg" fontWeight="700" color="ui.main">
                        {t("common.forms.confirm_change", { defaultValue: "Changer le Niveau" })}
                    </DialogTitle>
                </DialogHeader>
                <DialogBody py={6}>
                    <VStack gap={6} align="stretch">
                        <Box p={4} bg="teal.50" borderRadius="lg" border="1px solid" borderColor="teal.100">
                            <Text fontSize="sm" color="teal.900" fontWeight="500">
                                {t("common.forms.change_year_level_msg_simple", {
                                    name: `${student.user?.first_name || ""} ${student.user?.last_name || ""}`.trim() || student.user?.email,
                                    defaultValue: "Sélectionnez le nouveau niveau pour {{name}}.",
                                })}
                            </Text>
                        </Box>

                        <Box>
                            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={3} textTransform="uppercase" letterSpacing="wider">
                                {t("common.tables.level", { defaultValue: "NIVEAU ACTUEL" })} : {currentLevel}
                            </Text>

                            <SimpleGrid columns={4} gap={3}>
                                {availableLevels.map((level) => {

                                    const isDisabled = level > currentLevel + 1
                                    const isSelected = targetLevel === level

                                    return (
                                        <Button
                                            key={level}
                                            variant={isSelected ? "solid" : "outline"}
                                            // Using ui.main for the primary color scheme
                                            css={isSelected ? { backgroundColor: "var(--chakra-colors-ui-main)", color: "white" } : {}}
                                            colorPalette={isSelected ? "teal" : "gray"}
                                            height="60px"
                                            display="flex"
                                            flexDirection="column"
                                            onClick={() => !isDisabled && setTargetLevel(level)}
                                            position="relative"
                                            transition="all 0.2s"
                                            disabled={isDisabled}
                                            opacity={isDisabled ? 0.4 : 1}
                                            cursor={isDisabled ? "not-allowed" : "pointer"}
                                            _hover={!isDisabled ? { transform: "translateY(-2px)", shadow: "md", borderColor: "ui.main" } : {}}
                                        >
                                            <Text fontSize="xs" fontWeight="400" mb={-1}>
                                                Niveau
                                            </Text>
                                            <Text fontSize="xl" fontWeight="800">
                                                {level}
                                            </Text>
                                            {isSelected && (
                                                <Circle
                                                    size="16px"
                                                    bg="white"
                                                    color="ui.main"
                                                    position="absolute"
                                                    top={1}
                                                    right={1}
                                                    shadow="sm"
                                                >
                                                    <FiCheck size={10} />
                                                </Circle>
                                            )}
                                        </Button>
                                    )
                                })}
                            </SimpleGrid>
                            <Text fontSize="2xs" color="gray.500" mt={3}>
                                * Les niveaux supérieurs au niveau suivant (N+1) sont désactivés.
                            </Text>
                        </Box>
                    </VStack>
                </DialogBody>
                <DialogFooter gap={3} borderTop="1px solid" borderColor="gray.100" pt={4}>
                    <DialogActionTrigger asChild>
                        <Button variant="ghost" colorPalette="gray" size="sm">
                            {t("common.forms.cancel")}
                        </Button>
                    </DialogActionTrigger>
                    <Button
                        css={{ backgroundColor: "var(--chakra-colors-ui-main)", color: "white" }}
                        size="sm"
                        onClick={handleConfirm}
                        loading={mutation.isPending}
                        disabled={targetLevel === currentLevel}
                        _hover={{ opacity: 0.9 }}
                    >
                        {t("common.forms.confirm")}
                    </Button>
                </DialogFooter>
                <DialogCloseTrigger />
            </DialogContent>
        </DialogRoot>
    )
}

export default ChangeYearLevel
