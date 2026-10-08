import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './auth.store'

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
    vi.clearAllMocks()
  })

  describe('setAuth', () => {
    it('should set authentication data', () => {
      const authData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER' as const,
          status: 'ACTIVE' as const,
        },
      }

      useAuthStore.getState().setAuth(authData)

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe('access-token')
      expect(state.refreshToken).toBe('refresh-token')
      expect(state.user?.email).toBe('test@example.com')
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('logout', () => {
    it('should clear authentication data', () => {
      // Set initial auth state
      useAuthStore.setState({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'USER', status: 'ACTIVE' },
        isAuthenticated: true,
        isLoading: false,
      })

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.accessToken).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('setTokens', () => {
    it('should update tokens without affecting user', () => {
      const user = { id: '1', email: 'test@test.com', name: 'Test', role: 'USER' as const, status: 'ACTIVE' as const }
      useAuthStore.setState({
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        user,
        isAuthenticated: true,
        isLoading: false,
      })

      useAuthStore.getState().setTokens('new-token', 'new-refresh')

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe('new-token')
      expect(state.refreshToken).toBe('new-refresh')
      expect(state.user).toEqual(user)
    })
  })
})
