import { Badge, HStack, Text } from "@chakra-ui/react"
import {
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUserShield,
  FaUserTie,
} from "react-icons/fa"

interface RoleBadgesProps {
  roles?: Array<{ code: string; name: string }> | null
  size?: "sm" | "md" | "lg"
}

const RoleBadges = ({ roles, size = "sm" }: RoleBadgesProps) => {
  if (!roles || roles.length === 0) {
    return null
  }

  const getRoleConfig = (code: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> =
      {
        ADMIN: {
          color: "red",
          icon: FaUserShield,
          label: "Administrateur",
        },
        TEACHER: {
          color: "blue",
          icon: FaChalkboardTeacher,
          label: "Enseignant",
        },
        STUDENT: {
          color: "green",
          icon: FaUserGraduate,
          label: "Étudiant",
        },
        STAFF: {
          color: "purple",
          icon: FaUserTie,
          label: "Personnel",
        },
      }
    return configs[code] || { color: "gray", icon: null, label: code }
  }

  return (
    <HStack gap={2} wrap="wrap">
      {roles.map((role) => {
        const config = getRoleConfig(role.code)
        const Icon = config.icon

        return (
          <Badge
            key={role.code}
            colorPalette={config.color}
            variant="subtle"
            size={size}
            display="flex"
            alignItems="center"
            gap={1}
            px={2}
            py={1}
            borderRadius="md"
          >
            {Icon && <Icon size={12} />}
            <Text fontSize={size === "sm" ? "2xs" : "xs"} fontWeight="600">
              {config.label}
            </Text>
          </Badge>
        )
      })}
    </HStack>
  )
}

export default RoleBadges
