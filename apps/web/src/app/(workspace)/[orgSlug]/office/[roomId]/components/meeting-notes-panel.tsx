'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ChevronRight,
  FileText,
  Loader2,
  MicOff,
  MessageSquareText,
  Radio,
  Sparkles,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { officeApi } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { useOfficeStore } from '@/stores/office-store'
import { cn } from '@/lib/utils'

type PanelTab = 'transcript' | 'summary'

type MeetingNotesPanelProps = {
  roomId: string
  isOpen: boolean
  onToggle: () => void
}

const LIVE_BLOCK_START = '<!-- serenity-live-meeting-start -->'
const LIVE_BLOCK_END = '<!-- serenity-live-meeting-end -->'
const AI_BLOCK_START = '<!-- serenity-ai-meeting-notes-start -->'
const AI_BLOCK_END = '<!-- serenity-ai-meeting-notes-end -->'

function extractManagedBlock(content: string, startMarker: string, endMarker: string) {
  const start = content.indexOf(startMarker)
  const end = content.indexOf(endMarker)
  if (start < 0 || end < start) {
    return ''
  }
  return content.slice(start + startMarker.length, end).trim()
}

function getLiveTranscriptLines(content: string) {
  const block = extractManagedBlock(content, LIVE_BLOCK_START, LIVE_BLOCK_END)
  if (!block) {
    return []
  }

  return block
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line !== '## Live transcript' && line !== '- No transcript yet.')
}

export function MeetingNotesPanel({ roomId, isOpen, onToggle }: MeetingNotesPanelProps) {
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const { meetingNote, loadMeetingNote } = useOfficeStore(
    useShallow(state => ({
      meetingNote: state.meetingNote,
      loadMeetingNote: state.loadMeetingNote,
    })),
  )
  const [activeTab, setActiveTab] = useState<PanelTab>('transcript')
  const [isRoomTranscribing, setIsRoomTranscribing] = useState(false)
  const [isRoomTranscriptionPending, setIsRoomTranscriptionPending] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [roomTranscriptError, setRoomTranscriptError] = useState<string | null>(null)

  const liveTranscriptLines = useMemo(
    () => getLiveTranscriptLines(meetingNote?.contentMarkdown ?? ''),
    [meetingNote?.contentMarkdown],
  )
  const aiSummaryMarkdown = useMemo(
    () => extractManagedBlock(meetingNote?.contentMarkdown ?? '', AI_BLOCK_START, AI_BLOCK_END) || null,
    [meetingNote?.contentMarkdown],
  )

  useEffect(() => {
    if (!token) {
      return
    }
    void loadMeetingNote(token, roomId)
  }, [token, roomId, loadMeetingNote])

  useEffect(() => {
    if (!token || !isRoomTranscribing) {
      return
    }
    const interval = setInterval(() => {
      void loadMeetingNote(token, roomId)
    }, 1000)
    return () => clearInterval(interval)
  }, [token, roomId, isRoomTranscribing, loadMeetingNote])

  const startRoomTranscription = async () => {
    if (!token) {
      return
    }

    setIsRoomTranscriptionPending(true)
    setRoomTranscriptError(null)

    try {
      await officeApi.startLiveTranscription(token, roomId)
      setIsRoomTranscribing(true)
      setActiveTab('transcript')
    } catch {
      setRoomTranscriptError('Transcript could not start. Check LiveKit, AI service, and OpenAI settings.')
    } finally {
      setIsRoomTranscriptionPending(false)
    }
  }

  const stopRoomTranscription = async () => {
    if (!token) {
      return
    }

    setIsRoomTranscriptionPending(true)
    setRoomTranscriptError(null)

    try {
      await officeApi.stopLiveTranscription(token, roomId)
      setIsRoomTranscribing(false)
      setActiveTab('summary')
      setIsSummarizing(true)
      try {
        const currentNote = await officeApi.getMeetingNote(token, roomId)
        const transcriptMarkdown = currentNote?.contentMarkdown ?? ''
        await officeApi.summarizeMeetingNote(token, roomId, transcriptMarkdown)
        await loadMeetingNote(token, roomId)
      } catch {
        setRoomTranscriptError('Summary could not be generated.')
      } finally {
        setIsSummarizing(false)
      }
    } catch {
      setRoomTranscriptError('Transcript could not stop. The worker may already be stopped.')
    } finally {
      setIsRoomTranscriptionPending(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex h-full w-10 flex-col items-center justify-center gap-2 border-l border-white/10 bg-[#181a20] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        title="Open meeting notes"
      >
        <FileText className="h-4 w-4" />
        <ChevronRight className="h-3 w-3" />
      </button>
    )
  }

  return (
    <div className="flex w-90 max-w-[42vw] flex-col border-l border-white/10 bg-[#181a20]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-300" />
          <span className="text-sm font-medium text-white">Meeting notes</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="rounded p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            title="Close notes"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>

      <div className="border-b border-white/10 p-3">
        <button
          onClick={isRoomTranscribing ? stopRoomTranscription : startRoomTranscription}
          disabled={isRoomTranscriptionPending}
          className={cn(
            'flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium transition',
            isRoomTranscribing
              ? 'bg-red-500/15 text-red-200 hover:bg-red-500/25'
              : 'bg-sky-500 text-white hover:bg-sky-400',
            isRoomTranscriptionPending && 'cursor-wait opacity-70',
          )}
        >
          {isRoomTranscriptionPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRoomTranscribing ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
          {isRoomTranscribing ? 'Stop transcript' : 'Start transcript'}
        </button>
        {roomTranscriptError && <p className="mt-2 text-xs text-amber-200">{roomTranscriptError}</p>}
      </div>

      <div className="grid grid-cols-2 border-b border-white/10 text-xs">
        {[
          { id: 'transcript' as const, label: 'Transcript', icon: MessageSquareText },
          { id: 'summary' as const, label: 'Summary', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex h-10 items-center justify-center gap-1.5 border-r border-white/10 text-white/55 transition last:border-r-0 hover:bg-white/5 hover:text-white',
                activeTab === tab.id && 'bg-white/10 text-white',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'transcript' && (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {liveTranscriptLines.length > 0 ? (
                <div className="space-y-2">
                  {liveTranscriptLines.map((line, index) => (
                    <div key={`${line}-${index}`} className="rounded-md bg-white/4 p-3">
                      <p className="text-sm leading-relaxed text-white/80">{line.replace(/^- /, '')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-white/40">
                  Start the transcript to capture this meeting.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="h-full overflow-y-auto p-4">
            {isSummarizing ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                <p className="text-sm">Generating meeting summary…</p>
              </div>
            ) : aiSummaryMarkdown ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <h2 className="mb-3 mt-5 text-sm font-semibold text-white first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">{children}</h3>,
                  ul: ({ children }) => <ul className="mb-3 space-y-1.5">{children}</ul>,
                  li: ({ children }) => <li className="rounded-md bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-white/80">{children}</li>,
                  p: ({ children }) => <p className="mb-2 text-sm leading-relaxed text-white/80">{children}</p>,
                }}
              >
                {aiSummaryMarkdown}
              </ReactMarkdown>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-white/40">
                Stop the transcript to generate a meeting summary.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

