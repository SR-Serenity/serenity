import type { User } from './user'
import type { OrgSummary } from './org'

export type AuthResponse = {
  accessToken: string
  user?: User
  organization?: OrgSummary
  organizations?: OrgSummary[]
}

export type LoginResult =
  | { type: 'single_org'; slug: string }
  | { type: 'multi_org'; organizations: OrgSummary[] }
