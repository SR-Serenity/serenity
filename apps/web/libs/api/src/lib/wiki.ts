import { api } from './client'
import type {
  CreateWikiPageInput,
  DeleteWikiPageResponse,
  ListWikiPagesResponse,
  ListWikiSharesResponse,
  UpdateWikiPageInput,
  WikiAiEditRequest,
  WikiAiEditResponse,
  WikiFavoriteResponse,
  WikiPage,
  WikiPageShare,
  WikiSharePermission,
} from '../types/wiki'

export const wikiApi = {
  listPages: async (token: string): Promise<ListWikiPagesResponse> => {
    return api.get('wiki/pages', { token })
  },

  getPage: async (token: string, pageId: string): Promise<WikiPage> => {
    return api.get(`wiki/pages/${pageId}`, { token })
  },

  createPage: async (
    token: string,
    input: CreateWikiPageInput,
  ): Promise<WikiPage> => {
    return api.post('wiki/pages', { token, body: input })
  },

  updatePage: async (
    token: string,
    pageId: string,
    input: UpdateWikiPageInput,
  ): Promise<WikiPage> => {
    return api.patch(`wiki/pages/${pageId}`, { token, body: input })
  },

  deletePage: async (
    token: string,
    pageId: string,
  ): Promise<DeleteWikiPageResponse> => {
    return api.delete(`wiki/pages/${pageId}`, { token })
  },

  favoritePage: async (token: string, pageId: string): Promise<WikiFavoriteResponse> => {
    return api.post(`wiki/pages/${pageId}/favorite`, { token, body: {} })
  },

  unfavoritePage: async (token: string, pageId: string): Promise<WikiFavoriteResponse> => {
    return api.delete(`wiki/pages/${pageId}/favorite`, { token })
  },

  listShares: async (token: string, pageId: string): Promise<ListWikiSharesResponse> => {
    return api.get(`wiki/pages/${pageId}/shares`, { token })
  },

  addShare: async (
    token: string,
    pageId: string,
    userId: string,
    permission: WikiSharePermission,
  ): Promise<WikiPageShare> => {
    return api.post(`wiki/pages/${pageId}/shares`, { token, body: { userId, permission } })
  },

  updateShare: async (
    token: string,
    pageId: string,
    userId: string,
    permission: WikiSharePermission,
  ): Promise<WikiPageShare> => {
    return api.patch(`wiki/pages/${pageId}/shares/${userId}`, { token, body: { permission } })
  },

  removeShare: async (token: string, pageId: string, userId: string): Promise<void> => {
    return api.delete(`wiki/pages/${pageId}/shares/${userId}`, { token })
  },

  editWithAi: async (token: string, input: WikiAiEditRequest): Promise<WikiAiEditResponse> => {
    return api.post('ai/wiki/edit', { token, body: input })
  },
}
