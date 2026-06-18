'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  ControlBar,
  LayoutContextProvider,
  useCreateLayoutContext,
  usePinnedTracks,
  useParticipants,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import {
  Captions,
  Clock,
  FileText,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Square,
  Users,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { officeApi } from '@serenity/api'
import { MeetingNotesPanel } from './meeting-notes-panel'
import { getTranscriptCaptions, getTranscriptMarkdown, type TranscriptCaption } from './meeting-note-blocks'
import { useAuthStore } from '@/stores/auth-store'
import { useOfficeStore } from '@/stores/office-store'
import { cn } from '@/lib/utils'
import type { MeetingCaptionState } from './meeting-notes-panel'

function gridCols(count: number) {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 9) return 'grid-cols-3'
  return 'grid-cols-4'
}

type MeetingTrack = ReturnType<typeof useTracks>[number]

function trackKey(track: MeetingTrack) {
  return `${track.participant.identity}-${track.source}`
}

function participantJoinedAt(track: MeetingTrack) {
  return track.participant.joinedAt?.getTime() ?? 0
}

function sortMeetingTracks(tracks: MeetingTrack[]) {
  return [...tracks].sort((a, b) => {
    if (a.participant.isLocal !== b.participant.isLocal) {
      return a.participant.isLocal ? -1 : 1
    }

    if (a.source !== b.source) {
      if (a.source === Track.Source.ScreenShare) return -1
      if (b.source === Track.Source.ScreenShare) return 1
    }

    if (a.participant.isSpeaking !== b.participant.isSpeaking) {
      return a.participant.isSpeaking ? -1 : 1
    }

    if (a.participant.isCameraEnabled !== b.participant.isCameraEnabled) {
      return a.participant.isCameraEnabled ? -1 : 1
    }

    return participantJoinedAt(a) - participantJoinedAt(b)
  })
}

function CaptionLine({ caption, current }: { caption: TranscriptCaption; current: boolean }) {
  return (
    <p
      className={cn(
        'break-words leading-relaxed text-white',
        current ? 'text-base font-medium md:text-lg' : 'mb-1 text-sm text-white/55',
      )}
    >
      {caption.speaker && (
        <span className={cn('mr-2 font-semibold text-sky-200', current ? 'text-xs' : 'text-[11px]')}>
          {caption.speaker}
        </span>
      )}
      {caption.text}
    </p>
  )
}

