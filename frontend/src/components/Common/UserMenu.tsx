import { Box, Button, Flex, Text, VStack } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { FaUserAstronaut } from "react-icons/fa"
import { FiLogOut, FiUser } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"
import RoleBadges from "./RoleBadges"

const UserMenu = () => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  // Réactivé avec protection contre les déconnexions
  const { data: userRoles } = useUserRoles(user?.id)

  const handleLogout = async () => {
    logout()
  }

  // Obtenir le premier rôle pour affichage simple
  const primaryRole = userRoles && userRoles.length > 0 ? userRoles[0] : null

  return (
    <>
      {/* Desktop */}
      <Flex>
        <MenuRoot>
          <MenuTrigger asChild p={2}>
            <Button
              data-testid="user-menu"
              variant="solid"
              size="md"
              px={4}
              py={2}
              h="auto"
              minW="220px"
            >
              <Flex align="center" gap={3} w="full">
                <FaUserAstronaut fontSize="20" />
                <VStack gap={0.5} align="flex-start" flex="1">
                  <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
                    {user?.first_name
                      ? `${user.first_name} ${user.last_name || ""}`
                      : user?.email || "User"}
                  </Text>
                  {primaryRole ? (
                    <Text fontSize="xs" fontWeight="500" color="whiteAlpha.800">
                      Role: {primaryRole.name}
                    </Text>
                  ) : (
                    <Text fontSize="xs" fontWeight="400" color="whiteAlpha.700">
                      No role assigned
                    </Text>
                  )}
                </VStack>
              </Flex>
            </Button>
          </MenuTrigger>

          <MenuContent minW="250px">
            {/* User info header in menu */}
            <Box
              px={3}
              py={3}
              borderBottom="1px solid"
              borderColor="border.subtle"
            >
              <Text fontSize="sm" fontWeight="600" color="fg.emphasized">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name || ""}`
                  : user?.email || "User"}
              </Text>
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {user?.email}
              </Text>

              {/* Affichage des rôles avec badges ET texte */}
              {userRoles && userRoles.length > 0 ? (
                <Box mt={2}>
                  <Text fontSize="xs" fontWeight="600" color="fg.muted" mb={1}>
                    Rôles:
                  </Text>
                  {userRoles.map((role) => (
                    <Text
                      key={role.code}
                      fontSize="xs"
                      color="fg.default"
                      mb={0.5}
                    >
                      • {role.name} ({role.code})
                    </Text>
                  ))}
                  <Flex gap={1} mt={2} flexWrap="wrap">
                    <RoleBadges
                      roles={userRoles.map((role) => ({
                        code: role.code,
                        name: role.name,
                      }))}
                      size="sm"
                    />
                  </Flex>
                </Box>
              ) : (
                <Text fontSize="xs" color="fg.muted" mt={2}>
                  Aucun rôle assigné
                </Text>
              )}
            </Box>

            <Link to="/settings">
              <MenuItem
                closeOnSelect
                value="user-settings"
                gap={2}
                py={2}
                style={{ cursor: "pointer" }}
              >
                <FiUser fontSize="18px" />
                <Box flex="1">{t("common.my_profile")}</Box>
              </MenuItem>
            </Link>

            <MenuItem
              value="logout"
              gap={2}
              py={2}
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              <FiLogOut />
              {t("common.logout")}
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </>
  )
}

export default UserMenu
