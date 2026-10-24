// La connexion SSO de bout en bout, better-auth en mémoire et un faux fournisseur OIDC : la fiche
// miroir, son rôle relu à chaque connexion, les champs du projet à la création seulement, la
// session courte, et aucun autre identifiant pour un compte relié.
import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { devLogin } from '../auth-dev'
import { isSsoAccountEmail, readSsoConfig, ssoPlugins } from '../auth-sso'
import type { SsoClaims } from '../auth-sso'

const BASE = 'http://localhost:3000'
const ISSUER = 'https://auth.example.com'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// ─── Le faux fournisseur ────────────────────────────────────────────────────────────────────────

let claims: SsoClaims = {}

// Un jeton d'identité non signé : sans `jwks_uri` dans la découverte, better-auth le lit sans le
// vérifier — on teste ce que l'application en fait, pas la cryptographie de better-auth.
function idToken(payload: SsoClaims): string {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${part({ alg: 'RS256', typ: 'JWT' })}.${part(payload)}.signature`
}

function fauxFournisseur(input: RequestInfo | URL): Response {
  const url = String(input instanceof Request ? input.url : input)
  if (url === `${ISSUER}/.well-known/openid-configuration`) {
    return Response.json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/authorize`,
      token_endpoint: `${ISSUER}/token`,
      userinfo_endpoint: `${ISSUER}/userinfo`,
      id_token_signing_alg_values_supported: ['RS256'],
    })
  }
  if (url === `${ISSUER}/token`) {
    return Response.json({
      access_token: 'access',
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: idToken({ iss: ISSUER, aud: 'maria', ...claims }),
    })
  }
  return new Response('inconnu', { status: 404 })
}

// ─── L'instance de test ─────────────────────────────────────────────────────────────────────────

const envoyes: string[] = []

function authDeTest() {
  const config = readSsoConfig({
    SSO_ISSUER: ISSUER,
    SSO_CLIENT_ID: 'maria',
    SSO_CLIENT_SECRET: 'secret',
    SSO_NAME: 'Senpli OS',
    SSO_SESSION_HOURS: '12',
  })!
  return betterAuth({
    baseURL: BASE,
    basePath: '/api/auth',
    secret: 'test-secret-test-secret-test-secret-32',
    logger: { disabled: true },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user }) => {
        if (await isSsoAccountEmail(user.email)) return
        envoyes.push(`reset:${user.email}`)
      },
    },
    user: {
      additionalFields: {
        role: { type: 'string', input: false, defaultValue: 'USER' },
        companyId: { type: 'string', required: false, input: false },
      },
    },
    account: { accountLinking: { enabled: true, trustedProviders: ['sso'] } },
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: { enabled: false },
    },
    plugins: [
      ...ssoPlugins(config, {
        newUserFields: (c) => ({ companyId: String(c.company ?? '') }),
      }),
      devLogin(),
      magicLink({
        sendMagicLink: async ({ email }) => {
          if (await isSsoAccountEmail(email)) return
          envoyes.push(email)
        },
      }),
    ],
  })
}

type Auth = ReturnType<typeof authDeTest>

function cookiesDe(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .filter((c) => !c.endsWith('='))
    .join('; ')
}

