'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { MembersTab } from './members-tab'
import { DepartmentsTab } from './departments-tab'
import { SettingsTab } from './settings-sidebar'
import {
  AlertCircle,
  AppWindow,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Monitor,
  Palette,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mailApi } from '@serenity/api'
import type { MailAccount, User } from '@serenity/api'

interface SettingsContentProps {
  activeTab: SettingsTab
}

export function SettingsContent({ activeTab }: SettingsContentProps) {
  const { user, currentOrg } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      currentOrg: state.currentOrg,
    })),
  )
  const isOwner = currentOrg?.role === 'OWNER'

  switch (activeTab) {
    case 'account':
      return <AccountSettings user={user} />
    case 'general':
      return <GeneralSettings />
    case 'email':
      return <EmailSettings />
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
          <h2 className="text-lg font-medium text-gray-600 capitalize">{(activeTab as string).replace('-', ' ')}</h2>
          <p className="text-sm">This section is currently under development.</p>
        </div>
      )
  }
}

function AccountSettings({ user }: { user: User | null }) {
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

function EmailSettings() {
  const { token } = useAuthStore(useShallow((s) => ({ token: s.token })))
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<MailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'email_mismatch') {
      setError('You can only connect a Google account matching your Serenity email.')
    } else if (errorParam === 'connection_failed') {
      setError('Failed to connect Google account. Please try again.')
    }
  }, [searchParams])

  useEffect(() => {
    if (!token) return
    mailApi
      .listAccounts(token)
      .then((r) => setAccounts(r.accounts))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [token])

  async function handleConnect() {
    if (!token) return
    setBusyAction('connect')
    setError(null)
    try {
      const returnTo = `${window.location.origin}/${orgSlug}/settings?tab=email`
      const res = await mailApi.connectGoogle(token, returnTo)
      window.location.href = res.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
      setBusyAction(null)
    }
  }

  async function handleDisconnect(accountId: string) {
    if (!token) return
    setBusyAction(`disconnect-${accountId}`)
    setError(null)
    try {
      await mailApi.disconnectAccount(token, accountId)
      setAccounts((prev) => prev.filter((a) => a.id !== accountId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect')
    } finally {
      setBusyAction(null)
    }
  }

  const statusConfig: Record<MailAccount['status'], { label: string; color: string; icon: React.ReactNode }> = {
    CONNECTED: {
      label: 'Connected',
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    NEEDS_REAUTH: {
      label: 'Re-authentication needed',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      icon: <RefreshCcw className="w-3.5 h-3.5" />,
    },
    ERROR: {
      label: 'Error',
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
  }

  return (
    <div className="p-8 max-w-2xl space-y-10 overflow-y-auto h-full no-scrollbar bg-white">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Email & Calendar</h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect your Google account to enable Gmail and Google Calendar sync across Serenity.
        </p>
      </div>

      {/* What you get */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">What connecting enables</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Gmail</p>
              <p className="text-xs text-gray-500 leading-relaxed">Read, send, and manage your email directly in Serenity.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Google Calendar</p>
              <p className="text-xs text-gray-500 leading-relaxed">Sync your Google Calendar events into the Serenity planner.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Connected accounts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Connected accounts</h3>
          {accounts.length > 0 && (
            <button
              onClick={handleConnect}
              disabled={busyAction === 'connect'}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {busyAction === 'connect' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="text-base leading-none">+</span>
              )}
              Add account
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No accounts connected</p>
            <p className="mt-1 text-xs text-gray-500">Connect your Google account to get started.</p>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button
              onClick={handleConnect}
              disabled={busyAction === 'connect'}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {busyAction === 'connect' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Connect Google
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            {accounts.map((account) => {
              const s = statusConfig[account.status]
              const isDisconnecting = busyAction === `disconnect-${account.id}`
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                      {account.email[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{account.email}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', s.color)}>
                          {s.icon}
                          {s.label}
                        </span>
                        {account.lastSyncedAt && (
                          <span className="text-xs text-gray-400">
                            Synced {new Date(account.lastSyncedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {account.status === 'ERROR' && account.lastError && (
                        <p className="mt-1 text-xs text-red-500 truncate">{account.lastError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {account.status === 'NEEDS_REAUTH' && (
                      <button
                        onClick={handleConnect}
                        disabled={busyAction === 'connect'}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Reconnect
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      disabled={isDisconnecting}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                      title="Disconnect account"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
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
