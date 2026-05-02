'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { orgApi } from '@serenity/api'
import type { Member, Invitation, Department, WorkspaceRole } from '@serenity/api'
import { Plus, Mail, MoreHorizontal, UserCog, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MembersTabProps {
  isOwner: boolean
}

export function MembersTab({ isOwner }: MembersTabProps) {
  const auth = useAuth()
  const token = auth.token
  const userRole = auth.currentOrg?.role
  // Show invite button for owner, or for testing purposes
  const showInvite = isOwner || userRole === 'ADMIN' || userRole === 'OWNER'

  const [members, setMembers] = useState<Member[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'MEMBER' as WorkspaceRole,
    departmentId: '',
  })

  useEffect(() => {
    if (token && auth.currentOrg) {
      loadData()
    }
  }, [token, auth.currentOrg])

  async function loadData() {
    if (!token || !auth.currentOrg) {
      return
    }
    try {
      const [membersRes, departmentsRes, invitationsRes] = await Promise.all([
        orgApi.listMembers(auth.currentOrg.id, token),
        orgApi.listDepartments(auth.currentOrg.id, token),
        orgApi.listInvitations(auth.currentOrg.id, token),
      ])
      setMembers(membersRes.members)
      setDepartments(departmentsRes.departments)
      setInvitations(invitationsRes.invitations)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!token || !auth.currentOrg) {
      return
    }
    setInviteLoading(true)
    setInviteError('')
    try {
      await orgApi.createInvitation(auth.currentOrg.id, token, {
        email: inviteForm.email,
        role: inviteForm.role,
        departmentId: inviteForm.departmentId || undefined,
      })
      setShowInviteModal(false)
      setInviteForm({ email: '', role: 'MEMBER', departmentId: '' })
      loadData()
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!token || !auth.currentOrg) {
      return
    }
    try {
      await orgApi.revokeInvitation(auth.currentOrg.id, token, invitationId)
      loadData()
    } catch (err) {
      console.error('Failed to revoke invitation:', err)
    }
  }

  async function handleUpdateRole(memberId: string, role: WorkspaceRole) {
    if (!token || !auth.currentOrg) {
      return
    }
    try {
      await orgApi.updateMemberRole(auth.currentOrg.id, token, memberId, role)
      loadData()
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  async function handleUpdateDepartment(memberId: string, departmentId: string | null) {
    if (!token || !auth.currentOrg) {
      return
    }
    try {
      await orgApi.updateMemberDepartment(auth.currentOrg.id, token, memberId, departmentId)
      loadData()
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
          <h2 className="text-sm font-semibold text-brand mb-3">Pending Invitations</h2>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 bg-brand-surface/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center">
                    <Mail className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand">{inv.email}</p>
                    <p className="text-xs text-brand-muted">
                      {inv.role} {inv.departmentName && `• ${inv.departmentName}`}
                    </p>
                  </div>
                </div>
                {showInvite && (
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="p-2 text-brand-muted hover:text-danger rounded-lg hover:bg-danger/10"
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
        <h2 className="text-sm font-semibold text-brand">Team Members</h2>
        {showInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="border border-brand-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-brand-surface/20">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted">Member</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted">Department</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted">Joined</th>
              {isOwner && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-brand-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand font-medium text-sm">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand">{member.displayName}</p>
                      <p className="text-xs text-brand-muted">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isOwner && member.role !== 'OWNER' ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value as WorkspaceRole)}
                      className="text-sm border border-brand-border rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                        member.role === 'OWNER' && 'bg-brand-light text-brand',
                        member.role === 'ADMIN' && 'bg-info-light text-info',
                        member.role === 'MEMBER' && 'bg-muted text-brand-muted'
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
                      className="text-sm border border-brand-border rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="">No department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-brand-muted">
                      {member.departmentName || '—'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-brand-muted">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {isOwner && (
                  <td className="px-4 py-3">
                    <button className="p-1 text-brand-muted hover:text-brand rounded">
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
            <h3 className="text-lg font-semibold text-brand mb-4">Invite Member</h3>

            {inviteError && (
              <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg">
                {inviteError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand mb-1">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm"
                  placeholder="colleague@company.com"
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
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading || !inviteForm.email}
                className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
