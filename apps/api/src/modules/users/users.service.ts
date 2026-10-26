import { Injectable, NotFoundException, Inject } from '@nestjs/common'
import { TRPCError } from '@trpc/server'
import { PrismaService } from '../prisma/prisma.service'
import type { UpdateSelf, UpdateUser } from '@template-dev/shared'
import { readSsoConfig, SSO_PROVIDER_ID } from '../../lib/auth-sso'

const SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  // Le compte relié au fournisseur SSO, s'il y en a un : son rôle vient de là.
  accounts: { where: { providerId: SSO_PROVIDER_ID }, select: { id: true } },
} as const

/**
 * `roleManagedBy` : le nom du fournisseur SSO (`SSO_NAME`) quand le rôle de ce compte y est
 * décidé — l'écran l'affiche au lieu du sélecteur, l'API refuse de le changer. `null` sinon.
 */
function withRoleManagedBy<T extends { accounts: unknown[] }>(user: T, sso: string | null) {
  const { accounts, ...rest } = user
  return { ...rest, roleManagedBy: sso && accounts.length > 0 ? sso : null }
}

@Injectable()
export class UsersService {
  // Le SSO tel que l'environnement le décrit (lib/auth-sso.ts) : sans lui, aucun rôle n'est géré
  // ailleurs, même pour un compte qui garde un lien d'avant.
  private readonly ssoName = readSsoConfig()?.name ?? null

  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({ select: SELECT })
    return users.map((user) => withRoleManagedBy(user, this.ssoName))
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return withRoleManagedBy(user, this.ssoName)
  }

  /** Ce qu'un compte change sur lui-même : son nom, rien d'autre. */
  async updateSelf(id: string, data: UpdateSelf) {
    return this.update(id, { name: data.name })
  }

  /** Réservé à l'administrateur : c'est le seul chemin qui écrit un rôle. */
  async update(id: string, data: UpdateUser) {
    const user = await this.prisma.user.findUnique({ where: { id } })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    // Le rôle d'un compte relié au SSO se décide chez le fournisseur et se relit à chaque
    // connexion : changé ici, il serait écrasé à la suivante.
    if (data.role !== undefined && data.role !== user.role && this.ssoName) {
      const linked = await this.prisma.account.findFirst({
        where: { userId: id, providerId: SSO_PROVIDER_ID },
        select: { id: true },
      })
      if (linked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Le rôle de ce compte est géré par ${this.ssoName}`,
        })
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      // Champ par champ : rien de ce que l'appelant ajouterait n'atteint la base.
      data: { email: data.email, name: data.name, role: data.role },
      select: SELECT,
    })
    return withRoleManagedBy(updated, this.ssoName)
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    await this.prisma.user.delete({ where: { id } })

    return { message: `User ${id} deleted successfully` }
  }
}
