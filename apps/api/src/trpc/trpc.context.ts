import type { inferAsyncReturnType } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { getSessionUser } from '../modules/auth/session-user'

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const user = await getSessionUser(req.headers)

  return {
    req,
    res,
    user,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
