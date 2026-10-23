import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields, magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: 'string', input: false },
        status: { type: 'string', input: false },
      },
    }),
    // Sans effet en mode `password` : le serveur ne monte la route qu'en mode `magic-link`.
    magicLinkClient(),
  ],
})

// ---------------------------------------------------------------------------------------------
// Connexion SSO
//
// Le serveur ne monte le fournisseur que si son environnement le décrit : le web demande, et
// n'affiche le bouton que si l'API répond.
// ---------------------------------------------------------------------------------------------

export interface SsoInfo {
  providerId: string
  name: string
}

/** Le fournisseur d'identité de l'installation — `null` quand il n'y en a pas. */
export async function fetchSsoInfo(): Promise<SsoInfo | null> {
  try {
    const res = await fetch('/api/auth/sso/info', { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as SsoInfo
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------------------------
// Connexion de développement
//
// Ces routes n'existent côté serveur que si NODE_ENV=development (apps/api/src/lib/auth-dev.ts).
// Le web ne décide de rien : il demande, et n'affiche le panneau que si l'API répond.
// ---------------------------------------------------------------------------------------------

export interface DevUser {
  id: string
  email: string
  name: string
  role: string
  status: string
}

/** Les comptes proposés à la connexion en un clic — `null` quand elle n'existe pas (production). */
export async function fetchDevUsers(): Promise<DevUser[] | null> {
  try {
    const res = await fetch('/api/auth/dev/users', { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as DevUser[]
  } catch {
    return null
  }
}

export async function devSignIn(userId: string): Promise<boolean> {
  const res = await fetch('/api/auth/dev/sign-in', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  return res.ok
}
