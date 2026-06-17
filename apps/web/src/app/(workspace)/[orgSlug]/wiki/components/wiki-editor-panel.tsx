'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import {
  FileText,
  Globe,
  Loader2,
  Lock,
  MoreHorizontal,
  Share2,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import type { Department } from '@serenity/api'
import type { WikiPageVisibility } from '@serenity/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useWikiStore } from '@/stores/wiki-store'
import { NotionBlockEditor } from './notion-block-editor'
import type { AiCommandBarContext, NotionBlockEditorHandle } from './notion-block-editor'
import { WikiSharePanel } from './wiki-share-panel'
import { useCopilotContextStore } from '@/stores/copilot-context-store'

const EMPTY_DEPARTMENTS: Department[] = []

const COVER_COLORS = [
  '#f3e8ff', '#dbeafe', '#dcfce7', '#fef9c3', '#ffe4e6',
  '#f0fdf4', '#fdf4ff', '#ecfeff', '#fff7ed', '#f1f5f9',
]

function visibilityIcon(visibility: WikiPageVisibility) {
  if (visibility === 'PRIVATE') return <Lock className="h-3.5 w-3.5" />
  if (visibility === 'DEPARTMENT') return <Users className="h-3.5 w-3.5" />
  return <Globe className="h-3.5 w-3.5" />
}


