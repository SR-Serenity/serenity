import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarItemType } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarView } from './calendar-types'
import { formatHeaderTitle } from './calendar-utils'

export function CalendarToolbar({
  anchorDate,
  view,
  visibleItemsLabel,
  onCreate,
  onToday,
  onShift,
  onViewChange,
}: {
  anchorDate: Date
  view: CalendarView
  visibleItemsLabel: string
  onCreate: (type: CalendarItemType) => void
  onToday: () => void
  onShift: (direction: number) => void
  onViewChange: (view: CalendarView) => void
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button className="h-9 rounded-lg bg-blue-600 px-3 hover:bg-blue-700" onClick={() => onCreate('MEETING')}>
          <Plus className="size-4" />
          Create
        </Button>
        <Button variant="outline" size="sm" className="rounded-lg border-slate-200 bg-white" onClick={onToday}>
          Today
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => onShift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => onShift(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-slate-950">{formatHeaderTitle(anchorDate, view)}</h1>
          <p className="text-xs text-slate-500">{visibleItemsLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
        {(['day', 'week', 'month'] as CalendarView[]).map(option => (
          <button
            key={option}
            className={cn(
              'h-8 rounded-md px-3 text-sm font-medium capitalize transition-all',
              view === option ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/70',
            )}
            onClick={() => onViewChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </header>
  )
}
