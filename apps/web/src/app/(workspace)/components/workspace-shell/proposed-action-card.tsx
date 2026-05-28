'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BookOpen, Calendar, CalendarPlus, Check, CheckCircle2, Clock,
  FileEdit, FileText, Loader2, MapPin, Plus, Users, X,
} from 'lucide-react'
import { officeApi, orgApi } from '@serenity/api'
import type { AiProposedAction, AiProposedActionType, Member, OfficeRoom } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { browserTimezone, localToUnix, toUnix, unixToLocalDate, unixToLocalTime } from '@/lib/time'

const ACTION_LABELS: Record<AiProposedActionType, string> = {
  CREATE_TASK: 'Create Task',
  CREATE_EVENT: 'Create Event',
  CREATE_MEETING: 'Schedule Meeting',
  BOOK_ROOM: 'Book Room',
  CREATE_WIKI_PAGE: 'Create Wiki Page',
  EDIT_WIKI_PAGE: 'Edit Wiki Page',
}

const ACTION_ICONS: Record<AiProposedActionType, React.ElementType> = {
  CREATE_TASK: CheckCircle2,
  CREATE_EVENT: Calendar,
  CREATE_MEETING: CalendarPlus,
  BOOK_ROOM: BookOpen,
  CREATE_WIKI_PAGE: FileText,
  EDIT_WIKI_PAGE: FileEdit,
}

/** Normalise a raw action payload so date/time fields are stored as Unix ms. */
function normalisePayload(raw: Record<string, unknown>): Record<string, unknown> {
  const tz = browserTimezone()
  return {
    ...raw,
    startAt: toUnix(raw.startAt as string | number | null | undefined, tz) ?? undefined,
    endAt: toUnix(raw.endAt as string | number | null | undefined, tz) ?? undefined,
  }
}

