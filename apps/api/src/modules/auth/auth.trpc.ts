import { Injectable, Inject } from '@nestjs/common'
import { TrpcService } from '../../trpc/trpc.service'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import {
  SendMagicLinkSchema,
  VerifyMagicLinkSchema,
  DevLoginSchema,
  InviteUserSchema,
  RefreshTokenSchema,
} from '@template-dev/shared'

@Injectable()
export class AuthTrpc {
  readonly router: ReturnType<AuthTrpc['buildRouter']>

  constructor(
    @Inject(TrpcService) private readonly trpc: TrpcService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {
    this.router = this.buildRouter()
  }

  // Type de retour inféré, jamais annoté : il porte les procédures jusqu'au client web.
  private buildRouter() {
    return this.trpc.router({
      sendMagicLink: this.trpc.procedure.input(SendMagicLinkSchema).mutation(async ({ input }) => {
        return await this.authService.sendMagicLink(input.email)
      }),

      verifyMagicLink: this.trpc.procedure
        .input(VerifyMagicLinkSchema)
        .mutation(async ({ input }) => {
          return await this.authService.verifyMagicLink(input.token)
        }),

      devUsers: this.trpc.procedure.query(async () => {
        return await this.authService.getDevUsers()
      }),

      devLogin: this.trpc.procedure.input(DevLoginSchema).mutation(async ({ input }) => {
        return await this.authService.loginAs(input.email, input.role)
      }),

      inviteUser: this.trpc.adminProcedure.input(InviteUserSchema).mutation(async ({ input }) => {
        await this.authService.inviteUser(input.email, input.role)
        return { success: true }
      }),

      refresh: this.trpc.procedure.input(RefreshTokenSchema).mutation(async ({ input }) => {
        return await this.authService.refreshToken(input.refreshToken)
      }),

      logout: this.trpc.protectedProcedure
        .input(RefreshTokenSchema)
        .mutation(async ({ ctx, input }) => {
          await this.authService.logout(ctx.user.userId, input.refreshToken)
          return { success: true }
        }),

      me: this.trpc.protectedProcedure.query(async ({ ctx }) => {
        return await this.usersService.findOne(ctx.user.userId)
      }),
    })
  }
}
