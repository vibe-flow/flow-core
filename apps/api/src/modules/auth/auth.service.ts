import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import type { ConfigType } from '@nestjs/config'
import * as crypto from 'crypto'
import { TRPCError } from '@trpc/server'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import authConfigFactory from '../../config/auth.config'
import type { AuthResponse } from '@template-dev/shared'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(MailService) private mailService: MailService,
    @Inject(authConfigFactory.KEY) private authConfig: ConfigType<typeof authConfigFactory>,
  ) {}

  async sendMagicLink(email: string): Promise<{ success: true; message: string }> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

    // Cooldown: check if a recent unused token exists
    const recentToken = await this.prisma.magicToken.findFirst({
      where: {
        email,
        createdAt: { gt: twoMinutesAgo },
        usedAt: null,
      },
    })

    if (recentToken) {
      return { success: true, message: 'Si ce compte existe, un email a été envoyé' }
    }

    // Cleanup expired tokens for this email
    await this.prisma.magicToken.deleteMany({
      where: {
        email,
        expiresAt: { lt: new Date() },
      },
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const user = await this.prisma.user.findUnique({ where: { email } })

    let shouldSend = false
    let userId: string | undefined

    if (this.authConfig.registrationMode === 'open') {
      if (!user) {
        const newUser = await this.prisma.user.create({
          data: { email, status: 'ACTIVE' },
        })
        userId = newUser.id
        shouldSend = true
      } else if (user.status === 'ACTIVE') {
        userId = user.id
        shouldSend = true
      } else {
        shouldSend = false
      }
    } else if (this.authConfig.registrationMode === 'approval') {
      if (!user) {
        await this.prisma.user.create({
          data: { email, status: 'PENDING' },
        })
        shouldSend = false
      } else if (user.status === 'ACTIVE') {
        userId = user.id
        shouldSend = true
      } else {
        shouldSend = false
      }
    } else {
      // invite-only
      if (!user) {
        shouldSend = false
      } else if (user.status === 'ACTIVE') {
        userId = user.id
        shouldSend = true
      } else {
        shouldSend = false
      }
    }

    if (shouldSend) {
      const expiresAt = new Date(Date.now() + this.authConfig.magicLinkTtl * 60 * 1000)

      await this.prisma.magicToken.create({
        data: {
          tokenHash,
          email,
          ...(userId ? { userId } : {}),
          expiresAt,
        },
      })

      await this.mailService.sendMagicLink(email, rawToken, false)
      this.logger.log(`Magic link sent to ${email}`)
    }

    return { success: true, message: 'Si ce compte existe, un email a été envoyé' }
  }

  async verifyMagicLink(token: string): Promise<AuthResponse> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const magicToken = await this.prisma.magicToken.findUnique({ where: { tokenHash } })

    if (!magicToken) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired link' })
    }

    if (magicToken.expiresAt < new Date() || magicToken.usedAt !== null) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired link' })
    }

    // Mark token as used
    await this.prisma.magicToken.update({
      where: { id: magicToken.id },
      data: { usedAt: new Date() },
    })

    const user = await this.prisma.user.findUnique({ where: { email: magicToken.email } })

    if (!user) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired link' })
    }

    // Link token to user if not yet linked
    if (!magicToken.userId) {
      await this.prisma.magicToken.update({
        where: { id: magicToken.id },
        data: { userId: user.id },
      })
    }

    if (user.status === 'PENDING') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Account pending approval',
        cause: { code: 'ACCOUNT_PENDING' },
      })
    }

    if (user.status === 'DISABLED') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Account disabled',
        cause: { code: 'ACCOUNT_DISABLED' },
      })
    }

    return this.generateTokens(user)
  }

  async inviteUser(email: string, role: 'USER' | 'ADMIN'): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'User with this email already exists' })
    }

    const user = await this.prisma.user.create({
      data: { email, role, status: 'ACTIVE' },
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + this.authConfig.magicLinkTtl * 60 * 1000)

    await this.prisma.magicToken.create({
      data: {
        tokenHash,
        email,
        userId: user.id,
        expiresAt,
      },
    })

    await this.mailService.sendMagicLink(email, rawToken, true)
    this.logger.log(`Invite sent to ${email}`)
  }

  async getDevUsers(): Promise<
    Array<{ id: string; email: string; name: string | null; role: string }>
  > {
    if (!this.authConfig.devLogin || process.env.NODE_ENV !== 'development') {
      throw new UnauthorizedException('Dev-only endpoint')
    }

    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })
  }

  async loginAs(email?: string, role?: string): Promise<AuthResponse> {
    if (!this.authConfig.devLogin || process.env.NODE_ENV !== 'development') {
      throw new UnauthorizedException('Dev-only endpoint')
    }

    const user = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : await this.prisma.user.findFirst({ where: { role: role as any } })

    if (!user) {
      throw new UnauthorizedException('No user found with given criteria')
    }

    this.logger.log(`[DEV] Login as: ${user.email} (${user.role})`)

    return this.generateTokens(user)
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      })

      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      })

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token')
      }

      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      })

      return this.generateTokens(tokenRecord.user)
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    })

    this.logger.log(`User logged out: ${userId}`)
  }

  private async generateTokens(user: any): Promise<AuthResponse> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = this.jwtService.sign(payload)

    // `jti` unique : sans lui, deux connexions dans la même seconde produisent un
    // refresh token identique (même payload + iat) → collision sur la contrainte
    // unique `token`.
    const refreshToken = this.jwtService.sign(
      { ...payload, jti: crypto.randomUUID() },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    )

    const expiresInDays = parseInt(
      this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''),
    )
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })
  }
}