function MemberPicker({
  selected,
  members,
  onChange,
}: {
  selected: string[]
  members: Member[]
  onChange: (ids: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const selectedMembers = members.filter(m => selected.includes(m.id))
  const available = members.filter(
    m =>
      !selected.includes(m.id) &&
      (search === '' ||
        m.displayName.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div ref={containerRef} className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {selectedMembers.map(m => (
          <span
            key={m.id}
            className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
          >
            {m.displayName}
            <button
              type="button"
              onClick={() => onChange(selected.filter(id => id !== m.id))}
              className="hover:text-blue-900"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => { setOpen(true); setSearch('') }}
          className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>

      {open && (
        <div className="relative z-10">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members…"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
          {available.length > 0 && (
            <div className="absolute top-full mt-1 max-h-36 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-md">
              {available.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault()
                    onChange([...selected, m.id])
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{m.displayName}</span>
                  <span className="truncate text-slate-400">{m.email}</span>
                </button>
              ))}
            </div>
          )}
          {available.length === 0 && search && (
            <div className="absolute top-full mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-xs text-slate-400 shadow-md">
              No members found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function inputCls() {
  return 'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400'
}

function labelCls() {
  return 'mb-0.5 block text-xs font-medium text-slate-600'
}

function MeetingForm({
  payload,
  members,
  rooms,
  tz,
  onChange,
}: {
  payload: Record<string, unknown>
  members: Member[]
  rooms: OfficeRoom[]
  tz: string
  onChange: (p: Record<string, unknown>) => void
}) {
  const startUnix = payload.startAt as number | undefined
  const endUnix = payload.endAt as number | undefined
  const startDate = unixToLocalDate(startUnix, tz)
  const startTime = unixToLocalTime(startUnix, tz)
  const endTime = unixToLocalTime(endUnix, tz)
  const attendeeIds = (payload.attendeeIds as string[] | undefined) ?? []
  const roomId = (payload.roomId as string | undefined) ?? ''
  const selectedRoom = rooms.find(room => room.id === roomId)

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 px-2.5 py-2.5">
      <div>
        <label className={labelCls()}>Title</label>
        <input
          className={inputCls()}
          value={String(payload.title ?? '')}
          onChange={e => onChange({ ...payload, title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls()}>
            <Calendar className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Date
          </label>
          <input
            type="date"
            className={inputCls()}
            value={startDate}
            onChange={e => {
              const newStart = localToUnix(e.target.value, startTime || '09:00', tz)
              const newEnd = endTime
                ? localToUnix(e.target.value, endTime, tz)
                : newStart != null
                  ? newStart + 3_600_000
                  : undefined
              onChange({ ...payload, startAt: newStart, endAt: newEnd })
            }}
          />
        </div>
        <div>
          <label className={labelCls()}>
            <Clock className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Start time
          </label>
          <input
            type="time"
            className={inputCls()}
            value={startTime}
            onChange={e => onChange({ ...payload, startAt: localToUnix(startDate, e.target.value, tz) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div />
        <div>
          <label className={labelCls()}>
            <Clock className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            End time
          </label>
          <input
            type="time"
            className={inputCls()}
            value={endTime}
            onChange={e => onChange({ ...payload, endAt: localToUnix(startDate, e.target.value, tz) })}
          />
        </div>
      </div>

      <div>
        <label className={labelCls()}>
          <MapPin className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
          Office room
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>
        <select
          className={inputCls()}
          value={roomId}
          onChange={e => {
            const nextRoom = rooms.find(room => room.id === e.target.value)
            onChange({
              ...payload,
              roomId: e.target.value || null,
              location: nextRoom ? nextRoom.name : (payload.location ?? null),
            })
          }}
        >
          <option value="">No room</option>
          {rooms.map(room => (
            <option key={room.id} value={room.id}>
              {room.name} - up to {room.maxCapacity} people
            </option>
          ))}
        </select>
        {selectedRoom && attendeeIds.length > selectedRoom.maxCapacity && (
          <p className="mt-1 text-xs text-amber-600">
            Room capacity ({selectedRoom.maxCapacity}) is less than attendee count ({attendeeIds.length})
          </p>
        )}
      </div>

      <div>
        <label className={labelCls()}>
          <MapPin className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
          Location
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>
        <input
          className={inputCls()}
          value={String(payload.location ?? '')}
          onChange={e => onChange({ ...payload, location: e.target.value || null })}
        />
      </div>

      {members.length > 0 && (
        <div>
          <label className={labelCls()}>
            <Users className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Attendees
          </label>
          <MemberPicker
            selected={attendeeIds}
            members={members}
            onChange={ids => onChange({ ...payload, attendeeIds: ids })}
          />
        </div>
      )}
    </div>
  )
}

function EventForm({
  payload,
  members,
  tz,
  onChange,
}: {
  payload: Record<string, unknown>
  members: Member[]
  tz: string
  onChange: (p: Record<string, unknown>) => void
}) {
  const startUnix = payload.startAt as number | undefined
  const endUnix = payload.endAt as number | undefined
  const startDate = unixToLocalDate(startUnix, tz)
  const startTime = unixToLocalTime(startUnix, tz)
  const endTime = unixToLocalTime(endUnix, tz)
  const attendeeIds = (payload.attendeeIds as string[] | undefined) ?? []

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 px-2.5 py-2.5">
      <div>
        <label className={labelCls()}>Title</label>
        <input
          className={inputCls()}
          value={String(payload.title ?? '')}
          onChange={e => onChange({ ...payload, title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls()}>
            <Calendar className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Date
          </label>
          <input
            type="date"
            className={inputCls()}
            value={startDate}
            onChange={e => {
              const newStart = localToUnix(e.target.value, startTime || '09:00', tz)
              const newEnd = endTime
                ? localToUnix(e.target.value, endTime, tz)
                : newStart != null
                  ? newStart + 3_600_000
                  : undefined
              onChange({ ...payload, startAt: newStart, endAt: newEnd })
            }}
          />
        </div>
        <div>
          <label className={labelCls()}>
            <Clock className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Start time
          </label>
          <input
            type="time"
            className={inputCls()}
            value={startTime}
            onChange={e => onChange({ ...payload, startAt: localToUnix(startDate, e.target.value, tz) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls()}>
            <MapPin className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Location
            <span className="ml-1 font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className={inputCls()}
            value={String(payload.location ?? '')}
            onChange={e => onChange({ ...payload, location: e.target.value || null })}
          />
        </div>
        <div>
          <label className={labelCls()}>
            <Clock className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            End time
          </label>
          <input
            type="time"
            className={inputCls()}
            value={endTime}
            onChange={e => onChange({ ...payload, endAt: localToUnix(startDate, e.target.value, tz) })}
          />
        </div>
      </div>

      {members.length > 0 && (
        <div>
          <label className={labelCls()}>
            <Users className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Attendees
            <span className="ml-1 font-normal text-slate-400">(optional)</span>
          </label>
          <MemberPicker
            selected={attendeeIds}
            members={members}
            onChange={ids => onChange({ ...payload, attendeeIds: ids })}
          />
        </div>
      )}
    </div>
  )
}

function TaskForm({
  payload,
  members,
  onChange,
}: {
  payload: Record<string, unknown>
  members: Member[]
  onChange: (p: Record<string, unknown>) => void
}) {
  const dueUnix = payload.dueDate as number | string | null | undefined
  const dueDate = typeof dueUnix === 'string' ? dueUnix : unixToLocalDate(dueUnix as number | null)
  const assigneeId = (payload.assigneeId as string | undefined) ?? ''

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 px-2.5 py-2.5">
      <div>
        <label className={labelCls()}>Title</label>
        <input
          className={inputCls()}
          value={String(payload.title ?? '')}
          onChange={e => onChange({ ...payload, title: e.target.value })}
        />
      </div>

      <div>
        <label className={labelCls()}>
          Description
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={2}
          className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
          value={String(payload.description ?? '')}
          onChange={e => onChange({ ...payload, description: e.target.value || null })}
        />
      </div>

      <div>
        <label className={labelCls()}>
          <Calendar className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
          Due date
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>
        <input
          type="date"
          className={inputCls()}
          value={dueDate}
          onChange={e => onChange({ ...payload, dueDate: e.target.value || null })}
        />
      </div>

      {members.length > 0 && (
        <div>
          <label className={labelCls()}>
            <Users className="mb-0.5 mr-0.5 inline size-3 text-slate-400" />
            Assignee
            <span className="ml-1 font-normal text-slate-400">(optional)</span>
          </label>
          <select
            className={inputCls()}
            value={assigneeId}
            onChange={e => onChange({ ...payload, assigneeId: e.target.value || null })}
          >
            <option value="">— Unassigned —</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function WikiForm({
  payload,
  onChange,
}: {
  payload: Record<string, unknown>
  onChange: (p: Record<string, unknown>) => void
}) {
  return (
    <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2.5">
      <label className={labelCls()}>Title</label>
      <input
        className={inputCls()}
        value={String(payload.title ?? '')}
        onChange={e => onChange({ ...payload, title: e.target.value })}
      />
    </div>
  )
}

type CardState = 'idle' | 'confirming' | 'done' | 'rejected' | 'superseded'

export function ProposedActionCard({
  action,
  onConfirm,
  onReject,
  onStatusChange,
}: {
  action: AiProposedAction
  onConfirm: (action: AiProposedAction) => Promise<void>
  onReject: (action: AiProposedAction) => void
  onStatusChange?: (status: 'confirmed' | 'rejected', editedAction: AiProposedAction) => void
}) {
  const token = useAuthStore(s => s.token)
  const currentOrg = useAuthStore(s => s.currentOrg)
  const [tz] = useState(browserTimezone)

  const [cardState, setCardState] = useState<CardState>(
    action.status === 'confirmed' ? 'done'
    : action.status === 'rejected' ? 'rejected'
    : action.status === 'superseded' ? 'superseded'
    : 'idle',
  )
  const [members, setMembers] = useState<Member[]>([])
  const [rooms, setRooms] = useState<OfficeRoom[]>([])
  const [payload, setPayload] = useState<Record<string, unknown>>(() =>
    normalisePayload({ ...action.payload }),
  )

  useEffect(() => {
    if (action.status === 'confirmed') setCardState('done')
    else if (action.status === 'rejected') setCardState('rejected')
    else if (action.status === 'superseded') setCardState('superseded')
    else setCardState('idle')
    setPayload(normalisePayload({ ...action.payload }))
  }, [action])

  const Icon = ACTION_ICONS[action.type]
  const needsMembers =
    action.type === 'CREATE_EVENT' ||
    action.type === 'CREATE_MEETING' ||
    action.type === 'BOOK_ROOM' ||
    action.type === 'CREATE_TASK'

  useEffect(() => {
    if (!token || !currentOrg || !needsMembers) return
    orgApi
      .listMembers(currentOrg.id, token)
      .then(res => {
        setMembers(res.members)

        if (action.type === 'CREATE_MEETING' || action.type === 'BOOK_ROOM') {
          const names = (action.payload.attendeeNames as string[] | undefined) ?? []
          if (names.length > 0) {
            const matched = names.flatMap(name => {
              const m = res.members.find(
                mb =>
                  mb.displayName.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(mb.displayName.toLowerCase()),
              )
              return m ? [m.id] : []
            })
            if (matched.length > 0) {
              setPayload(prev => ({ ...prev, attendeeIds: matched }))
            }
          }
        }

        if (action.type === 'CREATE_TASK') {
          const assigneeName = action.payload.assignee as string | undefined
          if (assigneeName) {
            const m = res.members.find(
              mb =>
                mb.displayName.toLowerCase().includes(assigneeName.toLowerCase()) ||
                assigneeName.toLowerCase().includes(mb.displayName.toLowerCase()),
            )
            if (m) setPayload(prev => ({ ...prev, assigneeId: m.id }))
          }
        }
      })
      .catch(_err => { /* member fetch is best-effort */ })
  }, [token, currentOrg, action, needsMembers])

  useEffect(() => {
    if (!token || (action.type !== 'CREATE_MEETING' && action.type !== 'BOOK_ROOM')) return
    officeApi
      .listRooms(token)
      .then(data => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]))
  }, [token, action.type])

  async function handleConfirm() {
    setCardState('confirming')
    try {
      const editedAction = { ...action, payload }
      await onConfirm(editedAction)
      setCardState('done')
      onStatusChange?.('confirmed', editedAction)
    } catch {
      setCardState('idle')
    }
  }

  function handleReject() {
    setCardState('rejected')
    onReject(action)
    onStatusChange?.('rejected', action)
  }

  if (cardState === 'superseded') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
        <Icon className="size-3 shrink-0" />
        <span>{ACTION_LABELS[action.type]} — proposal updated</span>
      </div>
    )
  }

  if (cardState === 'done') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <Check className="size-4 shrink-0" />
        <span className="font-medium">{ACTION_LABELS[action.type]} — created</span>
      </div>
    )
  }

  if (cardState === 'rejected') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        <X className="size-4 shrink-0" />
        <span>{ACTION_LABELS[action.type]} — declined</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <Icon className="size-3.5" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          {ACTION_LABELS[action.type]}
        </p>
      </div>

      {(action.type === 'CREATE_MEETING' || action.type === 'BOOK_ROOM') && (
        <MeetingForm payload={payload} members={members} rooms={rooms} tz={tz} onChange={setPayload} />
      )}
      {action.type === 'CREATE_EVENT' && (
        <EventForm payload={payload} members={members} tz={tz} onChange={setPayload} />
      )}
      {action.type === 'CREATE_TASK' && (
        <TaskForm payload={payload} members={members} onChange={setPayload} />
      )}
      {(action.type === 'CREATE_WIKI_PAGE' || action.type === 'EDIT_WIKI_PAGE') && (
        <WikiForm payload={payload} onChange={setPayload} />
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          disabled={cardState === 'confirming'}
          onClick={() => void handleConfirm()}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
        >
          {cardState === 'confirming' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Confirm
        </button>
        <button
          type="button"
          disabled={cardState === 'confirming'}
          onClick={handleReject}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <X className="size-3.5" />
          Decline
        </button>
      </div>
    </div>
  )
}
