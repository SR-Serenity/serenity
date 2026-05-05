'use client'

import { useAuth } from '@/hooks/use-auth'
import { MembersTab } from './members-tab'
import { DepartmentsTab } from './departments-tab'
import { SettingsTab } from './settings-sidebar'
import { ExternalLink, ShieldCheck, Palette, Monitor, AppWindow } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsContentProps {
  activeTab: SettingsTab
}

export function SettingsContent({ activeTab }: SettingsContentProps) {
  const { user, currentOrg } = useAuth()
  const isOwner = currentOrg?.role === 'OWNER'

  switch (activeTab) {
    case 'account':
      return <AccountSettings user={user} />
    case 'general':
      return <GeneralSettings />
    case 'organization':
      return (
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-white">
          <div className="p-8 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">Manage Organization</h1>
            <p className="text-sm text-gray-500 mt-2">
              Configurations and management for <span className="font-semibold text-gray-700">{currentOrg?.name}</span>.
            </p>
          </div>
          
          <div className="space-y-4">
            <section className="px-8 pt-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {currentOrg?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{currentOrg?.name}</h3>
                    <p className="text-sm text-gray-500">ID: {currentOrg?.id}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100/50 transition-colors">
                  Edit Profile
                </button>
              </div>
            </section>

            <section>
              <MembersTab isOwner={isOwner} />
            </section>
            
            <div className="px-8">
              <div className="h-px bg-gray-100 w-full" />
            </div>
            
            <section className="pb-12">
              <DepartmentsTab isOwner={isOwner} />
            </section>
          </div>
        </div>
      )
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <AppWindow className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-medium text-gray-600 capitalize">{activeTab.replace('-', ' ')}</h2>
          <p className="text-sm">This section is currently under development.</p>
        </div>
      )
  }
}

function AccountSettings({ user }: { user: any }) {
  return (
    <div className="p-8 max-w-4xl space-y-12 overflow-y-auto h-full no-scrollbar bg-white">
      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900">My account</h2>
        
        <div className="flex items-center gap-6 p-1">
          <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold shadow-inner">
            {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-gray-900">{user?.displayName}</h3>
            <p className="text-sm font-medium text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 group cursor-pointer">
          <div className="relative flex items-center">
            <input type="checkbox" id="launch-startup" className="peer w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
          </div>
          <label htmlFor="launch-startup" className="text-sm font-medium text-gray-700 cursor-pointer group-hover:text-gray-900 transition-colors">
            Launch Serenity on startup
          </label>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Account and Security</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-500 max-w-2xl">
          Ensure your account security via Account Management, Password Settings, Two-Step Verification, Manage Devices, and other functions.
        </p>
        
        <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95">
          <ExternalLink className="w-4 h-4" />
          Go to Account Security Center
        </button>
      </section>
      
      <div className="h-px bg-gray-100 w-full" />
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="p-8 max-w-4xl space-y-12 overflow-y-auto h-full no-scrollbar bg-white">
      <h2 className="text-2xl font-bold text-gray-900">General</h2>
      
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Appearance</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-8 max-w-2xl">
          <div className="space-y-4 group cursor-pointer">
            <div className="aspect-16/10 bg-gray-50 border-2 border-blue-600 rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
              <div className="h-4 w-1/2 bg-blue-100 rounded-full" />
              <div className="mt-auto h-12 w-full bg-white border border-gray-200 rounded-xl shadow-sm" />
            </div>
            <div className="flex items-center gap-3">
              <input type="radio" name="appearance" id="light" defaultChecked className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" />
              <label htmlFor="light" className="text-sm font-bold text-gray-700 cursor-pointer">Light</label>
            </div>
          </div>
          
          <div className="space-y-4 group cursor-pointer">
            <div className="aspect-16/10 bg-gray-900 border-2 border-transparent rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all group-hover:shadow-md">
              <div className="h-4 w-3/4 bg-gray-800 rounded-full" />
              <div className="h-4 w-1/2 bg-blue-900/40 rounded-full" />
              <div className="mt-auto h-12 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-sm" />
            </div>
            <div className="flex items-center gap-3">
              <input type="radio" name="appearance" id="dark" className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" />
              <label htmlFor="dark" className="text-sm font-bold text-gray-700 cursor-pointer">Dark</label>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Theme</h3>
        </div>
        <div className="flex gap-5">
          {[
            { color: 'bg-blue-600', label: 'Classic Blue' },
            { color: 'bg-teal-500', label: 'Serenity Teal' },
            { color: 'bg-indigo-600', label: 'Deep Indigo' },
            { color: 'bg-purple-600', label: 'Royal Purple' },
            { color: 'bg-slate-800', label: 'Midnight' }
          ].map((theme, i) => (
            <button 
              key={i} 
              title={theme.label}
              className={cn(
                "w-12 h-12 rounded-2xl border-4 border-white shadow-md ring-2 ring-transparent hover:ring-blue-200 hover:scale-110 transition-all", 
                theme.color,
                i === 0 && "ring-blue-400"
              )} 
            />
          ))}
        </div>
      </section>
    </div>
  )
}
