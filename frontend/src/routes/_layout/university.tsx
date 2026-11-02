import {
  Badge,
  Box,
  Container,
  EmptyState,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  FiCheckCircle,
  FiEdit,
  FiGlobe,
  FiHome,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiXCircle,
} from "react-icons/fi"
import { z } from "zod"
import { UniversitiesService, type UniversityPublic } from "@/client"
import PendingItems from "@/components/Pending/PendingItems"
import { Button } from "@/components/ui/button"
import {
  DialogActionTrigger,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
import { toaster } from "@/components/ui/toaster"

const universitiesSearchSchema = z.object({
  page: z.number().catch(1),
  activeOnly: z.boolean().catch(false),
})

const PER_PAGE = 10

function getUniversitiesQueryOptions({
  page,
  activeOnly,
}: {
  page: number
  activeOnly: boolean
}) {
  return {
    queryFn: () =>
      activeOnly
        ? UniversitiesService.readActiveUniversities({
          skip: (page - 1) * PER_PAGE,
          limit: PER_PAGE,
        })
        : UniversitiesService.readUniversities({
          skip: (page - 1) * PER_PAGE,
          limit: PER_PAGE,
        }),
    queryKey: ["universities", { page, activeOnly }],
  }
}

export const Route = createFileRoute("/_layout/university")({
  component: Universities,
  validateSearch: (search) => universitiesSearchSchema.parse(search),
})

function UniversityHeader() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { page, activeOnly } = Route.useSearch()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["universities"] })
  }

  const { data } = useQuery({
    ...getUniversitiesQueryOptions({ page, activeOnly }),
  })

  const totalUniversities = data?.count ?? 0
  const activeUniversities =
    data?.data?.filter((university) => university.is_active)?.length ?? 0
  const inactiveUniversities =
    data?.data?.filter((university) => !university.is_active)?.length ?? 0
  const uniqueCountries = new Set(
    data?.data?.map((u) => u.country).filter(Boolean),
  ).size
  const uniqueCities = new Set(data?.data?.map((u) => u.city).filter(Boolean))
    .size
  const withWebsites = data?.data?.filter((u) => u.website)?.length ?? 0

  return (
    <Box borderBottom="1px solid" borderColor="border.subtle" pb={6} mb={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading
            size="lg"
            color="fg.emphasized"
            mb={2}
            fontSize="lg"
            fontWeight="600"
          >
            Établissements Universitaires
          </Heading>
          <Text color="fg.muted" fontSize="xs">
            {t("university_page.subtitle")}
          </Text>
        </Box>

        <HStack gap={3}>
          <IconButton
            variant="outline"
            colorPalette="gray"
            onClick={handleRefresh}
            aria-label="Refresh data"
            size="sm"
          >
            <FiRefreshCw />
          </IconButton>
          <AddUniversityDialog />
        </HStack>
      </Flex>

      <Flex justify="space-between" align="center">
        <HStack gap={6}>
          <Text fontSize="xs" color="fg.muted">
            <Text as="span" fontWeight="600" color="fg.default" fontSize="xs">
              {totalUniversities}
            </Text>{" "}
            {t("university_page.total")}
          </Text>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("common.active_label")}
            </Text>
            <Badge colorPalette="green" variant="subtle" size="sm">
              <Text fontSize="xs">{activeUniversities}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("common.inactive_label")}
            </Text>
            <Badge colorPalette="red" variant="subtle" size="sm">
              <Text fontSize="xs">{inactiveUniversities}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("university_page.countries")}
            </Text>
            <Badge colorPalette="blue" variant="subtle" size="sm">
              <Text fontSize="xs">{uniqueCountries}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("university_page.cities")}
            </Text>
            <Badge colorPalette="purple" variant="subtle" size="sm">
              <Text fontSize="xs">{uniqueCities}</Text>
            </Badge>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">
              {t("university_page.with_websites")}
            </Text>
            <Badge colorPalette="orange" variant="subtle" size="sm">
              <Text fontSize="xs">{withWebsites}</Text>
            </Badge>
          </HStack>
        </HStack>
      </Flex>
    </Box>
  )
}

function AddUniversityDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    country: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    description: "",
  })

  const mutation = useMutation({
    mutationFn: (data: any) =>
      UniversitiesService.createUniversity({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
      setOpen(false)
      setFormData({
        name: "",
        code: "",
        country: "",
        city: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        description: "",
      })
      toaster.create({
        title: t("university_page.success_create"),
        type: "success",
      })
    },
    onError: (error: any) => {
      toaster.create({
        title: t("university_page.error_create"),
        description: error.message,
        type: "error",
      })
    },
  })

  const handleSubmit = () => {
    mutation.mutate(formData)
  }

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Button onClick={() => setOpen(true)} colorPalette="blue" size="sm">
        {t("university_page.add_btn")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("university_page.add_title")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack gap={4}>
            <Field label={t("university_page.fields.name")} required>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("university_page.fields.name")}
              />
            </Field>
            <Field label={t("university_page.fields.code")} required>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder={t("university_page.fields.code")}
              />
            </Field>
            <Field label={t("university_page.fields.country")} required>
              <Input
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                placeholder={t("university_page.fields.country")}
              />
            </Field>
            <Field label={t("university_page.fields.city")} required>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder={t("university_page.fields.city")}
              />
            </Field>
            <Field label={t("university_page.fields.address")}>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder={t("university_page.fields.address")}
              />
            </Field>
            <Field label={t("university_page.fields.phone")}>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder={t("university_page.fields.phone")}
              />
            </Field>
            <Field label={t("university_page.fields.email")}>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder={t("university_page.fields.email")}
                type="email"
              />
            </Field>
            <Field label={t("university_page.fields.website")}>
              <Input
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder={t("university_page.fields.website")}
              />
            </Field>
            <Field label={t("university_page.fields.description")}>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("university_page.fields.description")}
              />
            </Field>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger>
            <Button variant="outline">{t("common.cancel")}</Button>
          </DialogActionTrigger>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

function EditUniversityDialog({
  university,
}: {
  university: UniversityPublic
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: university.name,
    code: university.code,
    country: university.country,
    city: university.city,
    address: university.address || "",
    phone: university.phone || "",
    email: university.email || "",
    website: university.website || "",
    description: university.description || "",
  })

  const mutation = useMutation({
    mutationFn: (data: any) =>
      UniversitiesService.updateUniversity({
        universityId: university.id,
        requestBody: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
      setOpen(false)
      toaster.create({
        title: t("university_page.success_update"),
        type: "success",
      })
    },
    onError: (error: any) => {
      toaster.create({
        title: t("university_page.error_update"),
        description: error.message,
        type: "error",
      })
    },
  })

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
      <IconButton onClick={() => setOpen(true)} variant="ghost" size="sm">
        <FiEdit />
      </IconButton>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("university_page.edit_title")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack gap={4}>
            <Field label={t("university_page.fields.name")}>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.code")}>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.country")}>
              <Input
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.city")}>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.address")}>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.phone")}>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.email")}>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.website")}>
              <Input
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </Field>
            <Field label={t("university_page.fields.description")}>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Field>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger>
            <Button variant="outline">{t("common.cancel")}</Button>
          </DialogActionTrigger>
          <Button
            onClick={() => mutation.mutate(formData)}
            loading={mutation.isPending}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

