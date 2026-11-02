import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Box, Flex, Heading, HStack, Icon, Input, Text, VStack } from "@chakra-ui/react"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiArrowLeft, FiBookOpen, FiCheckCircle, FiLock, FiMail } from "react-icons/fi"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { emailPattern, passwordRules } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

// Brand palette — the app's blue, with one restrained academic-gold accent.
const NAVY = "#15314f"
const BLUE_DEEP = "#2c5282"
const BLUE = "#2b6cb0"
const GOLD = "#C9A24B"
const INK = "#1A202C"
const MUTE = "#5B6B7B"
const FAINT = "#A0AEC0"
const LINE = "#E2E8F0"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"

// The real modules of the platform — doubles as the brand panel's signature.
const MODULES = ["RELEVÉ", "PRÉSENCES", "EMPLOI DU TEMPS", "ÉVALUATIONS"]

// ─── Brand mark ──────────────────────────────────────────────────────────────
function BrandMark({ onDark = false }: { onDark?: boolean }) {
  return (
    <HStack gap="11px">
      <Flex
        align="center"
        justify="center"
        w="34px"
        h="34px"
        borderRadius="7px"
        bg={onDark ? "rgba(255,255,255,0.08)" : BLUE_DEEP}
        border="1px solid"
        borderColor={onDark ? "rgba(201,162,75,0.55)" : "transparent"}
        flexShrink={0}
      >
        <Icon as={FiBookOpen} color={onDark ? GOLD : "white"} boxSize={4} />
      </Flex>
      <Box>
        <Text
          fontFamily={MONO}
          fontSize="9px"
          fontWeight="700"
          letterSpacing="2.5px"
          color={onDark ? "rgba(255,255,255,0.6)" : FAINT}
          lineHeight="1"
        >
          UNIVERSITÉ
        </Text>
        <Text
          fontWeight="800"
          fontSize="16px"
          letterSpacing="0.5px"
          color={onDark ? "white" : INK}
          lineHeight="1.2"
        >
          UCRECH
        </Text>
      </Box>
    </HStack>
  )
}

