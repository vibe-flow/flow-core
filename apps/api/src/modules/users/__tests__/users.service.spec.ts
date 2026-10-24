import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UsersService } from '../users.service'

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  account: {
    findFirst: vi.fn(),
  },
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' })
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', accounts: [] })
    service = new UsersService(mockPrisma as any)
  })

  it('updateSelf never writes a role or an email, whatever it is handed', async () => {
    await service.updateSelf('u1', { name: 'Bob', role: 'ADMIN', email: 'x@test.invalid' } as any)

    const { data } = mockPrisma.user.update.mock.calls[0][0]
    expect(data.name).toBe('Bob')
    expect(data.role).toBeUndefined()
    expect(data.email).toBeUndefined()
  })

  it('update writes only the known fields', async () => {
    await service.update('u1', { role: 'ADMIN', status: 'ACTIVE' } as any)

    const { data } = mockPrisma.user.update.mock.calls[0][0]
    expect(data).toEqual({ email: undefined, name: undefined, role: 'ADMIN' })
  })
})

describe('UsersService — comptes reliés au SSO', () => {
  const env = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(process.env, {
      SSO_ISSUER: 'https://auth.example.com',
      SSO_CLIENT_ID: 'app',
      SSO_CLIENT_SECRET: 'secret',
      SSO_NAME: 'Senpli OS',
    })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' })
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', role: 'USER', accounts: [] })
  })

  afterEach(() => {
    process.env = { ...env }
  })

  it("refuse de changer le rôle d'un compte relié, sans rien écrire", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1' })
    const service = new UsersService(mockPrisma as any)

    await expect(service.update('u1', { role: 'ADMIN' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Le rôle de ce compte est géré par Senpli OS',
    })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it("laisse changer le reste d'un compte relié, et le rôle d'un compte qui ne l'est pas", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1' })
    const service = new UsersService(mockPrisma as any)
    await service.update('u1', { name: 'Alice', role: 'USER' })
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)

    mockPrisma.account.findFirst.mockResolvedValue(null)
    await service.update('u1', { role: 'ADMIN' })
    expect(mockPrisma.user.update.mock.calls[1][0].data.role).toBe('ADMIN')
  })

  it('dit qui gère le rôle de chaque compte', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', role: 'ADMIN', accounts: [{ id: 'a1' }] },
      { id: 'u2', role: 'USER', accounts: [] },
    ])
    const service = new UsersService(mockPrisma as any)

    expect(await service.findAll()).toEqual([
      { id: 'u1', role: 'ADMIN', roleManagedBy: 'Senpli OS' },
      { id: 'u2', role: 'USER', roleManagedBy: null },
    ])
  })

  it("sans SSO configuré, aucun rôle n'est géré ailleurs", async () => {
    delete process.env.SSO_ISSUER
    delete process.env.SSO_CLIENT_ID
    delete process.env.SSO_CLIENT_SECRET
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', accounts: [{ id: 'a1' }] }])
    const service = new UsersService(mockPrisma as any)

    expect(await service.findAll()).toEqual([{ id: 'u1', roleManagedBy: null }])
    await service.update('u1', { role: 'ADMIN' })
    expect(mockPrisma.account.findFirst).not.toHaveBeenCalled()
  })
})
