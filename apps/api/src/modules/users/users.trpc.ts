import { Injectable, Inject } from '@nestjs/common'
import { z } from 'zod'
import { TrpcService } from '../../trpc/trpc.service'
import { UsersService } from './users.service'
import { UpdateSelfSchema, UpdateUserSchema } from '@template-dev/shared'
import { assertOwnerOrAdminTrpc } from '../auth/helpers/assert-owner'

@Injectable()
export class UsersTrpc {
  readonly router: ReturnType<UsersTrpc['buildRouter']>

  constructor(
    @Inject(TrpcService) private readonly trpc: TrpcService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {
    this.router = this.buildRouter()
  }

  // Un compte ne lit et ne modifie que lui-même, et jamais son rôle ; le reste est à
  // l'administrateur. Toute procédure ajoutée ici se déclare dans `trpc/__tests__/acces.spec.ts`.
  // Type de retour inféré, jamais annoté : il porte les procédures jusqu'au client web.
  private buildRouter() {
    return this.trpc.router({
      list: this.trpc.adminProcedure.query(async () => {
        return await this.usersService.findAll()
      }),

      getById: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
          assertOwnerOrAdminTrpc(input.id, ctx.user)
          return await this.usersService.findOne(input.id)
        }),

      updateMe: this.trpc.protectedProcedure
        .input(UpdateSelfSchema)
        .mutation(async ({ input, ctx }) => {
          return await this.usersService.updateSelf(ctx.user.id, input)
        }),

      update: this.trpc.adminProcedure
        .input(z.object({ id: z.string(), data: UpdateUserSchema }))
        .mutation(async ({ input }) => {
          return await this.usersService.update(input.id, input.data)
        }),

      delete: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          assertOwnerOrAdminTrpc(input.id, ctx.user)
          return await this.usersService.remove(input.id)
        }),
    })
  }
}
