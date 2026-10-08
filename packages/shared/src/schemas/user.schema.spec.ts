import { describe, it, expect } from 'vitest'
import { UserSchema, UpdateUserSchema, UpdateSelfSchema, UserRoleSchema } from './user.schema'

describe('UserSchema', () => {
  it('accepts a valid user with status', () => {
    const result = UserSchema.safeParse({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Alice',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })

  it('accepts PENDING status', () => {
    const result = UserSchema.safeParse({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Pending User',
      role: 'USER',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing status', () => {
    const result = UserSchema.safeParse({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Pending User',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = UserSchema.safeParse({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Pending User',
      role: 'USER',
      status: 'ARCHIVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateUserSchema', () => {
  it('accepts partial update without password', () => {
    const result = UpdateUserSchema.safeParse({ name: 'Bob' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = UpdateUserSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('UpdateSelfSchema', () => {
  it('accepts a name', () => {
    expect(UpdateSelfSchema.safeParse({ name: 'Bob' }).success).toBe(true)
  })

  it('rejects a role, even alongside a valid name', () => {
    expect(UpdateSelfSchema.safeParse({ role: 'ADMIN' }).success).toBe(false)
    expect(UpdateSelfSchema.safeParse({ name: 'Bob', role: 'ADMIN' }).success).toBe(false)
  })

  it('rejects an email', () => {
    expect(UpdateSelfSchema.safeParse({ email: 'bob@test.invalid' }).success).toBe(false)
  })
})

describe('UserRoleSchema', () => {
  it('accepts USER and ADMIN', () => {
    expect(UserRoleSchema.safeParse('USER').success).toBe(true)
    expect(UserRoleSchema.safeParse('ADMIN').success).toBe(true)
  })

  it('rejects unknown role', () => {
    expect(UserRoleSchema.safeParse('SUPERUSER').success).toBe(false)
  })
})
