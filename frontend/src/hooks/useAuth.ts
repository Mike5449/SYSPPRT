import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import {
  type Body_login_login_access_token as AccessToken,
  type ApiError,
  LoginService,
  type UserPublic,
  type UserRegister,
  UsersService,
  type OTPRequest,
  type OTPVerify,
} from "@/client"
import { handleError } from "@/utils"

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
}

const useAuth = () => {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ requestBody: data }),

    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    localStorage.setItem("access_token", response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const logout = () => {
    localStorage.removeItem("access_token")
    // Nettoyer TOUT le cache des queries pour éviter les conflits entre utilisateurs
    queryClient.clear()
    navigate({ to: "/login" })
  }

  const requestOtpMutation = useMutation({
    mutationFn: (data: OTPRequest) =>
      LoginService.requestOtp({ requestBody: data }),
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const verifyOtpMutation = useMutation({
    mutationFn: (data: OTPVerify) =>
      LoginService.verifyOtp({ requestBody: data }),
    onSuccess: (response) => {
      localStorage.setItem("access_token", response.access_token)
      navigate({ to: "/" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return {
    signUpMutation,
    loginMutation,
    requestOtpMutation,
    verifyOtpMutation,
    logout,
    user,
    error,
    resetError: () => setError(null),
  }
}

export { isLoggedIn }
export default useAuth
