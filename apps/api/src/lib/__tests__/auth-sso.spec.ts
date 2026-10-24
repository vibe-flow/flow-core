// La connexion SSO : montée seulement quand l'environnement la décrit, entière ou refusée.
import { betterAuth } from 'better-auth'
import { describe, expect, it } from 'vitest'
import { readSsoConfig, ssoPlugins } from '../auth-sso'

const complet = {
  SSO_ISSUER: 'https://auth.example.com/',
  SSO_CLIENT_ID: 'app',
  SSO_CLIENT_SECRET: 'secret',
  SSO_NAME: 'Senpli OS',
}

function authDeTest(avecSso: boolean) {
  const config = readSsoConfig(avecSso ? complet : {})
  return betterAuth({
    baseURL: 'http://localhost:3000',
    basePath: '/api/auth',
    secret: 'test-secret-test-secret-test-secret-32',
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    plugins: config ? ssoPlugins(config) : [],
  })
}

describe('configuration SSO', () => {
  it("ne monte rien quand l'environnement ne dit rien", () => {
    expect(readSsoConfig({})).toBeNull()
  })

  it("refuse une configuration à moitié écrite plutôt que de l'ignorer", () => {
    expect(() => readSsoConfig({ SSO_ISSUER: 'https://auth.example.com' })).toThrow(/SSO incomplet/)
  })

  it("lit l'émetteur sans barre finale, et nomme le bouton", () => {
    expect(readSsoConfig(complet)).toEqual({
      issuer: 'https://auth.example.com',
      clientId: 'app',
      clientSecret: 'secret',
      name: 'Senpli OS',
    })
    expect(readSsoConfig({ ...complet, SSO_NAME: '' })?.name).toBe('SSO')
  })
})

describe('route /sso/info', () => {
  it('dit le fournisseur quand il est monté', async () => {
    const res = await authDeTest(true).handler(
      new Request('http://localhost:3000/api/auth/sso/info'),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ providerId: 'sso', name: 'Senpli OS' })
  })

  it("n'existe pas sans fournisseur", async () => {
    const res = await authDeTest(false).handler(
      new Request('http://localhost:3000/api/auth/sso/info'),
    )
    expect(res.status).toBe(404)
  })
})

describe('inscription par le SSO', () => {
  const optionsDe = (signUp?: boolean) => {
    const config = readSsoConfig(complet)!
    const [oauth] = signUp === undefined ? ssoPlugins(config) : ssoPlugins(config, { signUp })
    return (oauth as unknown as { options: { config: { disableSignUp?: boolean }[] } }).options
      .config[0]
  }

  it('crée le compte à la première connexion par défaut', () => {
    expect(optionsDe().disableSignUp).toBe(false)
  })

  it("sur invitation, n'ouvre que les comptes qui existent", () => {
    expect(optionsDe(false).disableSignUp).toBe(true)
  })
})
