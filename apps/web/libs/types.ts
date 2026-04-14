export type User = {
  id: string
  email: string
  displayName: string
}

export type OrgSummary = {
  id: string
  name: string
  slug: string
  role: string
}

export type AuthResponse = {
  accessToken: string
  user?: User
  organization?: OrgSummary
  organizations?: OrgSummary[]
}

export type LoginResult =
  | { type: 'single_org'; slug: string }
  | { type: 'multi_org'; organizations: OrgSummary[] }
