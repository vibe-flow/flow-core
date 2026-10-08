// Rôles → permissions, la seule table qui décide de ce qu'un compte peut voir et faire.
//
// Le rôle reste l'enum `UserRole` de la base. Ajouter un rôle : une valeur dans l'enum Prisma et
// une entrée ici. Le menu et les procédures tRPC demandent une permission, jamais un rôle : ils
// suivent sans autre changement.

export const PERMISSIONS = [
  /** Réglages de l'application. */
  'settings.manage',
  /** Inviter, désactiver, réactiver des comptes, changer leur rôle. */
  'accounts.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLE_PERMISSIONS: Record<'USER' | 'ADMIN', readonly Permission[]> = {
  USER: [],
  ADMIN: PERMISSIONS,
}

/** Vrai si ce compte (tel que lu dans la session) détient la permission. */
export function can(
  user: { role?: string | null } | null | undefined,
  permission: Permission,
): boolean {
  const role = user?.role
  if (!role || !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) return false
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS].includes(permission)
}
