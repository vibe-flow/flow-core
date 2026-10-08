import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, ForbiddenException } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import type { UserRole } from '@template-dev/shared'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { SessionUser } from '../types/session-user.type'

/**
 * Guard that checks if the authenticated user has one of the required roles.
 * Must be used after SessionGuard to ensure user is authenticated.
 *
 * @example
 * @Roles('ADMIN')
 * @UseGuards(SessionGuard, RolesGuard)
 * @Get('admin/users')
 * getAdminUsers() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user as SessionUser | undefined

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`)
    }

    return true
  }
}
