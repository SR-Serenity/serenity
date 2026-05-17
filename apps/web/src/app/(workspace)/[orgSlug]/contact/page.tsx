'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import {
  Bot,
  Building2,
  Loader2,
  Mail,
  MessageSquare,
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
    <div className="flex h-full min-h-0 bg-surface">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-divider px-7 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted">Company directory</p>
              <h1 className="mt-1 truncate text-2xl font-semibold text-primary-text">Contacts</h1>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreateForm('AI_AGENT')}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-divider px-3 text-sm font-medium text-primary-text hover:bg-btn-hover"
                >
                  <Bot className="h-4 w-4" />
                  AI agent
                </button>
                <button
                  type="button"
                  onClick={() => openCreateForm('GUEST')}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Guest
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search contacts"
                className="h-10 w-full rounded-xl border border-divider bg-panel pl-9 pr-3 text-sm text-primary-text outline-none focus:border-focus"
              />
            </label>
            <select
              value={typeFilter}
              onChange={event => setTypeFilter(event.target.value as ContactType | 'ALL')}
              className="h-10 rounded-xl border border-divider bg-panel px-3 text-sm text-primary-text outline-none focus:border-focus"
            >
              <option value="ALL">All types</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="GUEST">Guests</option>
              <option value="AI_AGENT">AI agents</option>
            </select>
            <select
              value={departmentFilter}
              onChange={event => setDepartmentFilter(event.target.value)}
              className="h-10 rounded-xl border border-divider bg-panel px-3 text-sm text-primary-text outline-none focus:border-focus"
            >
              <option value="ALL">All departments</option>
              <option value="NONE">No department</option>
              {departments.map(department => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
        </header>

        {error && (
          <div className="mx-7 mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading contacts
            </div>
          ) : groupedContacts.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-divider bg-panel text-center">
              <div>
                <Users className="mx-auto h-8 w-8 text-muted" />
                <h2 className="mt-3 text-base font-semibold text-primary-text">No contacts found</h2>
                <p className="mt-1 text-sm text-muted">Adjust filters or add a guest contact.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedContacts.map(([departmentName, items]) => (
                <section key={departmentName}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-text">
                    <Building2 className="h-4 w-4 text-muted" />
                    {departmentName}
                    <span className="rounded-lg bg-btn-hover px-2 py-0.5 text-xs text-muted">{items.length}</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-divider bg-panel">
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
      </section>

      <ContactDetail
        contact={selectedContact}
        canManage={canManage}
        saving={saving}
        onMessage={handleMessage}
        onEdit={openEditForm}
        onArchive={handleArchive}
      />

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
        'flex w-full items-center gap-3 border-b border-divider px-4 py-3 text-left last:border-b-0 hover:bg-btn-hover',
        active && 'bg-primary/5',
      )}
    >
      <span className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold',
        contact.type === 'EMPLOYEE' && 'bg-teal-500 text-white',
        contact.type === 'GUEST' && 'bg-blue-100 text-blue-700',
        contact.type === 'AI_AGENT' && 'bg-violet-100 text-violet-700',
      )}>
        {contact.type === 'EMPLOYEE' ? initials(contact.displayName) : <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-primary-text">{contact.displayName}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {[contact.title, contact.email, contact.company].filter(Boolean).join(' · ') || typeLabels[contact.type]}
        </span>
      </span>
      <span className={cn(
        'shrink-0 rounded-lg px-2 py-1 text-xs font-medium',
        contact.status === 'ACTIVE' && 'bg-success/10 text-success',
        contact.status === 'INVITED' && 'bg-primary/10 text-accent-txt',
        contact.status === 'ARCHIVED' && 'bg-btn-hover text-muted',
      )}>
        {contact.status}
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
      <aside className="hidden w-90 shrink-0 border-l border-divider bg-panel p-5 xl:block">
        <p className="text-sm text-muted">Select a contact</p>
      </aside>
    )
  }

  const editable = canManage && contact.type !== 'EMPLOYEE' && contact.status !== 'INVITED'

  return (
    <aside className="hidden w-95 shrink-0 border-l border-divider bg-panel xl:flex xl:flex-col">
      <div className="border-b border-divider p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-sm font-semibold text-white">
            {contact.type === 'EMPLOYEE' ? initials(contact.displayName) : typeLabels[contact.type][0]}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-primary-text">{contact.displayName}</h2>
            <p className="mt-1 text-sm text-muted">{typeLabels[contact.type]}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          {contact.sourceUserId && (
            <button
              type="button"
              onClick={() => onMessage(contact)}
              disabled={saving}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </button>
          )}
          {editable && (
            <>
              <button
                type="button"
                onClick={() => onEdit(contact)}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-divider px-3 text-sm font-medium text-primary-text hover:bg-btn-hover"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onArchive(contact)}
                disabled={saving}
                title="Archive contact"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-divider text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <DetailItem label="Email" value={contact.email} icon={Mail} />
        <DetailItem label="Phone" value={contact.phone} />
        <DetailItem label="Company" value={contact.company} />
        <DetailItem label="Title" value={contact.title ?? contact.role} />
        <DetailItem label="Department" value={contact.departmentName} />
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
      <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className={cn('mt-1 text-sm text-primary-text', multiline && 'whitespace-pre-wrap leading-6')}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-panel shadow-xl">
        <div className="flex items-start justify-between border-b border-divider p-5">
          <div>
            <h2 className="text-lg font-semibold text-primary-text">
              {editing ? 'Edit contact' : 'New contact'}
            </h2>
            <p className="mt-1 text-sm text-muted">Manage guest and AI agent directory records.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted hover:bg-btn-hover"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Type">
            <select
              value={form.type}
              disabled={editing}
              onChange={event => onChange({ ...form, type: event.target.value as Exclude<ContactType, 'EMPLOYEE'> })}
              className="h-10 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-focus disabled:opacity-60"
            >
              <option value="GUEST">Guest</option>
              <option value="AI_AGENT">AI agent</option>
            </select>
          </Field>
          <Field label="Name">
            <input
              value={form.displayName}
              onChange={event => onChange({ ...form, displayName: event.target.value })}
              className="h-10 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-focus"
              autoFocus
            />
          </Field>
          <Field label="Email">
            <input
              value={form.email}
              onChange={event => onChange({ ...form, email: event.target.value })}
              className="h-10 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-focus"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={event => onChange({ ...form, phone: event.target.value })}
              className="h-10 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-focus"
            />
          </Field>
          <Field label="Company">
            <input
              value={form.company}
              onChange={event => onChange({ ...form, company: event.target.value })}
              className="h-10 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-focus"
            />
          </Field>
          <Field label="Title">
            <input
              value={form.title}
              onChange={event => onChange({ ...form, title: event.target.value })}
              className="h-10 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-focus"
            />
          </Field>
          <Field label="Department">
            <select
              value={form.departmentId}
              onChange={event => onChange({ ...form, departmentId: event.target.value })}
              className="h-10 w-full rounded-xl border border-divider bg-surface px-3 text-sm outline-none focus:border-focus"
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
                className="min-h-24 w-full resize-none rounded-xl border border-divider bg-surface px-3 py-2 text-sm outline-none focus:border-focus"
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-divider p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-sm font-medium text-muted hover:bg-btn-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !form.displayName.trim()}
            className="inline-flex h-9 min-w-28 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-primary-text">{label}</span>
      {children}
    </label>
  )
}
