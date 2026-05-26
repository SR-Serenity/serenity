'use client'

import { useMemo, useState } from 'react'
import {
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  ControlBar,
  LayoutContextProvider,
  useCreateLayoutContext,
  usePinnedTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { MeetingNotesPanel } from './meeting-notes-panel'
import { cn } from '@/lib/utils'

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

type MeetingShellProps = { roomId: string }

export function MeetingShell({ roomId }: MeetingShellProps) {
  const [notesOpen, setNotesOpen] = useState(true)
  const layoutContext = useCreateLayoutContext()

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

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="flex h-full w-full overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Video area ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden bg-[#070738]">
            {sortedTracks.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/30 text-sm">Waiting for participants…</p>
              </div>

            ) : isFocusMode ? (
              /* ── Focus mode (screen share or pinned) ─────────────── */
              <div className="flex flex-col h-full gap-2 p-2">
                {/* Main focused tile */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ParticipantTile
                    trackRef={focusedTrack}
                    className="w-full h-full rounded-xl overflow-hidden"
                  />
                </div>

                {/* Thumbnail strip */}
                {carouselTracks.length > 0 && (
                  <div className="shrink-0 flex gap-2 overflow-x-auto pb-0.5">
                    {carouselTracks.map(track => (
                      <div
                        key={trackKey(track)}
                        className="shrink-0 h-24 aspect-video"
                      >
                        <ParticipantTile
                          trackRef={track}
                          className="w-full h-full rounded-lg overflow-hidden"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (
              /* ── Grid mode ───────────────────────────────────────── */
              <div className={cn('grid gap-2 h-full p-2', gridCols(sortedTracks.length))}>
                {sortedTracks.map(track => (
                  <ParticipantTile
                    key={trackKey(track)}
                    trackRef={track}
                    className="rounded-xl overflow-hidden"
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Control bar ────────────────────────────────────────── */}
          <div className="shrink-0 bg-[#050530] border-t border-white/10">
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
        />
      </div>
    </LayoutContextProvider>
  )
}
