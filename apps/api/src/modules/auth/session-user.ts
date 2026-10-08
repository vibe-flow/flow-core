import type { IncomingHttpHeaders } from 'node:http'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../../lib/auth'
import type { SessionUser } from './types/session-user.type'

export async function getSessionUser(headers: IncomingHttpHeaders): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) })
  if (!session || session.user.status !== 'ACTIVE') return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role === 'ADMIN' ? 'ADMIN' : 'USER',
  }
}
