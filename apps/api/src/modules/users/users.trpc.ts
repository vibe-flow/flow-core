import { Injectable, Inject } from '@nestjs/common'
import { z } from 'zod'
import { TrpcService } from '../../trpc/trpc.service'
import { UsersService } from './users.service'
import { UpdateUserSchema } from '@template-dev/shared'
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

  // Type de retour inféré, jamais annoté : il porte les procédures jusqu'au client web.
  private buildRouter() {
    return this.trpc.router({
      list: this.trpc.protectedProcedure.query(async () => {
        return await this.usersService.findAll()
      }),

      getById: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
          return await this.usersService.findOne(input.id)
        }),

      update: this.trpc.protectedProcedure
        .input(z.object({ id: z.string(), data: UpdateUserSchema }))
        .mutation(async ({ input, ctx }) => {
          assertOwnerOrAdminTrpc(input.id, ctx.user!)
          return await this.usersService.update(input.id, input.data)
        }),

      delete: this.trpc.protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          assertOwnerOrAdminTrpc(input.id, ctx.user!)
          return await this.usersService.remove(input.id)
        }),
    })
  }
}
