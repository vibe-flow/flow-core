import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useSseStore } from './sse.store'

// Mock EventSource
class MockEventSource {
  url: string
  onopen: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  readyState: number = 0

  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  constructor(url: string) {
    this.url = url
  }

  close() {
    this.readyState = MockEventSource.CLOSED
  }
}

vi.stubGlobal('EventSource', MockEventSource)

describe('SseStore', () => {
  let mockEs: MockEventSource

  beforeEach(() => {
    vi.useFakeTimers()
    useSseStore.setState({
      isConnected: false,
      connectionError: null,
      eventSource: null,
      handlers: new Map(),
      reconnectAttempts: 0,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    useSseStore.getState().disconnect()
  })

  describe('connect', () => {
    it('should create an EventSource on the events URL', () => {
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      expect(eventSource).toBeInstanceOf(MockEventSource)
      expect((eventSource as unknown as MockEventSource).url).toBe('/api/sse/events')
    })

    it('should set isConnected true on open', () => {
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      mockEs = eventSource as unknown as MockEventSource
      mockEs.onopen!(new Event('open'))
      expect(useSseStore.getState().isConnected).toBe(true)
      expect(useSseStore.getState().connectionError).toBeNull()
      expect(useSseStore.getState().reconnectAttempts).toBe(0)
    })

    it('should close existing EventSource before opening a new one', () => {
      useSseStore.getState().connect()
      const firstEs = useSseStore.getState().eventSource as unknown as MockEventSource
      const closeSpy = vi.spyOn(firstEs, 'close')

      useSseStore.getState().connect()
      expect(closeSpy).toHaveBeenCalled()
    })

    it('should dispatch message to matching handlers', () => {
      const handler = vi.fn()
      useSseStore.getState().subscribe('entity_changed', handler)
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      mockEs = eventSource as unknown as MockEventSource

      const payload = { type: 'entity_changed', entity: 'User', action: 'create', id: '1' }
      mockEs.onmessage!(new MessageEvent('message', { data: JSON.stringify(payload) }))

      expect(handler).toHaveBeenCalledWith(payload)
    })

    it('should not dispatch message to handlers of different type', () => {
      const handler = vi.fn()
      useSseStore.getState().subscribe('heartbeat', handler)
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      mockEs = eventSource as unknown as MockEventSource

      const payload = { type: 'entity_changed', entity: 'User', action: 'create', id: '1' }
      mockEs.onmessage!(new MessageEvent('message', { data: JSON.stringify(payload) }))

      expect(handler).not.toHaveBeenCalled()
    })

    it('should ignore invalid JSON messages', () => {
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      mockEs = eventSource as unknown as MockEventSource
      expect(() => {
        mockEs.onmessage!(new MessageEvent('message', { data: 'not-json' }))
      }).not.toThrow()
    })

    it('should set isConnected false and schedule reconnect on error', () => {
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      mockEs = eventSource as unknown as MockEventSource
      mockEs.onopen!(new Event('open'))
      expect(useSseStore.getState().isConnected).toBe(true)

      mockEs.onerror!(new Event('error'))
      expect(useSseStore.getState().isConnected).toBe(false)
      expect(useSseStore.getState().eventSource).toBeNull()
    })
  })

  describe('disconnect', () => {
    it('should close EventSource and reset state', () => {
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      mockEs = eventSource as unknown as MockEventSource
      const closeSpy = vi.spyOn(mockEs, 'close')

      useSseStore.getState().disconnect()

      expect(closeSpy).toHaveBeenCalled()
      const state = useSseStore.getState()
      expect(state.eventSource).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.reconnectAttempts).toBe(0)
    })

    it('should do nothing if not connected', () => {
      expect(() => useSseStore.getState().disconnect()).not.toThrow()
    })
  })

  describe('subscribe / unsubscribe', () => {
    it('should add a handler for a given type', () => {
      const handler = vi.fn()
      useSseStore.getState().subscribe('entity_changed', handler)
      const { handlers } = useSseStore.getState()
      expect(handlers.get('entity_changed')?.has(handler)).toBe(true)
    })

    it('should remove a handler for a given type', () => {
      const handler = vi.fn()
      useSseStore.getState().subscribe('entity_changed', handler)
      useSseStore.getState().unsubscribe('entity_changed', handler)
      const { handlers } = useSseStore.getState()
      expect(handlers.get('entity_changed')?.has(handler)).toBe(false)
    })

    it('should support multiple handlers for the same type', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      useSseStore.getState().subscribe('entity_changed', h1)
      useSseStore.getState().subscribe('entity_changed', h2)
      expect(useSseStore.getState().handlers.get('entity_changed')?.size).toBe(2)
    })

    it('should not throw when unsubscribing a non-existent handler', () => {
      const handler = vi.fn()
      expect(() => useSseStore.getState().unsubscribe('entity_changed', handler)).not.toThrow()
    })
  })

  describe('reconnect backoff', () => {
    it('should increment reconnectAttempts on error', () => {
      useSseStore.getState().connect()
      const { eventSource } = useSseStore.getState()
      mockEs = eventSource as unknown as MockEventSource
      mockEs.onopen!(new Event('open'))
      mockEs.onerror!(new Event('error'))

      vi.advanceTimersByTime(1000)
      expect(useSseStore.getState().reconnectAttempts).toBe(1)
    })
  })
})
