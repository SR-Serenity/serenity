export type CalendarItemType = 'EVENT' | 'MEETING' | 'TASK'
export type CalendarVisibility = 'COMPANY' | 'PERSONAL'
export type CalendarTaskStatus = 'TODO' | 'DONE'

export interface CalendarAttendee {
  userId: string
  displayName: string
  email: string
}

export interface CalendarItem {
  id: string
  type: CalendarItemType
  visibility: CalendarVisibility
  title: string
  descriptionMarkdown: string | null
  location: string | null
  startAt: string | null
  endAt: string | null
  allDay: boolean
  taskStatus: CalendarTaskStatus | null
  dueDate: string | null
  createdById: string
  attendees: CalendarAttendee[]
  createdAt: string
  updatedAt: string
}

export interface ListCalendarItemsInput {
  from?: string
  to?: string
  visibility?: CalendarVisibility
  type?: CalendarItemType
}

export interface ListCalendarItemsResponse {
  items: CalendarItem[]
}

export interface CreateCalendarItemInput {
  type: CalendarItemType
  visibility: CalendarVisibility
  title: string
  descriptionMarkdown?: string | null
  location?: string | null
  startAt?: string | null
  endAt?: string | null
  allDay?: boolean
  taskStatus?: CalendarTaskStatus | null
  dueDate?: string | null
  attendeeIds?: string[]
}

export type UpdateCalendarItemInput = Partial<CreateCalendarItemInput>

export interface DeleteCalendarItemResponse {
  success: boolean
}
