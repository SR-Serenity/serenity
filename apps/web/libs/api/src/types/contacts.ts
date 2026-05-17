export type ContactType = 'EMPLOYEE' | 'GUEST' | 'AI_AGENT'
export type ContactStatus = 'ACTIVE' | 'INVITED' | 'ARCHIVED'

export interface ContactDirectoryItem {
  id: string
  type: ContactType
  status: ContactStatus
  displayName: string
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
  role: string | null
  departmentId: string | null
  departmentName: string | null
  notes: string | null
  sourceUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface ListContactsResponse {
  contacts: ContactDirectoryItem[]
}

export interface CreateContactInput {
  type: Exclude<ContactType, 'EMPLOYEE'>
  displayName: string
  email?: string
  phone?: string
  company?: string
  title?: string
  departmentId?: string
  notes?: string
}

export interface UpdateContactInput {
  status?: ContactStatus
  displayName?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  departmentId?: string | null
  notes?: string | null
}

export interface ArchiveContactResponse {
  success: boolean
}
