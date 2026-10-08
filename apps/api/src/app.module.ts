import { resolve } from 'node:path'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'
import { EnvSchema } from '@template-dev/shared'

// Charge .env du root du monorepo, peu importe le cwd du process
// (necessaire car `bun run --filter` ne propage pas process.env du parent)
const monorepoRoot = resolve(__dirname, '../../..')
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './modules/prisma/prisma.module'
import { SettingsModule } from './modules/settings/settings.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { AiModule } from './modules/ai/ai.module'
import { PythonModule } from './modules/python/python.module'
import { LoggerModule } from './modules/logger/logger.module'
// import { QueueModule } from './modules/queue/queue.module'; // Uncomment to enable
import { SseModule } from './modules/sse/sse.module'
import { TrpcModule } from './trpc/trpc.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(monorepoRoot, '.env.local'), resolve(monorepoRoot, '.env')],
      validate: (config) => {
        try {
          return EnvSchema.parse(config)
        } catch (error) {
          console.error('Invalid environment variables:', error)
          process.exit(1)
        }
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    LoggerModule,
    PrismaModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    AiModule,
    PythonModule,
    // QueueModule, // Uncomment to enable
    SseModule,
    TrpcModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
