import { Box, Flex, HStack, IconButton, Text, VStack } from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { FaBars } from "react-icons/fa"
import { FiLogOut, FiUser } from "react-icons/fi"

import { AcademicYearsService, type UserPublic } from "@/client"
import useAuth from "@/hooks/useAuth"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  // DrawerTrigger,
} from "../ui/drawer"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)

  const { data: currentYear } = useQuery({
    queryKey: ["currentAcademicYear"],
    queryFn: () => AcademicYearsService.readCurrentAcademicYear(),
  })

  return (
    <>
      {/* Bouton Hamburger Mobile */}
      <IconButton
        variant="solid"
        colorPalette="blue"
        display={{ base: "flex", md: "none" }}
        aria-label="Open Menu"
        onClick={() => setOpen(true)}
        position="fixed"
        top={4}
        left={4}
        zIndex="1000"
        size="sm"
        borderRadius="lg"
        boxShadow="lg"
        _hover={{
          transform: "scale(1.05)",
        }}
        transition="all 0.2s"
      >
        <FaBars size={14} />
      </IconButton>

      {/* Mobile */}
      <DrawerRoot
        placement="start"
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
      >
        <DrawerBackdrop />
        <DrawerContent
          maxW="280px"
          bg="bg.panel"
          color="#4b6a92"
          borderRight="1px solid"
          borderColor="border.subtle"
        >
          <DrawerCloseTrigger color="#4b6a92" top={4} right={4} />
          <DrawerBody p={0}>
            <VStack h="100%" justify="space-between" align="stretch" gap={0}>
              {/* Header */}
              <Box borderBottom="1px solid" borderColor="border.subtle" p={4}>
                <Flex alignItems="center" gap={3}>
                  <Text fontSize="2xl">📚</Text>
                  <Box>
                    <Text
                      fontSize="lg"
                      fontWeight="bold"
                      letterSpacing="tight"
                      color="#4b6a92"
                    >
                      Academic Portal
                    </Text>
                    {currentYear && (
                      <Text
                        fontSize="xs"
                        color="#4b6a92"
                        fontWeight="semibold"
                        opacity={0.8}
                      >
                        {currentYear.name}
                      </Text>
                    )}
                    <Box
                      h="2px"
                      w="40px"
                      bg="colorPalette.solid"
                      borderRadius="full"
                      mt={1}
                    />
                  </Box>
                </Flex>
              </Box>

              {/* Menu Items */}
              <Box flex="1" overflowY="auto" py={4} px={3}>
                <SidebarItems onClose={() => setOpen(false)} />
              </Box>

              {/* Footer */}
              <Box borderTop="1px solid" borderColor="border.subtle" p={3}>
                <Flex
                  as="button"
                  onClick={() => logout()}
                  alignItems="center"
                  gap={2}
                  px={3}
                  py={2}
                  w="100%"
                  borderRadius="lg"
                  fontSize="sm"
                  color="#4b6a92"
                  transition="all 0.2s"
                  _hover={{
                    bg: "bg.subtle",
                    color: "#2c5282",
                    transform: "translateX(2px)",
                  }}
                >
                  <FiLogOut size={16} />
                  <Text fontWeight="medium">Déconnexion</Text>
                </Flex>

                {currentUser?.email && (
                  <HStack
                    mt={3}
                    px={3}
                    py={2}
                    bg="bg.subtle"
                    borderRadius="lg"
                    gap={2}
                  >
                    <Box
                      bg="colorPalette.solid"
                      color="colorPalette.contrast"
                      p={1.5}
                      borderRadius="md"
                      fontSize="xs"
                    >
                      <FiUser />
                    </Box>
                    <Box flex="1" minW={0}>
                      <Text fontSize="xs" color="#4b6a92" mb={0.5}>
                        Connecté
                      </Text>
                      <Text
                        fontSize="xs"
                        fontWeight="medium"
                        lineClamp={1}
                        color="#4b6a92"
                      >
                        {currentUser.email}
                      </Text>
                    </Box>
                  </HStack>
                )}
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>

      {/* Desktop */}
      <Box
        display={{ base: "none", md: "flex" }}
        position="sticky"
        top={0}
        w={280}
        h="100vh"
        bg="bg.panel"
        color="#4b6a92"
        boxShadow="xl"
        borderRight="1px solid"
        borderColor="border.subtle"
      >
        <VStack w="100%" h="100%" gap={0}>
          {/* Header */}
          <Box
            w="100%"
            borderBottom="1px solid"
            borderColor="border.subtle"
            p={4}
          >
            <Flex alignItems="center" gap={3}>
              <Text fontSize="2xl">📚</Text>
              <Box>
                <Text
                  fontSize="lg"
                  fontWeight="bold"
                  letterSpacing="tight"
                  color="#4b6a92"
                >
                  Academic Portal
                </Text>
                {currentYear && (
                  <Text fontSize="xs" color="#4b6a92" fontWeight="semibold">
                    {currentYear.name}
                  </Text>
                )}
                <Box
                  h="2px"
                  w="40px"
                  bg="colorPalette.solid"
                  borderRadius="full"
                  mt={1}
                />
              </Box>
            </Flex>
          </Box>

          {/* Menu Items */}
          <Box
            flex="1"
            w="100%"
            overflowY="auto"
            overflowX="hidden"
            py={4}
            px={4}
          >
            <SidebarItems />
          </Box>

          {/* Footer */}
          <Box w="100%" borderTop="1px solid" borderColor="border.subtle" p={3}>
            <Flex
              as="button"
              onClick={() => logout()}
              alignItems="center"
              gap={2}
              px={3}
              py={2}
              w="100%"
              borderRadius="lg"
              fontSize="sm"
              color="#4b6a92"
              transition="all 0.2s"
              _hover={{
                bg: "bg.subtle",
                color: "#2c5282",
                transform: "translateX(2px)",
              }}
            >
              <FiLogOut size={16} />
              <Text fontWeight="medium">Déconnexion</Text>
            </Flex>

            {currentUser?.email && (
              <HStack
                mt={3}
                px={3}
                py={2}
                bg="bg.subtle"
                borderRadius="lg"
                gap={2}
              >
                <Box
                  bg="colorPalette.solid"
                  color="colorPalette.contrast"
                  p={1.5}
                  borderRadius="md"
                  fontSize="xs"
                >
                  <FiUser />
                </Box>
                <Box flex="1" minW={0}>
                  <Text fontSize="xs" color="#4b6a92" mb={0.5}>
                    Connecté
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    lineClamp={1}
                    color="#4b6a92"
                  >
                    {currentUser.email}
                  </Text>
                </Box>
              </HStack>
            )}
          </Box>
        </VStack>
      </Box>
    </>
  )
}

export default Sidebar
