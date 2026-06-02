'use client'

import { 
  User, 
  Settings, 
  Mail, 
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type SettingsTab = 
  | 'account' 
  | 'general' 
  | 'email' 
  | 'organization'

interface SettingsSidebarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

const sidebarItems: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'account', label: 'Account and Security', icon: User },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'email', label: 'Email & Calendar', icon: Mail },
  { id: 'organization', label: 'Manage Organization', icon: Building2 },
]

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 border-r border-gray-200 h-full flex flex-col bg-gray-50/50">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
              activeTab === item.id 
                ? "bg-white text-primary shadow-sm ring-1 ring-black/5" 
                : "text-gray-500"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4",
              activeTab === item.id ? "text-primary" : "text-gray-400"
            )} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