export function WikiEditorPanel() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const [localCoverColor, setLocalCoverColor] = useState<string | null | undefined>(undefined)
  const editorRef = useRef<NotionBlockEditorHandle>(null)
  const { token, currentOrg, user } = useAuthStore(useShallow(state => ({ token: state.token, currentOrg: state.currentOrg, user: state.user })))
  const isAdmin = currentOrg?.role === 'OWNER' || currentOrg?.role === 'ADMIN'
  const orgId = currentOrg?.id
  const { departments } = useWorkspaceStore(
    useShallow(state => ({
      departments: orgId ? state.departmentsByOrgId[orgId] ?? EMPTY_DEPARTMENTS : EMPTY_DEPARTMENTS,
    })),
  )

  const {
    selectedPage,
    draft,
    loading,
    saving,
    dirty,
    error,
    pages,
    updateDraft,
    toggleFavorite,
    deleteSelectedPage,
    createPage,
    scheduleSave,
  } = useWikiStore(
    useShallow(state => ({
      selectedPage: state.selectedPage,
      draft: state.draft,
      loading: state.loading,
      saving: state.saving,
      dirty: state.dirty,
      error: state.error,
      pages: state.pages,
      updateDraft: state.updateDraft,
      toggleFavorite: state.toggleFavorite,
      deleteSelectedPage: state.deleteSelectedPage,
      createPage: state.createPage,
      scheduleSave: state.scheduleSave,
    })),
  )

  useEffect(() => {
    if (dirty && token) scheduleSave(token)
  }, [dirty, token, scheduleSave])

  // Register copilot insert action so the sidebar can apply AI edits directly to this editor
  useEffect(() => {
    if (!selectedPage?.canEdit) {
      useCopilotContextStore.getState().setInsertAction(null)
      return
    }
    useCopilotContextStore.getState().setInsertAction({
      label: 'Apply to wiki page',
      type: 'wiki',
      pageId: selectedPage.id,
      execute: async (markdown: string) => {
        await editorRef.current?.replaceMarkdown(markdown, 'Copilot suggestion')
      },
    })
    return () => { useCopilotContextStore.getState().setInsertAction(null) }
  }, [selectedPage?.id, selectedPage?.canEdit])

  const navigate = useCallback((path: string) => router.replace(path), [router])

  function handleDeletePage() {
    if (!token) return
    deleteSelectedPage(token, params.orgSlug, navigate)
  }

  function handleToggleFavorite() {
    if (!token) return
    toggleFavorite(token)
  }

  function handleCreatePage(visibility: WikiPageVisibility) {
    if (!token) return
    const dept = departments[0]
    createPage(token, params.orgSlug, visibility, dept?.id ?? null, dept?.name ?? null, path => router.push(path))
  }

  const coverColor = localCoverColor !== undefined ? localCoverColor : (selectedPage?.coverColor ?? null)

  if (loading && !selectedPage) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  if (!selectedPage) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-divider bg-panel text-muted">
          <FileText className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-primary-text">Create your wiki</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-content">
          Start with a private note or publish a workspace page for policies, specs, and team docs.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCreatePage('PRIVATE')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#37352f] px-4 text-sm font-medium text-white hover:bg-[#2f2d28]"
          >
            <Lock className="h-4 w-4" />
            Private page
          </button>
          <button
            type="button"
            onClick={() => handleCreatePage('WORKSPACE')}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-divider bg-panel px-4 text-sm font-medium text-content hover:bg-ui"
          >
            <Users className="h-4 w-4" />
            Workspace page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-[#ffffff] text-[#37352f] [color-scheme:light]">
      {error && (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Top action bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#f0efed] bg-white/80 px-4 backdrop-blur-sm">
        {/* Left: save status */}
        <div className="flex items-center gap-1.5 text-[12px] text-[#b0aea8]">
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving…</span>
            </>
          ) : dirty ? (
            <span>Unsaved changes</span>
          ) : (
            <span className="text-[#c7c5bf]">Saved</span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={selectedPage.favorite ? 'Remove from favorites' : 'Add to favorites'}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#f1f1ef]',
              selectedPage.favorite ? 'text-amber-400' : 'text-[#b0aea8]',
            )}
          >
            <Star className="h-3.5 w-3.5" fill={selectedPage.favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => setSharePanelOpen(open => !open)}
            title="Share"
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors',
              sharePanelOpen
                ? 'bg-[#ededeb] text-[#37352f]'
                : 'text-[#787774] hover:bg-[#f1f1ef]',
            )}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </button>
          {selectedPage.canEdit && (
            <button
              type="button"
              onClick={handleDeletePage}
              title="Delete page"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#b0aea8] transition-colors hover:bg-red-50 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="More options"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#b0aea8] transition-colors hover:bg-[#f1f1ef]"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Page content — scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Cover color strip */}
        {coverColor && (
          <div
            className="h-36 w-full"
            style={{ backgroundColor: coverColor }}
          />
        )}

        <article className={cn(
          'mx-auto w-full max-w-[720px] pb-40 max-lg:px-12 max-sm:px-5',
          coverColor ? 'px-20 pt-6' : 'px-20 pt-16',
        )}>

          {/* Page icon + cover actions */}
          <div className="group/header mb-1 flex items-end justify-between">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-lg bg-[#f1f1ef] text-[#9b9a97] transition-colors hover:bg-[#ebebea]">
              <FileText className="h-6 w-6" />
            </div>

            {/* Cover color picker — appears on hover */}
            {selectedPage.canEdit && (
              <div className={cn(
                'flex items-center gap-2 opacity-0 transition-opacity group-hover/header:opacity-100',
                !coverColor && 'mb-1',
              )}>
                {!coverColor && (
                  <span className="text-[11px] font-medium text-[#b0aea8]">Add cover</span>
                )}
                <div className="flex gap-1">
                  {COVER_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setLocalCoverColor(color)}
                      title={color}
                      className={cn(
                        'h-4 w-4 rounded-full border-2 transition-transform hover:scale-110',
                        coverColor === color ? 'border-[#37352f]' : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {coverColor && (
                    <button
                      type="button"
                      onClick={() => setLocalCoverColor(null)}
                      className="h-4 w-4 rounded-full border-2 border-transparent bg-[#e9e9e7] text-[10px] leading-none text-[#9b9a97] hover:bg-[#deded9]"
                      title="Remove cover"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <input
            value={draft.title}
            onChange={event => updateDraft({ title: event.target.value })}
            disabled={!selectedPage.canEdit}
            placeholder="Untitled"
            className="mt-4 mb-1 block w-full border-none bg-transparent text-[32px] font-bold leading-snug tracking-[-0.02em] text-[#1a1a1a] outline-none placeholder:text-[#d3d1cb] disabled:cursor-default disabled:opacity-90"
          />

          {/* Metadata row — Notion-style property rows */}
          <div className="mb-8 mt-3 flex flex-col gap-0.5 border-t border-[#f0efed] pt-3">
            <div className="flex items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-[#f7f6f3]">
              <span className="flex w-28 shrink-0 items-center gap-1.5 text-[12px] text-[#9b9a97]">
                {visibilityIcon(draft.visibility)}
                <span>Visibility</span>
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={draft.visibility}
                  onChange={event => updateDraft({ visibility: event.target.value as WikiPageVisibility })}
                  disabled={!selectedPage.canEdit}
                  className="h-6 cursor-pointer rounded border border-transparent bg-transparent px-1 text-[13px] text-[#37352f] outline-none hover:bg-[#ededeb] focus:bg-[#ededeb] disabled:cursor-default disabled:opacity-70"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="WORKSPACE">Workspace</option>
                  {isAdmin && <option value="DEPARTMENT">Department</option>}
                </select>
                {draft.visibility === 'DEPARTMENT' && (
                  <select
                    value={draft.departmentId}
                    onChange={event => updateDraft({ departmentId: event.target.value })}
                    disabled={!selectedPage.canEdit}
                    className="h-6 cursor-pointer rounded border border-transparent bg-transparent px-1 text-[13px] text-[#37352f] outline-none hover:bg-[#ededeb] focus:bg-[#ededeb] disabled:cursor-default disabled:opacity-70"
                  >
                    <option value="">Select department…</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Block editor */}
          <NotionBlockEditor
            ref={editorRef}
            key={selectedPage.id}
            content={draft.contentJson}
            markdownFallback={draft.contentMarkdown}
            editable={selectedPage.canEdit}
            onChange={(contentJson, contentMarkdown) => updateDraft({ contentJson, contentMarkdown })}
            pages={pages
              .filter(p => p.id !== selectedPage.id)
              .map(p => ({ id: p.id, title: p.title, url: `/${params.orgSlug}/wiki/${encodeURIComponent(p.id)}` }))}
            aiContext={selectedPage.canEdit && token && currentOrg && user ? ({
              token,
              pageId: selectedPage.id,
              pageTitle: draft.title || selectedPage.title || 'Untitled',
              authContext: {
                orgId: currentOrg.id,
                userId: user.id,
                role: currentOrg.role ?? null,
                orgName: currentOrg.name ?? null,
                orgSlug: currentOrg.slug ?? null,
              },
            } satisfies AiCommandBarContext) : undefined}
          />

        </article>
      </div>

      {sharePanelOpen && selectedPage && (
        <WikiSharePanel
          page={selectedPage}
          onClose={() => setSharePanelOpen(false)}
        />
      )}
    </div>
  )
}
