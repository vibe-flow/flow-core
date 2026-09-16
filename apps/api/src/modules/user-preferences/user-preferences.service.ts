import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { BulkSetUserPreferencesInput } from '@template-dev/shared'

@Injectable()
export class UserPreferencesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(userId: string, key: string): Promise<unknown | null> {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId_key: { userId, key } },
    })
    return pref?.value ?? null
  }

  async getAll(userId: string): Promise<Record<string, unknown>> {
    const prefs = await this.prisma.userPreference.findMany({
      where: { userId },
    })
    return Object.fromEntries(prefs.map((p) => [p.key, p.value]))
  }

  async set(userId: string, key: string, value: unknown): Promise<void> {
    await this.prisma.userPreference.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value: value as any },
      update: { value: value as any },
    })
  }

  async bulkSet(
    userId: string,
    preferences: BulkSetUserPreferencesInput['preferences'],
  ): Promise<void> {
    await this.prisma.$transaction(
      preferences.map((pref) =>
        this.prisma.userPreference.upsert({
          where: { userId_key: { userId, key: pref.key } },
          create: { userId, key: pref.key, value: pref.value as any },
          update: { value: pref.value as any },
        }),
      ),
    )
  }

  async delete(userId: string, key: string): Promise<void> {
    await this.prisma.userPreference.deleteMany({
      where: { userId, key },
    })
  }
}
