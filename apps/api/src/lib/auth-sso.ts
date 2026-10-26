import type { BetterAuthPlugin } from 'better-auth'
import { APIError, createAuthEndpoint, createAuthMiddleware } from 'better-auth/api'
import { genericOAuth } from 'better-auth/plugins'
import {
  defineRequestState,
  getCurrentAuthEndpointContext,
  hasRequestState,
} from '@better-auth/core/context'
import type { GenericEndpointContext } from '@better-auth/core'
import { ROLE_PERMISSIONS } from '@template-dev/shared'
import { ssoNewUserFields } from './auth-sso.project'

/**
 * La connexion par le fournisseur d'identité d'une installation (OIDC) — Authelia pour Dimora.
 *
 * Montée seulement quand l'environnement la décrit : `SSO_ISSUER`, `SSO_CLIENT_ID`,
 * `SSO_CLIENT_SECRET` (et `SSO_NAME`, le nom affiché sur le bouton ; `SSO_SESSION_HOURS`, la durée
 * d'une session ouverte par lui). Sinon rien : ni route, ni bouton, l'écran de connexion demande
 * `/api/auth/sso/info` et n'affiche rien sur un 404.
 *
 * Le compte est celui de l'installation ; l'application n'en garde qu'une fiche miroir :
 * - elle se crée à la première connexion (le fournisseur décide qui entre : le groupe de
 *   l'application, chez Authelia), même quand l'inscription est sur invitation. Un compte qui
 *   existe déjà à la même adresse vérifiée se relie au lieu d'être doublé (`accountLinking`,
 *   lib/auth.ts). Son statut suit `AUTH.signup` : en `approval`, elle attend un administrateur ;
 * - son nom et son adresse suivent le fournisseur, son rôle aussi : relu à chaque connexion dans
 *   les groupes `app-<SSO_CLIENT_ID>-<rôle>` (`roleFromGroups`). L'application ne le change pas ;
 * - ce qui est propre au projet se pose à la création seulement (lib/auth-sso.project.ts) ;
 * - elle n'a pas d'autre identifiant : ni lien magique, ni mot de passe, et aucune session ne
 *   s'ouvre pour elle autrement que par le fournisseur (sauf la connexion de développement) ;
 * - sa session est courte (`SSO_SESSION_HOURS`, 24 h par défaut) et ne se prolonge pas : un accès
 *   retiré dans l'installation tombe au plus tard à son terme.
 *
 * Le retour du fournisseur : `/api/auth/callback/sso` — l'adresse à déclarer chez lui.
 */
export const SSO_PROVIDER_ID = 'sso'

const DEFAULT_SESSION_HOURS = 24

// Le cookie signé qui dit « cette session vient du fournisseur » (voir `/get-session` plus bas).
const SSO_MARKER = 'sso_session'

export interface SsoConfig {
  issuer: string
  clientId: string
  clientSecret: string
  name: string
  /** Durée d'une session ouverte par le fournisseur, en heures. */
  sessionHours: number
}

export function readSsoConfig(env: NodeJS.ProcessEnv = process.env): SsoConfig | null {
  const issuer = env.SSO_ISSUER?.trim().replace(/\/+$/, '')
  const clientId = env.SSO_CLIENT_ID?.trim()
  const clientSecret = env.SSO_CLIENT_SECRET?.trim()
  if (!issuer && !clientId && !clientSecret) return null
  if (!issuer || !clientId || !clientSecret) {
    throw new Error('SSO incomplet : SSO_ISSUER, SSO_CLIENT_ID et SSO_CLIENT_SECRET vont ensemble')
  }
  const hours = env.SSO_SESSION_HOURS?.trim()
  const sessionHours = hours ? Number(hours) : DEFAULT_SESSION_HOURS
  if (!Number.isFinite(sessionHours) || sessionHours <= 0) {
    throw new Error(`SSO_SESSION_HOURS doit être un nombre d'heures positif (reçu : ${hours})`)
  }
  return { issuer, clientId, clientSecret, name: env.SSO_NAME?.trim() || 'SSO', sessionHours }
}

// ─── Le rôle ────────────────────────────────────────────────────────────────────────────────────

export type Role = keyof typeof ROLE_PERMISSIONS

/** Ce que le fournisseur dit de la personne : le jeton d'identité (vérifié) ou userinfo, tel quel. */
export type SsoClaims = Record<string, unknown>

/** Les groupes des claims ; `null` quand le claim manque — on ne sait rien, ce n'est pas « aucun ». */
export function groupsOf(claims: SsoClaims): string[] | null {
  const groups = claims.groups
  if (typeof groups === 'string') return [groups]
  if (!Array.isArray(groups)) return null
  return groups.filter((g): g is string => typeof g === 'string')
}

