// La connexion de développement : montée, elle ouvre une vraie session ; absente, ses routes
// n'existent pas.
import { betterAuth } from 'better-auth'
import { describe, expect, it } from 'vitest'
import { devLogin } from '../auth-dev'

function authDeTest(avecDev: boolean) {
  return betterAuth({
    baseURL: 'http://localhost:3000',
    basePath: '/api/auth',
    secret: 'test-secret-test-secret-test-secret-32',
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    plugins: avecDev ? [devLogin()] : [],
  })
}

const origin = { origin: 'http://localhost:3000' }

describe('connexion de développement', () => {
  it('liste les comptes et ouvre une session sans mot de passe', async () => {
    const auth = authDeTest(true)
    const ctx = await auth.$context
    const user = await ctx.internalAdapter.createUser({
      email: 'dev@example.com',
      name: 'Dev',
      emailVerified: true,
    })

    const liste = await auth.handler(
      new Request('http://localhost:3000/api/auth/dev/users', { headers: origin }),
    )
    expect(liste.status).toBe(200)
    expect(await liste.json()).toEqual([
      expect.objectContaining({ id: user.id, email: 'dev@example.com' }),
    ])

    const entree = await auth.handler(
      new Request('http://localhost:3000/api/auth/dev/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...origin },
        body: JSON.stringify({ userId: user.id }),
      }),
    )
    expect(entree.status).toBe(200)
    const cookie = entree.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('better-auth.session_token=')

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookie.split(';')[0] }),
    })
    expect(session?.user.email).toBe('dev@example.com')
  })

  it('refuse un compte inconnu', async () => {
    const auth = authDeTest(true)
    const res = await auth.handler(
      new Request('http://localhost:3000/api/auth/dev/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...origin },
        body: JSON.stringify({ userId: 'inconnu' }),
      }),
    )
    expect(res.status).toBe(404)
  })

  it("n'existe pas quand le plugin n'est pas monté (production)", async () => {
    const auth = authDeTest(false)
    const liste = await auth.handler(
      new Request('http://localhost:3000/api/auth/dev/users', { headers: origin }),
    )
    expect(liste.status).toBe(404)
    const entree = await auth.handler(
      new Request('http://localhost:3000/api/auth/dev/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...origin },
        body: JSON.stringify({ userId: 'x' }),
      }),
    )
    expect(entree.status).toBe(404)
  })
})
