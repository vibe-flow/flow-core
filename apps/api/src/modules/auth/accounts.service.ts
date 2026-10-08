import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TRPCError } from '@trpc/server'
import { AUTH } from '@template-dev/shared'
import type { UserRole } from '@template-dev/shared'
import { PrismaService } from '../prisma/prisma.service'
import { auth } from '../../lib/auth'
import { sendAuthMail } from '../../lib/auth-mail'
import { PASSWORD_TOKEN_PREFIX, createPasswordToken } from './account-token'

const DAY_MS = 24 * 60 * 60 * 1000

/** Ce qu'un administrateur fait des comptes : inviter, couper, rétablir. */
@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /**
   * Crée le compte et envoie l'accès : « créer mon mot de passe » en mode `password`, un premier
   * lien de connexion en mode `magic-link`. L'adresse est tenue pour vérifiée : c'est par elle
   * que l'invitation arrive.
   */
  async invite(input: { email: string; name?: string; role: UserRole }) {
    const email = input.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Un compte existe déjà pour cette adresse' })
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name?.trim() || email.split('@')[0],
        role: input.role,
        status: 'ACTIVE',
        emailVerified: true,
      },
    })
    await this.sendAccess(user.id, email)
    this.logger.log(`Invitation envoyée à ${email}`)
    return { id: user.id }
  }

  /** Renvoie l'accès à un compte qui ne l'a pas encore utilisé (ou l'a perdu). */
  async resendAccess(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable' })
    await this.sendAccess(user.id, user.email)
  }

  /**
   * Coupe l'accès : statut DISABLED (toute nouvelle session est refusée), sessions ouvertes
   * supprimées, liens de mot de passe en attente annulés.
   */
  async disable(id: string, actorId: string) {
    if (id === actorId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Impossible de désactiver son propre compte',
      })
    }
    const [, sessions] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { status: 'DISABLED' } }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
      this.prisma.verification.deleteMany({
        where: { identifier: { startsWith: PASSWORD_TOKEN_PREFIX }, value: id },
      }),
    ])
    return { sessionsClosed: sessions.count }
  }

  /** Rétablit un compte désactivé, ou approuve un compte en attente (`signup: 'approval'`). */
  async activate(id: string) {
    await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } })
  }

  private async sendAccess(userId: string, email: string) {
    if (AUTH.mode === 'magic-link') {
      // Le compte existe : le lien part même quand l'inscription libre est fermée.
      await (auth.api as unknown as MagicLinkApi).signInMagicLink({
        body: { email, callbackURL: '/' },
        headers: new Headers(),
      })
      return
    }
    const { token } = await createPasswordToken(userId, AUTH.invitationDays * DAY_MS)
    const frontendUrl = this.config.get<string>('FRONTEND_URL')
    await sendAuthMail(
      email,
      'invitation',
      `${frontendUrl}/reset-password?token=${token}&invitation=1`,
    )
  }
}

// Le plugin magicLink n'est monté qu'en mode `magic-link` : son API n'apparaît pas dans le type
// de `auth.api` quand le mode est `password`.
interface MagicLinkApi {
  signInMagicLink(input: {
    body: { email: string; callbackURL?: string }
    headers: Headers
  }): Promise<unknown>
}
