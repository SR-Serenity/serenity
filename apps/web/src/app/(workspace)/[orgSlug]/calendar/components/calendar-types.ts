import type {
  CalendarItemType,
  CalendarTaskStatus,
  CalendarVisibility,
} from '@serenity/api'

export type CalendarView = 'week' | 'month' | 'day'
export type TypeFilter = CalendarItemType | 'ALL'
export type VisibilityFilter = CalendarVisibility | 'ALL'
export type CalendarRange = { from: Date; to: Date }
export type PopoverPosition = { x: number; y: number }
export type DraftSelection = {
  dayIndex: number
  startSlot: number
  endSlot: number
}

export type CalendarForm = {
  id: string | null
  type: CalendarItemType
  visibility: CalendarVisibility
  title: string
  descriptionMarkdown: string
  location: string
  roomId: string | null
  wikiPageId: string | null
  createMeetingNotes: boolean
  date: string
  startTime: string
  endTime: string
  allDay: boolean
  taskStatus: CalendarTaskStatus
  attendeeIds: string[]
}
