import { useQuery } from "@tanstack/react-query"
import { RolesService } from "@/client"

/**
 * Hook personnalisé pour charger les rôles d'un utilisateur
 */
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      try {
        return await RolesService.getUserRoles({ userId: userId! })
      } catch (error) {
        // Ne pas propager l'erreur pour éviter la déconnexion automatique
        console.warn("Impossible de charger les rôles:", error)
        return []
      }
    },
    enabled: !!userId,
    retry: false, // Ne pas réessayer en cas d'erreur
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
  })
}
