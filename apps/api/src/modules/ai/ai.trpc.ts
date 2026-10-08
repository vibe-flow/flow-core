import { Injectable, Inject } from '@nestjs/common'
import { TrpcService } from '../../trpc/trpc.service'
import { AiService } from './ai.service'
import { ChatCompletionSchema, EmbeddingSchema } from '@template-dev/shared'

@Injectable()
export class AiTrpc {
  readonly router: ReturnType<AiTrpc['buildRouter']>

  constructor(
    @Inject(TrpcService) private readonly trpc: TrpcService,
    @Inject(AiService) private readonly aiService: AiService,
  ) {
    this.router = this.buildRouter()
  }

  // Type de retour inféré, jamais annoté : il porte les procédures jusqu'au client web.
  private buildRouter() {
    return this.trpc.router({
      status: this.trpc.protectedProcedure.query(() => {
        return {
          configured: this.aiService.isConfigured(),
        }
      }),

      chat: this.trpc.protectedProcedure
        .input(ChatCompletionSchema)
        .mutation(async ({ input, ctx }) => {
          if (!this.aiService.isConfigured()) {
            return {
              success: false,
              error: 'AI not configured. Set LITELLM_BASE_URL and LITELLM_MASTER_KEY.',
              response: null,
            }
          }

          try {
            const response = await this.aiService.chatCompletion({
              model: input.model,
              messages: input.messages,
              temperature: input.temperature,
              maxTokens: input.maxTokens,
              userId: ctx.user?.id,
              sessionId: input.sessionId,
              tags: input.tags,
            })

            return {
              success: true,
              error: null,
              response: response.content,
            }
          } catch {
            return {
              success: false,
              error: 'AI request failed',
              response: null,
            }
          }
        }),

      embedding: this.trpc.protectedProcedure
        .input(EmbeddingSchema)
        .mutation(async ({ input, ctx }) => {
          if (!this.aiService.isConfigured()) {
            return {
              success: false,
              error: 'AI not configured. Set LITELLM_BASE_URL and LITELLM_MASTER_KEY.',
              embeddings: null,
            }
          }

          try {
            const embeddings = await this.aiService.embedding({
              model: input.model,
              input: input.input,
              userId: ctx.user?.id,
            })

            return {
              success: true,
              error: null,
              embeddings,
            }
          } catch {
            return {
              success: false,
              error: 'Embedding request failed',
              embeddings: null,
            }
          }
        }),
    })
  }
}
