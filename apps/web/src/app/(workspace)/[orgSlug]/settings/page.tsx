'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { SettingsSidebar, SettingsTab } from './components/settings-sidebar'
import { SettingsContent } from './components/settings-content'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()

  const handleClose = () => {
    router.push(`/${orgSlug}/dashboard`)
  }

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-500">
      {/* Header */}
      <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <button 
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sub-navbar (Sidebar) */}
        <SettingsSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Content Area */}
        <main className="flex-1 overflow-hidden bg-white">
          <SettingsContent activeTab={activeTab} />
        </main>
      </div>
    </div>
  )
}
