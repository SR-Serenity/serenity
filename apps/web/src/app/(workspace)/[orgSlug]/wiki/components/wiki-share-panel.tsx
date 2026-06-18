'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Globe, Lock, Search, Users, X } from 'lucide-react'
import type { Member, WikiPage, WikiPageVisibility, WikiSharePermission } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useWikiStore } from '@/stores/wiki-store'
import { DiceBearAvatar } from '@/components/dicebear-avatar'

const PERMISSION_LABELS: Record<WikiSharePermission, string> = {
  VIEW: 'Can view',
  COMMENT: 'Can comment',
  EDIT: 'Can edit',
}

function visibilityLabel(visibility: WikiPageVisibility) {
  if (visibility === 'PRIVATE') return 'Private — only you and invited people'
  if (visibility === 'DEPARTMENT') return 'Department — all department members'
  return 'Workspace — all org members'
}

function visibilityIcon(visibility: WikiPageVisibility) {
  if (visibility === 'PRIVATE') return <Lock className="h-3.5 w-3.5" />
  if (visibility === 'DEPARTMENT') return <Users className="h-3.5 w-3.5" />
  return <Globe className="h-3.5 w-3.5" />
}

const EMPTY_MEMBERS: Member[] = []

export function WikiSharePanel({
  page,
  onClose,
}: {
  page: WikiPage
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [addPermission, setAddPermission] = useState<WikiSharePermission>('VIEW')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { token, currentOrg, userId } = useAuthStore(
    useShallow(state => ({
      token: state.token,
      currentOrg: state.currentOrg,
      userId: state.user?.id,
    })),
  )
  const orgId = currentOrg?.id
  const { members, loadMembers } = useWorkspaceStore(
    useShallow(state => ({
      members: orgId ? state.membersByOrgId[orgId] ?? EMPTY_MEMBERS : EMPTY_MEMBERS,
      loadMembers: state.loadMembers,
    })),
  )
  const { shares, sharesLoading, addShare, updateShare, removeShare } = useWikiStore(
    useShallow(state => ({
      shares: state.shares,
      sharesLoading: state.sharesLoading,
      addShare: state.addShare,
      updateShare: state.updateShare,
      removeShare: state.removeShare,
    })),
  )

  useEffect(() => {
    void loadMembers(orgId, token)
  }, [loadMembers, orgId, token])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const sharedUserIds = useMemo(() => new Set(shares.map(s => s.userId)), [shares])

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return members.filter(m =>
      m.id !== userId &&
      m.id !== page.createdById &&
      !sharedUserIds.has(m.id) &&
      (m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)),
    ).slice(0, 6)
  }, [members, searchQuery, userId, page.createdById, sharedUserIds])

  const isAdmin = currentOrg?.role === 'OWNER' || currentOrg?.role === 'ADMIN'
  const canShare = page.createdById === userId || isAdmin ||
    shares.some(s => s.userId === userId && s.permission === 'EDIT')

  const creator = members.find(m => m.id === page.createdById)

  function handleAddShare(targetUserId: string, displayName: string) {
    if (!token) return
    setSearchQuery('')
    setShowSuggestions(false)
    addShare(token, page.id, targetUserId, addPermission)
  }

  function handleUpdateShare(targetUserId: string, permission: WikiSharePermission) {
    if (!token) return
    updateShare(token, page.id, targetUserId, permission)
  }

  function handleRemoveShare(targetUserId: string) {
    if (!token) return
    removeShare(token, page.id, targetUserId)
  }

  return (
    <div
      ref={panelRef}
      className="absolute inset-y-0 right-0 z-20 flex w-[340px] flex-col border-l border-[#e9e9e7] bg-white shadow-xl [color-scheme:light]"
    >
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#e9e9e7] px-4">
        <span className="text-sm font-semibold text-[#37352f]">Share</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-[#9b9a97] hover:bg-[#f1f1ef] hover:text-[#37352f]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Add people */}
        {canShare && (
          <div className="border-b border-[#e9e9e7] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9a97]">
              Invite people
            </p>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9b9a97]" />
                  <input
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search members..."
                    className="h-8 w-full rounded-md border border-[#e9e9e7] pl-7 pr-2 text-sm text-[#37352f] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-[#e9e9e7] bg-white shadow-md">
                      {suggestions.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleAddShare(member.id, member.displayName)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#f7f7f5]"
                        >
                          <DiceBearAvatar seed={member.id} name={member.displayName} className="h-6 w-6" />
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[#37352f]">{member.displayName}</p>
                            <p className="truncate text-xs text-[#9b9a97]">{member.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={addPermission}
                  onChange={e => setAddPermission(e.target.value as WikiSharePermission)}
                  className="h-8 rounded-md border border-[#e9e9e7] bg-white px-2 text-sm text-[#37352f] outline-none focus:border-blue-400"
                >
                  {(Object.keys(PERMISSION_LABELS) as WikiSharePermission[]).map(perm => (
                    <option key={perm} value={perm}>{PERMISSION_LABELS[perm]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Who has access */}
        <div className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9a97]">
            Who has access
          </p>

          {/* Creator */}
          <div className="flex h-9 items-center gap-2">
            <DiceBearAvatar
              seed={page.createdById}
              name={creator?.displayName ?? 'Unknown'}
              className="h-7 w-7"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#37352f]">
                {creator?.displayName ?? 'Unknown'}
                {page.createdById === userId && <span className="ml-1 text-[#9b9a97]">(you)</span>}
              </p>
            </div>
            <span className="shrink-0 text-xs text-[#9b9a97]">Owner</span>
          </div>

          {/* Shares */}
          {sharesLoading ? (
            <p className="mt-2 text-xs text-[#9b9a97]">Loading…</p>
          ) : shares.length === 0 ? (
            <p className="mt-2 text-xs text-[#9b9a97]">No one else has access yet.</p>
          ) : (
            shares.map(share => (
              <div key={share.userId} className="flex h-9 items-center gap-2">
                <DiceBearAvatar seed={share.userId} name={share.userName} className="h-7 w-7" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#37352f]">
                    {share.userName}
                    {share.userId === userId && <span className="ml-1 text-[#9b9a97]">(you)</span>}
                  </p>
                </div>
                {canShare ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <select
                      value={share.permission}
                      onChange={e => handleUpdateShare(share.userId, e.target.value as WikiSharePermission)}
                      className="h-6 rounded border border-transparent bg-transparent px-1 text-xs text-[#787774] outline-none hover:bg-[#f1f1ef] focus:border-blue-400"
                    >
                      {(Object.keys(PERMISSION_LABELS) as WikiSharePermission[]).map(perm => (
                        <option key={perm} value={perm}>{PERMISSION_LABELS[perm]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveShare(share.userId)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#9b9a97] hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="shrink-0 text-xs text-[#9b9a97]">{PERMISSION_LABELS[share.permission]}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* General access */}
        <div className="border-t border-[#e9e9e7] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9b9a97]">
            General access
          </p>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[#787774]">{visibilityIcon(page.visibility)}</span>
            <p className="text-sm text-[#787774]">{visibilityLabel(page.visibility)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
