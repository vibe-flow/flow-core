// Le contrôle d'accès du serveur, essayé sur le vrai routeur monté sur des services factices :
// ce qu'on vérifie ici, c'est qui passe la porte de chaque procédure, pas ce que fait le service.
//
// Toute procédure doit figurer dans `ACCES`. En ajouter une sans la déclarer casse ce fichier.
import { describe, expect, it, vi } from 'vitest'
import { TRPCError } from '@trpc/server'
import type { Context } from '../trpc.context'
import { TrpcService } from '../trpc.service'
import { TrpcRouter } from '../trpc.router'
import { AuthTrpc } from '../../modules/auth/auth.trpc'
import { UsersTrpc } from '../../modules/users/users.trpc'
import { AiTrpc } from '../../modules/ai/ai.trpc'
import { SettingsTrpc } from '../../modules/settings/settings.trpc'
import { UserPreferencesTrpc } from '../../modules/user-preferences/user-preferences.trpc'
import type { SessionUser } from '../../modules/auth/types/session-user.type'

/**
 * - `public` : sans session ;
 * - `session` : tout compte connecté, sur ses propres données ;
 * - `soi-ou-admin` : tout compte connecté sur lui-même, l'administrateur sur tous ;
 * - `admin` : l'administrateur seulement.
 */
type Acces = 'public' | 'session' | 'soi-ou-admin' | 'admin'

const ACCES: Record<string, Acces> = {
  'auth.me': 'session',
  'auth.inviteUser': 'admin',
  'auth.resendAccess': 'admin',
  'auth.disableUser': 'admin',
  'auth.activateUser': 'admin',
  'users.list': 'admin',
  'users.getById': 'soi-ou-admin',
  'users.updateMe': 'session',
  'users.update': 'admin',
  'users.delete': 'soi-ou-admin',
  'ai.status': 'session',
  'ai.chat': 'session',
  'ai.embedding': 'session',
  'settings.list': 'admin',
  'settings.get': 'admin',
  'settings.update': 'admin',
  'preferences.get': 'session',
  'preferences.getAll': 'session',
  'preferences.set': 'session',
  'preferences.bulkSet': 'session',
  'preferences.delete': 'session',
}

const usersService = {
  findAll: vi.fn(async () => []),
  findOne: vi.fn(async (id: string) => ({ id })),
  update: vi.fn(async (id: string, data: unknown) => ({ id, data })),
  updateSelf: vi.fn(async (id: string, data: unknown) => ({ id, data })),
  remove: vi.fn(async (id: string) => ({ id })),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeService(): any {
  return new Proxy({}, { get: () => async () => ({ service: true }) })
}

const trpc = new TrpcService()
const router = new TrpcRouter(
  trpc,
  new AuthTrpc(trpc, fakeService(), fakeService()),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new UsersTrpc(trpc, usersService as any),
  new AiTrpc(trpc, fakeService()),
  new SettingsTrpc(trpc, fakeService()),
  new UserPreferencesTrpc(trpc, fakeService()),
).appRouter

const user: SessionUser = { id: 'u-user', email: 'user@test.invalid', name: 'User', role: 'USER' }
const admin: SessionUser = { id: 'u-admin', email: 'admin@test.invalid', name: 'Ad', role: 'ADMIN' }

function context(sessionUser: SessionUser | null): Context {
  return { req: {} as Context['req'], res: {} as Context['res'], user: sessionUser }
}

/** Appelle une procédure par son chemin (`users.update`). */
function call(path: string, sessionUser: SessionUser | null, input?: unknown): Promise<unknown> {
  type Node = Record<string, unknown> & ((input?: unknown) => Promise<unknown>)
  const procedure = path
    .split('.')
    .reduce(
      (node, key) => node[key] as Node,
      router.createCaller(context(sessionUser)) as unknown as Node,
    )
  return procedure(input)
}

/** Le code de l'erreur tRPC rendue (ou `OK`). Sans entrée, une procédure ouverte rend BAD_REQUEST. */
async function attempt(path: string, sessionUser: SessionUser | null, input?: unknown) {
  try {
    await call(path, sessionUser, input)
    return 'OK'
  } catch (error) {
    if (error instanceof TRPCError) return error.code
    throw error
  }
}

const OPEN = ['OK', 'BAD_REQUEST']
const procedures = Object.keys(router._def.procedures).map((path) => ({ path }))

describe('toute procédure déclare son accès', () => {
  it('le routeur et la table disent la même liste', () => {
    expect(procedures.map((p) => p.path).sort()).toEqual(Object.keys(ACCES).sort())
  })

  it('aucune procédure ouverte sans session', () => {
    expect(Object.keys(ACCES).filter((path) => ACCES[path] === 'public')).toEqual([])
  })

  it.each(procedures)('$path refuse une requête sans session', async ({ path }) => {
    if (ACCES[path] === 'public') return
    expect(await attempt(path, null)).toBe('UNAUTHORIZED')
  })

  it.each(procedures)('$path : un compte USER', async ({ path }) => {
    const code = await attempt(path, user)
    if (ACCES[path] === 'admin') expect(code).toBe('FORBIDDEN')
    else expect(OPEN).toContain(code)
  })

  it.each(procedures)('$path : un administrateur', async ({ path }) => {
    expect(OPEN).toContain(await attempt(path, admin))
  })
})

describe('un compte ne se donne pas un rôle', () => {
  it('users.update sur soi-même avec role ADMIN : refusé, rien écrit', async () => {
    usersService.update.mockClear()
    await expect(
      call('users.update', user, { id: user.id, data: { role: 'ADMIN' } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(usersService.update).not.toHaveBeenCalled()
  })

  it('users.updateMe avec un role ou un email : refusé, rien écrit', async () => {
    usersService.updateSelf.mockClear()
    expect(await attempt('users.updateMe', user, { role: 'ADMIN' })).toBe('BAD_REQUEST')
    expect(await attempt('users.updateMe', user, { name: 'Bob', role: 'ADMIN' })).toBe(
      'BAD_REQUEST',
    )
    expect(await attempt('users.updateMe', user, { email: 'autre@test.invalid' })).toBe(
      'BAD_REQUEST',
    )
    expect(usersService.updateSelf).not.toHaveBeenCalled()
  })

  it('users.updateMe écrit sur le compte de la session, jamais sur un identifiant fourni', async () => {
    usersService.updateSelf.mockClear()
    await call('users.updateMe', user, { name: 'Bob' })
    expect(usersService.updateSelf).toHaveBeenCalledWith(user.id, { name: 'Bob' })
  })

  it("l'administrateur change le rôle d'un compte", async () => {
    usersService.update.mockClear()
    await call('users.update', admin, { id: user.id, data: { role: 'ADMIN' } })
    expect(usersService.update).toHaveBeenCalledWith(user.id, { role: 'ADMIN' })
  })
})

describe('les comptes des autres', () => {
  it('users.getById : le sien oui, celui d’un autre non', async () => {
    usersService.findOne.mockClear()
    expect(await attempt('users.getById', user, { id: admin.id })).toBe('FORBIDDEN')
    expect(usersService.findOne).not.toHaveBeenCalled()
    expect(await attempt('users.getById', user, { id: user.id })).toBe('OK')
    expect(await attempt('users.getById', admin, { id: user.id })).toBe('OK')
  })

  it('users.delete : celui d’un autre non', async () => {
    usersService.remove.mockClear()
    expect(await attempt('users.delete', user, { id: admin.id })).toBe('FORBIDDEN')
    expect(usersService.remove).not.toHaveBeenCalled()
  })
})
