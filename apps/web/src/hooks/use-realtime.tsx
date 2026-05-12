'use client'

import { useEffect, useRef, useState } from 'react'

export type RealtimeEvent = {
  type: string
  data: unknown
}

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export function useRealtime(token: string | null, enabled = true) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map())

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

    eventSource.onopen = () => {
      setStatus('connected')
    }

    eventSource.onerror = () => {
      setStatus('error')
      eventSource.close()
    }

    eventSource.addEventListener('ready', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent({ type: 'ready', data })
      notifyListeners('ready', data)
    })

    eventSource.addEventListener('heartbeat', (e) => {
      const data = JSON.parse(e.data)
      notifyListeners('heartbeat', data)
    })

    eventSource.addEventListener('message.created', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent({ type: 'message.created', data })
      notifyListeners('message.created', data)
    })

    eventSource.addEventListener('message.edited', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent({ type: 'message.edited', data })
      notifyListeners('message.edited', data)
    })

    eventSource.addEventListener('message.unsent', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent({ type: 'message.unsent', data })
      notifyListeners('message.unsent', data)
    })

    eventSource.addEventListener('reaction.added', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent({ type: 'reaction.added', data })
      notifyListeners('reaction.added', data)
    })

    eventSource.addEventListener('reaction.removed', (e) => {
      const data = JSON.parse(e.data)
      setLastEvent({ type: 'reaction.removed', data })
      notifyListeners('reaction.removed', data)
    })

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setStatus('disconnected')
    }
  }, [token, enabled])

  const subscribe = (eventType: string, callback: (data: unknown) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set())
    }
    const listeners = listenersRef.current.get(eventType)
    if (!listeners) return () => undefined
    listeners.add(callback)

    return () => {
      const currentListeners = listenersRef.current.get(eventType)
      if (currentListeners) {
        currentListeners.delete(callback)
        if (currentListeners.size === 0) {
          listenersRef.current.delete(eventType)
        }
      }
    }
  }

  const notifyListeners = (eventType: string, data: unknown) => {
    const listeners = listenersRef.current.get(eventType)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  return {
    status,
    lastEvent,
    subscribe,
  }
}
