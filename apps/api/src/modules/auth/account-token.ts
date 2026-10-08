import { randomBytes } from 'node:crypto'
import { auth } from '../../lib/auth'

// better-auth range ses jetons de réinitialisation sous `reset-password:<jeton>` et, quand le
// compte n'a pas encore de mot de passe, crée son identifiant au premier enregistrement.
// Une invitation est donc un jeton de réinitialisation à plus longue durée : la page
// « Créer mon mot de passe » appelle simplement resetPassword.
//
// ⚠ Ce préfixe et `internalAdapter` sont des détails internes de better-auth : le test
// account-token.spec.ts rejoue le parcours complet et casse si une montée de version les change.
export const PASSWORD_TOKEN_PREFIX = 'reset-password:'

/** Jeton de (ré)initialisation du mot de passe d'un compte, valable `durationMs`. */
export async function createPasswordToken(
  userId: string,
  durationMs: number,
  // Paramètre pour les tests : une instance sur base en mémoire.
  instance: Pick<typeof auth, '$context'> = auth,
): Promise<{ token: string; expiresAt: Date }> {
  const ctx = await instance.$context
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + durationMs)
  await ctx.internalAdapter.createVerificationValue({
    identifier: `${PASSWORD_TOKEN_PREFIX}${token}`,
    value: userId,
    expiresAt,
  })
  return { token, expiresAt }
}