/**
 * Le rôle que donnent les groupes : `app-<clientId>-<rôle>`, le rôle étant une clé de
 * `ROLE_PERMISSIONS` en minuscules (`app-maria-manager` → `MANAGER`). Plusieurs : celui qui a le
 * plus de permissions. À égalité, l'ordre de la table. Aucun de cette forme : `null` — le
 * fournisseur ne dit rien du rôle (une installation qui ne donne encore que le groupe d'accès,
 * `app-<clientId>`) : une fiche existante le garde, une fiche neuve prend `lowestRole`.
 * (`table` n'est là que pour les tests.)
 */
export function roleFromGroups<
  T extends Readonly<Record<string, readonly string[]>> = typeof ROLE_PERMISSIONS,
>(groups: readonly string[], clientId: string, table: T = ROLE_PERMISSIONS as unknown as T) {
  type R = keyof T & string
  const roles = Object.keys(table) as R[]
  const weight = (role: R) => table[role].length
  const prefix = `app-${clientId}-`.toLowerCase()
  const held = new Set(
    groups
      .map((g) => g.toLowerCase())
      .filter((g) => g.startsWith(prefix))
      .map((g) => g.slice(prefix.length)),
  )
  const granted = roles.filter((role) => held.has(role.toLowerCase()))
  if (granted.length === 0) return null
  return granted.reduce((most, role) => (weight(role) > weight(most) ? role : most))
}

/** Le rôle qui a le moins de permissions — celui d'une fiche neuve sans groupe de rôle. */
export function lowestRole<
  T extends Readonly<Record<string, readonly string[]>> = typeof ROLE_PERMISSIONS,
>(table: T = ROLE_PERMISSIONS as unknown as T): keyof T & string {
  const roles = Object.keys(table) as (keyof T & string)[]
  return roles.reduce((least, role) => (table[role].length < table[least].length ? role : least))
}

// ─── Le compte relié ────────────────────────────────────────────────────────────────────────────

type AuthCtx = Pick<GenericEndpointContext, 'context'>

async function hasSsoAccount(ctx: AuthCtx, userId: string): Promise<boolean> {
  const accounts = await ctx.context.internalAdapter.findAccounts(userId)
  return accounts.some((a) => a.providerId === SSO_PROVIDER_ID)
}

/**
 * Vrai si l'adresse est celle d'un compte relié au fournisseur : il ne reçoit ni lien magique ni
 * lien de mot de passe. À appeler depuis l'envoi (lib/auth.ts), qui se tait alors : la réponse
 * HTTP reste celle d'une adresse inconnue.
 */
export async function isSsoAccountEmail(email: string): Promise<boolean> {
  const ctx = getCurrentAuthEndpointContext()
  const found = await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase(), {
    includeAccounts: true,
  })
  return Boolean(found?.accounts.some((a) => a.providerId === SSO_PROVIDER_ID))
}

// Les claims de la connexion en cours, le temps de la requête de retour du fournisseur : posés par
// `mapProfileToUser`, lus par les hooks de création de la fiche et de la session. Les champs
// `input: false` (le rôle) que rendrait `mapProfileToUser` sont ignorés par better-auth, à la
// création comme à la mise à jour : c'est pourquoi le rôle passe par là.
const connexion = defineRequestState<SsoClaims | null>(() => null)

async function currentClaims(): Promise<SsoClaims | null> {
  return (await hasRequestState()) ? await connexion.get() : null
}

export interface SsoOptions {
  /** Les champs propres au projet, posés à la création de la fiche (lib/auth-sso.project.ts). */
  newUserFields?: (claims: SsoClaims) => Record<string, unknown> | Promise<Record<string, unknown>>
}

