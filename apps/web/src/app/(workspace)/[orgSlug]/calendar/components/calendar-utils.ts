import type { MouseEvent as ReactMouseEvent } from 'react'
import type {
  CalendarItem,
  CalendarItemType,
  CreateCalendarItemInput,
  Member,
} from '@serenity/api'
import { toDateKey } from '@/app/(workspace)/components/calendar-date-helpers'
import type { CalendarForm, CalendarView, PopoverPosition } from './calendar-types'

export const typeLabels: Record<CalendarItemType, string> = {
  EVENT: 'Event',
  MEETING: 'Meeting',
  TASK: 'Task',
}

export const typeStyles: Record<CalendarItemType, string> = {
  EVENT: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
  MEETING: 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
  TASK: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
}

export const EMPTY_MEMBERS: Member[] = []
export const hourRows = Array.from({ length: 15 }, (_, index) => index + 6)
export const hourHeight = 72
export const firstSlot = hourRows[0] * 2
export const lastSlot = (hourRows[hourRows.length - 1] + 1) * 2

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toDateInput(date: Date) {
  return toDateKey(date)
}

export function toTimeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function timeFromSlot(slot: number) {
  const hour = Math.floor(slot / 2)
  const minutes = slot % 2 === 0 ? 0 : 30
  return `${pad(hour)}:${pad(minutes)}`
}

export function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatSlotLabel(slot: number) {
  const date = new Date()
  date.setHours(Math.floor(slot / 2), slot % 2 === 0 ? 0 : 30, 0, 0)
  return formatTimeLabel(date)
}

export function pointerPosition(event?: ReactMouseEvent<HTMLElement>): PopoverPosition {
  const popoverWidth = 380
  const popoverHeight = 560
  const margin = 16
  const maxX = Math.max(margin, window.innerWidth - popoverWidth - margin)
  const maxY = Math.max(margin, window.innerHeight - popoverHeight - margin)

  if (!event) return { x: Math.min(maxX, 360), y: 88 }

  const preferredX = event.clientX + 12
  const preferredY = event.clientY + popoverHeight + margin > window.innerHeight
    ? event.clientY - popoverHeight - margin
    : event.clientY - 18

  return {
    x: Math.min(Math.max(margin, preferredX), maxX),
    y: Math.min(Math.max(margin, preferredY), maxY),
  }
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -startOfDay(date).getDay())
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonthGrid(date: Date) {
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return addDays(monthEnd, 6 - monthEnd.getDay())
}

export function itemDate(item: CalendarItem) {
  return new Date(item.startAt ?? item.dueDate ?? item.createdAt)
}

export function formatHeaderTitle(anchor: Date, view: CalendarView) {
  if (view === 'month') return anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  if (view === 'day') return anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const start = startOfWeek(anchor)
  const end = addDays(start, 6)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function combineDateTime(date: string, time: string) {
  if (!date || !time) return null
  return new Date(`${date}T${time}`).toISOString()
}

export function emptyForm(date = new Date()): CalendarForm {
  return {
    id: null,
    type: 'MEETING',
    visibility: 'COMPANY',
    title: '',
    descriptionMarkdown: '',
    location: '',
    date: toDateInput(date),
    startTime: '09:00',
    endTime: '10:00',
    allDay: false,
    taskStatus: 'TODO',
    attendeeIds: [],
  }
}

export function formFromItem(item: CalendarItem): CalendarForm {
  const sourceDate = itemDate(item)
  const start = item.startAt ? new Date(item.startAt) : sourceDate
  const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + 60 * 60 * 1000)

  return {
    id: item.id,
    type: item.type,
    visibility: item.visibility,
    title: item.title,
    descriptionMarkdown: item.descriptionMarkdown ?? '',
    location: item.location ?? '',
    date: toDateInput(sourceDate),
    startTime: item.startAt ? toTimeInput(start) : '09:00',
    endTime: item.endAt ? toTimeInput(end) : '10:00',
    allDay: item.allDay,
    taskStatus: item.taskStatus ?? 'TODO',
    attendeeIds: item.attendees.map(attendee => attendee.userId),
  }
}

export function buildInput(form: CalendarForm): CreateCalendarItemInput {
  const scheduled = form.type !== 'TASK' || !form.allDay
  const startAt = scheduled ? combineDateTime(form.date, form.startTime) : null
  const endAt = scheduled ? combineDateTime(form.date, form.endTime) : null

  return {
    type: form.type,
    visibility: form.visibility,
    title: form.title.trim(),
    descriptionMarkdown: form.descriptionMarkdown.trim() || null,
    location: form.location.trim() || null,
    startAt,
    endAt,
    allDay: form.allDay,
    taskStatus: form.type === 'TASK' ? form.taskStatus : null,
    dueDate: form.type === 'TASK' ? new Date(`${form.date}T00:00`).toISOString() : null,
    attendeeIds: form.type === 'TASK' ? [] : form.attendeeIds,
  }
}

export function eventPosition(item: CalendarItem) {
  if (!item.startAt) return { top: 0, height: hourHeight }
  const start = new Date(item.startAt)
  const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + 60 * 60 * 1000)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const top = Math.max(0, (startHour - hourRows[0]) * hourHeight)
  const height = Math.max(32, (endHour - startHour) * hourHeight)
  return { top, height }
}
