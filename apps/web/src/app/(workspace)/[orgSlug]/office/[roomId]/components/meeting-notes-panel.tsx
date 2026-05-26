'use client'

import { useEffect, useRef } from 'react'
import { ChevronRight, Download, FileText } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { useOfficeStore } from '@/stores/office-store'

type MeetingNotesPanelProps = {
  roomId: string
  isOpen: boolean
  onToggle: () => void
}

export function MeetingNotesPanel({ roomId, isOpen, onToggle }: MeetingNotesPanelProps) {
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const { meetingNote, loadMeetingNote, updateMeetingNote } = useOfficeStore(
    useShallow(state => ({
      meetingNote: state.meetingNote,
      loadMeetingNote: state.loadMeetingNote,
      updateMeetingNote: state.updateMeetingNote,
    })),
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!token) return
    void loadMeetingNote(token, roomId)
  }, [token, roomId, loadMeetingNote])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!token) return
    updateMeetingNote(token, roomId, e.target.value)
  }

  const handleExport = () => {
    const content = meetingNote?.contentMarkdown ?? ''
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-notes-${roomId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex flex-col items-center justify-center w-10 h-full bg-white/5 hover:bg-white/10 transition-colors border-l border-white/10 gap-2 text-brand-muted hover:text-white"
        title="Open meeting notes"
      >
        <FileText className="h-4 w-4" />
        <ChevronRight className="h-3 w-3" />
      </button>
    )
  }

  return (
    <div className="flex flex-col w-80 border-l border-white/10 bg-[#0a0a1a]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-muted" />
          <span className="text-sm font-medium text-white">Meeting Notes</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            title="Export notes"
            className="p-1.5 rounded text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
            title="Close notes"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-3">
        <textarea
          ref={textareaRef}
          value={meetingNote?.contentMarkdown ?? ''}
          onChange={handleChange}
          placeholder="Take notes during the meeting… (Markdown supported)"
          className="w-full h-full resize-none bg-transparent text-sm text-white/80 placeholder:text-white/20 focus:outline-none leading-relaxed"
        />
      </div>
    </div>
  )
}
