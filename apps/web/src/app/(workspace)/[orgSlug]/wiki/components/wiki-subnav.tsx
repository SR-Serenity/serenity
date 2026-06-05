'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import {
  FileText,
  FolderOpen,
  Globe,
  Lock,
  Plus,
  Search,
  Share2,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useWikiStore } from '@/stores/wiki-store'
import { ShellDivider } from '@/app/(workspace)/components/workspace-shell/workspace-shell-primitives'
import type { WikiPage } from '@serenity/api'

const EMPTY_DEPARTMENTS: never[] = []

export function WikiSubnav() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const { token, currentOrg, user } = useAuthStore(
    useShallow(state => ({ token: state.token, currentOrg: state.currentOrg, user: state.user })),
  )
  const orgId = currentOrg?.id
  const { departments, myDeptId } = useWorkspaceStore(
    useShallow(state => {
      const depts = orgId ? state.departmentsByOrgId[orgId] ?? EMPTY_DEPARTMENTS : EMPTY_DEPARTMENTS
      const members = orgId ? state.membersByOrgId[orgId] ?? [] : []
      const me = members.find(m => m.id === user?.id)
      return {
        departments: depts,
        myDeptId: me?.departmentId ?? null,
      }
    }),
  )
  const myDepartmentIds = useMemo(() => (myDeptId ? [myDeptId] : []), [myDeptId])
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

  const currentUserId = user?.id

  const { privatePages, deptPageMap, sharedPages, workspacePages, favoritePages } = useMemo(() => {
    const privatePages: WikiPage[] = []
    const deptPageMap = new Map<string, WikiPage[]>()
    const sharedPages: WikiPage[] = []
    const workspacePages: WikiPage[] = []
    const favoritePages: WikiPage[] = filteredPages.filter(p => p.favorite)

    for (const page of filteredPages) {
      const isSharedWithMe = currentUserId
        ? page.shares.some(s => s.userId === currentUserId)
        : false

      if (page.visibility === 'PRIVATE') {
        privatePages.push(page)
      } else if (page.visibility === 'DEPARTMENT' && page.departmentId) {
        const isMyDept = myDepartmentIds.includes(page.departmentId)
        if (isMyDept) {
          const bucket = deptPageMap.get(page.departmentId) ?? []
          bucket.push(page)
          deptPageMap.set(page.departmentId, bucket)
        } else if (isSharedWithMe) {
          sharedPages.push(page)
        }
      } else if (page.visibility === 'WORKSPACE') {
        if (isSharedWithMe) {
          sharedPages.push(page)
        } else {
          workspacePages.push(page)
        }
      }
    }

    return { privatePages, deptPageMap, sharedPages, workspacePages, favoritePages }
  }, [filteredPages, currentUserId, myDepartmentIds])

  function navigate(path: string) {
    router.push(path)
  }

  function handleSelectPage(pageId: string) {
    if (!token) return
    selectPage(token, params.orgSlug, pageId, navigate)
  }

  function handleCreatePrivate() {
    if (!token) return
    createPage(token, params.orgSlug, 'PRIVATE', null, null, navigate)
  }

  function handleCreateInDept(deptId: string, deptName: string) {
    if (!token) return
    createPage(token, params.orgSlug, 'DEPARTMENT', deptId, deptName, navigate)
  }

  function handleCreateWorkspace() {
    if (!token) return
    createPage(token, params.orgSlug, 'WORKSPACE', null, null, navigate)
  }

  const myDepts = departments.filter(d => myDepartmentIds.includes(d.id))

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-5">
        <h2 className="text-base font-medium text-primary-text">Wiki</h2>
        <button
          type="button"
          title="New private page"
          onClick={handleCreatePrivate}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ui hover:text-caption"
        >
          <Plus className="h-4 w-4" />
        </button>
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
          <SubnavSection title="Favorites" icon={<Star className="h-3 w-3" />}>
            <PageList
              orgSlug={params.orgSlug}
              pages={favoritePages}
              activeId={selectedPage?.id}
              onSelect={handleSelectPage}
            />
          </SubnavSection>
        )}

        <SubnavSection
          title="Private"
          icon={<Lock className="h-3 w-3" />}
          onAdd={handleCreatePrivate}
        >
          {privatePages.length === 0 ? (
            <EmptyHint>No private pages yet</EmptyHint>
          ) : (
            <PageList
              orgSlug={params.orgSlug}
              pages={privatePages}
              activeId={selectedPage?.id}
              onSelect={handleSelectPage}
            />
          )}
        </SubnavSection>

        {myDepts.map(dept => (
          <SubnavSection
            key={dept.id}
            title={dept.name}
            icon={<FolderOpen className="h-3 w-3" />}
            onAdd={() => handleCreateInDept(dept.id, dept.name)}
          >
            {(deptPageMap.get(dept.id) ?? []).length === 0 ? (
              <EmptyHint>No pages yet</EmptyHint>
            ) : (
              <PageList
                orgSlug={params.orgSlug}
                pages={deptPageMap.get(dept.id) ?? []}
                activeId={selectedPage?.id}
                onSelect={handleSelectPage}
              />
            )}
          </SubnavSection>
        ))}

        {workspacePages.length > 0 && (
          <SubnavSection
            title="Workspace"
            icon={<Globe className="h-3 w-3" />}
            onAdd={handleCreateWorkspace}
          >
            <PageList
              orgSlug={params.orgSlug}
              pages={workspacePages}
              activeId={selectedPage?.id}
              onSelect={handleSelectPage}
            />
          </SubnavSection>
        )}

        {sharedPages.length > 0 && (
          <SubnavSection title="Shared with me" icon={<Share2 className="h-3 w-3" />}>
            <PageList
              orgSlug={params.orgSlug}
              pages={sharedPages}
              activeId={selectedPage?.id}
              onSelect={handleSelectPage}
              showDeptBadge
            />
          </SubnavSection>
        )}
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
            title={`Add page`}
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
  return <p className="px-3 py-1 text-xs text-muted">{children}</p>
}

