'use client'

import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { orgApi } from '@serenity/api'
import type { Department } from '@serenity/api'
import { Plus, Building2, Trash2, Loader2 } from 'lucide-react'

interface DepartmentsTabProps {
  isOwner: boolean
}

export function DepartmentsTab({ isOwner }: DepartmentsTabProps) {
  const { token, currentOrg } = useAuthStore(
    useShallow((state) => ({
      token: state.token,
      currentOrg: state.currentOrg,
    })),
  )

  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newDepartmentName, setNewDepartmentName] = useState('')

  useEffect(() => {
    if (token && currentOrg) {
      loadDepartments()
    }
  }, [token, currentOrg])

  async function loadDepartments() {
    if (!token || !currentOrg) return
    try {
      const res = await orgApi.listDepartments(currentOrg.id, token)
      setDepartments(res.departments)
    } catch (err) {
      console.error('Failed to load departments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!token || !currentOrg || !newDepartmentName.trim()) return
    setCreateLoading(true)
    setCreateError('')
    try {
      await orgApi.createDepartment(currentOrg.id, token, { name: newDepartmentName.trim() })
      setShowCreateModal(false)
      setNewDepartmentName('')
      loadDepartments()
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create department')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDelete(departmentId: string) {
    if (!token || !currentOrg) return
    try {
      await orgApi.deleteDepartment(currentOrg.id, token, departmentId)
      loadDepartments()
    } catch (err) {
      console.error('Failed to delete department:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="px-8 py-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-primary">Departments</h3>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {/* Departments List */}
      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm">
            <Building2 className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-900">No departments yet</h3>
          <p className="text-gray-500 text-sm mt-1 text-center max-w-xs">
            Organize your team members into departments for better clarity.
          </p>
          {isOwner && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 text-primary font-bold text-sm hover:text-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first department
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl group transition-all hover:shadow-md hover:border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{dept.name}</p>
                  <p className="text-xs font-medium text-gray-500">{dept.memberCount} members</p>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Delete Department"
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-8 animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Create Department</h3>
              <p className="text-sm text-gray-500">Add a new department to organize your team.</p>
            </div>
            
            {createError && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-2xl">
                {createError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Department Name</label>
              <input
                type="text"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-400"
                placeholder="e.g., Engineering, Marketing"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading || !newDepartmentName.trim()}
                className="flex-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none active:scale-95 cursor-pointer flex items-center justify-center"
              >
                {createLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
