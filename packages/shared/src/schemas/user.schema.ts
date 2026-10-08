import { z } from 'zod'

export const UserRoleSchema = z.enum(['USER', 'ADMIN'])

export const UserStatusSchema = z.enum(['ACTIVE', 'PENDING', 'DISABLED'])

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Ce qu'un administrateur peut changer sur un compte, le rôle compris. Jamais l'entrée d'une
// procédure ouverte à tout compte connecté : c'est par là qu'un compte se nommait administrateur.
export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().min(1).optional(),
  role: UserRoleSchema.optional(),
})

// Ce qu'un compte peut changer sur lui-même. Strict : un `role` ou un `email` glissé dans l'appel
// est refusé, pas ignoré. L'adresse n'y est pas : la changer demande de la vérifier, et aucun
// parcours de changement d'adresse n'est monté (`changeEmail` de better-auth).
export const UpdateSelfSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
  })
  .strict()

export type User = z.infer<typeof UserSchema>
export type UserRole = z.infer<typeof UserRoleSchema>
export type UserStatus = z.infer<typeof UserStatusSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type UpdateSelf = z.infer<typeof UpdateSelfSchema>
