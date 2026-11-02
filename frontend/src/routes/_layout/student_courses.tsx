import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FiActivity, FiChevronDown, FiRefreshCw, FiSearch, FiUserCheck } from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import { StudentsService } from "@/client"

export const Route = createFileRoute("/_layout/student_courses")({
  component: StudentCourses,
})

function StudentCourses() {
  const { t } = useTranslation()
  const [studentNumber, setStudentNumber] = useState("")
  const [yearLevel, setYearLevel] = useState("1")
  const [sessionNumber, setSessionNumber] = useState("")
  const [shouldFetch, setShouldFetch] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-courses", studentNumber, yearLevel, sessionNumber],
    queryFn: () =>
      StudentsService.readTheoreticalCourses({
        studentNumber: studentNumber,
        yearLevel: parseInt(yearLevel, 10),
        sessionNumber: sessionNumber ? parseInt(sessionNumber, 10) : undefined,
      }),
    enabled: shouldFetch && !!studentNumber && !!yearLevel,
    retry: false,
  })

  const handleSearch = () => {
    if (studentNumber && yearLevel) {
      setShouldFetch(true)
      refetch()
    }
  }

  return (
    <Container maxW="full" py={6}>
      <VStack align="stretch" gap={6}>
        <Box borderBottom="1px solid" borderColor="border.subtle" pb={4}>
          <Flex justify="space-between" align="center" mb={3}>
            <Box>
              <Heading size="lg" mb={0.5}>
                Suivi des Cours par Étudiant
              </Heading>
              <Text color="fg.muted" fontSize="sm">
                {t("student_courses_page.subtitle")}
              </Text>
            </Box>
            <HStack gap={2}>
              <IconButton variant="ghost" size="xs" color="#6b8ab0" onClick={handleSearch} loading={isLoading} aria-label={t("student_courses_page.search_btn")} _hover={{ color: "ui.main", bg: "transparent" }}>
                <FiRefreshCw />
              </IconButton>
              <Link to="/scan-attendance">
                <IconButton variant="ghost" size="xs" color="#6b8ab0" aria-label={t("student_courses_page.scan_btn")} _hover={{ color: "ui.main", bg: "transparent" }}>
                  <FiUserCheck />
                </IconButton>
              </Link>
            </HStack>
          </Flex>
          <HStack bg="white" borderRadius="8px" p="0.35rem 1rem" boxShadow="0 2px 8px rgba(0,20,40,0.04)" border="1px solid #edf2f7" gap="10px" w="full" justify="flex-end">
            <Icon as={FiSearch} color="#a0aec0" boxSize={3} />
            <Input border="none" bg="transparent" placeholder="Ex: ETU2024001" fontSize="0.75rem" w="140px" size="sm" outline="none" _focus={{ outline: "none", boxShadow: "none" }} value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
            <Input border="none" bg="transparent" placeholder="Année" type="number" fontSize="0.75rem" w="60px" size="sm" outline="none" _focus={{ outline: "none", boxShadow: "none" }} value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} />
            <Box w="1px" h="10px" bg="gray.100" />
            <MenuRoot positioning={{ gutter: 4, placement: "bottom-end" }}>
              <MenuTrigger asChild>
                <HStack cursor="pointer" color="#1f3b62" fontWeight="500" fontSize="0.75rem" _hover={{ color: "ui.main" }} gap="4px">
                  <Icon as={FiActivity} color="#2a5f8a" boxSize={3} />
                  <Text>{sessionNumber === "1" ? "Session 1" : sessionNumber === "2" ? "Session 2" : t("student_courses_page.all")}</Text>
                  <Icon as={FiChevronDown} boxSize={2.5} color="#a0aec0" />
                </HStack>
              </MenuTrigger>
              <MenuContent minW="120px" bg="white" borderRadius="10px" border="1px solid #e2ecf9" p="4px" zIndex={1500}>
                <MenuItem value="" fontSize="0.75rem" borderRadius="6px" onClick={() => setSessionNumber("")}>{t("student_courses_page.all")}</MenuItem>
                <MenuItem value="1" fontSize="0.75rem" borderRadius="6px" onClick={() => setSessionNumber("1")}>Session 1</MenuItem>
                <MenuItem value="2" fontSize="0.75rem" borderRadius="6px" onClick={() => setSessionNumber("2")}>Session 2</MenuItem>
              </MenuContent>
            </MenuRoot>
          </HStack>
        </Box>

        {/* Error State */}
        {error && (
          <Box p={4} bg="red.50" color="red.600" borderRadius="md">
            {t("student_courses_page.fetch_error")} {error.message}
          </Box>
        )}

        {/* Results Table */}
        {data && (
          <Box
            borderRadius="lg"
            border="1px solid"
            borderColor="border.subtle"
            overflow="hidden"
          >
            <Table.Root size="md" variant="outline">
              <Table.Header>
                <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
                  <Table.ColumnHeader color="white">{t("student_courses_page.columns.code")}</Table.ColumnHeader>
                  <Table.ColumnHeader color="white">{t("student_courses_page.columns.name")}</Table.ColumnHeader>
                  <Table.ColumnHeader color="white">{t("student_courses_page.columns.credits")}</Table.ColumnHeader>
                  <Table.ColumnHeader color="white">{t("student_courses_page.columns.type")}</Table.ColumnHeader>
                  <Table.ColumnHeader color="white">{t("student_courses_page.columns.status")}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} textAlign="center" py={4}>
                      {t("student_courses_page.no_courses")}
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  data.map((course: any) => (
                    <Table.Row key={course.id} _odd={{ bg: "#f7f9fc" }} _even={{ bg: "white" }} _hover={{ bg: "gray.100" }}>
                      <Table.Cell
                        fontFamily="mono"
                        fontSize="sm"
                        fontWeight="bold"
                      >
                        {course.code}
                      </Table.Cell>
                      <Table.Cell fontWeight="medium">{course.name}</Table.Cell>
                      <Table.Cell>{course.credits}</Table.Cell>
                      <Table.Cell>
                        {course.is_mandatory ? (
                          <Badge colorPalette="purple">{t("student_courses_page.mandatory")}</Badge>
                        ) : (
                          <Badge colorPalette="gray">{t("student_courses_page.optional")}</Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {course.is_active ? (
                          <Badge colorPalette="green" variant="subtle">
                            {t("student_courses_page.active")}
                          </Badge>
                        ) : (
                          <Badge colorPalette="red" variant="subtle">
                            {t("student_courses_page.inactive")}
                          </Badge>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
