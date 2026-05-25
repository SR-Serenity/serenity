import { api } from './client'
import type {
  CalendarItem,
  CreateCalendarItemInput,
  DeleteCalendarItemResponse,
  ListCalendarItemsInput,
  ListCalendarItemsResponse,
  UpdateCalendarItemInput,
} from '../types/calendar'

function queryString(input: ListCalendarItemsInput = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value) {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const calendarApi = {
  listItems: async (
    token: string,
    input?: ListCalendarItemsInput,
  ): Promise<ListCalendarItemsResponse> => {
    return api.get(`calendar/items${queryString(input)}`, { token })
  },

  createItem: async (
    token: string,
    input: CreateCalendarItemInput,
  ): Promise<CalendarItem> => {
    return api.post('calendar/items', { token, body: input })
  },

  updateItem: async (
    token: string,
    itemId: string,
    input: UpdateCalendarItemInput,
  ): Promise<CalendarItem> => {
    return api.patch(`calendar/items/${itemId}`, { token, body: input })
  },

  deleteItem: async (
    token: string,
    itemId: string,
  ): Promise<DeleteCalendarItemResponse> => {
    return api.delete(`calendar/items/${itemId}`, { token })
  },
}
