import { useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { CalendarItem, CalendarItemType } from '@serenity/api'
import { cn } from '@/lib/utils'
import {
  calendarDateTone,
  datePillClassName,
  sameCalendarDay,
} from '@/app/(workspace)/components/calendar-date-helpers'
import {
  eventPosition,
  firstSlot,
  formatSlotLabel,
  formatTimeLabel,
  hourHeight,
  hourRows,
  itemDate,
  lastSlot,
} from './calendar-utils'
import type { DraftSelection } from './calendar-types'
import { EventChip } from './event-chip'

export function TimeGridCalendar({
  selectedDate,
  days,
  items,
  onCreate,
  onCreateRange,
  onEdit,
}: {
  selectedDate: Date
  days: Date[]
  items: CalendarItem[]
  onCreate: (type: CalendarItemType, date?: Date, event?: ReactMouseEvent<HTMLElement>) => void
  onCreateRange: (day: Date, startSlot: number, endSlot: number, event?: ReactMouseEvent<HTMLElement>) => void
  onEdit: (item: CalendarItem, event?: ReactMouseEvent<HTMLElement>) => void
}) {
  const [selection, setSelection] = useState<DraftSelection | null>(null)
  const now = new Date()
  const showNow = days.some(day => sameCalendarDay(day, now)) && now.getHours() >= hourRows[0] && now.getHours() <= hourRows[hourRows.length - 1]
  const nowTop = ((now.getHours() + now.getMinutes() / 60) - hourRows[0]) * hourHeight
  const template = `64px repeat(${days.length}, minmax(150px, 1fr))`

  function slotFromPointer(hour: number, event: ReactMouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const half = event.clientY - rect.top > rect.height / 2 ? 1 : 0
    return hour * 2 + half
  }

  function startSelection(dayIndex: number, hour: number, event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault()
    const slot = slotFromPointer(hour, event)
    setSelection({ dayIndex, startSlot: slot, endSlot: slot + 1 })
  }

  function updateSelection(dayIndex: number, hour: number, event: ReactMouseEvent<HTMLElement>) {
    if (!selection || selection.dayIndex !== dayIndex) return
    const slot = slotFromPointer(hour, event)
    setSelection(current => current && current.dayIndex === dayIndex ? { ...current, endSlot: slot + 1 } : current)
  }

  function finishSelection(day: Date, event: ReactMouseEvent<HTMLElement>) {
    if (!selection) return
    const start = Math.min(selection.startSlot, selection.endSlot)
    const end = Math.max(selection.startSlot, selection.endSlot)
    onCreateRange(day, start, end <= start ? start + 2 : end, event)
    setSelection(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid shrink-0 border-b border-slate-200 bg-white" style={{ gridTemplateColumns: template }}>
        <div className="border-r border-slate-200 px-2 py-3 text-xs font-medium text-slate-400">GMT+7</div>
        {days.map(day => {
          const { selected, current } = calendarDateTone({ date: day, selectedDate, today: now })
          return (
            <button
              key={day.toISOString()}
              className={cn(
                'border-r border-slate-200 px-3 py-3 text-left transition-colors last:border-r-0 hover:bg-slate-50',
                selected && 'bg-blue-50/60 hover:bg-blue-50',
              )}
              onClick={(event) => onCreate('EVENT', day, event)}
            >
              <p className={cn('text-xs font-medium uppercase', selected ? 'text-blue-700' : 'text-slate-500')}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={datePillClassName({ selected, current, size: 'md' })}>{day.getDate()}</span>
                <span className={cn('text-xs', selected ? 'text-blue-600' : 'text-slate-400')}>{day.toLocaleDateString('en-US', { month: 'short' })}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid shrink-0 border-b border-slate-200 bg-slate-50" style={{ gridTemplateColumns: template }}>
        <div className="border-r border-slate-200 px-2 py-2 text-xs font-medium text-slate-500">All-day</div>
        {days.map(day => (
          <div key={day.toISOString()} className={cn('min-h-12 border-r border-slate-200 p-1 last:border-r-0', sameCalendarDay(day, selectedDate) && 'bg-blue-50/40')}>
            {items.filter(item => sameCalendarDay(itemDate(item), day) && (item.allDay || !item.startAt)).slice(0, 3).map(item => (
              <EventChip key={item.id} item={item} compact onEdit={onEdit} />
            ))}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: template, height: hourRows.length * hourHeight }}
          onMouseLeave={() => setSelection(null)}
        >
          {hourRows.map((hour, index) => (
            <div key={`time-${hour}`} className="contents">
              <div className="border-r border-slate-200 pr-2 pt-1 text-right text-xs font-medium text-slate-400" style={{ gridColumn: 1, gridRow: index + 1 }}>{hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</div>
              {days.map((day, dayIndex) => (
                <div
                  role="button"
                  tabIndex={0}
                  key={`${day.toISOString()}-${hour}`}
                  className={cn(
                    'cursor-crosshair border-r border-t border-slate-100 text-left transition-colors hover:bg-blue-50/30 last:border-r-0',
                    sameCalendarDay(day, selectedDate) && 'bg-blue-50/20',
                  )}
                  style={{ gridColumn: dayIndex + 2, gridRow: index + 1 }}
                  onMouseDown={(event) => startSelection(dayIndex, hour, event)}
                  onMouseMove={(event) => updateSelection(dayIndex, hour, event)}
                  onMouseUp={(event) => finishSelection(day, event)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    const next = new Date(day)
                    next.setHours(hour, 0, 0, 0)
                    onCreate('MEETING', next)
                  }}
                />
              ))}
            </div>
          ))}

          {days.map((day, dayIndex) => (
            <div key={`events-${day.toISOString()}`} className="pointer-events-none relative" style={{ gridColumn: dayIndex + 2, gridRow: `1 / span ${hourRows.length}` }}>
              {items.filter(item => sameCalendarDay(itemDate(item), day) && item.startAt && !item.allDay).map(item => {
                const position = eventPosition(item)
                return (
                  <button key={item.id} className="pointer-events-auto absolute left-1 right-1 text-left" style={{ top: position.top, height: position.height }} onClick={(event) => onEdit(item, event)}>
                    <EventChip item={item} fill onEdit={onEdit} />
                  </button>
                )
              })}
              {selection?.dayIndex === dayIndex && (
                <DraftSelectionBlock selection={selection} />
              )}
            </div>
          ))}

          {showNow && (
            <div className="pointer-events-none absolute left-16 right-0 z-10 h-0.5 bg-blue-600" style={{ top: nowTop }}>
              <span className="absolute -left-14 top-1/2 -translate-y-1/2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">{formatTimeLabel(now)}</span>
              <span className="absolute -left-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-blue-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DraftSelectionBlock({ selection }: { selection: DraftSelection }) {
  const start = Math.min(selection.startSlot, selection.endSlot)
  const end = Math.max(selection.startSlot, selection.endSlot)
  const top = ((start - firstSlot) / 2) * hourHeight
  const height = Math.max(36, ((end - start) / 2) * hourHeight)

  return (
    <div className="absolute left-1 right-1 z-20 rounded-lg border border-blue-300 bg-blue-100/80 px-2 py-1 text-xs font-semibold text-blue-800 shadow-sm" style={{ top, height }}>
      {formatSlotLabel(start)} - {formatSlotLabel(end)}
    </div>
  )
}
