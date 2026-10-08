import { z } from 'zod'
import { AUTH } from '../app.config'
import { UserRoleSchema } from './user.schema'

const email = z.string().trim().email('Adresse e-mail invalide')
const newPassword = z
  .string()
  .min(
    AUTH.minPasswordLength,
    `Le mot de passe doit contenir au moins ${AUTH.minPasswordLength} caractères`,
  )

export const SignInSchema = z.object({
  email,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const SignUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Indiquez votre prénom et votre nom'),
    email,
    password: newPassword,
    confirmation: z.string(),
  })
  .refine((data) => data.password === data.confirmation, {
    message: 'Les deux mots de passe ne correspondent pas',
    path: ['confirmation'],
  })

export const ForgotPasswordSchema = z.object({ email })

/** Mode `magic-link` : l'adresse suffit. */
export const MagicLinkSchema = z.object({ email })

export const InviteUserSchema = z.object({
  email,
  name: z.string().trim().optional(),
  role: UserRoleSchema.default('USER'),
})

export const ResetPasswordSchema = z
  .object({
    password: newPassword,
    confirmation: z.string(),
  })
  .refine((data) => data.password === data.confirmation, {
    message: 'Les deux mots de passe ne correspondent pas',
    path: ['confirmation'],
  })

export type SignInInput = z.infer<typeof SignInSchema>
export type SignUpInput = z.infer<typeof SignUpSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type MagicLinkInput = z.infer<typeof MagicLinkSchema>
export type InviteUserInput = z.infer<typeof InviteUserSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
