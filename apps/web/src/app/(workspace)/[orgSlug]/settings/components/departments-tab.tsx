'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { orgApi } from '@serenity/api'
import type { Department } from '@serenity/api'
import { Plus, Building2, Trash2, Loader2 } from 'lucide-react'

interface DepartmentsTabProps {
  isOwner: boolean
}

export function DepartmentsTab({ isOwner }: DepartmentsTabProps) {
  const auth = useAuth()
  const token = auth.token

  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newDepartmentName, setNewDepartmentName] = useState('')

  useEffect(() => {
    if (token && auth.currentOrg) {
      loadDepartments()
    }
  }, [token, auth.currentOrg])

  async function loadDepartments() {
    if (!token || !auth.currentOrg) return
    try {
      const res = await orgApi.listDepartments(auth.currentOrg.id, token)
      setDepartments(res.departments)
    } catch (err) {
      console.error('Failed to load departments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!token || !auth.currentOrg || !newDepartmentName.trim()) return
    setCreateLoading(true)
    setCreateError('')
    try {
      await orgApi.createDepartment(auth.currentOrg.id, token, { name: newDepartmentName.trim() })
      setShowCreateModal(false)
      setNewDepartmentName('')
      loadDepartments()
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create department')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDelete(departmentId: string) {
    if (!token || !auth.currentOrg) return
    try {
      await orgApi.deleteDepartment(auth.currentOrg.id, token, departmentId)
      loadDepartments()
    } catch (err) {
      console.error('Failed to delete department:', err)
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-brand">Departments</h2>
          <p className="text-xs text-brand-muted mt-1">
            Organize your team into departments for better management.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Department
          </button>
        )}
      </div>

      {/* Departments List */}
      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-brand-surface/20 rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-brand-muted" />
          </div>
          <h3 className="font-semibold text-brand">No departments yet</h3>
          <p className="text-brand-muted text-sm mt-1 text-center max-w-xs">
            Create departments to organize your team members.
          </p>
          {isOwner && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="flex items-center justify-between p-4 bg-brand-surface/20 rounded-lg border border-brand-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand">{dept.name}</p>
                  <p className="text-xs text-brand-muted">{dept.memberCount} members</p>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="p-2 text-brand-muted hover:text-danger rounded-lg hover:bg-danger/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-brand mb-4">Create Department</h3>
            
            {createError && (
              <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand mb-1">Department Name</label>
              <input
                type="text"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm"
                placeholder="e.g., AI Team, Platform Team"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading || !newDepartmentName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-50"
              >
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}