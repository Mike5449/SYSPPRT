import { Badge, Box, Container, Flex, Heading, Table, Text } from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import RoleBadges from "@/components/Common/RoleBadges"
import { UserActionsMenu } from "@/components/Common/UserActionsMenu"
import PendingUsers from "@/components/Pending/PendingUsers"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import { useUserRoles } from "@/hooks/useUserRoles"

const usersSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 5

function getUsersQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      UsersService.readUsers({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["users", { page }],
  }
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  validateSearch: (search) => usersSearchSchema.parse(search),
})

function UserRolesCell({ userId }: { userId: string }) {
  const { t } = useTranslation()
  // Réactivé avec protection contre les déconnexions
  const { data: userRoles, isLoading } = useUserRoles(userId)

  if (isLoading) {
    return (
      <span
        style={{ fontSize: "11px", color: "var(--chakra-colors-fg-muted)" }}
      >
        {t("common.loading")}
      </span>
    )
  }

  if (!userRoles || userRoles.length === 0) {
    return (
      <span
        style={{ fontSize: "11px", color: "var(--chakra-colors-fg-muted)" }}
      >
        {t("common.no_roles")}
      </span>
    )
  }

  return (
    <RoleBadges
      roles={userRoles.map((role) => ({ code: role.code, name: role.name }))}
      size="sm"
    />
  )
}

function UsersTable() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getUsersQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/admin",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const users = data?.data.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingUsers />
  }

  return (
    <>
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
            <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" px={5} py={3}>
              {t("common.tables.full_name")}
            </Table.ColumnHeader>
            <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" py={3}>
              {t("common.tables.email")}
            </Table.ColumnHeader>
            <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" py={3}>
              {t("common.tables.role")}
            </Table.ColumnHeader>
            <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" textAlign="center" py={3}>
              {t("common.tables.status")}
            </Table.ColumnHeader>
            <Table.ColumnHeader color="white" fontWeight="700" fontSize="xs" letterSpacing="wide" textAlign="center" py={3}>
              {t("common.tables.actions")}
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {users?.map((user) => (
            <Table.Row key={user.id} opacity={isPlaceholderData ? 0.5 : 1} _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "gray.100" }} borderBottom="1px solid #f0f4f9">
              <Table.Cell px={5} py={3}>
                <Text fontSize="sm" fontWeight="600" color="#1f2937">
                  {`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "N/A"}
                  {currentUser?.id === user.id && (
                    <Badge ml="2" colorPalette="teal" size="xs">{t("common.you")}</Badge>
                  )}
                </Text>
              </Table.Cell>
              <Table.Cell py={3}>
                <Text fontSize="xs" color="gray.500">{user.email}</Text>
              </Table.Cell>
              <Table.Cell py={3}>
                <UserRolesCell userId={user.id} />
              </Table.Cell>
              <Table.Cell textAlign="center" py={3}>
                <Badge colorPalette={user.is_active ? "green" : "red"} variant="surface" size="xs">
                  {user.is_active ? t("common.tables.active") : t("common.tables.inactive")}
                </Badge>
              </Table.Cell>
              <Table.Cell textAlign="center" py={3}>
                <UserActionsMenu user={user} disabled={currentUser?.id === user.id} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Flex justifyContent="flex-end" p={4} borderTop="1px solid #f0f4f9">
        <PaginationRoot count={count} pageSize={PER_PAGE} onPageChange={({ page }) => setPage(page)}>
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </>
  )
}

function Admin() {
  return (
    <Container maxW="full" py={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading fontSize="lg" fontWeight="bold" color="gray.800" mb={0.5}>
              Gestion des Utilisateurs
            </Heading>
            <Text fontSize="sm" color="gray.500">Gestion des comptes et des rôles</Text>
          </Box>
          <AddUser />
        </Flex>
        <Box bg="white" borderRadius="sm" border="1px solid" borderColor="gray.200" overflow="hidden">
          <UsersTable />
        </Box>
    </Container>
  )
}
