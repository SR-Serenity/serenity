import { cn } from '@/lib/utils'

export function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

export function parseDateKey(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function sameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function calendarDateTone({
  date,
  selectedDate,
  today = new Date(),
}: {
  date: Date
  selectedDate: Date
  today?: Date
}) {
  const selected = sameCalendarDay(date, selectedDate)
  const current = sameCalendarDay(date, today)

  return {
    selected,
    current,
    dateKey: toDateKey(date),
  }
}

export function datePillClassName({
  selected,
  current,
  inMonth = true,
  size = 'md',
}: {
  selected: boolean
  current: boolean
  inMonth?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-all',
    size === 'sm' && 'size-7 text-xs',
    size === 'md' && 'size-8 text-sm',
    size === 'lg' && 'size-9 text-base',
    inMonth ? 'text-slate-700' : 'text-slate-300',
    current && !selected && 'bg-red-500 text-white shadow-sm shadow-red-500/20',
    selected && 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 ring-2 ring-blue-100',
  )
}
