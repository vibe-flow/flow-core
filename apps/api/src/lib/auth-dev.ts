import type { BetterAuthPlugin } from 'better-auth'
import { APIError, createAuthEndpoint } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'

/**
 * Connexion de développement : la liste des comptes et l'entrée en un clic, sans mot de passe.
 *
 * Ce plugin n'est monté QUE lorsque NODE_ENV vaut `development` (lib/auth.ts, lib/runtime.ts).
 * En production ses routes n'existent pas : /api/auth/dev/* répond 404, et l'écran de connexion,
 * qui interroge /api/auth/dev/users, n'affiche alors rien.
 *
 * Il ouvre une vraie session better-auth — même cookie, mêmes garde-fous (un compte désactivé
 * reste refusé par le hook de création de session).
 */
export const devLogin = (): BetterAuthPlugin => ({
  id: 'dev-login',
  endpoints: {
    devUsers: createAuthEndpoint('/dev/users', { method: 'GET' }, async (ctx) => {
      const users = await ctx.context.adapter.findMany<{
        id: string
        email: string
        name: string
        role?: string
        status?: string
      }>({ model: 'user', limit: 100, sortBy: { field: 'createdAt', direction: 'asc' } })
      return ctx.json(
        users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role ?? 'USER',
          status: u.status ?? 'ACTIVE',
        })),
      )
    }),

    devSignIn: createAuthEndpoint('/dev/sign-in', { method: 'POST' }, async (ctx) => {
      const userId = (ctx.body as { userId?: unknown } | undefined)?.userId
      if (typeof userId !== 'string' || !userId) {
        throw new APIError('BAD_REQUEST', { message: 'userId requis' })
      }
      const user = await ctx.context.internalAdapter.findUserById(userId)
      if (!user) throw new APIError('NOT_FOUND', { message: 'Compte introuvable' })

      const session = await ctx.context.internalAdapter.createSession(user.id)
      if (!session) throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Session non créée' })
      await setSessionCookie(ctx, { session, user })
      return ctx.json({ ok: true })
    }),
  },
})
