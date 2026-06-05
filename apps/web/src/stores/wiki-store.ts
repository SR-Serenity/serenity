'use client'

import { create } from 'zustand'
import { wikiApi } from '@serenity/api'
import type { WikiPage, WikiPageShare, WikiPageVisibility, WikiSharePermission } from '@serenity/api'
import { fallbackBlocks, type WikiBlockContent } from '@/app/(workspace)/[orgSlug]/wiki/components/notion-block-editor'

const OPTIMISTIC_PAGE_PREFIX = 'optimistic-wiki-page-'
const AUTOSAVE_DEBOUNCE_MS = 2000

export type WikiDraft = {
  title: string
  icon: string
  contentMarkdown: string
  contentJson: WikiBlockContent
  visibility: WikiPageVisibility
  departmentId: string
}

export type PageTreeNode = WikiPage & { children: PageTreeNode[] }

export function isOptimisticPageId(pageId: string) {
  return pageId.startsWith(OPTIMISTIC_PAGE_PREFIX)
}

export function buildPageTree(pages: WikiPage[]): PageTreeNode[] {
  const byId = new Map<string, PageTreeNode>()
  pages.forEach(page => byId.set(page.id, { ...page, children: [] }))

  const roots: PageTreeNode[] = []
  byId.forEach(node => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)?.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortNodes = (nodes: PageTreeNode[]) => {
    nodes.sort((a, b) => a.title.localeCompare(b.title))
    nodes.forEach(node => sortNodes(node.children))
  }
  sortNodes(roots)
  return roots
}

export function emptyDraft(page?: WikiPage | null): WikiDraft {
  return {
    title: page?.title ?? '',
    icon: page?.icon ?? '',
    contentMarkdown: page?.contentMarkdown ?? '',
    contentJson: (Array.isArray(page?.contentJson) ? page.contentJson : fallbackBlocks(page?.contentMarkdown ?? '')) as WikiBlockContent,
    visibility: page?.visibility ?? 'PRIVATE',
    departmentId: page?.departmentId ?? '',
  }
}

function toWikiPageUpdate(draft: WikiDraft) {
  return {
    title: draft.title.trim() || 'Untitled',
    icon: draft.icon || null,
    contentMarkdown: draft.contentMarkdown,
    contentJson: draft.contentJson,
    visibility: draft.visibility,
    departmentId: draft.visibility === 'DEPARTMENT' ? draft.departmentId : null,
  }
}

const starterContent = `- [x] Create your first wiki page
- [ ] Type / to add headers, checklists, quotes, and code blocks
- [ ] Use the sidebar to find, organize, and add nested pages

> This is a workspace wiki page. Keep notes, policies, specs, and team docs here.`

type WikiState = {
  pages: WikiPage[]
  selectedPage: WikiPage | null
  draft: WikiDraft
  query: string
  loading: boolean
  saving: boolean
  dirty: boolean
  error: string | null
  shares: WikiPageShare[]
  sharesLoading: boolean

  _saveVersion: number
  _saveTimer: ReturnType<typeof setTimeout> | null
  _pageStateVersion: number
  _skipRouteLoadId: string | null
  _deletedPageIds: Set<string>
}

type WikiActions = {
  setQuery: (query: string) => void
  updateDraft: (update: Partial<WikiDraft>) => void

  loadPages: (
    token: string,
    orgSlug: string,
    routePageId: string | undefined,
    onNavigate: (path: string) => void,
  ) => Promise<void>

  selectPage: (
    token: string,
    orgSlug: string,
    pageId: string,
    onNavigate: (path: string) => void,
  ) => Promise<void>

  createPage: (
    token: string,
    orgSlug: string,
    visibility: WikiPageVisibility,
    departmentId: string | null,
    departmentName: string | null,
    onNavigate: (path: string) => void,
  ) => Promise<void>

  toggleFavorite: (token: string) => Promise<void>

  deleteSelectedPage: (
    token: string,
    orgSlug: string,
    onNavigate: (path: string) => void,
  ) => Promise<void>

  scheduleSave: (token: string) => void
  cancelSave: () => void
  reset: () => void

  loadShares: (token: string, pageId: string) => Promise<void>
  addShare: (token: string, pageId: string, userId: string, permission: WikiSharePermission) => Promise<void>
  updateShare: (token: string, pageId: string, userId: string, permission: WikiSharePermission) => Promise<void>
  removeShare: (token: string, pageId: string, userId: string) => Promise<void>
}

