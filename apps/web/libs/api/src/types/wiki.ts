export type WikiPageVisibility = 'WORKSPACE' | 'DEPARTMENT' | 'PRIVATE'
export type WikiSharePermission = 'VIEW' | 'COMMENT' | 'EDIT'

export interface WikiPageShareUser {
  id: string
  displayName: string
  email: string
}

export interface WikiPageShare {
  id: string
  userId: string
  userName: string
  userEmail: string
  permission: WikiSharePermission
  createdAt: string
}

export interface WikiPage {
  id: string
  parentId: string | null
  createdById: string
  title: string
  icon: string | null
  coverColor: string | null
  contentMarkdown: string
  contentJson: unknown | null
  visibility: WikiPageVisibility
  departmentId: string | null
  departmentName: string | null
  favorite: boolean
  canEdit: boolean
  shares: WikiPageShare[]
  createdAt: string
  updatedAt: string
}

export interface ListWikiPagesResponse {
  pages: WikiPage[]
}

export interface ListWikiSharesResponse {
  shares: WikiPageShare[]
}

export interface DeleteWikiPageResponse {
  success: boolean
}

export interface WikiFavoriteResponse {
  favorite: boolean
}

export interface CreateWikiPageInput {
  title: string
  parentId?: string | null
  icon?: string | null
  coverColor?: string | null
  contentMarkdown?: string | null
  contentJson?: unknown[] | null
  visibility: WikiPageVisibility
  departmentId?: string | null
}

export type UpdateWikiPageInput = Partial<CreateWikiPageInput>
