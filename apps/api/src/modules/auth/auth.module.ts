import { Module, forwardRef } from '@nestjs/common'
import { AuthTrpc } from './auth.trpc'
import { AccountsService } from './accounts.service'
import { SessionGuard } from './guards/session.guard'
import { UsersModule } from '../users/users.module'
import { TrpcModule } from '../../trpc/trpc.module'

// Inscription, connexion, mots de passe et liens magiques sont servis par better-auth sur /api/auth (main.ts).
@Module({
  imports: [UsersModule, forwardRef(() => TrpcModule)],
  providers: [AuthTrpc, AccountsService, SessionGuard],
  exports: [AuthTrpc, AccountsService, SessionGuard],
})
export class AuthModule {}
