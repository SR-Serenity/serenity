import { authApi } from '@serenity/api'
import { useAuthStore } from '../src/stores/auth-store'
import type { OrgSummary } from '@serenity/api'

jest.mock('@serenity/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    switchOrg: jest.fn(),
  },
}))

const mockedAuthApi = jest.mocked(authApi)

const org: OrgSummary = {
  id: 'org-1',
  name: 'Serenity',
  slug: 'serenity',
  role: 'OWNER',
}

const nextOrg: OrgSummary = {
  id: 'org-2',
  name: 'Next Org',
  slug: 'next-org',
  role: 'ADMIN',
}

function createToken(overrides: Record<string, unknown> = {}) {
  const payload = {
    user_id: 'user-1',
    email: 'member@serenity.test',
    displayName: 'Serenity Member',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }

  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.')
}

function resetAuthStore() {
  useAuthStore.setState({
    token: null,
    user: null,
    currentOrg: null,
    initializing: true,
  })
}

beforeEach(() => {
  jest.resetAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  document.cookie = 'auth_token=; path=/; max-age=0'
  document.cookie = 'auth_org_slug=; path=/; max-age=0'
  resetAuthStore()
})

it('login persists session and cookies', async () => {
  const token = createToken()
  mockedAuthApi.login.mockResolvedValue({
    accessToken: token,
    organization: org,
  })

  const result = await useAuthStore.getState().login('member@serenity.test', 'password123')

  expect(result).toEqual({ type: 'single_org', slug: 'serenity' })
  expect(useAuthStore.getState()).toMatchObject({
    token,
    currentOrg: org,
    user: {
      id: 'user-1',
      email: 'member@serenity.test',
      displayName: 'Serenity Member',
    },
    initializing: false,
  })
  expect(localStorage.getItem('serenity-auth')).toContain(token)
  expect(document.cookie).toContain('auth_token=')
  expect(document.cookie).toContain('auth_org_slug=serenity')
})

it('logout clears session and cookies', () => {
  const token = createToken()
  useAuthStore.getState().setSession(token, org)

  useAuthStore.getState().logout()

  expect(useAuthStore.getState()).toMatchObject({
    token: null,
    user: null,
    currentOrg: null,
    initializing: false,
  })
  expect(document.cookie).not.toContain('auth_token=')
  expect(document.cookie).not.toContain('auth_org_slug=')
})

it('expired legacy token clears auth', async () => {
  const token = createToken({ exp: Math.floor(Date.now() / 1000) - 60 })
  localStorage.setItem('auth_token', token)
  localStorage.setItem('auth_org', JSON.stringify(org))

  await useAuthStore.getState().initialize()

  expect(useAuthStore.getState()).toMatchObject({
    token: null,
    user: null,
    currentOrg: null,
    initializing: false,
  })
  expect(localStorage.getItem('auth_token')).toBeNull()
  expect(localStorage.getItem('auth_org')).toBeNull()
})

it('setSession supports invite registration flow', () => {
  const token = createToken({ displayName: undefined })

  const user = useAuthStore.getState().setSession(token, org, 'Invite Member')

  expect(user.displayName).toBe('Invite Member')
  expect(useAuthStore.getState()).toMatchObject({
    token,
    currentOrg: org,
    user,
    initializing: false,
  })
})

it('selectOrg fails without token and updates org with token', async () => {
  await expect(useAuthStore.getState().selectOrg('next-org')).rejects.toThrow('Not authenticated')

  const firstToken = createToken()
  const nextToken = createToken({ displayName: 'Next Member' })
  useAuthStore.getState().setSession(firstToken, org)
  mockedAuthApi.switchOrg.mockResolvedValue({
    accessToken: nextToken,
    organization: nextOrg,
  })

  await useAuthStore.getState().selectOrg('next-org')

  expect(mockedAuthApi.switchOrg).toHaveBeenCalledWith(firstToken, 'next-org')
  expect(useAuthStore.getState()).toMatchObject({
    token: nextToken,
    currentOrg: nextOrg,
    user: {
      displayName: 'Next Member',
    },
    initializing: false,
  })
  expect(document.cookie).toContain('auth_org_slug=next-org')
})
