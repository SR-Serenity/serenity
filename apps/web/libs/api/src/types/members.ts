export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Department {
  id: string
  name: string
  orgId: string
  createdAt: string
  memberCount: number
}

export interface Member {
  id: string
  email: string
  displayName: string
  role: WorkspaceRole
  departmentId: string | null
  departmentName: string | null
  joinedAt: string
}

export interface Invitation {
  id: string
  email: string
  role: WorkspaceRole
  departmentId: string | null
  departmentName: string | null
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  inviterName: string
  orgName: string
  expiresAt: string
  createdAt: string
}

export interface ListDepartmentsResponse {
  departments: Department[]
}

export interface ListMembersResponse {
  members: Member[]
}

export interface ListInvitationsResponse {
  invitations: Invitation[]
}

export interface CreateInvitationInput {
  email: string
  role: WorkspaceRole
  departmentId?: string
}

export interface CreateDepartmentInput {
  name: string
}