'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiveKitRoom } from '@livekit/components-react'
import '@livekit/components-styles'
import { useShallow } from 'zustand/react/shallow'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useOfficeStore } from '@/stores/office-store'
import { MeetingShell } from './components/meeting-shell'

export default function MeetingRoomPage() {
  const params = useParams<{ orgSlug: string; roomId: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [errorMsg, setErrorMsg] = useState('')
  const hasLeftRef = useRef(false)

  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const { joinRoom, leaveRoom, livekitToken, livekitWsUrl } = useOfficeStore(
    useShallow(state => ({
      joinRoom: state.joinRoom,
      leaveRoom: state.leaveRoom,
      livekitToken: state.livekitToken,
      livekitWsUrl: state.livekitWsUrl,
    })),
  )

  useEffect(() => {
    if (!token) return
    let cancelled = false
    let joined = false
    hasLeftRef.current = false
    setStatus('connecting')
    setErrorMsg('')

    joinRoom(token, params.roomId)
      .then(() => {
        joined = true
        if (!cancelled) {
          setStatus('connected')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg('Could not join the room. It may not exist or you lack access.')
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
      if (joined && !hasLeftRef.current) {
        hasLeftRef.current = true
        void leaveRoom(token, params.roomId)
      }
    }
  }, [joinRoom, leaveRoom, params.roomId, token])

  const handleDisconnected = () => {
    if (token && !hasLeftRef.current) {
      hasLeftRef.current = true
      void leaveRoom(token, params.roomId)
    }
    router.push(`/${params.orgSlug}/office`)
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-brand-muted">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-400">{errorMsg}</p>
        <button
          onClick={() => router.push(`/${params.orgSlug}/office`)}
          className="text-sm text-brand-muted underline"
        >
          Back to Office
        </button>
      </div>
    )
  }

  if (status === 'connecting' || !livekitToken) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-brand-muted" />
      </div>
    )
  }

  return (
    <div className="meeting-room-wrapper h-full w-full" data-lk-theme="default">
      <LiveKitRoom
        serverUrl={livekitWsUrl}
        token={livekitToken}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleDisconnected}
        style={{ height: '100%' }}
      >
        <MeetingShell roomId={params.roomId} />
      </LiveKitRoom>
    </div>
  )
}