function UniversityActions({ university }: { university: UniversityPublic }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () =>
      UniversitiesService.deleteUniversity({ universityId: university.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
      toaster.create({
        title: t("university_page.success_delete"),
        type: "success",
      })
    },
    onError: (error: any) => {
      toaster.create({
        title: t("university_page.error_delete"),
        description: error.message,
        type: "error",
      })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      university.is_active
        ? UniversitiesService.deactivateUniversity({
          universityId: university.id,
        })
        : UniversitiesService.activateUniversity({
          universityId: university.id,
        }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
      toaster.create({
        title: `University ${university.is_active ? "deactivated" : "activated"} successfully`,
        type: "success",
      })
    },
    onError: (error: any) => {
      toaster.create({
        title: `Error ${university.is_active ? "deactivating" : "activating"} university`,
        description: error.message,
        type: "error",
      })
    },
  })

  return (
    <HStack>
      <EditUniversityDialog university={university} />
      <IconButton
        onClick={() => toggleActiveMutation.mutate()}
        variant="ghost"
        size="sm"
        colorScheme={university.is_active ? "orange" : "green"}
      >
        {university.is_active ? <FiXCircle /> : <FiCheckCircle />}
      </IconButton>
      <IconButton
        onClick={() => deleteMutation.mutate()}
        variant="ghost"
        size="sm"
        colorScheme="red"
      >
        <FiTrash2 />
      </IconButton>
    </HStack>
  )
}

