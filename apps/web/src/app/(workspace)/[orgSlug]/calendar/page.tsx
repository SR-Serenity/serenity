'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { Loader2 } from 'lucide-react'
import { calendarApi, wikiApi } from '@serenity/api'
import type {
  CalendarItem,
  CalendarItemType,
  UpdateCalendarItemInput,
} from '@serenity/api'
import { parseDateKey } from '@/app/(workspace)/components/calendar-date-helpers'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { CalendarEventPopover } from './components/calendar-event-popover'
import { CalendarToolbar } from './components/calendar-toolbar'
import { MonthCalendar } from './components/month-calendar'
import { TimeGridCalendar } from './components/time-grid-calendar'
import type {
  CalendarRange,
  CalendarView,
  PopoverPosition,
  TypeFilter,
  VisibilityFilter,
} from './components/calendar-types'
import {
  addDays,
  buildInput,
  EMPTY_MEMBERS,
  emptyForm,
  endOfMonthGrid,
  firstSlot,
  formFromItem,
  itemDate,
  lastSlot,
  pointerPosition,
  startOfDay,
  startOfMonth,
  startOfWeek,
  timeFromSlot,
} from './components/calendar-utils'

export default function CalendarPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token, currentOrg } = useAuthStore(
    useShallow(state => ({ token: state.token, currentOrg: state.currentOrg })),
  )
  const orgId = currentOrg?.id
  const { members, loadMembers } = useWorkspaceStore(
    useShallow(state => ({
      members: orgId ? state.membersByOrgId[orgId] ?? EMPTY_MEMBERS : EMPTY_MEMBERS,
      loadMembers: state.loadMembers,
    })),
  )

  const [items, setItems] = useState<CalendarItem[]>([])
  const [view, setView] = useState<CalendarView>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({ x: 360, y: 88 })
  const [form, setForm] = useState(() => emptyForm())

  const visibleRange = useMemo<CalendarRange>(() => {
    if (view === 'day') return { from: startOfDay(anchorDate), to: addDays(startOfDay(anchorDate), 1) }
    if (view === 'month') {
      const from = addDays(startOfMonth(anchorDate), -startOfMonth(anchorDate).getDay())
      return { from, to: addDays(endOfMonthGrid(anchorDate), 1) }
    }
    const from = startOfWeek(anchorDate)
    return { from, to: addDays(from, 7) }
  }, [anchorDate, view])

  const sortedItems = useMemo(() => [...items].sort((a, b) => itemDate(a).getTime() - itemDate(b).getTime()), [items])
  const visibleItemsLabel = `${sortedItems.length} ${sortedItems.length === 1 ? 'item' : 'items'}`

  const weekDays = useMemo(() => {
    const start = view === 'day' ? startOfDay(anchorDate) : startOfWeek(anchorDate)
    return Array.from({ length: view === 'day' ? 1 : 7 }, (_, index) => addDays(start, index))
  }, [anchorDate, view])

  const monthDays = useMemo(() => {
    const from = addDays(startOfMonth(anchorDate), -startOfMonth(anchorDate).getDay())
    return Array.from({ length: 42 }, (_, index) => addDays(from, index))
  }, [anchorDate])

  function openCreate(type: CalendarItemType, date = anchorDate, event?: ReactMouseEvent<HTMLElement>) {
    setForm({ ...emptyForm(date), type, allDay: type === 'TASK' || type === 'EVENT' })
    setPopoverPosition(pointerPosition(event))
    setPopoverOpen(true)
  }

  function openCreateRange(day: Date, startSlot: number, endSlot: number, event?: ReactMouseEvent<HTMLElement>) {
    const start = Math.max(firstSlot, Math.min(startSlot, endSlot))
    const end = Math.min(lastSlot, Math.max(startSlot, endSlot) || start + 2)
    const date = new Date(day)
    date.setHours(Math.floor(start / 2), start % 2 === 0 ? 0 : 30, 0, 0)
    setForm({
      ...emptyForm(date),
      type: 'MEETING',
      allDay: false,
      startTime: timeFromSlot(start),
      endTime: timeFromSlot(Math.max(start + 1, end)),
    })
    setPopoverPosition(pointerPosition(event))
    setPopoverOpen(true)
  }

  function openEdit(item: CalendarItem, event?: ReactMouseEvent<HTMLElement>) {
    setForm(formFromItem(item))
    setPopoverPosition(pointerPosition(event))
    setPopoverOpen(true)
  }

  useEffect(() => {
    const type = searchParams.get('type')
    const visibility = searchParams.get('visibility')
    const create = searchParams.get('create')
    const date = searchParams.get('date')

    setTypeFilter(type === 'EVENT' || type === 'MEETING' || type === 'TASK' ? type : 'ALL')
    setVisibilityFilter(visibility === 'COMPANY' || visibility === 'PERSONAL' ? visibility : 'ALL')

    const nextDate = parseDateKey(date)
    if (nextDate) setAnchorDate(nextDate)

    if (create === 'event' || create === 'meeting' || create === 'task') {
      const createType: CalendarItemType = create === 'event' ? 'EVENT' : create === 'task' ? 'TASK' : 'MEETING'
      openCreate(createType)
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('create')
      const query = nextParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }, [pathname, router, searchParams])

  const loadCalendar = useCallback(async () => {
    if (!token || !currentOrg) return
    setLoading(true)
    setError(null)

    try {
      const [response] = await Promise.all([
        calendarApi.listItems(token, {
          from: visibleRange.from.toISOString(),
          to: visibleRange.to.toISOString(),
          type: typeFilter === 'ALL' ? undefined : typeFilter,
          visibility: visibilityFilter === 'ALL' ? undefined : visibilityFilter,
        }),
        loadMembers(currentOrg.id, token),
      ])
      setItems(response.items)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [currentOrg, loadMembers, token, typeFilter, visibilityFilter, visibleRange])

  useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

  async function saveItem() {
    if (!token || !form.title.trim()) return
    setSaving(true)
    setError(null)

    try {
      let wikiPageId = form.wikiPageId

      if (!form.id && form.type === 'MEETING' && form.createMeetingNotes && !wikiPageId) {
        const notesPage = await wikiApi.createPage(token, {
          title: `${form.title.trim()} — Notes`,
          visibility: 'WORKSPACE',
        })
        wikiPageId = notesPage.id
        setForm(current => ({ ...current, wikiPageId: notesPage.id }))
      }

      const input = buildInput({ ...form, wikiPageId })
      if (form.id) {
        const updated = await calendarApi.updateItem(token, form.id, input as UpdateCalendarItemInput)
        setItems(current => current.map(item => item.id === updated.id ? updated : item))
      } else {
        const created = await calendarApi.createItem(token, input)
        setItems(current => [...current, created])
      }
      setPopoverOpen(false)
      setForm(emptyForm(anchorDate))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save calendar item')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem() {
    if (!token || !form.id) return
    setSaving(true)
    setError(null)

    try {
      await calendarApi.deleteItem(token, form.id)
      setItems(current => current.filter(item => item.id !== form.id))
      setPopoverOpen(false)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete calendar item')
    } finally {
      setSaving(false)
    }
  }

  function shift(direction: number) {
    setAnchorDate(current => {
      if (view === 'month') return new Date(current.getFullYear(), current.getMonth() + direction, 1)
      return addDays(current, direction * (view === 'day' ? 1 : 7))
    })
  }

  return (
    <div className="flex h-full min-h-0 bg-slate-50 text-slate-900 [color-scheme:light]">
      <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
        {error && <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

        <CalendarToolbar
          anchorDate={anchorDate}
          view={view}
          visibleItemsLabel={visibleItemsLabel}
          onCreate={(type) => openCreate(type)}
          onToday={() => setAnchorDate(new Date())}
          onShift={shift}
          onViewChange={setView}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-50 p-3 sm:p-4">
          {loading && (
            <div className="absolute inset-x-4 top-4 z-10 flex animate-in fade-in slide-in-from-top-1 items-center justify-center rounded-lg border border-slate-200 bg-white/95 py-2 text-sm text-slate-600 shadow-lg shadow-slate-200/60">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading calendar
            </div>
          )}
          <div className="h-full min-h-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
            {view === 'month' ? (
              <MonthCalendar
                anchorDate={anchorDate}
                selectedDate={anchorDate}
                days={monthDays}
                items={sortedItems}
                onCreate={openCreate}
                onEdit={openEdit}
              />
            ) : (
              <TimeGridCalendar
                selectedDate={anchorDate}
                days={weekDays}
                items={sortedItems}
                onCreate={openCreate}
                onCreateRange={openCreateRange}
                onEdit={openEdit}
              />
            )}
          </div>
        </div>
      </main>

      {popoverOpen && (
        <>
          <button aria-label="Close calendar editor" className="fixed inset-0 z-20 cursor-default bg-transparent" onClick={() => setPopoverOpen(false)} />
          <CalendarEventPopover
            form={form}
            setForm={setForm}
            members={members}
            position={popoverPosition}
            saving={saving}
            onClose={() => setPopoverOpen(false)}
            onSave={saveItem}
            onDelete={deleteItem}
            orgSlug={orgSlug}
          />
        </>
      )}
    </div>
  )
}
