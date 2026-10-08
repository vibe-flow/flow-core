import { z } from 'zod'

export const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // better-auth — le secret signe les cookies de session ; obligatoire en production (lib/auth.ts)
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters')
    .optional(),
  BETTER_AUTH_URL: z.string().url().optional(),

  // LiteLLM (optional)
  LITELLM_BASE_URL: z.string().url().optional(),
  LITELLM_MASTER_KEY: z.string().optional(),

  // LLM Providers (optional)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Queue
  QUEUE_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Ports
  FRONTEND_PORT: z.string().default('5173'),
  BACKEND_PORT: z.string().default('3000'),
  // Obligatoire, sans valeur par défaut : un environnement qui ne se déclare pas ne démarre pas.
  // C'est ce qui garantit que les facilités de développement (connexion en un clic) ne s'activent
  // que là où `development` est écrit — voir apps/api/src/lib/runtime.ts.
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // Mail (vérification d'adresse et réinitialisation de mot de passe)
  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.string().default('1025'),
  MAIL_FROM: z.string().default('noreply@localhost'),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
})

export type Env = z.infer<typeof EnvSchema>
