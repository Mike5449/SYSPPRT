import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { FaChalkboardTeacher, FaEye } from "react-icons/fa"
import {
  MdAssignment,
  MdBook,
  MdCheckCircle,
  MdDateRange,
  MdGrade,
  MdInfo,
  MdTimer,
} from "react-icons/md"

import type { AssessmentPublicWithDetails } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"

interface AssessmentDetailsProps {
  assessment: AssessmentPublicWithDetails
}

const AssessmentDetails = ({ assessment }: AssessmentDetailsProps) => {
  const [open, setOpen] = useState(false)

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getAssessmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      assignment: "Devoir",
      quiz: "Quiz",
      midterm: "Examen intermédiaire",
      final: "Examen final",
      project: "Projet",
      presentation: "Présentation",
      lab: "Laboratoire",
      participation: "Participation",
    }
    return labels[type] || type
  }

  const getAssessmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      assignment: "blue.500",
      quiz: "purple.500",
      midterm: "orange.500",
      final: "red.500",
      project: "green.500",
      presentation: "pink.500",
      lab: "cyan.500",
      participation: "teal.500",
    }
    return colors[type] || "gray.500"
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      size={{ base: "xs", md: "xl" }}
      placement="center"
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" w="full" justifyContent="flex-start">
          <FaEye />
          détails
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
            Détails de l'évaluation
          </DialogTitle>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
            {/* Section: Informations générales */}
            <GridItem>
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdInfo color="var(--chakra-colors-blue-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Informations générales
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Nom de l'évaluation
                    </Text>
                    <Text fontSize="lg" fontWeight="600" color="fg.emphasized">
                      {assessment.name}
                    </Text>
                  </GridItem>

                  {assessment.description && (
                    <GridItem colSpan={{ base: 1, md: 2 }}>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Description
                      </Text>
                      <Text fontSize="sm" color="fg.default">
                        {assessment.description}
                      </Text>
                    </GridItem>
                  )}

                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Type d'évaluation
                    </Text>
                    <Box
                      display="inline-block"
                      px={3}
                      py={1}
                      borderRadius="full"
                      bg={getAssessmentTypeColor(assessment.assessment_type)}
                      color="white"
                    >
                      <Text fontSize="xs" fontWeight="600">
                        {getAssessmentTypeLabel(assessment.assessment_type)}
                      </Text>
                    </Box>
                  </GridItem>

                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Statut
                    </Text>
                    <Box
                      display="inline-block"
                      px={3}
                      py={1}
                      borderRadius="full"
                      bg={assessment.is_published ? "green.500" : "orange.500"}
                      color="white"
                    >
                      <Text fontSize="xs" fontWeight="600">
                        {assessment.is_published ? "Publié" : "Brouillon"}
                      </Text>
                    </Box>
                  </GridItem>

                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      ID de l'évaluation
                    </Text>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      fontFamily="mono"
                    >
                      {assessment.id}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            </GridItem>

            {/* Section: Notation */}
            <GridItem>
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdGrade color="var(--chakra-colors-purple-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Notation
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Flex align="center" gap={2} mb={1}>
                      <MdGrade
                        size={14}
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text fontSize="xs" fontWeight="500" color="fg.muted">
                        Note maximale
                      </Text>
                    </Flex>
                    <Text fontSize="lg" fontWeight="600" color="fg.emphasized">
                      {assessment.max_score} pts
                    </Text>
                  </GridItem>

                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Poids dans la note finale
                    </Text>
                    <Text fontSize="lg" fontWeight="600" color="fg.emphasized">
                      {assessment.weight != null
                        ? (assessment.weight * 100).toFixed(0)
                        : "0"}
                      %
                    </Text>
                  </GridItem>

                  {assessment.passing_score && (
                    <GridItem>
                      <Flex align="center" gap={2} mb={1}>
                        <MdCheckCircle
                          size={14}
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text fontSize="xs" fontWeight="500" color="fg.muted">
                          Note de passage
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="600" color="green.600">
                        {assessment.passing_score} pts
                      </Text>
                    </GridItem>
                  )}

                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Type
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {assessment.is_mandatory ? "Obligatoire" : "Optionnel"}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            </GridItem>

            {/* Section: Planning */}
            <GridItem>
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdTimer color="var(--chakra-colors-orange-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Planning
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  {assessment.assessment_date && (
                    <GridItem>
                      <Flex align="center" gap={2} mb={1}>
                        <MdDateRange
                          size={14}
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text fontSize="xs" fontWeight="500" color="fg.muted">
                          Date de l'évaluation
                        </Text>
                      </Flex>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color="fg.emphasized"
                      >
                        {formatDate(assessment.assessment_date)}
                      </Text>
                    </GridItem>
                  )}

                  {assessment.due_date && (
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Date limite de remise
                      </Text>
                      <Text fontSize="sm" fontWeight="600" color="red.600">
                        {formatDate(assessment.due_date)}
                      </Text>
                    </GridItem>
                  )}

                  {assessment.duration_minutes && (
                    <GridItem>
                      <Flex align="center" gap={2} mb={1}>
                        <MdTimer
                          size={14}
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text fontSize="xs" fontWeight="500" color="fg.muted">
                          Durée
                        </Text>
                      </Flex>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {assessment.duration_minutes} minutes
                      </Text>
                    </GridItem>
                  )}
                </Grid>
              </Box>
            </GridItem>

            {/* Section: Instructions */}
            {assessment.instructions && (
              <GridItem colSpan={{ base: 1, md: 2 }}>
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="bg.subtle"
                >
                  <Flex align="center" gap={2} mb={4}>
                    <MdAssignment color="var(--chakra-colors-teal-500)" />
                    <Heading
                      fontSize="md"
                      fontWeight="600"
                      color="fg.emphasized"
                    >
                      Instructions
                    </Heading>
                  </Flex>
                  <Text fontSize="sm" color="fg.default" whiteSpace="pre-wrap">
                    {assessment.instructions}
                  </Text>
                </Box>
              </GridItem>
            )}

            {/* Section: Session de cours */}
            {assessment.course_session && (
              <GridItem>
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="bg.subtle"
                >
                  <Flex align="center" gap={2} mb={4}>
                    <MdBook color="var(--chakra-colors-green-500)" />
                    <Heading
                      fontSize="md"
                      fontWeight="600"
                      color="fg.emphasized"
                    >
                      Session de cours
                    </Heading>
                  </Flex>

                  <VStack align="stretch" gap={3}>
                    {assessment.course_session.course_program_level?.course && (
                      <>
                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="500"
                            color="fg.muted"
                            mb={1}
                          >
                            Cours
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color="fg.emphasized"
                          >
                            {
                              assessment.course_session.course_program_level
                                .course.name
                            }
                          </Text>
                        </Box>

                        {assessment.course_session.course_program_level.course
                          .code && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="500"
                              color="fg.muted"
                              mb={1}
                            >
                              Code du cours
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color="fg.default"
                              fontFamily="mono"
                            >
                              {
                                assessment.course_session.course_program_level
                                  .course.code
                              }
                            </Text>
                          </Box>
                        )}
                      </>
                    )}

                    {assessment.course_session.classroom && (
                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Salle de classe
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {assessment.course_session.classroom}
                        </Text>
                      </Box>
                    )}

                    {assessment.course_session.course_program_level
                      ?.program_level && (
                      <Box
                        mt={2}
                        pt={3}
                        borderTop="1px solid"
                        borderColor="border.subtle"
                      >
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Niveau de programme
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {
                            (
                              (assessment as any).course_session
                                .course_program_level?.program_level as any
                            )?.name
                          }
                        </Text>
                      </Box>
                    )}

                    {(
                      (assessment as any).course_session.course_program_level
                        ?.program_level as any
                    )?.program && (
                      <>
                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="500"
                            color="fg.muted"
                            mb={1}
                          >
                            Programme
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="500"
                            color="fg.default"
                          >
                            {
                              (
                                (assessment as any).course_session
                                  .course_program_level?.program_level as any
                              )?.program?.name
                            }
                          </Text>
                        </Box>

                        {(
                          (assessment as any).course_session
                            .course_program_level?.program_level as any
                        )?.program?.faculty && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="500"
                              color="fg.muted"
                              mb={1}
                            >
                              Faculté
                            </Text>
                            <Text
                              fontSize="sm"
                              fontWeight="500"
                              color="fg.default"
                            >
                              {
                                (
                                  (assessment as any).course_session
                                    .course_program_level?.program_level as any
                                )?.program?.faculty?.name
                              }
                            </Text>
                          </Box>
                        )}
                      </>
                    )}
                  </VStack>
                </Box>
              </GridItem>
            )}

            {/* Section: Enseignant */}
            {assessment.course_session?.teacher && (
              <GridItem>
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="bg.subtle"
                >
                  <Flex align="center" gap={2} mb={4}>
                    <FaChalkboardTeacher color="var(--chakra-colors-blue-500)" />
                    <Heading
                      fontSize="md"
                      fontWeight="600"
                      color="fg.emphasized"
                    >
                      Enseignant
                    </Heading>
                  </Flex>

                  <VStack align="stretch" gap={3}>
                    {assessment.course_session.teacher.user && (
                      <>
                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="500"
                            color="fg.muted"
                            mb={1}
                          >
                            Nom complet
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color="fg.emphasized"
                          >
                            {assessment.course_session.teacher.user.first_name}{" "}
                            {assessment.course_session.teacher.user.last_name}
                          </Text>
                        </Box>

                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="500"
                            color="fg.muted"
                            mb={1}
                          >
                            Email
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="500"
                            color="fg.default"
                          >
                            {assessment.course_session.teacher.user.email}
                          </Text>
                        </Box>
                      </>
                    )}

                    {((assessment as any).course_session.teacher as any)
                      .user_number ||
                    ((assessment as any).course_session.teacher as any)
                      .employee_number ? (
                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Numéro d'employé
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="500"
                          color="fg.default"
                          fontFamily="mono"
                        >
                          {((assessment as any).course_session.teacher as any)
                            .user_number ||
                            ((assessment as any).course_session.teacher as any)
                              .employee_number}
                        </Text>
                      </Box>
                    ) : null}
                  </VStack>
                </Box>
              </GridItem>
            )}

            {/* Section: Session académique */}
            {assessment.course_session?.session && (
              <GridItem>
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="bg.subtle"
                >
                  <Flex align="center" gap={2} mb={4}>
                    <MdDateRange color="var(--chakra-colors-purple-500)" />
                    <Heading
                      fontSize="md"
                      fontWeight="600"
                      color="fg.emphasized"
                    >
                      Session académique
                    </Heading>
                  </Flex>

                  <VStack align="stretch" gap={3}>
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Nom de la session
                      </Text>
                      <Text
                        fontSize="sm"
                        fontWeight="600"
                        color="fg.emphasized"
                      >
                        {assessment.course_session.session.name}
                      </Text>
                    </Box>

                    <Grid
                      templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                      gap={3}
                    >
                      <GridItem>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Date de début
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {formatDate(
                            assessment.course_session.session.start_date,
                          )}
                        </Text>
                      </GridItem>

                      <GridItem>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Date de fin
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {formatDate(
                            assessment.course_session.session.end_date,
                          )}
                        </Text>
                      </GridItem>
                    </Grid>

                    {((assessment.course_session.session as any)
                      .academic_year ||
                      (assessment.course_session.session as any)
                        .academic_year_id) && (
                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Année académique
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {(
                            (assessment.course_session.session as any)
                              .academic_year as any
                          )?.name ||
                            (assessment.course_session.session as any)
                              .academic_year_id}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Box>
              </GridItem>
            )}

            {/* Section: Métadonnées */}
            <GridItem>
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdDateRange color="var(--chakra-colors-gray-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Métadonnées
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Créé le
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {formatDateTime(assessment.created_at)}
                    </Text>
                  </GridItem>

                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Mis à jour le
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {formatDateTime(assessment.updated_at)}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            </GridItem>
          </Grid>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" size="sm">
              Fermer
            </Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default AssessmentDetails
