import { authApi, orgApi } from '@serenity/api'
import { useWorkspaceStore } from '../src/stores/workspace-store'
import type { Department, Invitation, Member, OrgSummary } from '@serenity/api'

jest.mock('@serenity/api', () => ({
  authApi: {
    organizations: jest.fn(),
  },
  orgApi: {
    listMembers: jest.fn(),
    listDepartments: jest.fn(),
    listInvitations: jest.fn(),
  },
}))

const mockedAuthApi = jest.mocked(authApi)
const mockedOrgApi = jest.mocked(orgApi)

const org: OrgSummary = {
  id: 'org-1',
  name: 'Serenity',
  slug: 'serenity',
  role: 'OWNER',
}

const member: Member = {
  id: 'user-1',
  email: 'member@serenity.test',
  displayName: 'Serenity Member',
  role: 'OWNER',
  departmentId: null,
  departmentName: null,
  joinedAt: '2026-01-01T00:00:00.000Z',
}

const department: Department = {
  id: 'dept-1',
  name: 'Engineering',
  orgId: org.id,
  createdAt: '2026-01-01T00:00:00.000Z',
  memberCount: 1,
}

const invitation: Invitation = {
  id: 'invite-1',
  email: 'invitee@serenity.test',
  role: 'MEMBER',
  departmentId: department.id,
  departmentName: department.name,
  status: 'PENDING',
  inviterName: 'Owner',
  orgName: org.name,
  expiresAt: '2026-01-08T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function resetWorkspaceStore() {
  useWorkspaceStore.setState({
    navigatorVisible: true,
    organizations: [],
    membersByOrgId: {},
    departmentsByOrgId: {},
    invitationsByOrgId: {},
    orgDataLoadingByOrgId: {},
    orgDataErrorByOrgId: {},
    chatNavSearch: '',
    switchingOrgSlug: null,
  })
}

beforeEach(() => {
  jest.resetAllMocks()
  resetWorkspaceStore()
})

it('caches organization members after first load', async () => {
  mockedOrgApi.listMembers.mockResolvedValue({ members: [member] })

  await expect(useWorkspaceStore.getState().loadMembers(org.id, 'token')).resolves.toEqual([member])
  await expect(useWorkspaceStore.getState().loadMembers(org.id, 'token')).resolves.toEqual([member])

  expect(mockedOrgApi.listMembers).toHaveBeenCalledTimes(1)
  expect(mockedOrgApi.listMembers).toHaveBeenCalledWith(org.id, 'token')
})

it('force refreshes org data after mutations', async () => {
  mockedOrgApi.listMembers
    .mockResolvedValueOnce({ members: [member] })
    .mockResolvedValueOnce({
      members: [{ ...member, role: 'ADMIN' }],
    })
  mockedOrgApi.listDepartments.mockResolvedValue({ departments: [department] })
  mockedOrgApi.listInvitations.mockResolvedValue({ invitations: [invitation] })

  await useWorkspaceStore.getState().loadOrgData(org.id, 'token')
  await useWorkspaceStore.getState().loadOrgData(org.id, 'token', { force: true })

  expect(mockedOrgApi.listMembers).toHaveBeenCalledTimes(2)
  expect(mockedOrgApi.listDepartments).toHaveBeenCalledTimes(2)
  expect(mockedOrgApi.listInvitations).toHaveBeenCalledTimes(2)
  expect(useWorkspaceStore.getState().membersByOrgId[org.id][0].role).toBe('ADMIN')
  expect(useWorkspaceStore.getState().departmentsByOrgId[org.id]).toEqual([department])
  expect(useWorkspaceStore.getState().invitationsByOrgId[org.id]).toEqual([invitation])
})

it('loads organization list into workspace state', async () => {
  mockedAuthApi.organizations.mockResolvedValue({ organizations: [org] })

  await useWorkspaceStore.getState().loadOrganizations('token', org)

  expect(useWorkspaceStore.getState().organizations).toEqual([org])
})
