import { ForbiddenException } from '@nestjs/common'
import { TRPCError } from '@trpc/server'
import type { SessionUser } from '../types/session-user.type'

/**
 * Asserts that the current user is either the owner of the resource or an admin.
 * Throws ForbiddenException if the check fails (for REST endpoints).
 */
export function assertOwnerOrAdmin(resourceUserId: string, currentUser: SessionUser): void {
  if (currentUser.role === 'ADMIN') {
    return
  }

  if (currentUser.id !== resourceUserId) {
    throw new ForbiddenException('You can only access your own resources')
  }
}

/**
 * Same as assertOwnerOrAdmin but throws TRPCError for use in tRPC procedures.
 */
export function assertOwnerOrAdminTrpc(resourceUserId: string, currentUser: SessionUser): void {
  if (currentUser.role === 'ADMIN') {
    return
  }

  if (currentUser.id !== resourceUserId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You can only access your own resources',
    })
  }
}
