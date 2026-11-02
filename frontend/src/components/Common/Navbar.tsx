// import { Flex, Image, useBreakpointValue, Box } from "@chakra-ui/react"
// import { Link } from "@tanstack/react-router"

// import Logo from "/assets/images/fastapi-logo.svg"
// import UserMenu from "./UserMenu"

// function Navbar() {
//   const display = useBreakpointValue({ base: "none", md: "flex" })

//   return (
//     <Flex
//       display={display}
//       justify="space-between"
//       position="sticky"
//       color="white"
//       align="center"
//       bg="linear-gradient(135deg, #1a202c 0%, #2d3748 100%)"
//       w="100%"
//       top={0}
//       px={6}
//       py={3}
//       boxShadow="0 4px 20px rgba(0, 0, 0, 0.15)"
//       backdropFilter="blur(10px)"
//       borderBottom="1px solid"
//       borderColor="whiteAlpha.200"
//       zIndex={1000}
//     >
//       <Link to="/">
//         <Box
//           transition="all 0.3s ease"
//           _hover={{ transform: "scale(1.05)" }}
//           _active={{ transform: "scale(0.95)" }}
//         >
//           <Image
//             src={Logo}
//             alt="Logo"
//             maxW="3xs"
//             p={2}
//             filter="brightness(0) invert(1)"
//           />
//         </Box>
//       </Link>

//       <Flex
//         gap={4}
//         alignItems="center"
//         bg="whiteAlpha.100"
//         borderRadius="xl"
//         px={4}
//         py={2}
//         backdropFilter="blur(8px)"
//       >
//         <UserMenu />
//       </Flex>
//     </Flex>
//   )
// }

// export default Navbar

import {
  Box,
  Circle,
  Flex,
  HStack,
  Image,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { StudentsService } from "@/client"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"
import Logo from "/assets/images/logoU.png"
import LanguageSwitcher from "./LanguageSwitcher"

function Navbar() {
  const display = useBreakpointValue({ base: "none", md: "flex" })
  const { user } = useAuth()

  const { data: roles } = useUserRoles(user?.id)

  const isAdmin = roles?.some((r) => r.code === "ADMIN") || user?.is_superuser
  const isTeacher = roles?.some((r) => r.code === "TEACHER")

  const { data: student } = useQuery({
    queryKey: ["currentStudent", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user ID")
      const result = await StudentsService.readStudentByUser({
        userId: user.id,
      })
      return result as any
    },
    enabled: !!user?.id && !isAdmin && !isTeacher,
  })

  // Determine what to display based on roles
  const renderUserInfo = () => {
    if (student) {
      return (
        <HStack gap={3} px={2} py={1}>
          <Circle
            size="36px"
            bg="whiteAlpha.300"
            fontWeight="bold"
            fontSize="md"
            border="2px solid"
            borderColor="whiteAlpha.400"
          >
            {(student as any).user?.first_name?.charAt(0)}
          </Circle>
          <VStack align="flex-start" gap={0}>
            <Text fontSize="sm" fontWeight="bold">
              {(student as any).user?.first_name}{" "}
              {(student as any).user?.last_name}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.900" fontWeight="500">
              {(student as any).program_level?.program?.name} -{" "}
              {(student as any).program_level?.name}
            </Text>
          </VStack>
        </HStack>
      )
    }

    if (user && (isAdmin || isTeacher)) {
      const roleDisplayName = isAdmin ? "Administrateur" : "Enseignant"
      return (
        <HStack gap={3} px={2} py={1}>
          <Circle
            size="36px"
            bg="whiteAlpha.300"
            fontWeight="bold"
            fontSize="md"
            border="2px solid"
            borderColor="whiteAlpha.400"
          >
            {user.first_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </Circle>
          <VStack align="flex-start" gap={0}>
            <Text fontSize="sm" fontWeight="bold">
              {user.first_name} {user.last_name}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.900" fontWeight="500">
              {roleDisplayName}
            </Text>
          </VStack>
        </HStack>
      )
    }

    return null
  }

  return (
    <Flex
      display={display}
      justify="space-between"
      position="sticky"
      color="white"
      align="center"
      background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)"
      w="100%"
      top={0}
      px={{ base: 4, md: 6 }}
      py={3}
      minH="64px"
      boxShadow="0 4px 24px rgba(44,82,130,0.35)"
      borderBottom="1px solid"
      borderColor="whiteAlpha.200"
      backdropFilter="saturate(120%) blur(4px)"
      zIndex={1000}
    >
      <HStack gap={4} alignItems="center">
        <Link to="/">
          <HStack gap={3} alignItems="center">
            <Image
              src={Logo}
              alt="Logo"
              boxSize={{ base: "36px", md: "40px" }}
            />
            <Box display={{ base: "none", md: "block" }}>
              <Text
                fontSize="md"
                fontWeight={700}
                letterSpacing="wide"
                color="white"
              >
                UCRECH UNIVERSITE
              </Text>
              <Text fontSize="xs" color="whiteAlpha.800">
                Faculté & Campus
              </Text>
            </Box>
          </HStack>
        </Link>
      </HStack>

      <HStack gap={6} alignItems="center">
        {renderUserInfo()}
        <LanguageSwitcher />
      </HStack>
    </Flex>
  )
}

export default Navbar
