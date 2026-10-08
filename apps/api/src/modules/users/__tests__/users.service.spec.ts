import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsersService } from '../users.service'

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER' })
    mockPrisma.user.update.mockResolvedValue({ id: 'u1' })
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
