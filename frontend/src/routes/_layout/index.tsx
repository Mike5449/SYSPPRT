import { Container, Flex, Spinner } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

import { StudentsService, TeachersService } from "@/client"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  // Vérifier si l'utilisateur est un étudiant
  const { data: studentData } = useQuery({
    queryKey: ["student_by_user", currentUser?.id],
    queryFn: async () => {
      try {
        return await StudentsService.readStudentByUser({
          userId: currentUser!.id,
        })
      } catch (_error) {
        // 404 = utilisateur n'est pas un étudiant, c'est normal
        return null
      }
    },
    enabled: !!currentUser && !currentUser.is_superuser,
    retry: false,
    staleTime: 0, // Toujours refetch lors du changement d'utilisateur
    gcTime: 0, // Ne pas garder en cache après démontage
  })

  // Vérifier si l'utilisateur est un professeur
  const { data: teacherData } = useQuery({
    queryKey: ["teacher_by_user", currentUser?.id],
    queryFn: async () => {
      try {
        return await TeachersService.readTeacherByUser({
          userId: currentUser!.id,
        })
      } catch (_error) {
        // 404 = utilisateur n'est pas un professeur, c'est normal
        return null
      }
    },
    enabled: !!currentUser && !currentUser.is_superuser,
    retry: false,
    staleTime: 0, // Toujours refetch lors du changement d'utilisateur
    gcTime: 0, // Ne pas garder en cache après démontage
  })

  useEffect(() => {
    if (!currentUser) return

    // Redirection selon le rôle
    const userWithRoles = currentUser as any
    const roles = userWithRoles.roles?.map((r: any) => r.name) || []
    const isStudentRole = roles.some(
      (r: string) => r.toUpperCase() === "STUDENT",
    )
    const isTeacherRole = roles.some(
      (r: string) => r.toUpperCase() === "TEACHER",
    )

    if (currentUser.is_superuser) {
      // Admin
      navigate({ to: "/dashboard/admin" })
    } else if (teacherData || isTeacherRole) {
      // Professeur
      navigate({ to: "/dashboard/teacher" })
    } else if (studentData || isStudentRole) {
      // Étudiant
      navigate({ to: "/dashboard/student" })
    }
  }, [currentUser, studentData, teacherData, navigate])

  // Afficher un loader pendant la détection du rôle
  return (
    <Container maxW="full">
      <Flex justify="center" align="center" minH="400px">
        <Spinner size="xl" />
      </Flex>
    </Container>
  )
}
