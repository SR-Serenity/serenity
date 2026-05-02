'use client'

import { 
  User, 
  Settings, 
  Lock, 
  Zap, 
  Bell, 
  Keyboard, 
  Calendar, 
  Mail, 
  Video, 
  CheckSquare, 
  Hexagon, 
  FlaskConical, 
  ArrowUpCircle, 
  Info,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type SettingsTab = 
  | 'account' 
  | 'general' 
  | 'privacy' 
  | 'efficiency' 
  | 'notifications' 
  | 'shortcuts' 
  | 'calendar' 
  | 'email' 
  | 'video' 
  | 'tasks' 
  | 'internal' 
  | 'lab' 
  | 'update' 
  | 'about'
  | 'organization'

interface SettingsSidebarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

const sidebarItems: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'account', label: 'Account and Security', icon: User },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'efficiency', label: 'Efficiency', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'video', label: 'Video Meetings', icon: Video },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'internal', label: 'Internal Settings', icon: Hexagon },
  { id: 'lab', label: 'Lab', icon: FlaskConical },
  { id: 'update', label: 'Software Update', icon: ArrowUpCircle },
  { id: 'about', label: 'About Serenity', icon: Info },
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
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === item.id 
                ? "bg-blue-100 text-blue-600" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4",
              activeTab === item.id ? "text-blue-600" : "text-gray-400"
            )} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
