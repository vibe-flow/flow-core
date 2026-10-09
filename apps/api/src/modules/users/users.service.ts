import { Injectable, NotFoundException, Inject } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { UpdateSelf, UpdateUser } from '@template-dev/shared'

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return user
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

    return this.prisma.user.update({
      where: { id },
      // Champ par champ : rien de ce que l'appelant ajouterait n'atteint la base.
      data: { email: data.email, name: data.name, role: data.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
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
