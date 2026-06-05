'use client'

import { useCallback, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { orgApi } from '@serenity/api'
import type { CreateInvitationResponse, Department, Invitation, Member, WorkspaceRole } from '@serenity/api'
import { Plus, Mail, MoreHorizontal, UserCog, Trash2, Loader2, Copy, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MembersTabProps {
  isOwner: boolean
}

const EMPTY_MEMBERS: Member[] = []
const EMPTY_DEPARTMENTS: Department[] = []
const EMPTY_INVITATIONS: Invitation[] = []

function toLocalInviteLink(inviteUrl?: string): string {
  if (!inviteUrl || typeof window === 'undefined') {
    return inviteUrl || ''
  }

  try {
    return `${window.location.origin}${new URL(inviteUrl).pathname}`
  } catch {
    return inviteUrl
  }
}

export function MembersTab({ isOwner }: MembersTabProps) {
  const { token, currentOrg } = useAuthStore(
    useShallow((state) => ({
      token: state.token,
      currentOrg: state.currentOrg,
    })),
  )
  const orgId = currentOrg?.id
  const {
    members,
    departments,
    invitations,
    loadOrgData,
  } = useWorkspaceStore(
    useShallow((state) => ({
      members: orgId ? state.membersByOrgId[orgId] ?? EMPTY_MEMBERS : EMPTY_MEMBERS,
      departments: orgId ? state.departmentsByOrgId[orgId] ?? EMPTY_DEPARTMENTS : EMPTY_DEPARTMENTS,
      invitations: orgId ? state.invitationsByOrgId[orgId] ?? EMPTY_INVITATIONS : EMPTY_INVITATIONS,
      loadOrgData: state.loadOrgData,
    })),
  )
  const userRole = currentOrg?.role
  // Show invite button for owner, or for testing purposes
  const showInvite = isOwner || userRole === 'ADMIN' || userRole === 'OWNER'

  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [createdInvite, setCreatedInvite] = useState<CreateInvitationResponse | null>(null)
  const [copiedInviteLink, setCopiedInviteLink] = useState(false)

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'MEMBER' as WorkspaceRole,
    departmentId: '',
  })

  const inviteLink = toLocalInviteLink(createdInvite?.inviteUrl)

  const loadData = useCallback(async (options?: { force?: boolean }) => {
    if (!token || !currentOrg) {
      return
    }
    setLoading(true)
    try {
      await loadOrgData(currentOrg.id, token, options)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentOrg, loadOrgData, token])

  useEffect(() => {
    if (token && currentOrg) {
      void loadData()
    }
  }, [currentOrg, loadData, token])

  async function handleInvite() {
    if (!token || !currentOrg) {
      return
    }
    setInviteLoading(true)
    setInviteError('')
    try {
      const invitation = await orgApi.createInvitation(currentOrg.id, token, {
        email: inviteForm.email,
        role: inviteForm.role,
        departmentId: inviteForm.departmentId || undefined,
      })
      setCreatedInvite(invitation)
      setInviteForm({ email: '', role: 'MEMBER', departmentId: '' })
      await loadData({ force: true })
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  function closeInviteModal() {
    setShowInviteModal(false)
    setInviteError('')
    setCreatedInvite(null)
    setCopiedInviteLink(false)
    setInviteForm({ email: '', role: 'MEMBER', departmentId: '' })
  }

  async function copyInviteLink() {
    if (!inviteLink) {
      return
    }
    await navigator.clipboard.writeText(inviteLink)
    setCopiedInviteLink(true)
    setTimeout(() => setCopiedInviteLink(false), 1800)
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!token || !currentOrg) {
      return
    }
    try {
      await orgApi.revokeInvitation(currentOrg.id, token, invitationId)
      void loadData({ force: true })
    } catch (err) {
      console.error('Failed to revoke invitation:', err)
    }
  }

  async function handleUpdateRole(memberId: string, role: WorkspaceRole) {
    if (!token || !currentOrg) {
      return
    }
    try {
      await orgApi.updateMemberRole(currentOrg.id, token, memberId, role)
      void loadData({ force: true })
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  async function handleUpdateDepartment(memberId: string, departmentId: string | null) {
    if (!token || !currentOrg) {
      return
    }
    try {
      await orgApi.updateMemberDepartment(currentOrg.id, token, memberId, departmentId)
      void loadData({ force: true })
    } catch (err) {
      console.error('Failed to update department:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Pending Invitations */}
      {invitations.length > 0 && showInvite && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-primary mb-3">Pending Invitations</h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 bg-primary/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      {inv.role} {inv.departmentName && `• ${inv.departmentName}`}
                    </p>
                  </div>
                </div>
                {showInvite && (
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary">Team Members</h2>
        {showInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Member</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Department</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Joined</th>
              {isOwner && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.displayName}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isOwner && member.role !== 'OWNER' ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value as WorkspaceRole)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                        member.role === 'OWNER' && 'bg-primary/10 text-primary',
                        member.role === 'ADMIN' && 'bg-blue-50 text-blue-600',
                        member.role === 'MEMBER' && 'bg-gray-100 text-gray-600'
                      )}
                    >
                      <UserCog className="w-3 h-3" />
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isOwner ? (
                    <select
                      value={member.departmentId || ''}
                      onChange={(e) => handleUpdateDepartment(member.id, e.target.value || null)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="">No department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-gray-500">
                      {member.departmentName || '—'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {isOwner && (
                  <td className="px-4 py-3">
                    <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-brand">Invite member</h3>
                <p className="mt-1 text-sm text-brand-muted">
                  Send invitation by email, or copy link for local onboarding.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInviteModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg">
                {inviteError}
              </div>
            )}

            {createdInvite ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Invitation ready
                  </div>
                  <p className="mt-1 text-sm text-green-700">
                    {createdInvite.email} can use this link to join {createdInvite.orgName}.
                  </p>
                </div>

                {inviteLink && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand">Invite link</label>
                    <div className="flex gap-2">
                      <input
                        value={inviteLink}
                        readOnly
                        className="min-w-0 flex-1 rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-muted"
                      />
                      <button
                        type="button"
                        onClick={copyInviteLink}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand hover:bg-gray-50"
                      >
                        <Copy className="h-4 w-4" />
                        {copiedInviteLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInvite(null)
                      setCopiedInviteLink(false)
                    }}
                    className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand"
                  >
                    Invite another
                  </button>
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand mb-1">Email</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm"
                      placeholder="colleague@company.com"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand mb-1">Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as WorkspaceRole })}
                      className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm"
                    >
                      <option value="MEMBER">Member</option>
                      {isOwner && <option value="ADMIN">Admin</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand mb-1">
                      Department (optional)
                    </label>
                    <select
                      value={inviteForm.departmentId}
                      onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })}
                      className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm"
                    >
                      <option value="">No department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteForm.email}
                    className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending
                      </>
                    ) : (
                      'Invite member'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
