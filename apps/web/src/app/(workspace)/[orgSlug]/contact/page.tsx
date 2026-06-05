'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import {
  Bot,
  Building2,
  BriefcaseBusiness,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { chatApi, contactsApi } from '@serenity/api'
import type {
  ContactDirectoryItem,
  ContactType,
  CreateContactInput,
  Department,
  UpdateContactInput,
} from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

type ContactFormState = {
  type: Exclude<ContactType, 'EMPLOYEE'>
  displayName: string
  email: string
  phone: string
  company: string
  title: string
  departmentId: string
  notes: string
}

const emptyForm: ContactFormState = {
  type: 'GUEST',
  displayName: '',
  email: '',
  phone: '',
  company: '',
  title: '',
  departmentId: '',
  notes: '',
}

const typeLabels: Record<ContactType, string> = {
  EMPLOYEE: 'Employee',
  GUEST: 'Guest',
  AI_AGENT: 'AI agent',
}

const EMPTY_DEPARTMENTS: Department[] = []

function contactIcon(type: ContactType) {
  if (type === 'AI_AGENT') return Bot
  if (type === 'GUEST') return UserRound
  return Users
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'C'
}

function normalize(value: string | null | undefined) {
  return value?.toLowerCase() ?? ''
}

function buildInput(form: ContactFormState): CreateContactInput {
  return {
    type: form.type,
    displayName: form.displayName.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    company: form.company.trim() || undefined,
    title: form.title.trim() || undefined,
    departmentId: form.departmentId || undefined,
    notes: form.notes.trim() || undefined,
  }
}

function formFromContact(contact: ContactDirectoryItem): ContactFormState {
  return {
    type: contact.type === 'AI_AGENT' ? 'AI_AGENT' : 'GUEST',
    displayName: contact.displayName,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
    title: contact.title ?? '',
    departmentId: contact.departmentId ?? '',
    notes: contact.notes ?? '',
  }
}