/** Le parcours complet : `/sign-in/social`, le fournisseur, `/callback/sso`. */
async function connexionSso(auth: Auth, profil: SsoClaims) {
  claims = profil
  const depart = await auth.handler(
    new Request(`${BASE}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE },
      body: JSON.stringify({ provider: 'sso', callbackURL: '/' }),
    }),
  )
  const { url } = (await depart.json()) as { url: string }
  const state = new URL(url).searchParams.get('state')
  const retour = await auth.handler(
    new Request(`${BASE}/api/auth/callback/sso?code=code&state=${state}`, {
      headers: { cookie: cookiesDe(depart) },
    }),
  )
  expect(retour.status).toBe(302)
  expect(retour.headers.get('location')).toBe('/')
  return cookiesDe(retour)
}

const alice = {
  sub: 'alice-sub',
  email: 'alice@example.com',
  email_verified: true,
  name: 'Alice',
  company: 'c1',
}

async function fiche(auth: Auth, email: string) {
  const ctx = await auth.$context
  const found = await ctx.internalAdapter.findUserByEmail(email)
  return found?.user as (Record<string, unknown> & { id: string }) | undefined
}

async function session(auth: Auth, cookie: string) {
  return auth.api.getSession({ headers: new Headers({ cookie }) })
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => fauxFournisseur(input)),
  )
  envoyes.length = 0
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('la fiche miroir', () => {
  it('se crée à la première connexion, avec le rôle des groupes et les champs du projet', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, groups: ['app-maria-admin', 'app-autre-user', 'famille'] })

    expect(await fiche(auth, 'alice@example.com')).toMatchObject({
      name: 'Alice',
      role: 'ADMIN',
      companyId: 'c1',
    })
  })

  it('relit le rôle à chaque connexion ; les champs du projet ne bougent plus', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, groups: ['app-maria-admin'] })
    await connexionSso(auth, { ...alice, company: 'c2', groups: ['app-maria-user'] })

    expect(await fiche(auth, 'alice@example.com')).toMatchObject({ role: 'USER', companyId: 'c1' })

    await connexionSso(auth, { ...alice, groups: ['APP-MARIA-ADMIN'] })
    expect(await fiche(auth, 'alice@example.com')).toMatchObject({ role: 'ADMIN' })
  })

  it('sans groupe de l’application, le rôle qui a le moins de permissions', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, groups: ['app-maria-admin'] })
    await connexionSso(auth, { ...alice, groups: [] })

    expect(await fiche(auth, 'alice@example.com')).toMatchObject({ role: 'USER' })
  })

  it('sans claim `groups`, le rôle reste ce qu’il était', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, groups: ['app-maria-admin'] })
    await connexionSso(auth, alice)

    expect(await fiche(auth, 'alice@example.com')).toMatchObject({ role: 'ADMIN' })
  })

  it('le rôle ne se prend pas par le profil : un compte créé sans groupe naît USER', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, role: 'ADMIN' })

    expect(await fiche(auth, 'alice@example.com')).toMatchObject({ role: 'USER' })
  })
})

describe('la session SSO', () => {
  it('dure SSO_SESSION_HOURS ; les autres gardent la durée de l’application', async () => {
    const auth = authDeTest()
    const avant = Date.now()
    const cookie = await connexionSso(auth, { ...alice, groups: [] })
    const sso = await session(auth, cookie)
    const duree = sso!.session.expiresAt.getTime() - avant
    expect(duree).toBeGreaterThan(12 * HOUR - 60_000)
    expect(duree).toBeLessThanOrEqual(12 * HOUR + 60_000)

    const inscrit = await auth.api.signUpEmail({
      body: { email: 'bob@example.com', password: 'motdepasse-solide', name: 'Bob' },
    })
    const ctx = await auth.$context
    const ligne = (await ctx.internalAdapter.findSession(inscrit.token!))!.session
    expect(ligne.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * DAY)
  })

  it('ne se prolonge pas à la lecture, même sans le marqueur', async () => {
    const auth = authDeTest()
    const cookie = await connexionSso(auth, { ...alice, groups: [] })
    const fin = (await session(auth, cookie))!.session.expiresAt.getTime()
    const lecture = (c: string) =>
      auth.handler(new Request(`${BASE}/api/auth/get-session`, { headers: { cookie: c } }))

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 6 * HOUR)
    // Avec le marqueur posé au retour du fournisseur : better-auth ne tente même pas de prolonger
    // (aucune écriture, aucun cookie renvoyé).
    const marquee = await lecture(cookie)
    expect(marquee.headers.getSetCookie()).toEqual([])
    expect(((await marquee.json()) as { session: { expiresAt: string } }).session.expiresAt).toBe(
      new Date(fin).toISOString(),
    )

    // Le marqueur effacé : better-auth prolonge, le filet tient la limite.
    const seul = cookie
      .split('; ')
      .filter((c) => c.startsWith('better-auth.session_token='))
      .join('; ')
    const nue = await lecture(seul)
    expect(nue.headers.getSetCookie()).not.toEqual([])
    expect((await session(auth, cookie))!.session.expiresAt.getTime()).toBeLessThanOrEqual(fin)

    vi.setSystemTime(Date.now() + 7 * HOUR)
    expect(await session(auth, cookie)).toBeNull()
  })
})

describe('pas de second identifiant', () => {
  it('un compte relié ne reçoit pas de lien magique — même réponse qu’une autre adresse', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, groups: [] })
    const ctx = await auth.$context
    await ctx.internalAdapter.createUser(
      { email: 'carl@example.com', name: 'Carl', emailVerified: true },
      { method: 'admin' },
    )

    const demande = (email: string) =>
      auth.handler(
        new Request(`${BASE}/api/auth/sign-in/magic-link`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: BASE },
          body: JSON.stringify({ email }),
        }),
      )
    const relie = await demande('alice@example.com')
    const autre = await demande('carl@example.com')

    expect(relie.status).toBe(autre.status)
    expect(await relie.json()).toEqual(await autre.json())
    expect(envoyes).toEqual(['carl@example.com'])
  })

  it('ni lien de mot de passe — même réponse qu’une autre adresse', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, groups: [] })
    const ctx = await auth.$context
    await ctx.internalAdapter.createUser(
      { email: 'carl@example.com', name: 'Carl', emailVerified: true },
      { method: 'admin' },
    )

    const demande = (email: string) =>
      auth.handler(
        new Request(`${BASE}/api/auth/request-password-reset`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: BASE },
          body: JSON.stringify({ email, redirectTo: '/reset-password' }),
        }),
      )
    const relie = await demande('alice@example.com')
    const autre = await demande('carl@example.com')

    expect(relie.status).toBe(200)
    expect(await relie.json()).toEqual(await autre.json())
    expect(envoyes).toEqual(['reset:carl@example.com'])
  })

  it('un mot de passe d’avant la liaison n’ouvre plus de session', async () => {
    const auth = authDeTest()
    await auth.api.signUpEmail({
      body: { email: 'alice@example.com', password: 'motdepasse-solide', name: 'Alice' },
    })
    const ctx = await auth.$context
    const avant = await fiche(auth, 'alice@example.com')
    await ctx.internalAdapter.updateUser(avant!.id, { emailVerified: true })

    // La première connexion SSO relie le compte existant au lieu de le doubler.
    await connexionSso(auth, { ...alice, groups: ['app-maria-admin'] })
    expect((await fiche(auth, 'alice@example.com'))!.id).toBe(avant!.id)

    const res = await auth.handler(
      new Request(`${BASE}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE },
        body: JSON.stringify({ email: 'alice@example.com', password: 'motdepasse-solide' }),
      }),
    )
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'ACCOUNT_SSO' })
  })

  it('la connexion de développement reste ouverte à un compte relié', async () => {
    const auth = authDeTest()
    await connexionSso(auth, { ...alice, groups: [] })
    const user = await fiche(auth, 'alice@example.com')

    const res = await auth.handler(
      new Request(`${BASE}/api/auth/dev/sign-in`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE },
        body: JSON.stringify({ userId: user!.id }),
      }),
    )
    expect(res.status).toBe(200)
  })
})
