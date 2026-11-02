import { Flex, Image, Input, Text } from "@chakra-ui/react"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock, FiUser } from "react-icons/fi"

import type { UserRegister } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { confirmPasswordRules, emailPattern, passwordRules } from "@/utils"
import Logo from "/assets/images/fastapi-logo.svg"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

interface UserRegisterForm extends UserRegister {
  confirm_password: string
}

function SignUp() {
  const { signUpMutation } = useAuth()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    signUpMutation.mutate(data)
  }

  return (
    <Flex flexDir={{ base: "column", md: "row" }} justify="center" h="100vh">
      <Flex
        as="form"
        direction="column"
        onSubmit={handleSubmit(onSubmit)}
        h="100vh"
        maxW="sm"
        mx="auto"
        alignItems="stretch"
        justifyContent="center"
        gap={4}
      >
        <Image
          src={Logo}
          alt="FastAPI logo"
          height="auto"
          maxW="2xs"
          alignSelf="center"
          mb={4}
        />
        <Field
          invalid={!!errors.first_name}
          errorText={errors.first_name?.message}
        >
          <InputGroup w="100%" startElement={<FiUser />}>
            <Input
              minLength={1}
              {...register("first_name", {
                required: "First Name is required",
              })}
              placeholder="First Name"
              type="text"
            />
          </InputGroup>
        </Field>

        <Field
          invalid={!!errors.last_name}
          errorText={errors.last_name?.message}
        >
          <InputGroup w="100%" startElement={<FiUser />}>
            <Input
              minLength={1}
              {...register("last_name", {
                required: "Last Name is required",
              })}
              placeholder="Last Name"
              type="text"
            />
          </InputGroup>
        </Field>

        <Field invalid={!!errors.email} errorText={errors.email?.message}>
          <InputGroup w="100%" startElement={<FiUser />}>
            <Input
              {...register("email", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              placeholder="Email"
              type="email"
            />
          </InputGroup>
        </Field>
        <PasswordInput
          type="password"
          startElement={<FiLock />}
          {...register("password", passwordRules())}
          placeholder="Password"
          errors={errors}
        />
        <PasswordInput
          type="confirm_password"
          startElement={<FiLock />}
          {...register("confirm_password", confirmPasswordRules(getValues))}
          placeholder="Confirm Password"
          errors={errors}
        />
        <Button variant="solid" type="submit" loading={isSubmitting}>
          Sign Up
        </Button>
        <Text>
          Already have an account?{" "}
          <RouterLink to="/login" className="main-link">
            Log In
          </RouterLink>
        </Text>
      </Flex>
    </Flex>
  )
}

export default SignUp
