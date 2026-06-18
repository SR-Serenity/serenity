'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RotateCw,
  Sparkles,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { wikiApi } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { useOfficeStore } from '@/stores/office-store'
import { cn } from '@/lib/utils'
import {
  getAiNotesMarkdown,
  getTranscriptMarkdown,
} from './meeting-note-blocks'

export type MeetingCaptionState = 'idle' | 'starting' | 'live' | 'stopping'
type ExportState = 'idle' | 'exporting' | 'success' | 'error'

type MeetingNotesPanelProps = {
  roomId: string
  isOpen: boolean
  onToggle: () => void
  captionState: MeetingCaptionState
  isGeneratingNotes: boolean
  meetingError: string | null
  onRegenerateNotes: () => Promise<void>
}

function formatMeetingDate(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) {
    return formatMeetingDate()
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function MeetingNotesPanel({
  roomId,
  isOpen,
  onToggle,
  captionState,
  isGeneratingNotes,
  meetingError,
  onRegenerateNotes,
}: MeetingNotesPanelProps) {
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const { meetingNote, loadMeetingNote, rooms } = useOfficeStore(
    useShallow(state => ({
      meetingNote: state.meetingNote,
      loadMeetingNote: state.loadMeetingNote,
      rooms: state.rooms,
    })),
  )
  const [exportState, setExportState] = useState<ExportState>('idle')

  const room = useMemo(() => rooms.find(item => item.id === roomId) ?? null, [roomId, rooms])
  const transcriptMarkdown = useMemo(
    () => getTranscriptMarkdown(meetingNote?.contentMarkdown ?? ''),
    [meetingNote?.contentMarkdown],
  )
  const aiSummaryMarkdown = useMemo(
    () => getAiNotesMarkdown(meetingNote?.contentMarkdown ?? '') || null,
    [meetingNote?.contentMarkdown],
  )
  const isCaptionPending = captionState === 'starting' || captionState === 'stopping'
  const canRegenerate = Boolean(transcriptMarkdown.trim()) && !isGeneratingNotes && !isCaptionPending
  const exportMarkdown = aiSummaryMarkdown?.trim() || transcriptMarkdown.trim()
  const canExport = Boolean(exportMarkdown) && exportState !== 'exporting'

  const status = useMemo(() => {
    if (captionState === 'starting') {
      return {
        icon: Loader2,
        title: 'Starting captions',
        detail: 'Connecting the live transcription worker.',
        tone: 'text-sky-200',
        spin: true,
      }
    }

    if (captionState === 'stopping') {
      return {
        icon: Loader2,
        title: 'Stopping captions',
        detail: 'Closing the live transcription worker.',
        tone: 'text-amber-200',
        spin: true,
      }
    }

    if (isGeneratingNotes) {
      return {
        icon: Loader2,
        title: 'Generating notes',
        detail: 'Building the AI notes from the captured captions.',
        tone: 'text-sky-200',
        spin: true,
      }
    }

    if (exportState === 'exporting') {
      return {
        icon: Loader2,
        title: 'Exporting to wiki',
        detail: 'Creating the wiki page.',
        tone: 'text-sky-200',
        spin: true,
      }
    }

    if (exportState === 'success') {
      return {
        icon: CheckCircle2,
        title: 'Exported to wiki',
        detail: 'Opening the created page.',
        tone: 'text-emerald-200',
      }
    }

    if (exportState === 'error') {
      return {
        icon: AlertCircle,
        title: 'Export failed',
        detail: 'The notes stayed in this meeting.',
        tone: 'text-amber-200',
      }
    }

    if (captionState === 'live') {
      return {
        icon: CheckCircle2,
        title: 'Captions active',
        detail: 'Live captions are shown over the meeting stage.',
        tone: 'text-emerald-200',
      }
    }

    return {
      icon: FileText,
      title: 'Idle',
      detail: aiSummaryMarkdown ? 'AI notes are ready.' : 'No live transcript is running.',
      tone: 'text-white/60',
    }
  }, [
    aiSummaryMarkdown,
    captionState,
    exportState,
    isGeneratingNotes,
  ])

  useEffect(() => {
    if (!token) {
      return
    }
    void loadMeetingNote(token, roomId)
  }, [token, roomId, loadMeetingNote])

  const regenerateNotes = async () => {
    setExportState('idle')
    await onRegenerateNotes()
  }

  const exportToWiki = async () => {
    if (!token || !exportMarkdown) {
      return
    }

    setExportState('exporting')

    try {
      const page = await wikiApi.createPage(token, {
        title: `Meeting: ${room?.name ?? 'Room'} - ${formatMeetingDate(meetingNote?.sessionStartAt)}`,
        contentMarkdown: exportMarkdown,
        visibility: 'WORKSPACE',
      })
      setExportState('success')
      router.push(`/${params.orgSlug}/wiki/${encodeURIComponent(page.id)}`)
    } catch {
      setExportState('error')
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

  const StatusIcon = status.icon

  return (
    <div className="flex w-[380px] max-w-[42vw] min-w-[340px] flex-col border-l border-white/10 bg-[#181a20]">
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
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-start gap-2">
            <StatusIcon className={cn('mt-0.5 h-4 w-4 shrink-0', status.tone, status.spin && 'animate-spin')} />
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', status.tone)}>{status.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/45">{status.detail}</p>
            </div>
          </div>
        </div>
        {meetingError && <p className="mt-2 text-xs text-amber-200">{meetingError}</p>}
        {exportState === 'error' && <p className="mt-2 text-xs text-amber-200">Export to wiki failed.</p>}
      </div>

      <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2 text-xs font-medium text-white/65">
          <FileText className="h-3.5 w-3.5" />
          AI Notes
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void regenerateNotes()}
            disabled={!canRegenerate}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded text-white/55 transition hover:bg-white/10 hover:text-white',
              !canRegenerate && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-white/55',
            )}
            title="Regenerate notes"
          >
            {isGeneratingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={exportToWiki}
            disabled={!canExport}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded text-white/55 transition hover:bg-white/10 hover:text-white',
              !canExport && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-white/55',
            )}
            title="Export to wiki"
          >
            {exportState === 'exporting' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          {isGeneratingNotes ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/40">
              <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
              <p className="text-sm">Generating AI notes...</p>
            </div>
          ) : aiSummaryMarkdown ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => <h2 className="mb-3 mt-5 border-b border-white/10 pb-2 text-sm font-semibold text-white first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-2 mt-4 text-xs font-semibold uppercase text-white/50">{children}</h3>,
                ul: ({ children }) => <ul className="mb-4 space-y-2">{children}</ul>,
                li: ({ children }) => <li className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-white/80">{children}</li>,
                p: ({ children }) => <p className="mb-2 text-sm leading-relaxed text-white/80">{children}</p>,
                input: ({ checked }) => (
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    className="mr-2 h-3.5 w-3.5 accent-sky-400"
                    readOnly
                    disabled
                  />
                ),
              }}
            >
              {aiSummaryMarkdown}
            </ReactMarkdown>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-white/40">
              No AI notes generated yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
