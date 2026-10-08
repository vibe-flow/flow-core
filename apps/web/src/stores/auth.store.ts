import { authClient } from '@/lib/auth-client'

// La session vit dans un cookie httpOnly : ces hooks lisent l'état tenu par le client better-auth,
// rien n'est stocké côté navigateur.
export const useUser = () => authClient.useSession().data?.user ?? null
export const useIsAuthenticated = () => Boolean(authClient.useSession().data)

// better-auth relance la lecture de session après chaque connexion. Afficher le chargement à ce
// moment démonterait la page en cours et effacerait son état : on ne l'affiche qu'avant la toute
// première réponse.
let sessionResolvedOnce = false

export const useAuthLoading = () => {
  const { isPending } = authClient.useSession()
  if (!isPending) sessionResolvedOnce = true
  return isPending && !sessionResolvedOnce
}
