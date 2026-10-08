// La limitation de débit de better-auth compte par adresse du visiteur, lue dans X-Real-IP.
import { betterAuth } from 'better-auth'
import { describe, expect, it } from 'vitest'
import { authIpAddressOptions } from '../auth-ip'

// Instance minimale : même réglage d'adresse que lib/auth.ts, limitation active (elle ne l'est
// par défaut qu'en production), stockage en mémoire, base en mémoire.
function authDeTest() {
  return betterAuth({
    baseURL: 'http://localhost:3000',
    basePath: '/api/auth',
    secret: 'test-secret-test-secret-test-secret-32',
    emailAndPassword: { enabled: true },
    rateLimit: { enabled: true, storage: 'memory' },
    advanced: { ipAddress: authIpAddressOptions },
    logger: { disabled: true },
  })
}

// /sign-in est limité à 3 requêtes par fenêtre de 10 s.
function connexion(auth: ReturnType<typeof authDeTest>, headers: Record<string, string>) {
  return auth.handler(
    new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', ...headers },
      body: JSON.stringify({ email: 'personne@example.com', password: 'mauvais-mot-de-passe' }),
    }),
  )
}

async function statuts(
  auth: ReturnType<typeof authDeTest>,
  headers: Record<string, string>,
  n: number,
) {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push((await connexion(auth, headers)).status)
  return out
}

describe('adresse du visiteur pour la limitation de débit', () => {
  it('deux adresses X-Real-IP différentes ont deux compteurs distincts', async () => {
    const auth = authDeTest()
    const a = await statuts(auth, { 'x-real-ip': '203.0.113.10' }, 4)
    expect(a.slice(0, 3)).not.toContain(429)
    expect(a[3]).toBe(429)
    // Le visiteur B n'est pas bloqué par les essais de A.
    const b = await statuts(auth, { 'x-real-ip': '198.51.100.20' }, 1)
    expect(b[0]).not.toBe(429)
  })

  it('un X-Forwarded-For forgé par le visiteur ne lui ouvre pas un compteur neuf', async () => {
    const auth = authDeTest()
    const reelle = { 'x-real-ip': '203.0.113.10' }
    await statuts(auth, reelle, 3)
    const forge = await connexion(auth, { ...reelle, 'x-forwarded-for': '192.0.2.99' })
    expect(forge.status).toBe(429)
  })
})
