import React, { useEffect } from 'react'
import { act, render } from '@testing-library/react'
import { useRealtime } from '../src/hooks/use-realtime'

class MockEventSource {
  static instances: MockEventSource[] = []

  readonly listeners = new Map<string, Set<EventListener>>()
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  constructor(readonly url: string) {
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)?.add(listener)
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener)
  }

  close() {
    this.closed = true
  }

  emit(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent<string>
    this.listeners.get(type)?.forEach(listener => listener(event))
  }
}

beforeEach(() => {
  MockEventSource.instances = []
  Object.defineProperty(globalThis, 'EventSource', {
    configurable: true,
    value: MockEventSource,
  })
})

it('subscribes to custom SSE event names', () => {
  const onNoteUpdated = jest.fn()

  function Harness() {
    const { subscribe } = useRealtime('token')

    useEffect(() => {
      return subscribe('office.note.updated', onNoteUpdated)
    }, [subscribe])

    return null
  }

  render(<Harness />)

  const eventSource = MockEventSource.instances[0]
  expect(eventSource.listeners.has('office.note.updated')).toBe(true)

  act(() => {
    eventSource.emit('office.note.updated', {
      type: 'office.note.updated',
      payload: { id: 'note-1', roomId: 'room-1' },
    })
  })

  expect(onNoteUpdated).toHaveBeenCalledWith({
    type: 'office.note.updated',
    payload: { id: 'note-1', roomId: 'room-1' },
  })
})
