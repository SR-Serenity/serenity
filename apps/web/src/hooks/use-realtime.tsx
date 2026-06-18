'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type RealtimeEvent = {
  type: string
  data: unknown
}

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

const DEFAULT_EVENT_TYPES = [
  'ready',
  'heartbeat',
  'message.created',
  'message.edited',
  'message.unsent',
  'reaction.added',
  'reaction.removed',
]

function parseEventData(event: Event) {
  const data = (event as MessageEvent<string>).data
  if (typeof data !== 'string') {
    return data
  }

  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

export function useRealtime(token: string | null, enabled = true) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map())
  const eventHandlersRef = useRef<Map<string, EventListener>>(new Map())

  const notifyListeners = useCallback((eventType: string, data: unknown) => {
    const listeners = listenersRef.current.get(eventType)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }, [])

  const attachEventListener = useCallback((eventType: string) => {
    const eventSource = eventSourceRef.current
    if (!eventSource || eventHandlersRef.current.has(eventType)) {
      return
    }

    const handler: EventListener = (event) => {
      const data = parseEventData(event)
      if (eventType !== 'heartbeat') {
        setLastEvent({ type: eventType, data })
      }
      notifyListeners(eventType, data)
    }

    eventHandlersRef.current.set(eventType, handler)
    eventSource.addEventListener(eventType, handler)
  }, [notifyListeners])

  const detachEventListener = useCallback((eventType: string) => {
    const eventSource = eventSourceRef.current
    const handler = eventHandlersRef.current.get(eventType)
    if (!eventSource || !handler) {
      return
    }

    eventSource.removeEventListener(eventType, handler)
    eventHandlersRef.current.delete(eventType)
  }, [])

  useEffect(() => {
    if (!enabled || !token) {
      return
    }

    setStatus('connecting')
    const realtimeUrl = (process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:2992')
      .replace(/\/$/, '')
    const endpoint = realtimeUrl.endsWith('/realtime/events')
      ? realtimeUrl
      : `${realtimeUrl}/api/realtime/events`
    const url = `${endpoint}?token=${encodeURIComponent(token)}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource
    const eventHandlers = eventHandlersRef.current

    eventSource.onopen = () => {
      setStatus('connected')
    }

    eventSource.onerror = () => {
      setStatus('error')
      eventSource.close()
      if (eventSourceRef.current === eventSource) {
        eventSourceRef.current = null
      }
    }

    const eventTypes = new Set([...DEFAULT_EVENT_TYPES, ...listenersRef.current.keys()])
    eventTypes.forEach(attachEventListener)

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      eventHandlers.clear()
      setStatus('disconnected')
    }
  }, [token, enabled, attachEventListener])

  const subscribe = useCallback((eventType: string, callback: (data: unknown) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set())
    }
    const listeners = listenersRef.current.get(eventType)
    if (!listeners) return () => undefined
    listeners.add(callback)
    attachEventListener(eventType)

    return () => {
      const currentListeners = listenersRef.current.get(eventType)
      if (currentListeners) {
        currentListeners.delete(callback)
        if (currentListeners.size === 0) {
          listenersRef.current.delete(eventType)
          if (!DEFAULT_EVENT_TYPES.includes(eventType)) {
            detachEventListener(eventType)
          }
        }
      }
    }
  }, [attachEventListener, detachEventListener])

  return useMemo(() => ({
    status,
    lastEvent,
    subscribe,
  }), [lastEvent, status, subscribe])
}
