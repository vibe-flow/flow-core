// La connexion SSO : montée seulement quand l'environnement la décrit, entière ou refusée.
import { betterAuth } from 'better-auth'
import { describe, expect, it } from 'vitest'
import { groupsOf, readSsoConfig, roleFromGroups, ssoPlugins } from '../auth-sso'

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
      sessionHours: 24,
    })
    expect(readSsoConfig({ ...complet, SSO_NAME: '' })?.name).toBe('SSO')
  })

  it('lit la durée des sessions SSO, et refuse une durée qui n’en est pas une', () => {
    expect(readSsoConfig({ ...complet, SSO_SESSION_HOURS: '8' })?.sessionHours).toBe(8)
    expect(() => readSsoConfig({ ...complet, SSO_SESSION_HOURS: 'un jour' })).toThrow(
      /SSO_SESSION_HOURS/,
    )
    expect(() => readSsoConfig({ ...complet, SSO_SESSION_HOURS: '0' })).toThrow(/SSO_SESSION_HOURS/)
  })
})

// Une table comme celle de Maria : trois rôles, de plus en plus de permissions.
const MARIA = {
  USER: [],
  MANAGER: ['equipe.voir'],
  ADMIN: ['equipe.voir', 'accounts.manage'],
} as const

describe('les groupes donnent le rôle', () => {
  it('app-<client>-<rôle> → le rôle, en minuscules comme en capitales', () => {
    expect(roleFromGroups(['app-maria-manager'], 'maria', MARIA)).toBe('MANAGER')
    expect(roleFromGroups(['APP-Maria-Admin'], 'maria', MARIA)).toBe('ADMIN')
  })

  it('plusieurs : celui qui a le plus de permissions', () => {
    expect(
      roleFromGroups(['app-maria-user', 'app-maria-admin', 'app-maria-manager'], 'maria', MARIA),
    ).toBe('ADMIN')
    expect(roleFromGroups(['app-maria-user', 'app-maria-manager'], 'maria', MARIA)).toBe('MANAGER')
  })

  it('aucun de cette forme : celui qui en a le moins', () => {
    expect(roleFromGroups([], 'maria', MARIA)).toBe('USER')
    expect(roleFromGroups(['admins', 'app-autre-admin', 'app-maria-inconnu'], 'maria', MARIA)).toBe(
      'USER',
    )
  })

  it('ne confond pas deux applications dont l’une prolonge le nom de l’autre', () => {
    expect(roleFromGroups(['app-maria-test-admin'], 'maria', MARIA)).toBe('USER')
    expect(roleFromGroups(['app-maria-admin'], 'maria-test', MARIA)).toBe('USER')
  })

  it('suit la table du projet par défaut', () => {
    expect(roleFromGroups(['app-flow-admin'], 'flow')).toBe('ADMIN')
    expect(roleFromGroups(['app-flow-user'], 'flow')).toBe('USER')
  })

  it("distingue un claim absent (on ne sait rien) d'une liste vide", () => {
    expect(groupsOf({})).toBeNull()
    expect(groupsOf({ groups: [] })).toEqual([])
    expect(groupsOf({ groups: 'app-flow-admin' })).toEqual(['app-flow-admin'])
    expect(groupsOf({ groups: ['a', 3, null, 'b'] })).toEqual(['a', 'b'])
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
