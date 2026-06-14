import type { MouseEvent as ReactMouseEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { CalendarItem, CalendarItemType } from '@serenity/api'
import { cn } from '@/lib/utils'
import {
  calendarDateTone,
  datePillClassName,
  sameCalendarDay,
} from '@/app/(workspace)/components/calendar-date-helpers'
import { itemDate } from './calendar-utils'
import { EventChip } from './event-chip'

export type TaskDeadline = {
  id: string
  title: string
  dueDate: string
  done: boolean
}

export function MonthCalendar({
  anchorDate,
  selectedDate,
  days,
  items,
  taskDeadlines = [],
  onCreate,
  onEdit,
}: {
  anchorDate: Date
  selectedDate: Date
  days: Date[]
  items: CalendarItem[]
  taskDeadlines?: TaskDeadline[]
  onCreate: (type: CalendarItemType, date?: Date, event?: ReactMouseEvent<HTMLElement>) => void
  onEdit: (item: CalendarItem, event?: ReactMouseEvent<HTMLElement>) => void
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 grid-cols-7 grid-rows-6 overflow-auto">
        {days.map(day => {
          const dayItems = items.filter(item => sameCalendarDay(itemDate(item), day))
          const dayTasks = taskDeadlines.filter(task =>
            sameCalendarDay(new Date(task.dueDate), day),
          )
          const inMonth = day.getMonth() === anchorDate.getMonth()
          const { selected, current } = calendarDateTone({ date: day, selectedDate })
          return (
            <button
              key={day.toISOString()}
              className={cn(
                'min-h-32 border-b border-r border-slate-200 p-2 text-left align-top transition-colors hover:bg-blue-50/30',
                !inMonth && 'bg-slate-50 text-slate-400',
                selected && 'bg-blue-50/60 hover:bg-blue-50',
              )}
              onClick={(event) => onCreate('EVENT', day, event)}
            >
              <div className="mb-2">
                <span className={datePillClassName({ selected, current, inMonth, size: 'sm' })}>{day.getDate()}</span>
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 4).map(item => <EventChip key={item.id} item={item} compact onEdit={onEdit} />)}
                {dayItems.length > 4 && <p className="text-xs font-medium text-slate-500">+{dayItems.length - 4} more</p>}
                {dayTasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    title={`Task due: ${task.title}`}
                    className={cn(
                      'flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-xs',
                      task.done
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    <CheckCircle2 className="size-3 shrink-0" />
                    <span className={cn('truncate', task.done && 'line-through')}>{task.title}</span>
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <p className="text-xs font-medium text-amber-600">+{dayTasks.length - 2} task(s)</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
