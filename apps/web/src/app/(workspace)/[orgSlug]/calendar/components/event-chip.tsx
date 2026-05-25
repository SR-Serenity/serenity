import type { MouseEvent as ReactMouseEvent } from 'react'
import { Clock } from 'lucide-react'
import type { CalendarItem } from '@serenity/api'
import { cn } from '@/lib/utils'
import { typeStyles } from './calendar-utils'

export function EventChip({
  item,
  compact,
  fill,
  onEdit,
}: {
  item: CalendarItem
  compact?: boolean
  fill?: boolean
  onEdit: (item: CalendarItem, event?: ReactMouseEvent<HTMLElement>) => void
}) {
  const start = item.startAt ? new Date(item.startAt) : null

  return (
    <div
      className={cn(
        'w-full rounded-md border px-2 py-1 text-xs font-medium shadow-sm transition-all hover:-translate-y-px hover:shadow-md',
        typeStyles[item.type],
        fill && 'h-full overflow-hidden',
        item.type === 'TASK' && item.taskStatus === 'DONE' && 'opacity-60 line-through',
      )}
      onClick={(event) => {
        event.stopPropagation()
        onEdit(item, event)
      }}
    >
      <div className="truncate">{item.title}</div>
      {!compact && start && (
        <div className="mt-1 flex items-center gap-1 opacity-75">
          <Clock className="size-3" />
          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
