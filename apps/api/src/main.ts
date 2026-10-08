// En premier : refuse de démarrer si NODE_ENV ne dit ni `production` ni `development`.
import { IS_PRODUCTION } from './lib/runtime'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import { toNodeHandler } from 'better-auth/node'
import { AppModule } from './app.module'
import { TrpcRouter } from './trpc/trpc.router'
import { LoggerService } from './modules/logger/logger.service'
import { auth } from './lib/auth'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    bodyParser: false,
  })

  // Use our LoggerService as the global NestJS logger
  // This routes ALL logs (including new Logger() in services) through Hub log buffer
  const loggerService = app.get(LoggerService)
  app.useLogger(loggerService)

  const configService = app.get(ConfigService)
  const port = configService.get('BACKEND_PORT', 3000)

  // Les sessions voyagent dans un cookie : en production, seule l'origine du web est admise
  // (un autre sous-domaine du même domaine ne doit pas pouvoir appeler l'API avec ce cookie).
  // En développement toute origine passe : l'adresse change d'une copie de travail à l'autre.
  app.enableCors({
    origin: IS_PRODUCTION ? configService.get<string>('FRONTEND_URL') : true,
    credentials: true,
  })

  // better-auth lit lui-même le corps de ses requêtes : sa route doit passer avant les parseurs.
  app.getHttpAdapter().getInstance().all('/api/auth/*', toNodeHandler(auth))
  app.useBodyParser('json')
  app.useBodyParser('urlencoded', { extended: true })

  // Global prefix
  app.setGlobalPrefix('api')

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Template Dev API')
    .setDescription('Full-stack template API documentation')
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  const cleanedDocument = cleanupOpenApiDoc(document)
  SwaggerModule.setup('api/docs', app, cleanedDocument)

  // tRPC
  const trpc = app.get(TrpcRouter)
  await trpc.applyMiddleware(app)

  await app.listen(port)

  Logger.log(`🚀 Application is running on: http://localhost:${port}/api`)
  Logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`)
  Logger.log(`🔌 tRPC endpoint: http://localhost:${port}/trpc`)
}

bootstrap()
