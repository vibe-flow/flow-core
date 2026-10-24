import { betterAuth } from 'better-auth'
import type { BetterAuthPlugin } from 'better-auth'
import { APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import { PrismaClient } from '@prisma/client'
import { APP_NAME, AUTH } from '@template-dev/shared'
import { IS_DEVELOPMENT, IS_PRODUCTION } from './runtime'
import { sendAuthMail } from './auth-mail'
import { authIpAddressOptions } from './auth-ip'
import { devLogin } from './auth-dev'
import { isSsoAccountEmail, readSsoConfig, ssoPlugins, SSO_PROVIDER_ID } from './auth-sso'

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const secret = process.env.BETTER_AUTH_SECRET

if (IS_PRODUCTION && !secret) {
  throw new Error('BETTER_AUTH_SECRET est obligatoire en production')
}

// better-auth vit hors de l'injection de Nest : il a son propre client Prisma.
const prisma = new PrismaClient()

const DAY = 60 * 60 * 24

const plugins: BetterAuthPlugin[] = []

// La connexion par le fournisseur d'identité de l'installation, quand l'environnement la décrit.
export const sso = readSsoConfig()

if (AUTH.mode === 'magic-link') {
  plugins.push(
    magicLink({
      expiresIn: 15 * 60,
      // Sans inscription libre, un lien n'est envoyé qu'à un compte qui existe déjà.
      disableSignUp: AUTH.signup === 'invite-only',
      sendMagicLink: async ({ email, url }) => {
        // `disableSignUp` ne refuse qu'au clic : sans ce contrôle, n'importe quelle adresse
        // recevrait un lien qui ne mène nulle part. La réponse HTTP reste la même dans les deux
        // cas : on ne révèle pas quelles adresses ont un compte.
        if (AUTH.signup === 'invite-only') {
          const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
          if (!exists) return
        }
        // Un compte relié au fournisseur de l'installation n'a pas d'autre identifiant.
        if (sso && (await isSsoAccountEmail(email))) return
        await sendAuthMail(email, 'magic-link', url)
      },
    }),
  )
}

if (sso) plugins.push(...ssoPlugins(sso))

// La connexion en un clic n'existe que là où `development` est écrit (lib/runtime.ts).
if (IS_DEVELOPMENT) plugins.push(devLogin())

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: process.env.BETTER_AUTH_URL ?? frontendUrl,
  basePath: '/api/auth',
  secret: secret ?? 'dev-only-template-dev-secret-never-used-in-production',
  trustedOrigins: [frontendUrl],
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  user: {
    additionalFields: {
      role: { type: 'string', input: false, defaultValue: 'USER' },
      // `approval` : le compte naît en attente, un administrateur l'active.
      status: {
        type: 'string',
        input: false,
        defaultValue: AUTH.signup === 'approval' ? 'PENDING' : 'ACTIVE',
      },
    },
  },
  emailAndPassword: {
    enabled: AUTH.mode === 'password',
    disableSignUp: AUTH.signup === 'invite-only',
    requireEmailVerification: true,
    minPasswordLength: AUTH.minPasswordLength,
    // Un nouveau mot de passe (oubli, invitation) ferme toutes les sessions ouvertes :
    // un accès volé ne survit pas au changement.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Même silence que pour une adresse inconnue : un compte relié n'a pas de mot de passe.
      if (sso && (await isSsoAccountEmail(user.email))) return
      await sendAuthMail(user.email, 'reset', url)
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthMail(user.email, 'verification', url)
    },
  },
  // Un compte qui existe déjà à la même adresse se relie au fournisseur au lieu d'être doublé : le
  // fournisseur de l'installation fait foi sur l'adresse.
  account: {
    accountLinking: { enabled: true, trustedProviders: sso ? [SSO_PROVIDER_ID] : [] },
  },
  session: {
    // Une session ouverte par le fournisseur SSO, elle, dure `SSO_SESSION_HOURS` (lib/auth-sso.ts).
    expiresIn: AUTH.sessionDays * DAY,
    updateAge: DAY,
    // Pas de cache de session dans le cookie : une session fermée, un compte désactivé ou un
    // rôle changé prend effet à la requête suivante, pas cinq minutes plus tard.
    cookieCache: { enabled: false },
  },
  databaseHooks: {
    session: {
      create: {
        // Seul un compte ACTIVE ouvre une session (PENDING : pas encore approuvé ; DISABLED :
        // coupé). Le hook passe après la vérification du mot de passe : il ne révèle rien à qui
        // ne le connaît pas. Il vaut aussi pour le lien magique et la connexion de dev.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { status: true },
          })
          if (user?.status !== 'ACTIVE') {
            throw new APIError('FORBIDDEN', {
              code: user?.status === 'PENDING' ? 'ACCOUNT_PENDING' : 'ACCOUNT_DISABLED',
              message:
                user?.status === 'PENDING'
                  ? "Ce compte attend d'être approuvé."
                  : 'Ce compte est désactivé.',
            })
          }
        },
      },
    },
  },
  // Active aussi en développement : c'est elle qui protège la connexion contre les essais en rafale.
  rateLimit: { enabled: true, window: 60, max: 100 },
  advanced: {
    ipAddress: authIpAddressOptions,
  },
  plugins,
})
