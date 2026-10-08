import { Global, Module } from '@nestjs/common'
import { SseService } from './sse.service'
import { SseController } from './sse.controller'
import { SessionGuard } from '../auth/guards/session.guard'

@Global()
@Module({
  controllers: [SseController],
  providers: [SseService, SessionGuard],
  exports: [SseService],
})
export class SseModule {}
