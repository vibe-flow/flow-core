import type { INestApplication, OnApplicationBootstrap } from '@nestjs/common'
import { Injectable, Inject } from '@nestjs/common'
import * as trpcExpress from '@trpc/server/adapters/express'
import { TrpcService } from './trpc.service'
import { AuthTrpc } from '../modules/auth/auth.trpc'
import { UsersTrpc } from '../modules/users/users.trpc'
import { AiTrpc } from '../modules/ai/ai.trpc'
import { SettingsTrpc } from '../modules/settings/settings.trpc'
import { UserPreferencesTrpc } from '../modules/user-preferences/user-preferences.trpc'
import { createContext } from './trpc.context'

@Injectable()
export class TrpcRouter implements OnApplicationBootstrap {
  readonly appRouter: ReturnType<TrpcRouter['buildAppRouter']>

  constructor(
    @Inject(TrpcService) private readonly trpc: TrpcService,
    @Inject(AuthTrpc) private readonly authTrpc: AuthTrpc,
    @Inject(UsersTrpc) private readonly usersTrpc: UsersTrpc,
    @Inject(AiTrpc) private readonly aiTrpc: AiTrpc,
    @Inject(SettingsTrpc) private readonly settingsTrpc: SettingsTrpc,
    @Inject(UserPreferencesTrpc) private readonly userPreferencesTrpc: UserPreferencesTrpc,
  ) {
    this.appRouter = this.buildAppRouter()
  }

  /**
   * Assemble modular routers.
   *
   * Le type de retour doit rester inféré : c'est lui que `AppRouter` expose au client web.
   * Annoter `ReturnType<TrpcService['router']>` le remplace par la signature générique de
   * `router()` et fait perdre tout le typage côté web (« collides with a built-in method »).
   */
  private buildAppRouter() {
    return this.trpc.router({
      auth: this.authTrpc.router,
      users: this.usersTrpc.router,
      ai: this.aiTrpc.router,
      settings: this.settingsTrpc.router,
      preferences: this.userPreferencesTrpc.router,
    })
  }

  onApplicationBootstrap() {
    // Hook is called but we don't need to do anything here
    // since routers are already initialized in constructor
  }

  async applyMiddleware(app: INestApplication) {
    // Middleware to prevent double Transfer-Encoding: chunked
    // when going through a reverse proxy (Caddy). Without this,
    // tRPC streaming via httpBatchStreamLink causes 502 errors.
    app.use('/trpc', (req: any, res: any, next: any) => {
      const originalWrite = res.write.bind(res)
      const originalEnd = res.end.bind(res)
      let headersSent = false

      res.write = function (chunk: any, ...args: any[]) {
        if (!headersSent) {
          res.removeHeader('Transfer-Encoding')
          headersSent = true
        }
        return originalWrite(chunk, ...args)
      }

      res.end = function (chunk: any, ...args: any[]) {
        if (!headersSent) {
          res.removeHeader('Transfer-Encoding')
        }
        return originalEnd(chunk, ...args)
      }

      next()
    })

    app.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: this.appRouter,
        createContext,
      }),
    )
  }

  getRouter() {
    return this.appRouter
  }
}

export type AppRouter = TrpcRouter['appRouter']
