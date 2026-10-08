import { beforeAll, afterAll, vi } from 'vitest'

// Mock environment variables for tests
beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.REDIS_URL = 'redis://localhost:6379'
  process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret-32-chars-long'
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  vi.clearAllMocks()
})
