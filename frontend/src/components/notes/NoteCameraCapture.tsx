import { Box, Button, Text, VStack } from "@chakra-ui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FiCamera } from "react-icons/fi"

const C = {
  brand: "#2b6cb0",
  line: "#E2E8F0",
  inkMute: "#4A5568",
}

interface NoteCameraCaptureProps {
  /** Appelée avec la photo capturée (JPEG). */
  onCapture: (image: Blob) => void
  /** Désactive le bouton de capture (ex. pendant l'analyse). */
  disabled?: boolean
}

/**
 * Caméra plein cadre pour photographier une fiche de notes.
 *
 * Ouvre automatiquement la caméra arrière (``facingMode: environment``),
 * affiche un cadre de visée et capture une image JPEG via un canvas hors-écran.
 * Gère le contexte non sécurisé (HTTPS requis) et les erreurs d'accès caméra.
 */
export function NoteCameraCapture({
  onCapture,
  disabled = false,
}: NoteCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    const isSecure =
      window.isSecureContext ||
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost"
    if (!isSecure) {
      setError(
        "🔒 HTTPS requis — l'accès à la caméra nécessite une connexion sécurisée.",
      )
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setReady(true)
      } catch (err: any) {
        const name = err?.name || ""
        if (name === "NotAllowedError") {
          setError("🚫 Accès à la caméra refusé. Autorisez la caméra puis rechargez.")
        } else if (name === "NotFoundError") {
          setError("📷 Aucune caméra détectée sur cet appareil.")
        } else if (name === "NotReadableError") {
          setError("⚠️ La caméra est déjà utilisée par une autre application.")
        } else {
          setError("❌ Impossible d'initialiser la caméra.")
        }
      }
    })()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [stopStream])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob)
      },
      "image/jpeg",
      0.92,
    )
  }, [onCapture])

  if (error) {
    return (
      <Box
        p={5}
        bg="red.50"
        border="1px solid"
        borderColor="red.200"
        borderRadius="8px"
        textAlign="center"
      >
        <Text fontSize="sm" color="red.700" fontWeight="600">
          {error}
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      <Box
        position="relative"
        w="full"
        bg="black"
        borderRadius="10px"
        overflow="hidden"
        border="1px solid"
        borderColor={C.line}
        aspectRatio={4 / 3}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: flux caméra en direct */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Cadre de visée */}
        <Box
          position="absolute"
          inset="8%"
          border="2px dashed rgba(255,255,255,0.7)"
          borderRadius="8px"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          bottom="10px"
          left="0"
          right="0"
          textAlign="center"
          pointerEvents="none"
        >
          <Text fontSize="xs" color="whiteAlpha.900" fontWeight="600">
            Alignez la fiche dans le cadre
          </Text>
        </Box>
      </Box>

      <Button
        colorPalette="blue"
        size="lg"
        onClick={handleCapture}
        disabled={disabled || !ready}
        borderRadius="8px"
      >
        <Box as="span" mr={2}>
          <FiCamera />
        </Box>
        Prendre une photo
      </Button>
      {!ready && (
        <Text fontSize="xs" color={C.inkMute} textAlign="center">
          📷 Démarrage de la caméra…
        </Text>
      )}
    </VStack>
  )
}

export default NoteCameraCapture
