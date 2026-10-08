import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePersistedState } from './use-persisted-state'

// The test setup mocks localStorage with vi.fn() — we work with that mock
const mockGetItem = localStorage.getItem as ReturnType<typeof vi.fn>
const mockSetItem = localStorage.setItem as ReturnType<typeof vi.fn>

describe('usePersistedState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default value when nothing is stored', () => {
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() => usePersistedState('test:key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('persists value to localStorage on change', () => {
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() => usePersistedState<string>('test:key', 'default'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(mockSetItem).toHaveBeenCalledWith('ps:test:key', '"new-value"')
  })

  it('reads existing value from localStorage', () => {
    mockGetItem.mockReturnValue('"stored-value"')

    const { result } = renderHook(() => usePersistedState('test:key', 'default'))
    expect(result.current[0]).toBe('stored-value')
    expect(mockGetItem).toHaveBeenCalledWith('ps:test:key')
  })

  it('handles objects', () => {
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      usePersistedState('test:obj', { sort: 'date', order: 'asc' }),
    )

    act(() => {
      result.current[1]({ sort: 'name', order: 'desc' })
    })

    expect(result.current[0]).toEqual({ sort: 'name', order: 'desc' })
    expect(mockSetItem).toHaveBeenCalledWith(
      'ps:test:obj',
      JSON.stringify({ sort: 'name', order: 'desc' }),
    )
  })

  it('handles arrays', () => {
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() => usePersistedState('test:arr', ['a', 'b']))

    act(() => {
      result.current[1](['c', 'd', 'e'])
    })

    expect(result.current[0]).toEqual(['c', 'd', 'e'])
    expect(mockSetItem).toHaveBeenCalledWith('ps:test:arr', '["c","d","e"]')
  })

  it('supports updater function', () => {
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() => usePersistedState<number>('test:counter', 0))

    act(() => {
      result.current[1]((prev) => prev + 1)
    })

    expect(result.current[0]).toBe(1)
    expect(mockSetItem).toHaveBeenCalledWith('ps:test:counter', '1')
  })

  it('falls back to default on corrupted localStorage data', () => {
    mockGetItem.mockReturnValue('not-valid-json{')

    const { result } = renderHook(() => usePersistedState('test:key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('syncs across tabs via storage event', () => {
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() => usePersistedState('test:key', 'default'))

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'ps:test:key',
        newValue: '"from-other-tab"',
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('from-other-tab')
  })

  it('ignores storage events for other keys', () => {
    mockGetItem.mockReturnValue(null)

    const { result } = renderHook(() => usePersistedState<string>('test:key', 'default'))

    act(() => {
      result.current[1]('my-value')
    })

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'ps:other:key',
        newValue: '"other-value"',
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('my-value')
  })

  it('handles localStorage being unavailable', () => {
    mockGetItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })
    mockSetItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const { result } = renderHook(() => usePersistedState<string>('test:key', 'fallback'))
    expect(result.current[0]).toBe('fallback')

    act(() => {
      result.current[1]('new-value')
    })

    // Should not throw, just silently degrade
    expect(result.current[0]).toBe('new-value')
  })
})