function Login() {
  const { t } = useTranslation()
  const [step, setStep] = useState<"login" | "otp">("login")
  const [email, setEmail] = useState("")
  const { requestOtpMutation, verifyOtpMutation, error, resetError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isLoginSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: errorsOtp, isSubmitting: isOtpSubmitting },
  } = useForm<{ otp_code: string }>({
    defaultValues: {
      otp_code: "",
    },
  })

  const onLoginSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isLoginSubmitting) return
    resetError()
    try {
      await requestOtpMutation.mutateAsync({
        email: data.username,
        password: data.password,
      })
      setEmail(data.username)
      setStep("otp")
    } catch {
      // error is handled by useAuth hook
    }
  }

  const onOtpSubmit: SubmitHandler<{ otp_code: string }> = async (data) => {
    if (isOtpSubmitting) return
    resetError()
    try {
      await verifyOtpMutation.mutateAsync({
        email: email,
        otp_code: data.otp_code,
      })
    } catch {
      // error is handled by useAuth hook
    }
  }

  return (
    <Flex minH="100vh" w="100%">
      {/* ── Brand panel (lg+) ─────────────────────────────────────────── */}
      <Box
        display={{ base: "none", lg: "flex" }}
        flex="1.05"
        position="relative"
        overflow="hidden"
        flexDirection="column"
        justifyContent="space-between"
        p="48px"
        style={{
          background: `linear-gradient(155deg, ${NAVY} 0%, ${BLUE_DEEP} 58%, ${BLUE} 130%)`,
        }}
      >
        {/* ledger-paper dotted grid */}
        <Box
          position="absolute"
          inset="0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* faint oversized monogram for depth */}
        <Icon
          as={FiBookOpen}
          position="absolute"
          color="rgba(255,255,255,0.04)"
          boxSize="420px"
          bottom="-120px"
          right="-90px"
        />

        <Box position="relative">
          <BrandMark onDark />
        </Box>

        <Box position="relative" maxW="430px">
          <Box w="34px" h="2px" bg={GOLD} mb="22px" />
          <Heading
            fontSize="34px"
            fontWeight="800"
            color="white"
            letterSpacing="-1px"
            lineHeight="1.12"
          >
            Cours, notes, présences et bulletins — réunis.
          </Heading>
          <Text fontSize="15px" color="rgba(255,255,255,0.72)" mt="16px" lineHeight="1.6">
            Connectez-vous pour retrouver tout votre parcours au même endroit.
          </Text>
        </Box>

        {/* signature: registrar module strip */}
        <HStack position="relative" gap="0" wrap="wrap">
          {MODULES.map((m, i) => (
            <HStack key={m} gap="0">
              {i > 0 && (
                <Box w="3px" h="3px" borderRadius="full" bg={GOLD} mx="11px" />
              )}
              <Text
                fontFamily={MONO}
                fontSize="10px"
                fontWeight="700"
                letterSpacing="1.5px"
                color="rgba(255,255,255,0.55)"
              >
                {m}
              </Text>
            </HStack>
          ))}
        </HStack>
      </Box>

      {/* ── Form panel ────────────────────────────────────────────────── */}
      <Flex
        flex="1"
        align="center"
        justify="center"
        bg="#FBFCFD"
        p={{ base: 6, md: 10 }}
      >
        <Box w="100%" maxW="380px">
          {/* mobile-only brand mark (brand panel is hidden on small screens) */}
          <Box display={{ base: "block", lg: "none" }} mb={8}>
            <BrandMark />
          </Box>

          {step === "login" ? (
            <Box as="form" onSubmit={handleSubmit(onLoginSubmit)} w="100%">
              <VStack gap={5} align="stretch">
                <Box>
                  <Text
                    fontFamily={MONO}
                    fontSize="10px"
                    fontWeight="700"
                    letterSpacing="2px"
                    color={BLUE}
                    mb="7px"
                  >
                    CONNEXION
                  </Text>
                  <Heading fontSize="26px" fontWeight="800" color={INK} letterSpacing="-0.6px">
                    Bon retour
                  </Heading>
                  <Text fontSize="13.5px" color={MUTE} mt="6px">
                    Entrez vos identifiants pour accéder à votre espace.
                  </Text>
                </Box>

                <Field
                  label={
                    <Text fontSize="11px" fontWeight="700" color={MUTE} letterSpacing="0.3px">
                      Adresse e-mail
                    </Text>
                  }
                  invalid={!!errors.username}
                  errorText={errors.username?.message || (error as any)}
                >
                  <InputGroup w="100%" startElement={<FiMail color={FAINT} />}>
                    <Input
                      {...register("username", {
                        required: t("auth.email_required"),
                        pattern: emailPattern,
                      })}
                      placeholder={t("auth.email_placeholder")}
                      type="email"
                      variant="outline"
                      borderRadius="8px"
                      bg="white"
                      borderColor={LINE}
                      _focus={{ borderColor: BLUE, boxShadow: `0 0 0 1px ${BLUE}` }}
                    />
                  </InputGroup>
                </Field>

                <Field
                  label={
                    <Text fontSize="11px" fontWeight="700" color={MUTE} letterSpacing="0.3px">
                      Mot de passe
                    </Text>
                  }
                  invalid={!!errors.password}
                  errorText={errors.password?.message}
                >
                  <PasswordInput
                    {...register("password", passwordRules())}
                    placeholder="••••••••"
                    startElement={<FiLock color={FAINT} />}
                    variant="outline"
                    borderRadius="8px"
                    bg="white"
                    borderColor={LINE}
                    _focus={{ borderColor: BLUE, boxShadow: `0 0 0 1px ${BLUE}` }}
                  />
                </Field>

                <RouterLink to="/recover-password">
                  <Text fontSize="12px" color={BLUE_DEEP} fontWeight="700" textAlign="right">
                    Mot de passe oublié ?
                  </Text>
                </RouterLink>

                <Button
                  variant="solid"
                  type="submit"
                  loading={isLoginSubmitting}
                  size="lg"
                  bg={`linear-gradient(135deg, ${BLUE_DEEP} 0%, ${BLUE} 100%)`}
                  color="white"
                  borderRadius="8px"
                  shadow="sm"
                  _hover={{ shadow: "md", filter: "brightness(1.05)" }}
                  fontSize="sm"
                  fontWeight="700"
                >
                  Se connecter
                </Button>

                <HStack justify="center" pt={1}>
                  <Text fontSize="12.5px" color={MUTE}>
                    Pas encore de compte ?
                  </Text>
                  <RouterLink to="/signup">
                    <Text fontSize="12.5px" color={BLUE_DEEP} fontWeight="700">
                      Créer un compte
                    </Text>
                  </RouterLink>
                </HStack>
              </VStack>
            </Box>
          ) : (
            <Box as="form" onSubmit={handleSubmitOtp(onOtpSubmit)} w="100%">
              <VStack gap={5} align="stretch">
                <Box>
                  <Text
                    fontFamily={MONO}
                    fontSize="10px"
                    fontWeight="700"
                    letterSpacing="2px"
                    color={BLUE}
                    mb="7px"
                  >
                    VÉRIFICATION
                  </Text>
                  <Heading fontSize="26px" fontWeight="800" color={INK} letterSpacing="-0.6px">
                    Code de vérification
                  </Heading>
                  <Text fontSize="13.5px" color={MUTE} mt="6px" lineHeight="1.55">
                    Un code à 6 chiffres a été envoyé à{" "}
                    <Text as="span" fontWeight="700" color={INK}>
                      {email || "votre e-mail"}
                    </Text>
                    . Saisissez-le pour continuer.
                  </Text>
                </Box>

                <Field
                  label={
                    <Text fontSize="11px" fontWeight="700" color={MUTE} letterSpacing="0.3px">
                      Code OTP
                    </Text>
                  }
                  invalid={!!errorsOtp.otp_code}
                  errorText={errorsOtp.otp_code?.message || (error as any)}
                >
                  <InputGroup w="100%" startElement={<FiCheckCircle color={FAINT} />}>
                    <Input
                      {...registerOtp("otp_code", {
                        required: t("auth.otp_required"),
                        minLength: {
                          value: 6,
                          message: t("auth.otp_length"),
                        },
                        maxLength: {
                          value: 6,
                          message: t("auth.otp_length"),
                        },
                      })}
                      placeholder="000000"
                      type="text"
                      variant="outline"
                      borderRadius="8px"
                      bg="white"
                      borderColor={LINE}
                      fontFamily={MONO}
                      letterSpacing="6px"
                      fontSize="18px"
                      fontWeight="700"
                      textAlign="center"
                      color={INK}
                      _focus={{ borderColor: BLUE, boxShadow: `0 0 0 1px ${BLUE}` }}
                    />
                  </InputGroup>
                </Field>

                <Button
                  variant="solid"
                  type="submit"
                  loading={isOtpSubmitting}
                  size="lg"
                  bg={`linear-gradient(135deg, ${BLUE_DEEP} 0%, ${BLUE} 100%)`}
                  color="white"
                  borderRadius="8px"
                  shadow="sm"
                  _hover={{ shadow: "md", filter: "brightness(1.05)" }}
                  fontSize="sm"
                  fontWeight="700"
                >
                  Vérifier le code
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("login")
                    resetError()
                  }}
                  color={MUTE}
                  fontSize="12.5px"
                  fontWeight="600"
                  _hover={{ color: BLUE_DEEP, bg: "transparent" }}
                >
                  <FiArrowLeft />
                  Retour à la connexion
                </Button>
              </VStack>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  )
}
