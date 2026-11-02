import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMemo, useState } from "react"
import { FiCheckCircle, FiRotateCcw } from "react-icons/fi"

import type { NoteScanResponse } from "@/client"

const C = {
  ink: "#1A202C",
  inkMute: "#4A5568",
  line: "#E2E8F0",
  paper: "#F7FAFC",
  brand: "#2b6cb0",
}

const MATRICULE_RE = /^[A-Z]{2}[0-9]{6}$/

interface DetectedNoteCardProps {
  scan: NoteScanResponse
  capturedUrl: string
  saving: boolean
  onConfirm: (matricule: string, note: number) => void
  onRetake: () => void
}

/**
 * Écran de confirmation : montre la photo, l'aperçu des zones détectées, les
 * valeurs reconnues (éditables), l'étudiant retrouvé, puis le bouton Confirmer.
 *
 * Les champs sont éditables car la reconnaissance manuscrite n'est jamais
 * parfaite : l'utilisateur corrige avant d'enregistrer.
 */
export function DetectedNoteCard({
  scan,
  capturedUrl,
  saving,
  onConfirm,
  onRetake,
}: DetectedNoteCardProps) {
  const [matricule, setMatricule] = useState(scan.matricule ?? "")
  const [noteStr, setNoteStr] = useState(
    scan.note != null ? String(scan.note) : "",
  )

  const matriculeValid = MATRICULE_RE.test(matricule.trim().toUpperCase())
  const noteValue = Number.parseFloat(noteStr.replace(",", "."))
  const noteValid =
    !Number.isNaN(noteValue) && noteValue >= 0 && noteValue <= 20

  // L'étudiant affiché n'est fiable que si le matricule n'a pas été modifié.
  const matriculeUnchanged =
    matricule.trim().toUpperCase() === (scan.matricule ?? "").toUpperCase()
  const showStudent = scan.student_found && scan.student && matriculeUnchanged

  const lowConfidence = useMemo(
    () =>
      (scan.matricule_confidence != null && scan.matricule_confidence < 0.5) ||
      (scan.note_confidence != null && scan.note_confidence < 0.5),
    [scan.matricule_confidence, scan.note_confidence],
  )

  const canConfirm = matriculeValid && noteValid && !saving

  return (
    <VStack gap={5} align="stretch">
      {/* Aperçu photo + zones détectées */}
      <Flex gap={4} direction={{ base: "column", md: "row" }}>
        <Box flex="1" borderRadius="10px" overflow="hidden" border="1px solid" borderColor={C.line}>
          <Image src={capturedUrl} alt="Photo capturée" w="full" objectFit="cover" />
          <Text fontSize="10px" color={C.inkMute} px={2} py={1} bg={C.paper}>
            Photo capturée
          </Text>
        </Box>
        {scan.preview_image && (
          <Box flex="1" borderRadius="10px" overflow="hidden" border="1px solid" borderColor={C.line}>
            <Image src={scan.preview_image} alt="Zones détectées" w="full" objectFit="cover" />
            <Text fontSize="10px" color={C.inkMute} px={2} py={1} bg={C.paper}>
              Zones détectées (vert = matricule, bleu = note)
            </Text>
          </Box>
        )}
      </Flex>

      {lowConfidence && (
        <Box p={3} bg="orange.50" border="1px solid" borderColor="orange.200" borderRadius="8px">
          <Text fontSize="xs" color="orange.700" fontWeight="600">
            ⚠️ Reconnaissance peu fiable — vérifiez attentivement les valeurs ci-dessous.
          </Text>
        </Box>
      )}

      {/* Valeurs reconnues, éditables */}
      <VStack gap={4} align="stretch">
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" fontWeight="700" color={C.inkMute} letterSpacing="0.5px">
              MATRICULE
            </Text>
            <Badge colorPalette={matriculeValid ? "green" : "red"} variant="subtle" size="xs">
              {matriculeValid ? "Format valide" : "Format attendu : AA000000"}
            </Badge>
          </HStack>
          <Input
            value={matricule}
            onChange={(e) => setMatricule(e.target.value.toUpperCase())}
            placeholder="AA000000"
            fontFamily="ui-monospace, monospace"
            fontSize="lg"
            fontWeight="700"
            letterSpacing="2px"
            borderRadius="8px"
            borderColor={matriculeValid ? C.line : "red.300"}
          />
        </Box>

        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" fontWeight="700" color={C.inkMute} letterSpacing="0.5px">
              NOTE (sur 20)
            </Text>
            <Badge colorPalette={noteValid ? "green" : "red"} variant="subtle" size="xs">
              {noteValid ? "Valide" : "0 à 20"}
            </Badge>
          </HStack>
          <Input
            type="number"
            step="0.25"
            min={0}
            max={20}
            value={noteStr}
            onChange={(e) => setNoteStr(e.target.value)}
            placeholder="17.5"
            fontSize="lg"
            fontWeight="700"
            borderRadius="8px"
            borderColor={noteValid ? C.line : "red.300"}
          />
        </Box>
      </VStack>

      {/* Étudiant retrouvé / introuvable */}
      {showStudent && scan.student ? (
        <Flex
          gap={4}
          p={4}
          bg={C.paper}
          border="1px solid"
          borderColor={C.line}
          borderRadius="10px"
          align="center"
        >
          <Box
            w="52px"
            h="52px"
            borderRadius="full"
            bg={C.brand}
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontWeight="800"
            fontSize="lg"
            overflow="hidden"
            flexShrink={0}
          >
            {scan.student.photo_url ? (
              <Image src={scan.student.photo_url} alt="" w="full" h="full" objectFit="cover" />
            ) : (
              `${(scan.student.prenom ?? "?")[0] ?? "?"}${(scan.student.nom ?? "")[0] ?? ""}`
            )}
          </Box>
          <Box>
            <Text fontWeight="800" color={C.ink} fontSize="md">
              {scan.student.prenom} {scan.student.nom}
            </Text>
            {scan.student.classe && (
              <Text fontSize="xs" color={C.inkMute}>
                {scan.student.classe}
              </Text>
            )}
            <Badge colorPalette="green" variant="subtle" size="xs" mt={1}>
              Étudiant trouvé
            </Badge>
          </Box>
        </Flex>
      ) : (
        <Box p={3} bg="blue.50" border="1px solid" borderColor="blue.200" borderRadius="8px">
          <Text fontSize="xs" color="blue.700" fontWeight="600">
            {matriculeUnchanged && scan.matricule
              ? "Matricule introuvable — corrigez-le si nécessaire."
              : "Le matricule sera vérifié lors de l'enregistrement."}
          </Text>
        </Box>
      )}

      {/* Actions */}
      <HStack gap={3} pt={1}>
        <Button
          variant="outline"
          onClick={onRetake}
          disabled={saving}
          borderRadius="8px"
          flex="1"
        >
          <Box as="span" mr={2}>
            <FiRotateCcw />
          </Box>
          Reprendre
        </Button>
        <Button
          colorPalette="blue"
          onClick={() => onConfirm(matricule.trim().toUpperCase(), noteValue)}
          disabled={!canConfirm}
          loading={saving}
          borderRadius="8px"
          flex="1"
        >
          <Box as="span" mr={2}>
            <FiCheckCircle />
          </Box>
          Confirmer
        </Button>
      </HStack>
    </VStack>
  )
}

export default DetectedNoteCard
