import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { FaEye, FaUserGraduate } from "react-icons/fa"
import {
  MdContactEmergency,
  MdDateRange,
  MdEmail,
  MdGrade,
  MdPhone,
  MdSchool,
} from "react-icons/md"

import { type StudentPublic, StudentsService } from "@/client"
import { useUserRoles } from "@/hooks/useUserRoles"
import RoleBadges from "../Common/RoleBadges"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import StudentTranscriptDialog from "./StudentTranscriptDialog"

interface StudentDetailsProps {
  student: StudentPublic
}

const StudentDetails = ({ student }: StudentDetailsProps) => {
  const [open, setOpen] = useState(false)

  // Fetch detailed student data
  const { data: studentDetails, isLoading } = useQuery({
    queryKey: ["student", student.id],
    queryFn: () => StudentsService.readStudent({ studentId: student.id }),
    enabled: open && !!student.id,
  })

  // Fetch user roles - Réactivé avec protection
  const { data: userRoles } = useUserRoles(studentDetails?.user?.id)

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "green.500",
      graduated: "blue.500",
      suspended: "red.500",
      on_leave: "orange.500",
      withdrawn: "gray.500",
    }
    return statusColors[status] || "gray.500"
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Actif",
      graduated: "Diplômé",
      suspended: "Suspendu",
      on_leave: "En congé",
      withdrawn: "Retiré",
    }
    return labels[status] || status
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
          Voir détails
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="600" color="fg.emphasized">
            Détails de l'étudiant
          </DialogTitle>
        </DialogHeader>

        <DialogCloseTrigger />

        <DialogBody>
          {isLoading ? (
            <Box textAlign="center" py={8}>
              <Text fontSize="sm" color="fg.muted">
                Chargement...
              </Text>
            </Box>
          ) : studentDetails ? (
            <VStack gap={6} align="stretch">
              {/* Section: Informations personnelles */}
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <FaUserGraduate color="var(--chakra-colors-blue-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Informations personnelles
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      ID Étudiant
                    </Text>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      fontFamily="mono"
                    >
                      {studentDetails.id}
                    </Text>
                  </GridItem>

                  <GridItem>
                    <Text
                      fontSize="xs"
                      fontWeight="500"
                      color="fg.muted"
                      mb={1}
                    >
                      Numéro étudiant
                    </Text>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {studentDetails.user?.user_number || "N/A"}
                    </Text>
                  </GridItem>

                  {studentDetails.user && (
                    <>
                      <GridItem>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Nom complet
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {(studentDetails.user as any).first_name ||
                            (studentDetails.user as any).last_name ||
                            studentDetails.user.email}
                        </Text>
                      </GridItem>

                      <GridItem>
                        <Flex align="center" gap={2} mb={1}>
                          <MdEmail
                            size={14}
                            color="var(--chakra-colors-fg-muted)"
                          />
                          <Text fontSize="xs" fontWeight="500" color="fg.muted">
                            Email
                          </Text>
                        </Flex>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {studentDetails.user.email}
                        </Text>
                      </GridItem>
                    </>
                  )}

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
                      bg={getStatusColor(studentDetails.status || "active")}
                      color="white"
                    >
                      <Text fontSize="xs" fontWeight="600">
                        {getStatusLabel(studentDetails.status || "active")}
                      </Text>
                    </Box>
                  </GridItem>

                  {studentDetails.user && (
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Rôles
                      </Text>
                      <RoleBadges
                        roles={
                          userRoles?.map((role) => ({
                            code: role.code,
                            name: role.name,
                          })) || []
                        }
                        size="sm"
                      />
                    </GridItem>
                  )}
                </Grid>
              </Box>

              {/* Section: Programme académique */}
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdSchool color="var(--chakra-colors-purple-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Programme académique
                  </Heading>
                </Flex>

                {studentDetails.program_level && (
                  <VStack align="stretch" gap={3}>
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Niveau de programme
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {studentDetails.program_level.name}
                      </Text>
                    </Box>

                    {studentDetails.program_level.description && (
                      <Box>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          ID du programme
                        </Text>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          fontFamily="mono"
                        >
                          {studentDetails.program_level.description}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                )}
              </Box>

              {/* Section: Progression académique */}
              <Box
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="border.subtle"
                bg="bg.subtle"
              >
                <Flex align="center" gap={2} mb={4}>
                  <MdGrade color="var(--chakra-colors-green-500)" />
                  <Heading fontSize="md" fontWeight="600" color="fg.emphasized">
                    Progression académique
                  </Heading>
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <Flex align="center" gap={2} mb={1}>
                      <MdDateRange
                        size={14}
                        color="var(--chakra-colors-fg-muted)"
                      />
                      <Text fontSize="xs" fontWeight="500" color="fg.muted">
                        Date d'admission
                      </Text>
                    </Flex>
                    <Text fontSize="sm" fontWeight="500" color="fg.default">
                      {formatDate(studentDetails.admission_date)}
                    </Text>
                  </GridItem>

                  {studentDetails.expected_graduation_date && (
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Diplôme prévu
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        {formatDate(studentDetails.expected_graduation_date)}
                      </Text>
                    </GridItem>
                  )}

                  {studentDetails.actual_graduation_date && (
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Date de diplôme
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="green.600">
                        {formatDate(studentDetails.actual_graduation_date)}
                      </Text>
                    </GridItem>
                  )}

                  {studentDetails.gpa !== null &&
                    studentDetails.gpa !== undefined && (
                      <GridItem>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Moyenne générale (GPA)
                        </Text>
                        <Text fontSize="lg" fontWeight="700" color="green.600">
                          {studentDetails.gpa.toFixed(2)} / 4.00
                        </Text>
                      </GridItem>
                    )}

                  {studentDetails.total_credits_earned !== null && (
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Crédits acquis
                      </Text>
                      <Text fontSize="sm" fontWeight="600" color="fg.default">
                        {studentDetails.total_credits_earned} crédits
                      </Text>
                    </GridItem>
                  )}

                  {studentDetails.current_year_level !== null && (
                    <GridItem>
                      <Text
                        fontSize="xs"
                        fontWeight="500"
                        color="fg.muted"
                        mb={1}
                      >
                        Niveau actuel
                      </Text>
                      <Text fontSize="sm" fontWeight="500" color="fg.default">
                        Année {studentDetails.current_year_level}
                      </Text>
                    </GridItem>
                  )}
                </Grid>
              </Box>

              {/* Section: Bourse */}
              {studentDetails.is_scholarship && (
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="blue.50"
                >
                  <Heading
                    fontSize="md"
                    fontWeight="600"
                    color="blue.700"
                    mb={2}
                  >
                    🎓 Boursier
                  </Heading>
                  {studentDetails.scholarship_type && (
                    <Text fontSize="sm" color="blue.600">
                      Type: {studentDetails.scholarship_type}
                    </Text>
                  )}
                </Box>
              )}

              {/* Section: Contact d'urgence */}
              {(studentDetails.emergency_contact_name ||
                studentDetails.emergency_contact_phone) && (
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="bg.subtle"
                >
                  <Flex align="center" gap={2} mb={4}>
                    <MdContactEmergency color="var(--chakra-colors-red-500)" />
                    <Heading
                      fontSize="md"
                      fontWeight="600"
                      color="fg.emphasized"
                    >
                      Contact d'urgence
                    </Heading>
                  </Flex>

                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                  >
                    {studentDetails.emergency_contact_name && (
                      <GridItem>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Nom
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {studentDetails.emergency_contact_name}
                        </Text>
                      </GridItem>
                    )}

                    {studentDetails.emergency_contact_phone && (
                      <GridItem>
                        <Flex align="center" gap={2} mb={1}>
                          <MdPhone
                            size={14}
                            color="var(--chakra-colors-fg-muted)"
                          />
                          <Text fontSize="xs" fontWeight="500" color="fg.muted">
                            Téléphone
                          </Text>
                        </Flex>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {studentDetails.emergency_contact_phone}
                        </Text>
                      </GridItem>
                    )}

                    {studentDetails.emergency_contact_relationship && (
                      <GridItem>
                        <Text
                          fontSize="xs"
                          fontWeight="500"
                          color="fg.muted"
                          mb={1}
                        >
                          Relation
                        </Text>
                        <Text fontSize="sm" fontWeight="500" color="fg.default">
                          {studentDetails.emergency_contact_relationship}
                        </Text>
                      </GridItem>
                    )}
                  </Grid>
                </Box>
              )}

              {/* Section: Notes */}
              {studentDetails.notes && (
                <Box
                  p={4}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="border.subtle"
                  bg="yellow.50"
                >
                  <Text
                    fontSize="xs"
                    fontWeight="600"
                    color="yellow.900"
                    mb={2}
                  >
                    📝 Notes
                  </Text>
                  <Text fontSize="sm" color="yellow.800">
                    {studentDetails.notes}
                  </Text>
                </Box>
              )}

              {/* Section: Métadonnées */}
              <Box
                p={3}
                borderRadius="md"
                bg="bg.muted"
                borderTop="1px solid"
                borderColor="border.subtle"
              >
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                  <GridItem>
                    <Text fontSize="2xs" color="fg.muted">
                      Créé le: {formatDate(studentDetails.created_at)}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text fontSize="2xs" color="fg.muted">
                      Modifié le: {formatDate(studentDetails.updated_at)}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            </VStack>
          ) : (
            <Box textAlign="center" py={8}>
              <Text fontSize="sm" color="fg.muted">
                Aucune donnée disponible
              </Text>
            </Box>
          )}
        </DialogBody>

        <DialogFooter>
          <HStack gap={2}>
            {studentDetails && (
              <StudentTranscriptDialog
                studentNumber={(studentDetails.user as any)?.user_number || ""}
                studentName={
                  studentDetails.user
                    ? `${(studentDetails.user as any).first_name || ""} ${(studentDetails.user as any).last_name || ""}`.trim() ||
                      studentDetails.user.email
                    : (studentDetails.user as any)?.user_number || ""
                }
              />
            )}
            <DialogActionTrigger asChild>
              <Button variant="outline" size="sm">
                Fermer
              </Button>
            </DialogActionTrigger>
          </HStack>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default StudentDetails