/** Les plugins de la connexion SSO : le client OIDC, la fiche miroir, la route qui dit au web qu'il existe. */
export function ssoPlugins(config: SsoConfig, options: SsoOptions = {}): BetterAuthPlugin[] {
  const newUserFields = options.newUserFields ?? ssoNewUserFields
  const sessionMs = config.sessionHours * 60 * 60 * 1000

  return [
    genericOAuth({
      config: [
        {
          providerId: SSO_PROVIDER_ID,
          discoveryUrl: `${config.issuer}/.well-known/openid-configuration`,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          scopes: ['openid', 'email', 'profile', 'groups'],
          pkce: true,
          // Le nom et l'adresse suivent le fournisseur à chaque connexion : il fait foi.
          overrideUserInfo: true,
          mapProfileToUser: async (profile) => {
            await connexion.set(profile)
            return {
              email: String(profile.email ?? '').toLowerCase(),
              name: String(profile.name ?? profile.preferred_username ?? profile.email ?? ''),
              emailVerified: profile.email_verified === true,
            }
          },
        },
      ],
    }),
    {
      id: 'sso',
      endpoints: {
        ssoInfo: createAuthEndpoint('/sso/info', { method: 'GET' }, async (ctx) =>
          ctx.json({ providerId: SSO_PROVIDER_ID, name: config.name }),
        ),
      },
      init: () => ({
        options: {
          databaseHooks: {
            user: {
              create: {
                // La fiche naît avec les champs du projet et le rôle des groupes.
                before: async (user) => {
                  const claims = await currentClaims()
                  if (!claims) return
                  const fields = await newUserFields(claims)
                  const role =
                    roleFromGroups(groupsOf(claims) ?? [], config.clientId) ?? lowestRole()
                  return { data: { ...user, ...fields, role } }
                },
              },
            },
            session: {
              create: {
                before: async (session, ctx) => {
                  if (!ctx) return
                  const claims = await currentClaims()
                  if (!claims) {
                    // Une session ouverte autrement (mot de passe, lien magique, vérification
                    // d'adresse) : pas pour un compte relié. La connexion de développement reste.
                    if (ctx.path === '/dev/sign-in') return
                    if (await hasSsoAccount(ctx, session.userId)) {
                      throw new APIError('FORBIDDEN', {
                        code: 'ACCOUNT_SSO',
                        message: `Ce compte se connecte avec ${config.name}.`,
                      })
                    }
                    return
                  }
                  // Le rôle suit les groupes à chaque connexion. Sans claim `groups`, ou sans
                  // groupe de rôle parmi eux, on ne sait rien : le rôle reste ce qu'il était.
                  const groups = groupsOf(claims)
                  if (groups) {
                    const role = roleFromGroups(groups, config.clientId)
                    const user = role
                      ? await ctx.context.internalAdapter.findUserById(session.userId)
                      : null
                    if (role && user && (user as { role?: string }).role !== role) {
                      await ctx.context.internalAdapter.updateUser(session.userId, { role })
                    }
                  } else {
                    ctx.context.logger.warn(
                      'SSO : pas de claim `groups` (scope `groups` refusé ?) — rôle inchangé',
                    )
                  }
                  return { data: { ...session, expiresAt: new Date(Date.now() + sessionMs) } }
                },
              },
              update: {
                // Filet : une session d'un compte relié ne se prolonge jamais au-delà de sa durée,
                // même quand le marqueur ci-dessous manque (cookie effacé).
                before: async (data, ctx) => {
                  const current = ctx?.context.session?.session
                  if (!data.expiresAt || !current || !ctx) return
                  if (!(await hasSsoAccount(ctx, current.userId))) return
                  const limit = new Date(new Date(current.createdAt).getTime() + sessionMs)
                  if (new Date(data.expiresAt) <= limit) return
                  return { data: { ...data, expiresAt: limit } }
                },
              },
            },
          },
        },
      }),
      hooks: {
        before: [
          {
            // Une session ouverte par le fournisseur ne se prolonge pas : better-auth la
            // prolongerait à chaque lecture, sa durée étant plus courte que `AUTH.sessionDays`.
            matcher: (ctx) => ctx.path === '/get-session',
            handler: createAuthMiddleware(async (ctx) => {
              const marker = ctx.context.createAuthCookie(SSO_MARKER)
              const marked = await ctx.getSignedCookie(marker.name, ctx.context.secret)
              if (!marked) return
              const token = await ctx.getSignedCookie(
                ctx.context.authCookies.sessionToken.name,
                ctx.context.secret,
              )
              if (marked !== token) return
              return { context: { query: { ...ctx.query, disableRefresh: true } } }
            }),
          },
        ],
        after: [
          {
            matcher: (ctx) => ctx.path === '/callback/:id' && ctx.params?.id === SSO_PROVIDER_ID,
            handler: createAuthMiddleware(async (ctx) => {
              const created = ctx.context.newSession
              if (!created) return
              // Le marqueur signé porte le jeton de la session : il ne vaut que pour elle.
              const marker = ctx.context.createAuthCookie(SSO_MARKER, {
                maxAge: Math.ceil(sessionMs / 1000),
              })
              await ctx.setSignedCookie(
                marker.name,
                created.session.token,
                ctx.context.secret,
                marker.attributes,
              )
            }),
          },
        ],
      },
    } satisfies BetterAuthPlugin,
  ]
}
