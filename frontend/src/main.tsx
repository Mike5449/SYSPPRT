import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { ApiError, OpenAPI } from "./client"
import { CustomProvider } from "./components/ui/provider"
import { routeTree } from "./routeTree.gen"
import "./i18n/config"

OpenAPI.BASE = import.meta.env.VITE_API_URL
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

const handleApiError = (error: Error) => {
  if (error instanceof ApiError) {
    // Pour les erreurs 403 (permissions), ne déconnecter que pour les endpoints critiques
    if (error.status === 403) {
      const errorBody = error.body as any
      const errorUrl = error.url || errorBody?.url || ""

      // Endpoints optionnels - ne jamais déconnecter pour ces erreurs
      const optionalEndpoints = [
        "/roles/",
        "/api/v1/roles/", // Rôles (optionnel)
        "/users/?",
        "/api/v1/users/?", // Liste utilisateurs (admin only)
        "/teachers/",
        "/api/v1/teachers/", // Liste enseignants (peut être restreint)
        "/grades/",
        "/api/v1/grades/", // Notes (peut être restreint)
        "/assessments/",
        "/api/v1/assessments/", // Évaluations (peut être restreint)
      ]

      // Vérifier si l'URL contient un endpoint optionnel
      const isOptionalEndpoint = optionalEndpoints.some((endpoint) =>
        errorUrl.includes(endpoint),
      )

      if (isOptionalEndpoint) {
        console.warn(
          "⚠️ Pas de permission pour cet endpoint (ignoré):",
          errorUrl,
        )
        return // Ne pas déconnecter
      }

      // Pour les autres 403 (endpoints critiques), déconnecter
      console.error(
        "❌ Permission refusée sur endpoint critique, déconnexion...",
      )
      localStorage.removeItem("access_token")
      window.location.href = "/login"
      return
    }

    // Pour les erreurs 401 (authentification invalide), toujours déconnecter
    if (error.status === 401) {
      const errorBody = error.body as any
      const errorUrl = error.url || errorBody?.url || ""

      // Même pour les rôles, si c'est 401 c'est que le token est invalide
      if (errorUrl.includes("/roles/") || errorUrl.includes("/api/v1/roles/")) {
        console.warn("⚠️ Token invalide pour les rôles, on ignore")
        return // Ne pas déconnecter, l'utilisateur peut continuer sans rôles
      }

      console.error("❌ Token invalide, déconnexion...")
      localStorage.removeItem("access_token")
      window.location.href = "/login"
    }
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CustomProvider>
  </StrictMode>,
)