function UniversitiesTable() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, activeOnly } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getUniversitiesQueryOptions({ page, activeOnly }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) => {
    navigate({
      to: "/university",
      search: (prev) => ({ ...prev, page }),
    })
  }

  const universities = data?.data ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (universities.length === 0) {
    return (
      <Box py={12}>
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <FiSearch size="48px" />
            </EmptyState.Indicator>
            <VStack textAlign="center" gap={2}>
              <EmptyState.Title
                fontSize="sm"
                color="fg.emphasized"
                fontWeight="600"
              >
                {t("university_page.no_found")}
              </EmptyState.Title>
              <EmptyState.Description color="fg.muted" fontSize="xs">
                {t("university_page.no_found_desc")}
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      </Box>
    )
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box
        borderRadius="lg"
        border="1px solid"
        borderColor="border.subtle"
        overflow="hidden"
      >
        <Table.Root size="md" variant="outline">
          <Table.Header position="sticky" top={0} zIndex={1}>
            <Table.Row background="linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)">
              <Table.ColumnHeader w="60px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.id")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("university_page.columns.university")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="100px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("student_courses_page.columns.code")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="180px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("university_page.columns.location")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="160px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("university_page.columns.contact")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader flex="1" minW="200px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.description")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="120px">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("university_page.columns.website")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="90px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.status")}
                </Text>
              </Table.ColumnHeader>
              <Table.ColumnHeader w="120px" textAlign="center">
                <Text fontSize="xs" fontWeight="600" letterSpacing="wide" color="white">
                  {t("common.tables.actions")}
                </Text>
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
        </Table.Root>

        {/* Scrollable Body Container */}
        <Box maxH="450px" overflowY="auto" overflowX="hidden">
          <Table.Root size="md" variant="outline">
            <Table.Body>
              {universities.map((university, index) => (
                <Table.Row
                  key={university.id}
                  opacity={isPlaceholderData ? 0.5 : 1}
                  _hover={{ bg: "bg.subtle" }}
                  bg={index % 2 === 0 ? "white" : "#f7f9fc"}
                >
                  <Table.Cell w="60px" textAlign="center">
                    <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                      {university.id?.toString().slice(-4) || "N/A"}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="200px">
                    <VStack align="start" gap={0.5}>
                      <HStack gap={1}>
                        <FiHome
                          size="10px"
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text
                          fontSize="xs"
                          color="#1a3a5c"
                          fontWeight="600"
                          truncate
                        >
                          {university.name}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="fg.muted">
                        {t("university_page.columns.university")}
                      </Text>
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="100px">
                    <Badge colorPalette="blue" variant="outline" size="sm">
                      <Text fontSize="xs" fontWeight="500" fontFamily="mono">
                        {university.code}
                      </Text>
                    </Badge>
                  </Table.Cell>

                  <Table.Cell w="180px">
                    <VStack align="start" gap={0.5}>
                      <HStack gap={1}>
                        <FiMapPin
                          size="10px"
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text
                          fontSize="xs"
                          color="#1a3a5c"
                          fontWeight="500"
                          truncate
                        >
                          {university.city}, {university.country}
                        </Text>
                      </HStack>
                      {university.address && (
                        <Text fontSize="xs" color="fg.muted" truncate>
                          {university.address}
                        </Text>
                      )}
                    </VStack>
                  </Table.Cell>

                  <Table.Cell w="160px">
                    <VStack align="start" gap={0.5}>
                      {university.email && (
                        <HStack gap={1}>
                          <FiMail
                            size="10px"
                            color="var(--chakra-colors-fg-muted)"
                          />
                          <Text fontSize="xs" color="#1a3a5c" truncate>
                            {university.email}
                          </Text>
                        </HStack>
                      )}
                      {university.phone && (
                        <HStack gap={1}>
                          <FiPhone
                            size="10px"
                            color="var(--chakra-colors-fg-muted)"
                          />
                          <Text fontSize="xs" color="fg.muted" truncate>
                            {university.phone}
                          </Text>
                        </HStack>
                      )}
                      {!university.email && !university.phone && (
                        <Text fontSize="xs" color="fg.muted">
                          {t("university_page.no_contact")}
                        </Text>
                      )}
                    </VStack>
                  </Table.Cell>

                  <Table.Cell flex="1" minW="200px">
                    <Text
                      fontSize="xs"
                      color="#1a3a5c"
                      lineClamp={2}
                      title={university.description || undefined}
                    >
                      {university.description || t("university_page.no_description")}
                    </Text>
                  </Table.Cell>

                  <Table.Cell w="120px">
                    {university.website ? (
                      <HStack gap={1}>
                        <FiGlobe
                          size="10px"
                          color="var(--chakra-colors-fg-muted)"
                        />
                        <Text
                          fontSize="xs"
                          color="blue.500"
                          truncate
                          cursor="pointer"
                          onClick={() =>
                            window.open(university.website || "", "_blank")
                          }
                          _hover={{ textDecoration: "underline" }}
                        >
                          {t("university_page.columns.website")}
                        </Text>
                      </HStack>
                    ) : (
                      <Text fontSize="xs" color="fg.muted">
                        {t("university_page.no_website")}
                      </Text>
                    )}
                  </Table.Cell>

                  <Table.Cell w="90px" textAlign="center">
                    <Badge
                      colorPalette={university.is_active ? "green" : "red"}
                      variant="solid"
                      size="sm"
                    >
                      <Text fontSize="xs">
                        {university.is_active ? t("common.tables.active") : t("common.tables.inactive")}
                      </Text>
                    </Badge>
                  </Table.Cell>

                  <Table.Cell w="120px" textAlign="center">
                    <UniversityActions university={university} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      {/* Pagination - Always visible */}
      <Flex justify="space-between" align="center" mt={4}>
        <Text fontSize="xs" color="fg.muted">
          {t("university_page.showing", {
            from: (page - 1) * PER_PAGE + 1,
            to: Math.min(page * PER_PAGE, count),
            total: count,
          })}
        </Text>

        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          page={page}
          onPageChange={({ page }) => setPage(page)}
        >
          <HStack gap={1}>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </HStack>
        </PaginationRoot>
      </Flex>
    </VStack>
  )
}

function Universities() {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { activeOnly } = Route.useSearch()

  return (
    <Container maxW="full" py={6}>
      <UniversityHeader />
      <Box mb={4}>
        <Button
          onClick={() =>
            navigate({
              to: "/university",
              search: (prev) => ({ ...prev, activeOnly: !activeOnly, page: 1 }),
            })
          }
          variant={activeOnly ? "solid" : "outline"}
          colorPalette="blue"
          size="sm"
        >
          {t("university_page.columns.active_filter")}
        </Button>
      </Box>
      <UniversitiesTable />
    </Container>
  )
}
