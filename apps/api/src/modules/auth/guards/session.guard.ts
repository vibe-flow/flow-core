import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { getSessionUser } from '../session-user'
import type { SessionUser } from '../types/session-user.type'

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: SessionUser }>()
    const user = await getSessionUser(request.headers)

    if (!user) {
      throw new UnauthorizedException('Connexion requise')
    }

    request.user = user
    return true
  }
}