const initialState: WikiState = {
  pages: [],
  selectedPage: null,
  draft: emptyDraft(),
  query: '',
  loading: true,
  saving: false,
  shares: [],
  sharesLoading: false,
  dirty: false,
  error: null,

  _saveVersion: 0,
  _saveTimer: null,
  _pageStateVersion: 0,
  _skipRouteLoadId: null,
  _deletedPageIds: new Set(),
}

export const useWikiStore = create<WikiState & WikiActions>((set, get) => ({
  ...initialState,

  setQuery: (query) => set({ query }),

  updateDraft: (update) =>
    set(state => ({ draft: { ...state.draft, ...update }, dirty: true })),

  reset: () => {
    get().cancelSave()
    set({ ...initialState, _deletedPageIds: new Set() })
  },

  cancelSave: () => {
    const timer = get()._saveTimer
    if (timer !== null) clearTimeout(timer)
    set({ _saveTimer: null })
  },

  scheduleSave: (token) => {
    const { selectedPage, dirty, _saveVersion, cancelSave } = get()
    if (!selectedPage || !dirty || !selectedPage.canEdit) return
    if (isOptimisticPageId(selectedPage.id)) return

    const pageId = selectedPage.id
    const draftSnapshot = toWikiPageUpdate(get().draft)

    cancelSave()
    const version = _saveVersion + 1
    set({ _saveVersion: version })

    const timer = setTimeout(async () => {
      const shouldUpdateSelected = get().selectedPage?.id === pageId
      if (shouldUpdateSelected) {
        set({ saving: true, error: null })
      }
      try {
        const updated = await wikiApi.updatePage(token, pageId, draftSnapshot)
        if (get()._saveVersion === version) {
          set(state => ({
            pages: state.pages.map(page => page.id === updated.id ? updated : page),
            ...(state.selectedPage?.id === updated.id
              ? { selectedPage: updated, dirty: false }
              : {}),
          }))
        }
      } catch (err) {
        if (get().selectedPage?.id === pageId) {
          set({ error: err instanceof Error ? err.message : 'Failed to save wiki page' })
        }
      } finally {
        if (get()._saveVersion === version && get().selectedPage?.id === pageId) {
          set({ saving: false })
        }
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    set({ _saveTimer: timer })
  },

  loadPages: async (token, orgSlug, routePageId, onNavigate) => {
    const { _skipRouteLoadId, _deletedPageIds } = get()

    if (routePageId && _skipRouteLoadId === routePageId) {
      set({ _skipRouteLoadId: null })
      return
    }

    const loadVersion = get()._pageStateVersion
    set({ loading: true, error: null })

    try {
      const response = await wikiApi.listPages(token)
      if (get()._pageStateVersion !== loadVersion) return

      const visiblePages = response.pages.filter(page => !_deletedPageIds.has(page.id))
      set({ pages: visiblePages })

      const routePage = routePageId ? visiblePages.find(page => page.id === routePageId) : undefined
      const routePageWasDeleted = Boolean(routePageId && _deletedPageIds.has(routePageId))
      const nextId = routePage?.id ?? visiblePages[0]?.id

      if (routePageId && (!routePage || routePageWasDeleted)) {
        if (nextId) {
          set({ _skipRouteLoadId: nextId })
          onNavigate(`/${orgSlug}/wiki/${encodeURIComponent(nextId)}`)
        } else {
          onNavigate(`/${orgSlug}/wiki`)
        }
      }

      if (nextId) {
        const listedPage = visiblePages.find(page => page.id === nextId)
        if (listedPage) {
          set({ selectedPage: listedPage, draft: emptyDraft(listedPage), dirty: false })
        }

        const page = await wikiApi.getPage(token, nextId)
        if (get()._pageStateVersion !== loadVersion) return
        set({ selectedPage: page, draft: emptyDraft(page), dirty: false })
      } else {
        set({ selectedPage: null, draft: emptyDraft() })
      }
    } catch (err) {
      if (routePageId && get()._deletedPageIds.has(routePageId)) return
      set({ error: err instanceof Error ? err.message : 'Failed to load wiki' })
    } finally {
      if (get()._pageStateVersion === loadVersion) set({ loading: false })
    }
  },

  selectPage: async (token, orgSlug, pageId, onNavigate) => {
    const { pages } = get()

    if (isOptimisticPageId(pageId)) {
      const page = pages.find(candidate => candidate.id === pageId)
      if (page) set({ selectedPage: page })
      return
    }

    const loadVersion = get()._pageStateVersion + 1
    set({ _pageStateVersion: loadVersion })

    const cachedPage = pages.find(page => page.id === pageId)
    if (cachedPage) {
      set({ selectedPage: cachedPage, draft: emptyDraft(cachedPage), dirty: false })
    }

    set({ _skipRouteLoadId: pageId, loading: true, error: null })
    onNavigate(`/${orgSlug}/wiki/${encodeURIComponent(pageId)}`)

    try {
      const [page, sharesRes] = await Promise.all([
        wikiApi.getPage(token, pageId),
        wikiApi.listShares(token, pageId).catch(() => ({ shares: [] })),
      ])
      if (get()._pageStateVersion !== loadVersion) return
      set({ selectedPage: page, draft: emptyDraft(page), dirty: false, shares: sharesRes.shares })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to open wiki page' })
    } finally {
      if (get()._pageStateVersion === loadVersion) set({ loading: false })
    }
  },

  createPage: async (token, orgSlug, visibility, departmentId, departmentName, onNavigate) => {
    const now = new Date().toISOString()
    const tempId = `${OPTIMISTIC_PAGE_PREFIX}${crypto.randomUUID()}`
    const resolvedDeptId = visibility === 'DEPARTMENT' ? departmentId : null

    const optimisticPage: WikiPage = {
      id: tempId,
      parentId: null,
      createdById: '',
      title: 'Untitled',
      icon: null,
      coverColor: null,
      contentMarkdown: starterContent,
      contentJson: fallbackBlocks(starterContent),
      visibility,
      departmentId: resolvedDeptId,
      departmentName: visibility === 'DEPARTMENT' ? departmentName : null,
      favorite: false,
      canEdit: true,
      shares: [],
      createdAt: now,
      updatedAt: now,
    }

    set(state => ({
      _pageStateVersion: state._pageStateVersion + 1,
      pages: [optimisticPage, ...state.pages],
      selectedPage: optimisticPage,
      draft: emptyDraft(optimisticPage),
      dirty: false,
      loading: false,
      saving: true,
      error: null,
    }))

    try {
      const page = await wikiApi.createPage(token, {
        title: 'Untitled',
        icon: null,
        contentMarkdown: starterContent,
        contentJson: fallbackBlocks(starterContent),
        parentId: null,
        visibility,
        departmentId: resolvedDeptId,
      })

      const { draft: activeDraft, dirty: isDirty, selectedPage: currentSelected } = get()
      const draftChanged = isDirty && currentSelected?.id === tempId
      const nextPage = draftChanged ? { ...page, ...toWikiPageUpdate(activeDraft) } : page

      set(state => ({
        _pageStateVersion: state._pageStateVersion + 1,
        pages: state.pages.map(candidate => candidate.id === tempId ? nextPage : candidate),
        ...(state.selectedPage?.id === tempId
          ? {
              selectedPage: nextPage,
              draft: draftChanged ? state.draft : emptyDraft(page),
              dirty: draftChanged,
              _skipRouteLoadId: page.id,
            }
          : {}),
      }))

      if (get().selectedPage?.id === nextPage.id) {
        onNavigate(`/${orgSlug}/wiki/${encodeURIComponent(page.id)}`)
      }
    } catch (err) {
      set(state => {
        const remaining = state.pages.filter(page => page.id !== tempId)
        const next = remaining[0] ?? null
        return {
          _pageStateVersion: state._pageStateVersion + 1,
          pages: remaining,
          selectedPage: state.selectedPage?.id === tempId ? next : state.selectedPage,
          draft: state.selectedPage?.id === tempId ? emptyDraft(next) : state.draft,
          dirty: state.selectedPage?.id === tempId ? false : state.dirty,
          error: err instanceof Error ? err.message : 'Failed to create wiki page',
        }
      })

      const { selectedPage, pages } = get()
      if (!selectedPage || !pages.find(page => page.id === selectedPage.id)) {
        const next = pages[0] ?? null
        onNavigate(next ? `/${orgSlug}/wiki/${encodeURIComponent(next.id)}` : `/${orgSlug}/wiki`)
      }
    } finally {
      set({ saving: false })
    }
  },

  toggleFavorite: async (token) => {
    const { selectedPage } = get()
    if (!selectedPage || isOptimisticPageId(selectedPage.id)) return

    try {
      const result = selectedPage.favorite
        ? await wikiApi.unfavoritePage(token, selectedPage.id)
        : await wikiApi.favoritePage(token, selectedPage.id)
      const updated = { ...selectedPage, favorite: result.favorite }
      set(state => ({
        selectedPage: updated,
        pages: state.pages.map(page => page.id === updated.id ? updated : page),
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update favorite' })
    }
  },

  deleteSelectedPage: async (token, orgSlug, onNavigate) => {
    const { selectedPage, pages } = get()
    if (!selectedPage || !selectedPage.canEdit) return

    const deletedPageId = selectedPage.id
    const remaining = pages.filter(page => page.id !== deletedPageId)
    const next = remaining[0] ?? null
    const nextPath = next
      ? `/${orgSlug}/wiki/${encodeURIComponent(next.id)}`
      : `/${orgSlug}/wiki`

    set(state => {
      const deletedIds = new Set(state._deletedPageIds)
      deletedIds.add(deletedPageId)
      return {
        _pageStateVersion: state._pageStateVersion + 1,
        _deletedPageIds: deletedIds,
        _skipRouteLoadId: next?.id ?? null,
        pages: remaining,
        selectedPage: next,
        draft: emptyDraft(next),
        dirty: false,
        loading: false,
      }
    })
    onNavigate(nextPath)

    if (isOptimisticPageId(deletedPageId)) return

    try {
      await wikiApi.deletePage(token, deletedPageId)
    } catch (err) {
      set(state => {
        const deletedIds = new Set(state._deletedPageIds)
        deletedIds.delete(deletedPageId)
        return {
          _pageStateVersion: state._pageStateVersion + 1,
          _deletedPageIds: deletedIds,
          pages: [...state.pages, selectedPage],
          selectedPage,
          draft: emptyDraft(selectedPage),
          dirty: false,
          _skipRouteLoadId: selectedPage.id,
          error: err instanceof Error ? err.message : 'Failed to delete wiki page',
        }
      })
      onNavigate(`/${orgSlug}/wiki/${encodeURIComponent(selectedPage.id)}`)
    }
  },

  loadShares: async (token, pageId) => {
    set({ sharesLoading: true })
    try {
      const res = await wikiApi.listShares(token, pageId)
      set({ shares: res.shares })
    } catch {
      // silently fail — shares panel will show empty
    } finally {
      set({ sharesLoading: false })
    }
  },

  addShare: async (token, pageId, userId, permission) => {
    try {
      const share = await wikiApi.addShare(token, pageId, userId, permission)
      set(state => ({ shares: [...state.shares.filter(s => s.userId !== userId), share] }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add share' })
    }
  },

  updateShare: async (token, pageId, userId, permission) => {
    set(state => ({
      shares: state.shares.map(s => s.userId === userId ? { ...s, permission } : s),
    }))
    try {
      const share = await wikiApi.updateShare(token, pageId, userId, permission)
      set(state => ({ shares: state.shares.map(s => s.userId === userId ? share : s) }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update share' })
      get().loadShares(token, pageId)
    }
  },

  removeShare: async (token, pageId, userId) => {
    const prev = get().shares
    set(state => ({ shares: state.shares.filter(s => s.userId !== userId) }))
    try {
      await wikiApi.removeShare(token, pageId, userId)
    } catch (err) {
      set({ shares: prev, error: err instanceof Error ? err.message : 'Failed to remove share' })
    }
  },
}))
