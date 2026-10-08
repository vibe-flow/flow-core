import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator } from '@nestjs/common'
import type { SessionUser } from '../types/session-user.type'

/**
 * Parameter decorator to extract the current authenticated user from the request.
 * Requires SessionGuard to be applied to the route.
 *
 * @example
 * @UseGuards(SessionGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: SessionUser) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof SessionUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user as SessionUser

    return data ? user?.[data] : user
  },
)
