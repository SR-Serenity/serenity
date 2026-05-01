'use client'

import { useState } from 'react'
import { Settings, Users, Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MembersTab } from './_components/members-tab'
import { DepartmentsTab } from './_components/departments-tab'
import { useAuth } from '@/hooks/use-auth'

const tabs = [
  { id: 'members', label: 'Members', icon: Users },
  { id: 'departments', label: 'Departments', icon: Building2 },
] as const

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['id']>('members')
  const auth = useAuth()

  // Don't render anything until auth is initialized on client
  if (auth.initializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  // If not authenticated, still show loading (will redirect via middleware)
  if (!auth.token || !auth.currentOrg) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  const isOwner = auth.currentOrg?.role === 'OWNER' || auth.currentOrg?.role === 'ADMIN'

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-8 py-5 border-b border-brand-border">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted">
          <Settings className="w-4.5 h-4.5 text-brand-muted" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-brand leading-tight">Settings</h1>
          <p className="text-xs text-brand-muted leading-tight mt-0.5">
            Configure your workspace, members and integrations.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 px-8 py-2 border-b border-brand-border bg-brand-surface/20">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-brand shadow-sm'
                  : 'text-brand-muted hover:text-brand hover:bg-white/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'members' && <MembersTab isOwner={isOwner} />}
        {activeTab === 'departments' && <DepartmentsTab isOwner={isOwner} />}
      </div>
    </div>
  )
}