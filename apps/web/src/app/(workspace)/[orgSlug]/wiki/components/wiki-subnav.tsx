'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import {
  ChevronRight,
  FileText,
  Globe,
  Lock,
  Plus,
  Search,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import {
  buildPageTree,
  isOptimisticPageId,
  useWikiStore,
  type PageTreeNode,
} from '@/stores/wiki-store'
import { ShellDivider } from '@/app/(workspace)/components/workspace-shell/workspace-shell-primitives'

const EMPTY_DEPARTMENTS: never[] = []

export function WikiSubnav() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const { token, currentOrg } = useAuthStore(
    useShallow(state => ({ token: state.token, currentOrg: state.currentOrg })),
  )
  const orgId = currentOrg?.id
  const { departments } = useWorkspaceStore(
    useShallow(state => ({
      departments: orgId ? state.departmentsByOrgId[orgId] ?? EMPTY_DEPARTMENTS : EMPTY_DEPARTMENTS,
    })),
  )
  const { pages, selectedPage, query, createPage, selectPage, setQuery } = useWikiStore(
    useShallow(state => ({
      pages: state.pages,
      selectedPage: state.selectedPage,
      query: state.query,
      createPage: state.createPage,
      selectPage: state.selectPage,
      setQuery: state.setQuery,
    })),
  )

  const filteredPages = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return pages
    return pages.filter(page =>
      page.title.toLowerCase().includes(value) ||
      page.contentMarkdown.toLowerCase().includes(value),
    )
  }, [pages, query])

  const privatePages = filteredPages.filter(page => page.visibility === 'PRIVATE')
  const teamPages = filteredPages.filter(page => page.visibility !== 'PRIVATE')
  const favoritePages = filteredPages.filter(page => page.favorite)

  function navigate(path: string) {
    router.push(path)
  }

  function handleSelectPage(pageId: string) {
    if (!token) return
    selectPage(token, params.orgSlug, pageId, navigate)
  }

  function handleCreatePage(visibility: 'PRIVATE' | 'WORKSPACE', parentId?: string | null) {
    if (!token) return
    const dept = departments[0]
    createPage(token, params.orgSlug, visibility, dept?.id ?? null, dept?.name ?? null, navigate, parentId)
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-5">
        <h2 className="text-base font-medium text-primary-text">Wiki</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="New page"
            onClick={() => handleCreatePage('PRIVATE')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ui hover:text-caption"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ShellDivider />

      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search pages..."
            className="h-8 w-full rounded-lg border border-transparent bg-ui pl-7 pr-2 text-sm text-content outline-none placeholder:text-muted focus:border-focus focus:bg-panel"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
        {favoritePages.length > 0 && (
          <SubnavSection
            title="Favorites"
            icon={<Star className="h-3 w-3" />}
          >
            <PageTree
              orgSlug={params.orgSlug}
              nodes={buildPageTree(favoritePages)}
              activeId={selectedPage?.id}
              onSelect={handleSelectPage}
              onAddChild={pageId => handleCreatePage('PRIVATE', pageId)}
            />
          </SubnavSection>
        )}

        <SubnavSection
          title="Private"
          icon={<Lock className="h-3 w-3" />}
          onAdd={() => handleCreatePage('PRIVATE')}
        >
          {privatePages.length === 0 ? (
            <EmptyHint>No private pages yet</EmptyHint>
          ) : (
            <PageTree
              orgSlug={params.orgSlug}
              nodes={buildPageTree(privatePages)}
              activeId={selectedPage?.id}
              onSelect={handleSelectPage}
              onAddChild={pageId => handleCreatePage('PRIVATE', pageId)}
            />
          )}
        </SubnavSection>

        <SubnavSection
          title="Teamspace"
          icon={<Globe className="h-3 w-3" />}
          onAdd={() => handleCreatePage('WORKSPACE')}
        >
          {teamPages.length === 0 ? (
            <EmptyHint>No shared pages yet</EmptyHint>
          ) : (
            <PageTree
              orgSlug={params.orgSlug}
              nodes={buildPageTree(teamPages)}
              activeId={selectedPage?.id}
              onSelect={handleSelectPage}
              onAddChild={pageId => handleCreatePage('WORKSPACE', pageId)}
            />
          )}
        </SubnavSection>
      </div>
    </div>
  )
}

function SubnavSection({
  title,
  icon,
  onAdd,
  children,
}: {
  title: string
  icon?: React.ReactNode
  onAdd?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="mt-4">
      <div className="mb-0.5 flex h-7 items-center justify-between px-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {icon}
          <span>{title}</span>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            title={`Add ${title} page`}
            className="flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-ui hover:text-caption"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-1 text-xs text-muted">{children}</p>
  )
}

function PageTree({
  orgSlug,
  nodes,
  activeId,
  onSelect,
  onAddChild,
}: {
  orgSlug: string
  nodes: PageTreeNode[]
  activeId?: string
  onSelect: (pageId: string) => void
  onAddChild: (pageId: string) => void
}) {
  return (
    <div>
      {nodes.map(node => (
        <PageTreeRow
          key={node.id}
          orgSlug={orgSlug}
          node={node}
          activeId={activeId}
          depth={0}
          onSelect={onSelect}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  )
}

function PageTreeRow({
  orgSlug,
  node,
  activeId,
  depth,
  onSelect,
  onAddChild,
}: {
  orgSlug: string
  node: PageTreeNode
  activeId?: string
  depth: number
  onSelect: (pageId: string) => void
  onAddChild: (pageId: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isActive = activeId === node.id
  const [open, setOpen] = useState(depth < 1)

  return (
    <>
      <div
        className={cn(
          'group flex h-8 min-h-8 cursor-pointer select-none items-center gap-1 rounded-lg px-1',
          'transition-colors duration-100',
          isActive ? 'bg-primary/10 text-primary-text' : 'text-content hover:bg-ui',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-ui-hover',
            !hasChildren && 'opacity-0 pointer-events-none',
          )}
        >
          <ChevronRight className={cn('h-3 w-3 transition-transform duration-100', open && 'rotate-90')} />
        </button>

        <Link
          href={`/${orgSlug}/wiki/${encodeURIComponent(node.id)}`}
          onClick={event => {
            event.preventDefault()
            onSelect(node.id)
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className={cn('truncate text-sm', isActive ? 'font-medium' : '')}>
            {node.title || 'Untitled'}
          </span>
        </Link>

        {!isOptimisticPageId(node.id) && (
          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            title="Add nested page"
            className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:bg-ui-hover hover:text-caption group-hover:flex"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && hasChildren && node.children.map(child => (
        <PageTreeRow
          key={child.id}
          orgSlug={orgSlug}
          node={child}
          activeId={activeId}
          depth={depth + 1}
          onSelect={onSelect}
          onAddChild={onAddChild}
        />
      ))}
    </>
  )
}