function PageList({
  orgSlug,
  pages,
  activeId,
  onSelect,
  showDeptBadge = false,
}: {
  orgSlug: string
  pages: WikiPage[]
  activeId?: string
  onSelect: (pageId: string) => void
  showDeptBadge?: boolean
}) {
  return (
    <div>
      {pages.map(page => (
        <PageRow
          key={page.id}
          orgSlug={orgSlug}
          page={page}
          isActive={activeId === page.id}
          onSelect={onSelect}
          showDeptBadge={showDeptBadge}
        />
      ))}
    </div>
  )
}

function PageRow({
  orgSlug,
  page,
  isActive,
  onSelect,
  showDeptBadge,
}: {
  orgSlug: string
  page: WikiPage
  isActive: boolean
  onSelect: (pageId: string) => void
  showDeptBadge: boolean
}) {
  return (
    <div
      className={cn(
        'group flex h-8 min-h-8 cursor-pointer select-none items-center gap-1 rounded-lg px-2',
        'transition-colors duration-100',
        isActive ? 'bg-primary/10 text-primary-text' : 'text-content hover:bg-ui',
      )}
    >
      <Link
        href={`/${orgSlug}/wiki/${encodeURIComponent(page.id)}`}
        onClick={event => {
          event.preventDefault()
          onSelect(page.id)
        }}
        className="flex min-w-0 flex-1 items-center gap-1.5"
      >
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
        <span className={cn('truncate text-sm', isActive ? 'font-medium' : '')}>
          {page.title || 'Untitled'}
        </span>
        {showDeptBadge && page.departmentName && (
          <span className="ml-auto shrink-0 rounded bg-ui px-1.5 py-0.5 text-[10px] text-muted">
            {page.departmentName}
          </span>
        )}
      </Link>
    </div>
  )
}
