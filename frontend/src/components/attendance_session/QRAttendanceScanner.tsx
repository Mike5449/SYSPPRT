import { Box, Button, Center, Icon, Text, VStack } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { Html5QrcodeScanner } from "html5-qrcode"
import { useCallback, useEffect, useRef, useState } from "react"
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa"
import { AttendanceQrService } from "@/client"

interface QRAttendanceScannerProps {
  onStudentScanned?: (name: string) => void
}

export const QRAttendanceScanner = ({
  onStudentScanned,
}: QRAttendanceScannerProps) => {
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSecureContext, setIsSecureContext] = useState(true)
  const [scannerReady, setScannerReady] = useState(false)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  const mutation = useMutation({
    mutationFn: (token: string) => AttendanceQrService.scanQrToken({ token }),
    onSuccess: (data) => {
      setIsSuccess(true)
      setError(null)
      // Extract student name from response
      if ((data as any).student) {
        const fullName =
          `${(data as any).student.first_name || ""} ${(data as any).student.last_name || ""}`.trim()
        setStudentName(fullName)
        // Notify parent component
        if (onStudentScanned) {
          onStudentScanned(fullName)
        }
      }
      // Clear scanner after success
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch((e) => console.error("Failed to clear scanner", e))
      }
    },
    onError: (err: any) => {
      console.error("Erreur scan QR:", err)

      // Parse error message
      let errorMessage = "Échec de l'enregistrement de la présence."

      if (err.body?.detail) {
        errorMessage = err.body.detail
      } else if (err.detail) {
        errorMessage = err.detail
      } else if (err.message) {
        errorMessage = err.message
      }

      // Specific error messages
      if (errorMessage.includes("not an active student")) {
        errorMessage =
          "❌ Vous devez être connecté en tant qu'étudiant pour scanner le QR code."
      } else if (
        errorMessage.includes("expired") ||
        errorMessage.includes("Expired")
      ) {
        errorMessage =
          "⏰ Ce QR code a expiré. Demandez à votre professeur de générer un nouveau code."
      } else if (
        errorMessage.includes("Invalid") ||
        errorMessage.includes("invalid")
      ) {
        errorMessage =
          "❌ QR code invalide. Assurez-vous de scanner le bon code."
      } else if (errorMessage.includes("already recorded")) {
        errorMessage =
          "✅ Votre présence a déjà été enregistrée pour cette session."
      }

      setError(errorMessage)
    },
  })

  const handleQrCodeSuccess = useCallback(
    (decodedText: string) => {
      console.log("QR Code détecté:", decodedText)
      try {
        const data = JSON.parse(decodedText)
        if (data.type === "attendance_scan" && data.token) {
          mutation.mutate(data.token)
        } else {
          setError("QR Code non valide pour la présence.")
        }
      } catch (_e) {
        setError("Format de QR Code invalide.")
      }
    },
    [mutation.mutate],
  )

  useEffect(() => {
    // Check if we're in a secure context
    const isSecure =
      window.isSecureContext ||
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost"
    setIsSecureContext(isSecure)

    // Camera-only mode - no file upload
    if (!isSecure) {
      setError(
        "⚠️ HTTPS requis - La caméra nécessite une connexion sécurisée (HTTPS)",
      )
      return () => {
        const styles = document.querySelectorAll("style")
        styles.forEach((s) => {
          if (s.innerHTML.includes("qr-reader__dashboard_section_csr")) {
            document.head.removeChild(s)
          }
        })
      }
    }

    // Initialize camera scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        supportedScanTypes: [0], // 0 = Camera only, 1 = File upload
      },
      /* verbose= */ false,
    )

    scannerRef.current = scanner

    try {
      scanner.render(handleQrCodeSuccess, (errorMessage) => {
        // Only log real errors, not scanning states
        console.log("Scanner error:", errorMessage)

        if (errorMessage.includes("NotAllowedError")) {
          setError(
            "🚫 Accès à la caméra refusé. Vous devez autoriser l'accès à la caméra pour scanner le QR code.",
          )
          setIsLoading(false)
        } else if (errorMessage.includes("NotFoundError")) {
          setError(
            "📷 Aucune caméra trouvée. Assurez-vous que votre appareil possède une caméra.",
          )
          setIsLoading(false)
        } else if (errorMessage.includes("NotReadableError")) {
          setError(
            "⚠️ La caméra est déjà utilisée par une autre application. Fermez les autres applications et rechargez la page.",
          )
          setIsLoading(false)
        } else if (errorMessage.includes("OverconstrainedError")) {
          setError("⚠️ La caméra ne supporte pas les paramètres demandés.")
          setIsLoading(false)
        }
      })

      // Wait a bit for camera to initialize
      setTimeout(() => {
        setScannerReady(true)
        setIsLoading(false)
        console.log("Scanner initialisé!")
      }, 1000)
    } catch (err) {
      console.error("Erreur d'initialisation du scanner:", err)
      setError(
        "❌ Impossible d'initialiser le scanner. Vérifiez que vous avez une caméra et que les permissions sont accordées.",
      )
      setIsLoading(false)
    }

    return () => {
      if (scannerRef.current) {
        try {
          const clearPromise = scannerRef.current.clear()
          if (clearPromise && typeof clearPromise.catch === "function") {
            clearPromise.catch((e) =>
              console.error("Failed to clear scanner", e),
            )
          }
        } catch (e) {
          console.error("Error clearing scanner", e)
        }
      }
    }
  }, [handleQrCodeSuccess])

  const handleNewScan = () => {
    setIsSuccess(false)
    setError(null)
    setStudentName(null)
    setIsLoading(true)
    setScannerReady(false)

    // Reinitialize scanner after a brief delay
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  if (isSuccess) {
    return (
      <Center p={10}>
        <VStack gap={4}>
          <Box
            p={6}
            bg="green.50"
            border="1px solid"
            borderColor="green.200"
            borderRadius="lg"
            w="full"
          >
            <VStack gap={2} align="start">
              <Box
                display="flex"
                alignItems="center"
                gap={2}
                color="green.600"
                fontWeight="bold"
              >
                <Icon as={FaCheckCircle} />
                <Text>Présence Enregistrée !</Text>
              </Box>
              {studentName && (
                <Text fontSize="md" color="green.800" fontWeight="600">
                  {studentName}
                </Text>
              )}
              <Text fontSize="sm" color="green.700">
                Votre présence a été confirmée avec succès. Merci.
              </Text>
            </VStack>
          </Box>
          <Button onClick={handleNewScan} colorScheme="blue">
            Scanner un autre étudiant
          </Button>
        </VStack>
      </Center>
    )
  }

  return (
    <Box p={4}>
      <VStack gap={6}>
        <Text fontWeight="bold" fontSize="xl">
          Scanner le QR Code de présence
        </Text>

        <Box
          p={3}
          bg="blue.50"
          border="1px solid"
          borderColor="blue.200"
          borderRadius="md"
          w="full"
        >
          <Text
            fontSize="sm"
            color="blue.700"
            textAlign="center"
            fontWeight="500"
          >
            ⚠️ Scan en direct uniquement - Pas de capture d'écran autorisée
          </Text>
        </Box>

        {!isSecureContext && (
          <Box
            p={4}
            bg="red.50"
            border="1px solid"
            borderColor="red.200"
            borderRadius="md"
            w="full"
          >
            <Text fontSize="sm" color="red.700" fontWeight="bold" mb={2}>
              🔒 Connexion HTTPS requise
            </Text>
            <Text fontSize="xs" color="red.600">
              L'accès à la caméra nécessite HTTPS. Contactez l'administrateur.
            </Text>
          </Box>
        )}

        {isLoading && !error && (
          <Box
            p={3}
            bg="blue.50"
            border="1px solid"
            borderColor="blue.200"
            borderRadius="md"
            w="full"
          >
            <Text
              fontSize="sm"
              color="blue.700"
              textAlign="center"
              fontWeight="500"
            >
              📷 Démarrage de la caméra...
            </Text>
          </Box>
        )}

        {scannerReady && !isLoading && (
          <Box
            p={3}
            bg="green.50"
            border="1px solid"
            borderColor="green.200"
            borderRadius="md"
            w="full"
          >
            <Text
              fontSize="sm"
              color="green.700"
              textAlign="center"
              fontWeight="500"
            >
              ✅ Caméra activée - Positionnez le QR code devant la caméra
            </Text>
          </Box>
        )}

        <Box
          id="qr-reader"
          w="full"
          maxW="500px"
          borderRadius="lg"
          overflow="hidden"
          border="2px solid"
          borderColor="border.strong"
        />

        {error && (
          <Box
            p={4}
            bg="red.50"
            border="1px solid"
            borderColor="red.200"
            borderRadius="md"
            w="full"
          >
            <Box
              display="flex"
              alignItems="center"
              gap={2}
              color="red.600"
              fontWeight="bold"
              mb={1}
            >
              <Icon as={FaExclamationCircle} />
              <Text>Erreur</Text>
            </Box>
            <Text fontSize="sm" color="red.700">
              {error}
            </Text>
          </Box>
        )}

        {mutation.isPending && (
          <Box
            p={3}
            bg="blue.50"
            border="1px solid"
            borderColor="blue.200"
            borderRadius="md"
            w="full"
          >
            <Text textAlign="center" fontSize="sm" color="blue.700">
              ⏳ Enregistrement en cours...
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}

// import { useState, useEffect } from "react"
// import { Html5QrcodeScanner } from "html5-qrcode"
// import {
//     Box,
//     Button,
//     VStack,
//     Text,
//     Center,
//     Icon,
// } from "@chakra-ui/react"
// import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa"
// import { useMutation } from "@tanstack/react-query"
// import { AttendanceQrService } from "@/client"

// export const QRAttendanceScanner = () => {
//     const [error, setError] = useState<string | null>(null)
//     const [isSuccess, setIsSuccess] = useState(false)

//     const mutation = useMutation({
//         mutationFn: (token: string) =>
//             AttendanceQrService.scanQrToken({ token }),
//         onSuccess: () => {
//             setIsSuccess(true)
//             setError(null)
//         },
//         onError: (err: any) => {
//             setError(err.detail || "Échec de l'enregistrement de la présence.")
//         },
//     })

//     useEffect(() => {
//         const scanner = new Html5QrcodeScanner(
//             "qr-reader",
//             { fps: 10, qrbox: { width: 250, height: 250 } },
//       /* verbose= */ false
//         )

//         scanner.render(
//             (decodedText) => {
//                 try {
//                     const data = JSON.parse(decodedText)
//                     if (data.type === "attendance_scan" && data.token) {
//                         mutation.mutate(data.token)
//                         scanner.clear()
//                     } else {
//                         setError("QR Code non valide pour la présence.")
//                     }
//                 } catch (e) {
//                     setError("Format de QR Code invalide.")
//                 }
//             },
//             () => {
//                 // Just ignore errors during scanning
//             }
//         )

//         return () => {
//             scanner.clear().catch(e => console.error("Failed to clear scanner", e))
//         }
//     }, [])

//     if (isSuccess) {
//         return (
//             <Center p={10}>
//                 <VStack gap={4}>
//                     <Box p={6} bg="green.50" border="1px solid" borderColor="green.200" borderRadius="lg" w="full">
//                         <VStack gap={2} align="start">
//                             <Box display="flex" alignItems="center" gap={2} color="green.600" fontWeight="bold">
//                                 <Icon as={FaCheckCircle} />
//                                 <Text>Présence Enregistrée !</Text>
//                             </Box>
//                             <Text fontSize="sm" color="green.700">
//                                 Votre présence a été confirmée avec succès. Merci.
//                             </Text>
//                         </VStack>
//                     </Box>
//                     <Button onClick={() => window.location.reload()}>Fermer</Button>
//                 </VStack>
//             </Center>
//         )
//     }

//     return (
//         <Box p={4}>
//             <VStack gap={6}>
//                 <Text fontWeight="bold" fontSize="xl">Scanner le QR Code de présence</Text>

//                 <Box
//                     id="qr-reader"
//                     w="full"
//                     maxW="500px"
//                     borderRadius="lg"
//                     overflow="hidden"
//                     border="2px solid"
//                     borderColor="border.strong"
//                 />

//                 {error && (
//                     <Box p={4} bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" w="full">
//                         <Box display="flex" alignItems="center" gap={2} color="red.600" fontWeight="bold" mb={1}>
//                             <Icon as={FaExclamationCircle} />
//                             <Text>Erreur</Text>
//                         </Box>
//                         <Text fontSize="sm" color="red.700">{error}</Text>
//                     </Box>
//                 )}

//                 {mutation.isPending && <Text>Enregistrement en cours...</Text>}
//             </VStack>
//         </Box>
//     )
// }
