import {
  Badge,
  Box,
  Container,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { FiCheckSquare, FiClipboard, FiSearch } from "react-icons/fi"

import { AssessmentsService } from "@/client"
import DetectedNoteCard from "@/components/notes/DetectedNoteCard"
import NoteCameraCapture from "@/components/notes/NoteCameraCapture"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@/components/ui/menu"
import useCustomToast from "@/hooks/useCustomToast"
import { useScanNote, useSaveNote } from "@/hooks/useNoteScan"
import useAuth from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"

export const Route = createFileRoute("/_layout/notes/scan")({
  component: NotesScanPage,
})

// ─── Palette — identité bleue conservée ─────────────────────────────────────
const C = {
  ink: "#1A202C",
  inkMute: "#4A5568",
  line: "#E2E8F0",
  paper: "#F7FAFC",
  brand: "#2b6cb0",
  headerGrad: "linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%)",
}
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

interface AssessmentOption {
  id: string
  label: string
  sub?: string
}

function NotesScanPage() {
  const { user: currentUser } = useAuth()
  const { data: roles } = useUserRoles(currentUser?.id)
  const isAdmin = currentUser?.is_superuser
  const isTeacher = roles?.some((r) => r.code === "TEACHER")
  const allowed = isAdmin || isTeacher

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const scanMutation = useScanNote()
  const saveMutation = useSaveNote()

  // Sélection de l'évaluation
  const [assessmentId, setAssessmentId] = useState<string | undefined>()
  const [assessmentFilter, setAssessmentFilter] = useState("")

  // Machine à états de capture
  const [captured, setCaptured] = useState<{ blob: Blob; url: string } | null>(
    null,
  )

  const { data: assessmentsData, isLoading: loadingAssessments } = useQuery({
    queryKey: ["assessments_for_scan"],
    queryFn: () => AssessmentsService.readAssessments({ limit: 500 }),
    enabled: !!allowed,
  })

  const assessmentOptions: AssessmentOption[] = useMemo(() => {
    const rows = assessmentsData?.data ?? []
    return rows.map((a: any) => {
      const course =
        a.course_session?.course_program_level?.course?.name ??
        a.course_session?.course_program_level?.course?.code ??
        undefined
      return {
        id: a.id,
        label: a.name,
        sub: course
          ? `${course}${a.assessment_type ? ` · ${a.assessment_type}` : ""}`
          : a.assessment_type,
      }
    })
  }, [assessmentsData])

  const filteredOptions = useMemo(() => {
    const q = assessmentFilter.trim().toLowerCase()
    if (!q) return assessmentOptions
    return assessmentOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sub ?? "").toLowerCase().includes(q),
    )
  }, [assessmentOptions, assessmentFilter])

  const selectedAssessment = assessmentOptions.find((o) => o.id === assessmentId)

  // Nettoyage de l'URL objet
  useEffect(() => {
    return () => {
      if (captured) URL.revokeObjectURL(captured.url)
    }
  }, [captured])

  const resetCapture = useCallback(() => {
    setCaptured((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    scanMutation.reset()
  }, [scanMutation])

  const handleCapture = useCallback(
    (blob: Blob) => {
      const url = URL.createObjectURL(blob)
      setCaptured({ blob, url })
      scanMutation.mutate(blob, {
        onSuccess: (data) => {
          if (!data.success) {
            showErrorToast(data.message || "Image illisible. Reprenez la photo.")
          }
        },
        onError: () => {
          showErrorToast("Échec de l'analyse de l'image.")
        },
      })
    },
    [scanMutation, showErrorToast],
  )

  const handleConfirm = useCallback(
    (matricule: string, note: number) => {
      if (!assessmentId) {
        showErrorToast("Choisissez d'abord une évaluation.")
        return
      }
      saveMutation.mutate(
        { matricule, note, assessment_id: assessmentId },
        {
          onSuccess: (res) => {
            showSuccessToast(res.message || "Note enregistrée.")
            resetCapture() // prêt pour la fiche suivante
          },
          onError: (err: any) => {
            showErrorToast(err?.body?.detail || "Échec de l'enregistrement.")
          },
        },
      )
    },
    [assessmentId, saveMutation, showSuccessToast, showErrorToast, resetCapture],
  )

  if (!allowed) {
    return (
      <Container maxW="2xl" py={16}>
        <Box p={8} bg="red.50" border="1px solid" borderColor="red.200" borderRadius="10px" textAlign="center">
          <Text fontWeight="700" color="red.700">
            Accès réservé aux professeurs et administrateurs.
          </Text>
        </Box>
      </Container>
    )
  }

  const scanResult = scanMutation.data
  const inReview = !!captured && !!scanResult && scanResult.success

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Hero */}
        <Box bg="white" border="1px solid" borderColor={C.line} borderRadius="12px" overflow="hidden">
          <Box bg={C.headerGrad} px={6} py={5}>
            <Text fontFamily={MONO} fontSize="10.5px" fontWeight="700" letterSpacing="2px" color="whiteAlpha.800" mb="6px">
              SAISIE AUTOMATIQUE
            </Text>
            <Text fontSize={{ base: "20px", md: "24px" }} fontWeight="800" color="white" letterSpacing="-0.5px">
              Saisie des notes par photo
            </Text>
            <Text color="whiteAlpha.900" fontSize="13px" mt="4px">
              Photographiez la fiche : le matricule et la note sont reconnus automatiquement.
            </Text>
          </Box>
        </Box>

        {/* Étape 1 — Évaluation */}
        <Box bg="white" border="1px solid" borderColor={C.line} borderRadius="12px" p={5}>
          <HStack mb={3} gap={2}>
            <Box color={C.brand}>
              <FiClipboard />
            </Box>
            <Text fontWeight="800" color={C.ink} fontSize="sm">
              1. Évaluation cible
            </Text>
            {selectedAssessment && (
              <Badge colorPalette="green" variant="subtle" size="xs">
                Sélectionnée
              </Badge>
            )}
          </HStack>

          <MenuRoot positioning={{ gutter: 6, placement: "bottom-start" }}>
            <MenuTrigger asChild>
              <Flex
                as="button"
                align="center"
                justify="space-between"
                w="full"
                px={4}
                py={3}
                borderRadius="8px"
                border="1px solid"
                borderColor={C.line}
                bg={C.paper}
                cursor="pointer"
              >
                <Text fontSize="sm" color={selectedAssessment ? C.ink : C.inkMute} fontWeight={selectedAssessment ? "700" : "500"} textAlign="left">
                  {selectedAssessment
                    ? selectedAssessment.label
                    : loadingAssessments
                      ? "Chargement…"
                      : "Choisir une évaluation…"}
                </Text>
                <Box color={C.brand}>▾</Box>
              </Flex>
            </MenuTrigger>
            <MenuContent minW="360px" maxH="360px" overflowY="auto" bg="white" borderRadius="8px" border="1px solid" borderColor={C.line} p="6px" zIndex={1500}>
              <Box px={2} pb={2}>
                <Flex align="center" gap={2} border="1px solid" borderColor={C.line} borderRadius="6px" px={2}>
                  <FiSearch color={C.inkMute} />
                  <Input
                    value={assessmentFilter}
                    onChange={(e) => setAssessmentFilter(e.target.value)}
                    placeholder="Rechercher…"
                    variant="flushed"
                    size="sm"
                    border="none"
                    _focus={{ boxShadow: "none" }}
                  />
                </Flex>
              </Box>
              {filteredOptions.length === 0 && (
                <Text px={3} py={2} fontSize="xs" color={C.inkMute}>
                  Aucune évaluation.
                </Text>
              )}
              {filteredOptions.map((o) => (
                <MenuItem
                  key={o.id}
                  value={o.id}
                  borderRadius="6px"
                  onClick={() => setAssessmentId(o.id)}
                >
                  <Box>
                    <Text fontSize="13px" fontWeight="600" color={C.ink}>
                      {o.label}
                    </Text>
                    {o.sub && (
                      <Text fontSize="11px" color={C.inkMute}>
                        {o.sub}
                      </Text>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </MenuContent>
          </MenuRoot>
        </Box>

        {/* Étape 2 — Caméra / Révision */}
        <Box bg="white" border="1px solid" borderColor={C.line} borderRadius="12px" p={5}>
          <HStack mb={3} gap={2}>
            <Box color={C.brand}>
              <FiCheckSquare />
            </Box>
            <Text fontWeight="800" color={C.ink} fontSize="sm">
              2. Photographier la fiche
            </Text>
          </HStack>

          {!assessmentId ? (
            <Box p={4} bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="8px">
              <Text fontSize="sm" color="blue.700" fontWeight="600">
                Sélectionnez d'abord une évaluation ci-dessus.
              </Text>
            </Box>
          ) : scanMutation.isPending ? (
            <VStack py={10} gap={3}>
              <Spinner color={C.brand} size="lg" />
              <Text fontSize="sm" color={C.inkMute}>
                Analyse de l'image en cours…
              </Text>
            </VStack>
          ) : inReview && scanResult ? (
            <DetectedNoteCard
              scan={scanResult}
              capturedUrl={captured!.url}
              saving={saveMutation.isPending}
              onConfirm={handleConfirm}
              onRetake={resetCapture}
            />
          ) : (
            <NoteCameraCapture onCapture={handleCapture} disabled={scanMutation.isPending} />
          )}
        </Box>
      </VStack>
    </Container>
  )
}
