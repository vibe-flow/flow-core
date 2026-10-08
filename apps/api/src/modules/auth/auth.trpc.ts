import { Injectable, Inject } from '@nestjs/common'
import { z } from 'zod'
import { InviteUserSchema } from '@template-dev/shared'
import { TrpcService } from '../../trpc/trpc.service'
import { UsersService } from '../users/users.service'
import { AccountsService } from './accounts.service'

// Connexion, inscription, mots de passe et liens magiques sont servis par better-auth sur
// /api/auth (main.ts). Ici : ce que l'application ajoute autour.
@Injectable()
export class AuthTrpc {
  readonly router: ReturnType<AuthTrpc['buildRouter']>

  constructor(
    @Inject(TrpcService) private readonly trpc: TrpcService,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(AccountsService) private readonly accounts: AccountsService,
  ) {
    this.router = this.buildRouter()
  }

  // Type de retour inféré, jamais annoté : il porte les procédures jusqu'au client web.
  private buildRouter() {
    const id = z.object({ id: z.string() })
    return this.trpc.router({
      me: this.trpc.protectedProcedure.query(async ({ ctx }) => {
        return await this.usersService.findOne(ctx.user.id)
      }),

      inviteUser: this.trpc.adminProcedure.input(InviteUserSchema).mutation(async ({ input }) => {
        return await this.accounts.invite(input)
      }),

      resendAccess: this.trpc.adminProcedure.input(id).mutation(async ({ input }) => {
        await this.accounts.resendAccess(input.id)
        return { success: true }
      }),

      disableUser: this.trpc.adminProcedure.input(id).mutation(async ({ ctx, input }) => {
        return await this.accounts.disable(input.id, ctx.user.id)
      }),

      activateUser: this.trpc.adminProcedure.input(id).mutation(async ({ input }) => {
        await this.accounts.activate(input.id)
        return { success: true }
      }),
    })
  }
}
