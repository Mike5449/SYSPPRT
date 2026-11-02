import { Box, Flex, Icon, Text, VStack } from "@chakra-ui/react"
import { Collapsible } from "@chakra-ui/react/collapsible"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { FaChevronDown, FaChevronRight } from "react-icons/fa"
import {
  FiAward,
  FiBook,
  FiCalendar,
  FiCamera,
  FiClipboard,
  FiFileText,
  FiHome,
  FiLayers,
  FiList,
  FiSettings,
  FiUser,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic } from "@/client"
import { useUserRoles } from "@/hooks/useUserRoles"

interface SidebarItemsProps {
  onClose?: () => void
}

interface MenuItem {
  icon: IconType
  title: string
  path: string
}

interface MenuGroup {
  key: string
  label: string
  icon: IconType
  items: MenuItem[]
  roles?: string[]
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { data: roles } = useUserRoles(currentUser?.id)

  const isAdmin = currentUser?.is_superuser
  const isTeacher = roles?.some((r) => r.code === "TEACHER")
  const isStudent = roles?.some((r) => r.code === "STUDENT")

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  // Initialize open groups based on roles
  useEffect(() => {
    if (roles) {
      if (isTeacher) {
        setOpenGroups({ teacher: true, academic: true })
      } else if (isStudent) {
        setOpenGroups({ student: true })
      } else if (isAdmin) {
        setOpenGroups({ academic: true })
      }
    }
  }, [roles, isTeacher, isStudent, isAdmin])

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }

  // Dashboard Item (Standardized)
  const DashboardItem = () => (
    <RouterLink to="/" onClick={onClose}>
      {({ isActive }) => (
        <Flex
          alignItems="center"
          gap={2.5}
          px={3}
          py={2.5}
          borderRadius="md"
          transition="all 0.2s"
          bg={isActive ? "blue.500" : "transparent"}
          color={isActive ? "white" : "#4b6a92"}
          _hover={{
            bg: isActive ? "blue.600" : "bg.subtle",
            color: isActive ? "white" : "#2c5282",
          }}
          cursor="pointer"
          mb={2}
          shadow={isActive ? "md" : "none"}
        >
          <Icon
            as={FiHome}
            fontSize="16px"
            color={isActive ? "white" : "#4b6a92"}
          />
          <Text fontWeight="700" fontSize="xs" letterSpacing="wide">
            {t("common.dashboard")}
          </Text>
        </Flex>
      )}
    </RouterLink>
  )

  // Collapsible Groups
  const allGroups: MenuGroup[] = [
    {
      key: "structures",
      label: t("common.structures"),
      icon: FiHome,
      roles: ["ADMIN"],
      items: [
        { icon: FiList, title: t("common.departments"), path: "/department" },
        { icon: FiHome, title: t("common.faculties"), path: "/faculty" },
        { icon: FiLayers, title: t("common.programs"), path: "/program" },
        {
          icon: FiLayers,
          title: t("common.program_levels"),
          path: "/program_level",
        },
      ],
    },
    {
      key: "academic",
      label: t("common.academic"),
      icon: FiBook,
      roles: ["ADMIN"],
      items: [
        {
          icon: FiCalendar,
          title: t("common.academic_years"),
          path: "/academic_year",
        },
        { icon: FiCalendar, title: t("common.sessions"), path: "/session" },
        { icon: FiBook, title: t("common.courses"), path: "/course" },
        {
          icon: FiCalendar,
          title: t("common.course_sessions"),
          path: "/course_session",
        },
        {
          icon: FiCalendar,
          title: t("common.schedules"),
          path: "/schedule",
        },
        {
          icon: FiClipboard,
          title: t("common.attendance_records"),
          path: "/attendance_record",
        },
        {
          icon: FiCamera,
          title: t("common.notes_scan"),
          path: "/notes/scan",
        },
        { icon: FiLayers, title: "Diagrams", path: "/diagrams" },
      ],
    },
    {
      key: "users_management",
      label: t("common.users_management"),
      icon: FiUsers,
      roles: ["ADMIN"],
      items: [
        { icon: FiUser, title: t("common.students"), path: "/student" },
        { icon: FiUserPlus, title: t("common.teachers"), path: "/teacher" },
      ],
    },
    {
      key: "teacher",
      label: t("common.students_teachers"),
      icon: FiUsers,
      roles: ["TEACHER"],
      items: [
        { icon: FiUser, title: t("common.students"), path: "/student" },
        {
          icon: FiClipboard,
          title: t("common.assessments"),
          path: "/assessment",
        },
        { icon: FiAward, title: t("common.grades"), path: "/grade" },
        {
          icon: FiCamera,
          title: t("common.notes_scan"),
          path: "/notes/scan",
        },
        {
          icon: FiCalendar,
          title: t("common.attendance_sessions"),
          path: "/attendance_session",
        },
        {
          icon: FiClipboard,
          title: t("common.attendance_records"),
          path: "/attendance_record",
        },
        { icon: FiCalendar, title: t("common.schedules"), path: "/schedule" },
      ],
    },
    {
      key: "student",
      label: t("common.students_courses"),
      icon: FiUsers,
      roles: ["STUDENT"],
      items: [
        {
          icon: FiBook,
          title: t("common.course_search"),
          path: "/course_search",
        },
        { icon: FiCalendar, title: t("common.schedules"), path: "/schedule" },
        {
          icon: FiClipboard,
          title: t("common.assessments"),
          path: "/assessment",
        },
        { icon: FiUserCheck, title: t("common.transcript"), path: "/grades" },
        { icon: FiFileText, title: t("common.bulletins"), path: "/transcript" },
        {
          icon: FiUserCheck,
          title: t("common.scan_attendance"),
          path: "/scan-attendance",
        },
        {
          icon: FiClipboard,
          title: t("common.attendance_records"),
          path: "/attendance_record",
        },
      ],
    },
  ]

  
  const filteredGroups = allGroups.filter((group) => {
    if (!group.roles) return true
    // If the group has roles, check if the user has AT LEAST ONE of those roles
    // We check against the actual roles object from useUserRoles/currentUser
    return group.roles.some((role) => {
      if (role === "ADMIN") return isAdmin
      if (role === "TEACHER") return isTeacher
      if (role === "STUDENT") return isStudent
      return false
    })
  })

  // Settings
  const settingsGroup: MenuGroup = {
    key: "settings",
    label: isAdmin ? t("common.administration") : t("common.settings"),
    icon: FiSettings,
    items: [
      ...(isAdmin
        ? [{ icon: FiUsers, title: t("common.admin"), path: "/admin" }]
        : []),
      { icon: FiSettings, title: t("common.user_settings"), path: "/settings" },
    ],
  }

  const finalGroups = [...filteredGroups, settingsGroup]

  return (
    <VStack align="stretch" gap={1.5}>
      <DashboardItem />

      {finalGroups.map((group, groupIndex) => {
        const groupKey = group.key
        const isGroupOpen = openGroups[groupKey] ?? false

        return (
          <Box key={groupIndex}>
            <Flex
              as="button"
              onClick={() => toggleGroup(groupKey)}
              alignItems="center"
              justifyContent="space-between"
              px={3}
              py={2}
              w="100%"
              borderRadius="md"
              transition="all 0.2s"
              bg="transparent"
              color="#4b6a92"
              _hover={{
                bg: "bg.subtle",
                color: "#2c5282",
              }}
              cursor="pointer"
            >
              <Flex alignItems="center" gap={2.5}>
                <Icon as={group.icon} fontSize="15px" color="#4b6a92" />
                <Text
                  fontWeight="600"
                  fontSize="xs"
                  letterSpacing="wide"
                  color="#4b6a92"
                >
                  {group.label}
                </Text>
              </Flex>
              <Box transition="transform 0.2s">
                {isGroupOpen ? (
                  <FaChevronDown size={10} color="fg.muted" />
                ) : (
                  <FaChevronRight size={10} color="fg.muted" />
                )}
              </Box>
            </Flex>

            <Collapsible.Root open={isGroupOpen}>
              <Collapsible.Content>
                <VStack align="stretch" gap={0.5} mt={1} pl={2}>
                  {group.items.map((item, itemIndex) => (
                    <RouterLink
                      key={itemIndex}
                      to={item.path}
                      onClick={onClose}
                    >
                      {({ isActive }) => (
                        <Flex
                          alignItems="center"
                          gap={2.5}
                          px={3}
                          py={2}
                          borderRadius="md"
                          transition="all 0.15s"
                          bg={isActive ? "blue.50" : "transparent"}
                          color={isActive ? "#4b6a92" : "#4b6a92"}
                          _hover={{
                            bg: isActive ? "blue.50" : "bg.subtle",
                            color: isActive ? "#2b6cb0" : "#2c5282",
                            transform: "translateX(3px)",
                          }}
                          cursor="pointer"
                          position="relative"
                        >
                          <Icon
                            as={item.icon}
                            fontSize="14px"
                            color={isActive ? "#2b6cb0" : "#4b6a92"}
                            opacity={isActive ? 1 : 0.8}
                          />
                          <Text
                            fontSize="xs"
                            fontWeight={isActive ? "700" : "500"}
                          >
                            {item.title}
                          </Text>
                          {isActive && (
                            <Box
                              position="absolute"
                              left={0}
                              w="3px"
                              h="60%"
                              bg="blue.500"
                              borderRadius="full"
                            />
                          )}
                        </Flex>
                      )}
                    </RouterLink>
                  ))}
                </VStack>
              </Collapsible.Content>
            </Collapsible.Root>
          </Box>
        )
      })}
    </VStack>
  )
}

export default SidebarItems
