import type { MouseEvent as ReactMouseEvent } from 'react'
import { Clock } from 'lucide-react'
import type { CalendarItem } from '@serenity/api'
import { cn } from '@/lib/utils'
import { typeStyles } from './calendar-utils'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-label="Google Calendar">
      <path d="M3.5 8a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" fill="white" fillOpacity=".8" />
      <path d="M8 3.8a4.2 4.2 0 0 1 3.36 1.68l-1.26 1.05A2.63 2.63 0 0 0 8 5.37a2.63 2.63 0 0 0-2.63 2.63c0 .44.11.86.31 1.22L4.33 10.5A4.2 4.2 0 0 1 3.8 8 4.2 4.2 0 0 1 8 3.8Z" fill="#4285F4" />
      <path d="M11.8 8c0-.18-.02-.36-.04-.53l-3.76.01v1.5h2.16a1.84 1.84 0 0 1-.8 1.21l1.24.96A4.2 4.2 0 0 0 11.8 8Z" fill="#34A853" />
      <path d="M5.68 9.22A2.63 2.63 0 0 1 5.37 8c0-.43.1-.84.3-1.2L4.32 5.5A4.2 4.2 0 0 0 3.8 8c0 .67.16 1.3.44 1.87l1.44-1.12-.01-.53Z" fill="#FBBC05" />
      <path d="M8 12.2a4.2 4.2 0 0 1-2.6-.9l-1.25.97A5.6 5.6 0 0 0 8 13.8a4.2 4.2 0 0 0 3.6-2.02l-1.24-.96A2.63 2.63 0 0 1 8 12.2Z" fill="#EA4335" />
    </svg>
  )
}

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
      <div className="flex items-center gap-1 min-w-0">
        {item.googleEventId && <GoogleIcon className="size-3 shrink-0" />}
        <span className="truncate">{item.title}</span>
      </div>
      {!compact && start && (
        <div className="mt-1 flex items-center gap-1 opacity-75">
          <Clock className="size-3" />
          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
