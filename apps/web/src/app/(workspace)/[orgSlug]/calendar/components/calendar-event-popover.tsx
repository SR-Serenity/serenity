import dynamic from 'next/dynamic'
import type { CSSProperties, Dispatch, SetStateAction } from 'react'
import { Clock, Loader2, MapPin, Trash2, Users, X } from 'lucide-react'
import type {
  CalendarItemType,
  CalendarVisibility,
  Member,
} from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { cn } from '@/lib/utils'
import type { CalendarForm, PopoverPosition } from './calendar-types'
import { typeLabels } from './calendar-utils'

const DescriptionEditor = dynamic(
  () => import('./calendar-description-editor').then(mod => mod.CalendarDescriptionEditor),
  { ssr: false },
)

export function CalendarEventPopover({
  form,
  setForm,
  members,
  position,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  form: CalendarForm
  setForm: Dispatch<SetStateAction<CalendarForm>>
  members: Member[]
  position: PopoverPosition
  saving: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const showAttendees = form.type !== 'TASK'
  const style = {
    left: position.x,
    top: position.y,
  } satisfies CSSProperties

  return (
    <div
      className="fixed z-30 flex max-h-[min(680px,calc(100vh-32px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15 animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
      style={style}
      onClick={event => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['EVENT', 'MEETING', 'TASK'] as CalendarItemType[]).map(type => (
            <button
              key={type}
              type="button"
              className={cn(
                'h-7 rounded-md px-2.5 text-xs font-medium transition-all',
                form.type === type ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/70',
              )}
              onClick={() => setForm(current => ({
                ...current,
                type,
                allDay: type === 'TASK' ? true : current.allDay,
                attendeeIds: type === 'TASK' ? [] : current.attendeeIds,
              }))}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" className="rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        <div className="space-y-3">
          <Input
            value={form.title}
            onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
            placeholder="Title"
            className="h-10 rounded-lg border-slate-200 bg-slate-50 text-base font-semibold text-slate-950 placeholder:text-slate-400 focus-visible:bg-white"
          />

          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Clock className="size-4 shrink-0 text-slate-400" />
              <Input className="h-8 rounded-md border-transparent bg-slate-50 px-2 text-slate-900 shadow-none" type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} />
            </div>
            {!form.allDay && (
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 pl-6">
                <Input className="h-8 rounded-md border-transparent bg-slate-50 px-2 text-slate-900 shadow-none" type="time" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} />
                <span className="text-xs text-slate-400">to</span>
                <Input className="h-8 rounded-md border-transparent bg-slate-50 px-2 text-slate-900 shadow-none" type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} />
              </div>
            )}
            <label className="mt-2 flex items-center gap-2 pl-6 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={event => setForm(current => ({ ...current, allDay: event.target.checked }))}
              />
              All day
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            {(['COMPANY', 'PERSONAL'] as CalendarVisibility[]).map(visibility => (
              <button
                key={visibility}
                type="button"
                className={cn(
                  'h-8 rounded-md text-xs font-medium transition-all',
                  form.visibility === visibility ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/70',
                )}
                onClick={() => setForm(current => ({ ...current, visibility }))}
              >
                {visibility === 'COMPANY' ? 'Company' : 'Personal'}
              </button>
            ))}
          </div>

          {form.type === 'TASK' ? (
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.taskStatus === 'DONE'}
                onChange={event => setForm(current => ({ ...current, taskStatus: event.target.checked ? 'DONE' : 'TODO' }))}
              />
              Completed
            </label>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
              <MapPin className="size-4 shrink-0 text-slate-400" />
              <Input className="h-8 border-transparent bg-transparent px-0 text-sm text-slate-900 shadow-none focus-visible:ring-0" value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} placeholder="Location or conferencing link" />
            </div>
          )}

          {showAttendees && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase text-slate-500"><Users className="size-4 text-slate-400" /> Attendees</p>
              <div className="max-h-32 overflow-auto rounded-lg border border-slate-200 bg-white">
                {members.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No members loaded.</p>
                ) : members.map(member => (
                  <label key={member.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={form.attendeeIds.includes(member.id)}
                      onChange={event => setForm(current => ({
                        ...current,
                        attendeeIds: event.target.checked
                          ? [...current.attendeeIds, member.id]
                          : current.attendeeIds.filter(id => id !== member.id),
                      }))}
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{member.displayName}</span>
                      <span className="block truncate text-xs text-slate-500">{member.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">Description</p>
            <DescriptionEditor
              key={form.id ?? 'new'}
              value={form.descriptionMarkdown}
              onChange={value => setForm(current => ({ ...current, descriptionMarkdown: value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3">
        {form.id ? (
          <Button variant="ghost" className="h-8 rounded-lg px-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete} disabled={saving}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 rounded-lg border-slate-200 bg-white px-3" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="h-8 rounded-lg bg-blue-600 px-3 hover:bg-blue-700" onClick={onSave} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
