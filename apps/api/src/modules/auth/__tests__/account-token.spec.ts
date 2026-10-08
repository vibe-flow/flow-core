// L'invitation « créer mon mot de passe » s'appuie sur un détail interne de better-auth (le
// préfixe `reset-password:` et internalAdapter). Ce test rejoue le parcours complet : il casse
// si une montée de version change ce détail.
import { betterAuth } from 'better-auth'
import { describe, expect, it } from 'vitest'
import { createPasswordToken } from '../account-token'

function authDeTest() {
  return betterAuth({
    baseURL: 'http://localhost:3000',
    basePath: '/api/auth',
    secret: 'test-secret-test-secret-test-secret-32',
    emailAndPassword: { enabled: true, disableSignUp: true },
    logger: { disabled: true },
  })
}

describe('invitation — créer mon mot de passe', () => {
  it('un compte invité pose son mot de passe avec le jeton, puis se connecte', async () => {
    const auth = authDeTest()
    const ctx = await auth.$context
    // Le compte tel que AccountsService.invite le crée : sans mot de passe, adresse vérifiée.
    const user = await ctx.internalAdapter.createUser({
      email: 'invitee@example.com',
      name: 'Invitée',
      emailVerified: true,
    })

    const { token } = await createPasswordToken(user.id, 60_000, auth)

    await auth.api.resetPassword({ body: { newPassword: 'un-mot-de-passe-solide', token } })

    const connexion = await auth.api.signInEmail({
      body: { email: 'invitee@example.com', password: 'un-mot-de-passe-solide' },
    })
    expect(connexion.user.email).toBe('invitee@example.com')
  })

  it('un jeton ne sert qu’une fois', async () => {
    const auth = authDeTest()
    const ctx = await auth.$context
    const user = await ctx.internalAdapter.createUser({
      email: 'une-fois@example.com',
      name: 'Une fois',
      emailVerified: true,
    })
    const { token } = await createPasswordToken(user.id, 60_000, auth)

    await auth.api.resetPassword({ body: { newPassword: 'un-mot-de-passe-solide', token } })
    await expect(
      auth.api.resetPassword({ body: { newPassword: 'un-autre-mot-de-passe', token } }),
    ).rejects.toThrow()
  })

  it('un jeton expiré est refusé', async () => {
    const auth = authDeTest()
    const ctx = await auth.$context
    const user = await ctx.internalAdapter.createUser({
      email: 'expire@example.com',
      name: 'Expiré',
      emailVerified: true,
    })
    const { token } = await createPasswordToken(user.id, -1000, auth)
    await expect(
      auth.api.resetPassword({ body: { newPassword: 'un-mot-de-passe-solide', token } }),
    ).rejects.toThrow()
  })
})