export default function ContactPage() {
  const router = useRouter()
  const { token, currentOrg } = useAuthStore(
    useShallow(state => ({
      token: state.token,
      currentOrg: state.currentOrg,
    })),
  )
  const orgId = currentOrg?.id
  const { departments, loadDepartments } = useWorkspaceStore(
    useShallow(state => ({
      departments: orgId ? state.departmentsByOrgId[orgId] ?? EMPTY_DEPARTMENTS : EMPTY_DEPARTMENTS,
      loadDepartments: state.loadDepartments,
    })),
  )

  const [contacts, setContacts] = useState<ContactDirectoryItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ContactType | 'ALL'>('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactDirectoryItem | null>(null)
  const [form, setForm] = useState<ContactFormState>(emptyForm)

  const canManage = currentOrg?.role === 'OWNER' || currentOrg?.role === 'ADMIN'

  const loadContacts = useCallback(async () => {
    if (!token || !currentOrg) return
    setLoading(true)
    setError(null)
    try {
      const [contactResponse] = await Promise.all([
        contactsApi.listContacts(token),
        loadDepartments(currentOrg.id, token),
      ])
      setContacts(contactResponse.contacts)
      setSelectedId(current => current ?? contactResponse.contacts[0]?.id ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [currentOrg, loadDepartments, token])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return contacts.filter(contact => {
      const matchesType = typeFilter === 'ALL' || contact.type === typeFilter
      const matchesDepartment =
        departmentFilter === 'ALL' || (contact.departmentId ?? 'NONE') === departmentFilter
      const haystack = [
        contact.displayName,
        contact.email,
        contact.phone,
        contact.company,
        contact.title,
        contact.departmentName,
        contact.role,
      ].map(normalize).join(' ')

      return matchesType && matchesDepartment && (!needle || haystack.includes(needle))
    })
  }, [contacts, departmentFilter, query, typeFilter])

  const groupedContacts = useMemo(() => {
    const groups = new Map<string, ContactDirectoryItem[]>()
    for (const contact of filteredContacts) {
      const key = contact.departmentName || 'No department'
      groups.set(key, [...(groups.get(key) ?? []), contact])
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredContacts])

  const selectedContact = useMemo(
    () => contacts.find(contact => contact.id === selectedId) ?? filteredContacts[0] ?? null,
    [contacts, filteredContacts, selectedId],
  )
  const contactStats = useMemo(() => ({
    employees: contacts.filter(contact => contact.type === 'EMPLOYEE').length,
    guests: contacts.filter(contact => contact.type === 'GUEST').length,
    agents: contacts.filter(contact => contact.type === 'AI_AGENT').length,
  }), [contacts])
  const resultLabel = `${filteredContacts.length} ${filteredContacts.length === 1 ? 'contact' : 'contacts'}`

  function openCreateForm(type: Exclude<ContactType, 'EMPLOYEE'> = 'GUEST') {
    setEditingContact(null)
    setForm({ ...emptyForm, type })
    setFormOpen(true)
  }

  function openEditForm(contact: ContactDirectoryItem) {
    if (contact.type === 'EMPLOYEE' || contact.status === 'INVITED') return
    setEditingContact(contact)
    setForm(formFromContact(contact))
    setFormOpen(true)
  }

  async function handleSaveContact() {
    if (!token || !form.displayName.trim()) return
    setSaving(true)
    setError(null)

    try {
      if (editingContact) {
        const input: UpdateContactInput = {
          displayName: form.displayName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          company: form.company.trim() || undefined,
          title: form.title.trim() || undefined,
          departmentId: form.departmentId || null,
          notes: form.notes.trim() || null,
        }
        const updated = await contactsApi.updateContact(token, editingContact.id, input)
        setContacts(current => current.map(contact => contact.id === updated.id ? updated : contact))
        setSelectedId(updated.id)
      } else {
        const created = await contactsApi.createContact(token, buildInput(form))
        setContacts(current => [...current, created])
        setSelectedId(created.id)
      }
      setFormOpen(false)
      setEditingContact(null)
      setForm(emptyForm)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(contact: ContactDirectoryItem) {
    if (!token || contact.type === 'EMPLOYEE' || contact.status === 'INVITED') return
    setSaving(true)
    setError(null)
    try {
      await contactsApi.archiveContact(token, contact.id)
      setContacts(current => current.filter(item => item.id !== contact.id))
      setSelectedId(current => current === contact.id ? null : current)
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Failed to archive contact')
    } finally {
      setSaving(false)
    }
  }

  async function handleMessage(contact: ContactDirectoryItem) {
    if (!token || !contact.sourceUserId) return
    setSaving(true)
    try {
      const conversation = await chatApi.createDm(token, { memberIds: [contact.sourceUserId] })
      router.push(`/${currentOrg?.slug}/chat/${encodeURIComponent(conversation.id)}`)
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : 'Failed to open direct message')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-slate-50 text-slate-900 [color-scheme:light]">
      <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-950">Contacts</h1>
            <p className="text-xs text-slate-500">
              {resultLabel} · {contactStats.employees} employees · {contactStats.guests} guests · {contactStats.agents} agents
            </p>
          </div>
          {canManage && (
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="lg" className="rounded-lg border-slate-200 bg-white" onClick={() => openCreateForm('AI_AGENT')}>
                <Bot className="size-4" />
                AI agent
              </Button>
              <Button size="lg" className="rounded-lg bg-blue-600 px-3 text-white hover:bg-blue-700" onClick={() => openCreateForm('GUEST')}>
                <Plus className="size-4" />
                Guest
              </Button>
            </div>
          )}
        </header>

        {error && <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
            <div className="grid shrink-0 gap-3 border-b border-slate-200 bg-white p-3 lg:grid-cols-[minmax(240px,1fr)_180px_220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search contacts"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="relative block">
                <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={event => setTypeFilter(event.target.value as ContactType | 'ALL')}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">All types</option>
                  <option value="EMPLOYEE">Employees</option>
                  <option value="GUEST">Guests</option>
                  <option value="AI_AGENT">AI agents</option>
                </select>
              </label>
              <label className="relative block">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={event => setDepartmentFilter(event.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">All departments</option>
                  <option value="NONE">No department</option>
                  {departments.map(department => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-h-0 overflow-y-auto">
                {loading ? (
                  <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Loading contacts
                  </div>
                ) : groupedContacts.length === 0 ? (
                  <div className="flex h-full min-h-72 items-center justify-center px-4 text-center">
                    <div>
                      <Users className="mx-auto size-9 text-slate-400" />
                      <h2 className="mt-3 text-base font-semibold text-slate-950">No contacts found</h2>
                      <p className="mt-1 text-sm text-slate-500">Adjust filters or add a guest contact.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {groupedContacts.map(([departmentName, items]) => (
                      <section key={departmentName}>
                        <div className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-slate-100 bg-slate-50/95 px-4 text-xs font-semibold uppercase text-slate-500 backdrop-blur">
                          <Building2 className="size-3.5" />
                          <span className="truncate">{departmentName}</span>
                          <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">{items.length}</span>
                        </div>
                        <div>
                          {items.map(contact => (
                            <ContactRow
                              key={contact.id}
                              contact={contact}
                              active={selectedContact?.id === contact.id}
                              onSelect={() => setSelectedId(contact.id)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <ContactDetail
                contact={selectedContact}
                canManage={canManage}
                saving={saving}
                onMessage={handleMessage}
                onEdit={openEditForm}
                onArchive={handleArchive}
              />
            </div>
          </div>
        </div>
      </main>

      {formOpen && (
        <ContactFormModal
          departments={departments}
          editing={Boolean(editingContact)}
          form={form}
          saving={saving}
          onClose={() => setFormOpen(false)}
          onChange={setForm}
          onSave={handleSaveContact}
        />
      )}
    </div>
  )
}

function ContactRow({
  contact,
  active,
  onSelect,
}: {
  contact: ContactDirectoryItem
  active: boolean
  onSelect: () => void
}) {
  const Icon = contactIcon(contact.type)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50',
        active && 'bg-blue-50/80 hover:bg-blue-50',
      )}
    >
      <span className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-1 ring-inset',
        contact.type === 'EMPLOYEE' && 'bg-emerald-600 text-white ring-emerald-600',
        contact.type === 'GUEST' && 'bg-blue-100 text-blue-700',
        contact.type === 'AI_AGENT' && 'bg-violet-100 text-violet-700 ring-violet-200',
      )}>
        {contact.type === 'EMPLOYEE' ? initials(contact.displayName) : <Icon className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-950">{contact.displayName}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {[contact.title, contact.email, contact.company].filter(Boolean).join(' · ') || typeLabels[contact.type]}
        </span>
      </span>
      <span className={cn(
        'shrink-0 rounded-md px-2 py-1 text-xs font-medium',
        contact.status === 'ACTIVE' && 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
        contact.status === 'INVITED' && 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
        contact.status === 'ARCHIVED' && 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
      )}>
        {contact.status.toLowerCase()}
      </span>
    </button>
  )
}

function ContactDetail({
  contact,
  canManage,
  saving,
  onMessage,
  onEdit,
  onArchive,
}: {
  contact: ContactDirectoryItem | null
  canManage: boolean
  saving: boolean
  onMessage: (contact: ContactDirectoryItem) => void
  onEdit: (contact: ContactDirectoryItem) => void
  onArchive: (contact: ContactDirectoryItem) => void
}) {
  if (!contact) {
    return (
      <aside className="hidden border-l border-slate-200 bg-white p-5 xl:block">
        <p className="text-sm text-slate-500">Select a contact</p>
      </aside>
    )
  }

  const editable = canManage && contact.type !== 'EMPLOYEE' && contact.status !== 'INVITED'
  const Icon = contactIcon(contact.type)

  return (
    <aside className="hidden min-h-0 border-l border-slate-200 bg-white xl:flex xl:flex-col">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset',
            contact.type === 'EMPLOYEE' && 'bg-emerald-600 text-white ring-emerald-600',
            contact.type === 'GUEST' && 'bg-blue-100 text-blue-700 ring-blue-200',
            contact.type === 'AI_AGENT' && 'bg-violet-100 text-violet-700 ring-violet-200',
          )}>
            {contact.type === 'EMPLOYEE' ? initials(contact.displayName) : <Icon className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-slate-950">{contact.displayName}</h2>
            <p className="mt-1 text-sm text-slate-500">{typeLabels[contact.type]}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          {contact.sourceUserId && (
            <Button
              onClick={() => onMessage(contact)}
              disabled={saving}
              className="h-9 flex-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <MessageSquare className="size-4" />
              Message
            </Button>
          )}
          {editable && (
            <>
              <Button variant="outline" className="h-9 flex-1 rounded-lg border-slate-200 bg-white" onClick={() => onEdit(contact)}>
                Edit
              </Button>
              <Button
                variant="destructive"
                size="icon-lg"
                onClick={() => onArchive(contact)}
                disabled={saving}
                title="Archive contact"
                className="rounded-lg"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <DetailItem label="Email" value={contact.email} icon={Mail} />
        <DetailItem label="Phone" value={contact.phone} icon={Phone} />
        <DetailItem label="Company" value={contact.company} icon={BriefcaseBusiness} />
        <DetailItem label="Title" value={contact.title ?? contact.role} icon={UserRound} />
        <DetailItem label="Department" value={contact.departmentName} icon={Building2} />
        <DetailItem label="Notes" value={contact.notes} multiline />
      </div>
    </aside>
  )
}

function DetailItem({
  label,
  value,
  multiline,
  icon: Icon,
}: {
  label: string
  value?: string | null
  multiline?: boolean
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </p>
      <p className={cn('mt-1 text-sm text-slate-950', multiline && 'whitespace-pre-wrap leading-6')}>
        {value || '—'}
      </p>
    </div>
  )
}

function ContactFormModal({
  departments,
  editing,
  form,
  saving,
  onClose,
  onChange,
  onSave,
}: {
  departments: Department[]
  editing: boolean
  form: ContactFormState
  saving: boolean
  onClose: () => void
  onChange: (form: ContactFormState) => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {editing ? 'Edit contact' : 'New contact'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Manage guest and AI agent directory records.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Type">
            <select
              value={form.type}
              disabled={editing}
              onChange={event => onChange({ ...form, type: event.target.value as Exclude<ContactType, 'EMPLOYEE'> })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            >
              <option value="GUEST">Guest</option>
              <option value="AI_AGENT">AI agent</option>
            </select>
          </Field>
          <Field label="Name">
            <input
              value={form.displayName}
              onChange={event => onChange({ ...form, displayName: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </Field>
          <Field label="Email">
            <input
              value={form.email}
              onChange={event => onChange({ ...form, email: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={event => onChange({ ...form, phone: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </Field>
          <Field label="Company">
            <input
              value={form.company}
              onChange={event => onChange({ ...form, company: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </Field>
          <Field label="Title">
            <input
              value={form.title}
              onChange={event => onChange({ ...form, title: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </Field>
          <Field label="Department">
            <select
              value={form.departmentId}
              onChange={event => onChange({ ...form, departmentId: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">No department</option>
              {departments.map(department => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={event => onChange({ ...form, notes: event.target.value })}
                className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Button variant="ghost" className="h-9 rounded-lg text-slate-600 hover:bg-slate-100" onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-9 min-w-28 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700" onClick={onSave} disabled={saving || !form.displayName.trim()}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