function LiveCaptionOverlay({
  captions,
  visible,
  raised,
}: {
  captions: TranscriptCaption[]
  visible: boolean
  raised: boolean
}) {
  if (!visible || captions.length === 0) {
    return null
  }

  const visibleCaptions = captions.slice(-2)

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-4 z-20 flex justify-center',
        raised ? 'bottom-32' : 'bottom-5',
      )}
    >
      <div className="max-h-28 w-full max-w-3xl overflow-hidden rounded-md bg-black/75 px-4 py-3 text-left shadow-2xl backdrop-blur-md">
        {visibleCaptions.map((caption, index) => (
          <CaptionLine
            key={`${caption.raw}-${index}`}
            caption={caption}
            current={index === visibleCaptions.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

type MeetingShellProps = { roomId: string }

export function MeetingShell({ roomId }: MeetingShellProps) {
  const [notesOpen, setNotesOpen] = useState(true)
  const [captionsVisible, setCaptionsVisible] = useState(true)
  const [captionState, setCaptionState] = useState<MeetingCaptionState>('idle')
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const [meetingError, setMeetingError] = useState<string | null>(null)
  const [meetingTime, setMeetingTime] = useState('')
  const layoutContext = useCreateLayoutContext()
  const participants = useParticipants()
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const { meetingNote, loadMeetingNote } = useOfficeStore(
    useShallow(state => ({
      meetingNote: state.meetingNote,
      loadMeetingNote: state.loadMeetingNote,
    })),
  )

  useEffect(() => {
    const updateClock = () => {
      setMeetingTime(new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date()))
    }

    updateClock()
    const id = window.setInterval(updateClock, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  const sortedTracks = useMemo(() => sortMeetingTracks(tracks), [tracks])

  // Pinned tracks come from the layout context (set by clicking the pin icon on any tile)
  const pinnedTracks = usePinnedTracks(layoutContext)

  // Screen-share tracks are always auto-focused (like Google Meet)
  const screenShareTracks = sortedTracks.filter(t => t.source === Track.Source.ScreenShare)

  // Decide what to show in the main focused slot: pinned first, then screen share
  const focusedTrack = pinnedTracks[0] ?? screenShareTracks[0] ?? null
  const isFocusMode = !!focusedTrack

  // Carousel: everything except the focused track
  const carouselTracks = isFocusMode
    ? sortedTracks.filter(
        t => !(t.participant.sid === focusedTrack.participant.sid && t.source === focusedTrack.source),
      )
    : []
  const liveCaptions = useMemo(
    () => getTranscriptCaptions(meetingNote?.contentMarkdown ?? '', 'live'),
    [meetingNote?.contentMarkdown],
  )
  const isCaptionPending = captionState === 'starting' || captionState === 'stopping'

  const regenerateNotes = useCallback(async () => {
    if (!token) {
      return
    }

    setIsGeneratingNotes(true)
    setMeetingError(null)

    try {
      const currentNote = await officeApi.getMeetingNote(token, roomId)
      const transcriptMarkdown = getTranscriptMarkdown(currentNote?.contentMarkdown ?? '')
      if (!transcriptMarkdown.trim()) {
        setMeetingError('No captions are available to summarize.')
        return
      }
      await officeApi.summarizeMeetingNote(token, roomId, transcriptMarkdown)
      await loadMeetingNote(token, roomId)
      setNotesOpen(true)
    } catch {
      setMeetingError('AI notes could not be generated.')
    } finally {
      setIsGeneratingNotes(false)
    }
  }, [loadMeetingNote, roomId, token])

  const startCaptions = async () => {
    if (!token || isCaptionPending || captionState === 'live') {
      return
    }

    setCaptionState('starting')
    setMeetingError(null)

    try {
      await officeApi.startLiveTranscription(token, roomId)
      await loadMeetingNote(token, roomId)
      setCaptionsVisible(true)
      setCaptionState('live')
    } catch {
      setMeetingError('Captions could not start. Check LiveKit, AI service, and OpenAI settings.')
      setCaptionState('idle')
    }
  }

  const stopCaptions = async () => {
    if (!token || isCaptionPending || captionState !== 'live') {
      return
    }

    setCaptionState('stopping')
    setMeetingError(null)

    try {
      await officeApi.stopLiveTranscription(token, roomId)
      setCaptionState('idle')
      await regenerateNotes()
    } catch {
      setMeetingError('Captions could not stop. The worker may already be stopped.')
      setCaptionState('live')
    }
  }

  const handleCaptionButton = () => {
    if (captionState === 'idle') {
      void startCaptions()
      return
    }

    if (captionState === 'live') {
      setCaptionsVisible(value => !value)
    }
  }

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="flex h-full w-full overflow-hidden bg-[#11131a] text-white">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#181a20] px-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">Serenity Meet</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  Live
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-white/55">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {meetingTime}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participants.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 sm:flex">
                <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                Assistant notes
              </div>
              <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5">
                <button
                  onClick={handleCaptionButton}
                  disabled={isCaptionPending}
                  className={cn(
                    'inline-flex h-8 items-center justify-center gap-2 rounded-full px-2.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white',
                    captionState === 'live' && captionsVisible && 'bg-white/10 text-white',
                    isCaptionPending && 'cursor-wait opacity-70',
                  )}
                  title={
                    captionState === 'idle'
                      ? 'Start captions'
                      : captionsVisible
                        ? 'Hide captions'
                        : 'Show captions'
                  }
                >
                  {isCaptionPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Captions className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Captions</span>
                </button>
                {captionState === 'live' && (
                  <button
                    onClick={() => void stopCaptions()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-red-500/15 hover:text-red-100"
                    title="Stop captions"
                  >
                    <Square className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setNotesOpen(o => !o)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                title={notesOpen ? 'Close meeting notes' : 'Open meeting notes'}
              >
                {notesOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* ── Video area ─────────────────────────────────────────── */}
          <div className="relative flex-1 overflow-hidden bg-[#202124]">
            {sortedTracks.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-white/55">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-sm">Waiting for participants...</p>
                </div>
              </div>

            ) : isFocusMode ? (
              /* ── Focus mode (screen share or pinned) ─────────────── */
              <div className="flex h-full flex-col gap-2 p-3">
                {/* Main focused tile */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <ParticipantTile
                    trackRef={focusedTrack}
                    className="h-full w-full overflow-hidden rounded-lg border border-white/10 bg-[#303134]"
                  />
                </div>

                {/* Thumbnail strip */}
                {carouselTracks.length > 0 && (
                  <div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5">
                    {carouselTracks.map(track => (
                      <div
                        key={trackKey(track)}
                        className="aspect-video h-24 shrink-0"
                      >
                        <ParticipantTile
                          trackRef={track}
                          className="h-full w-full overflow-hidden rounded-lg border border-white/10 bg-[#303134]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (
              /* ── Grid mode ───────────────────────────────────────── */
              <div className={cn('grid h-full gap-3 p-3', gridCols(sortedTracks.length))}>
                {sortedTracks.map(track => (
                  <ParticipantTile
                    key={trackKey(track)}
                    trackRef={track}
                    className="overflow-hidden rounded-lg border border-white/10 bg-[#303134] shadow-sm"
                  />
                ))}
              </div>
            )}
            <LiveCaptionOverlay
              captions={liveCaptions}
              visible={captionsVisible}
              raised={isFocusMode && carouselTracks.length > 0}
            />
          </div>

          {/* ── Control bar ────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-white/10 bg-[#181a20]">
            <ControlBar
              variation="minimal"
              controls={{ microphone: true, camera: true, screenShare: true, leave: true }}
            />
          </div>
        </div>

        <RoomAudioRenderer />

        <MeetingNotesPanel
          roomId={roomId}
          isOpen={notesOpen}
          onToggle={() => setNotesOpen(o => !o)}
          captionState={captionState}
          isGeneratingNotes={isGeneratingNotes}
          meetingError={meetingError}
          onRegenerateNotes={regenerateNotes}
        />
      </div>
    </LayoutContextProvider>
  )
}
