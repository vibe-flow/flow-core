import type { BetterAuthPlugin } from 'better-auth'
import { createAuthEndpoint } from 'better-auth/api'
import { genericOAuth } from 'better-auth/plugins'

/**
 * La connexion par le fournisseur d'identité d'une installation (OIDC) — Authelia pour Dimora.
 *
 * Montée seulement quand l'environnement la décrit : `SSO_ISSUER`, `SSO_CLIENT_ID`,
 * `SSO_CLIENT_SECRET` (et `SSO_NAME`, le nom affiché sur le bouton). Sinon rien : ni route, ni
 * bouton, l'écran de connexion demande `/api/auth/sso/info` et n'affiche rien sur un 404.
 *
 * Le fournisseur décide qui entre (le groupe de l'application, chez Authelia) ; l'application décide
 * si elle crée le compte. Un compte qui existe déjà à la même adresse se relie au lieu d'être doublé
 * (`accountLinking`, lib/auth.ts). En `invite-only`, la connexion SSO n'ouvre QUE ces comptes-là :
 * l'invitation pose ce que l'application attache à un compte (son entreprise, son rôle), qu'un compte
 * né d'une connexion n'aurait pas. Ailleurs, le compte se crée à la première connexion, son statut
 * suivant `AUTH.signup` (en `approval`, il attend un administrateur).
 *
 * Le retour du fournisseur : `/api/auth/callback/sso` — l'adresse à déclarer chez lui.
 */
export const SSO_PROVIDER_ID = 'sso'

export interface SsoConfig {
  issuer: string
  clientId: string
  clientSecret: string
  name: string
}

export function readSsoConfig(env: NodeJS.ProcessEnv = process.env): SsoConfig | null {
  const issuer = env.SSO_ISSUER?.trim().replace(/\/+$/, '')
  const clientId = env.SSO_CLIENT_ID?.trim()
  const clientSecret = env.SSO_CLIENT_SECRET?.trim()
  if (!issuer && !clientId && !clientSecret) return null
  if (!issuer || !clientId || !clientSecret) {
    throw new Error('SSO incomplet : SSO_ISSUER, SSO_CLIENT_ID et SSO_CLIENT_SECRET vont ensemble')
  }
  return { issuer, clientId, clientSecret, name: env.SSO_NAME?.trim() || 'SSO' }
}

/** Les plugins de la connexion SSO : le client OIDC, et la route qui dit au web qu'il existe. */
export function ssoPlugins(
  config: SsoConfig,
  options: { signUp: boolean } = { signUp: true },
): BetterAuthPlugin[] {
  return [
    genericOAuth({
      config: [
        {
          providerId: SSO_PROVIDER_ID,
          discoveryUrl: `${config.issuer}/.well-known/openid-configuration`,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          scopes: ['openid', 'email', 'profile'],
          pkce: true,
          disableSignUp: !options.signUp,
          // Le nom et l'adresse suivent le fournisseur à chaque connexion : il fait foi.
          overrideUserInfo: true,
          mapProfileToUser: (profile) => ({
            email: String(profile.email ?? '').toLowerCase(),
            name: String(profile.name ?? profile.preferred_username ?? profile.email ?? ''),
            emailVerified: profile.email_verified === true,
          }),
        },
      ],
    }),
    {
      id: 'sso-info',
      endpoints: {
        ssoInfo: createAuthEndpoint('/sso/info', { method: 'GET' }, async (ctx) =>
          ctx.json({ providerId: SSO_PROVIDER_ID, name: config.name }),
        ),
      },
    } satisfies BetterAuthPlugin,
  ]
}
