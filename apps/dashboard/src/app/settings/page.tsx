'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import {
  clearChatHistory,
  DashboardChatHistoryTurn,
  DashboardChatPreferences,
  DashboardSystemStatus,
  fetchChatHistory,
  fetchChatSettings,
  fetchDashboardUser,
  fetchSystemStatus,
  LIVE_REFRESH_INTERVAL_MS,
  updateChatSettings,
} from '@/lib/dashboard'
import { AuthUser } from '@/lib/auth'

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [chatPreferences, setChatPreferences] = useState<DashboardChatPreferences | null>(null)
  const [chatTurns, setChatTurns] = useState<DashboardChatHistoryTurn[]>([])
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [savingKey, setSavingKey] = useState<'persistHistory' | 'contextCarryover' | ''>('')
  const [isClearingHistory, setIsClearingHistory] = useState(false)

  const loadSettings = () => {
    setError('')
    Promise.all([fetchDashboardUser(), fetchSystemStatus(), fetchChatSettings(), fetchChatHistory(200)])
      .then(([userPayload, nextStatus, chatSettingsPayload, chatHistoryPayload]) => {
        setUser(userPayload.user)
        setStatus(nextStatus)
        setChatPreferences(chatSettingsPayload.preferences)
        setChatTurns(Array.isArray(chatHistoryPayload.turns) ? chatHistoryPayload.turns : [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load settings'))
  }

  useEffect(() => {
    loadSettings()
    const interval = window.setInterval(loadSettings, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const handleToggle = async (key: 'persistHistory' | 'contextCarryover') => {
    if (!chatPreferences) {
      return
    }

    setSavingKey(key)
    setActionMessage('')

    try {
      const nextValue = !chatPreferences[key]
      const payload = await updateChatSettings({ [key]: nextValue })
      setChatPreferences(payload.preferences)
      setActionMessage(key === 'persistHistory' ? 'Chat history sync updated.' : 'Context carryover updated.')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not update chat settings')
    } finally {
      setSavingKey('')
    }
  }

  const handleClearHistory = async () => {
    setIsClearingHistory(true)
    setActionMessage('')

    try {
      await clearChatHistory()
      setChatTurns([])
      setActionMessage('Saved chat history cleared from your account.')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not clear chat history')
    } finally {
      setIsClearingHistory(false)
    }
  }

  const handleExportHistory = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
          }
        : null,
      preferences: chatPreferences,
      turns: chatTurns,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `ion-ai-chat-history-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
    setActionMessage('Chat history export started.')
  }

  return (
    <DashboardShell
      title="Settings"
      subtitle="Account details, deployment context, and environment facts for the current signed-in operator."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Account</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Display name</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{user?.displayName || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Username</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{user?.username || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Email</dt>
              <dd className="break-all font-medium text-quantum-white sm:text-right">{user?.email || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Role</dt>
              <dd className="break-words font-medium uppercase tracking-[0.2em] text-quantum-white sm:text-right">{user?.role || 'Loading'}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Edit profile</Link>
            <span className="inline-flex min-h-[2.75rem] items-center rounded-full border border-quantum-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-quantum-white/60">
              {user?.emailVerified ? 'Email verified' : 'Verification pending'}
            </span>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Deployment context</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Platform</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.environment.platform || 'Cloudflare Workers'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Region</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.environment.region || 'Global edge'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Runtime</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.version || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Status</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.status || 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-quantum-white">Chat memory</h2>
              <p className="mt-2 text-sm leading-6 text-quantum-white/72">Assistant conversations now sync to your account, reload after navigation, and follow you across browsers and mobile sessions.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-quantum-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-quantum-white/60">
              {chatTurns.length} saved turns
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-quantum-white/8 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-quantum-white">Save chat history</h3>
                <p className="mt-1 text-sm text-quantum-white/60">Store assistant turns on your account so the conversation reloads when you return.</p>
              </div>
              <Button
                variant={chatPreferences?.persistHistory ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleToggle('persistHistory')}
                disabled={!chatPreferences || savingKey === 'persistHistory'}
              >
                {chatPreferences?.persistHistory ? 'History sync on' : 'History sync off'}
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-quantum-white/8 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-quantum-white">Carry saved context</h3>
                <p className="mt-1 text-sm text-quantum-white/60">Reuse recent saved turns so follow-up prompts on another device still have continuity.</p>
              </div>
              <Button
                variant={chatPreferences?.contextCarryover ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleToggle('contextCarryover')}
                disabled={!chatPreferences || savingKey === 'contextCarryover'}
              >
                {chatPreferences?.contextCarryover ? 'Carryover on' : 'Carryover off'}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportHistory} disabled={chatTurns.length === 0}>
              Export chat history
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearHistory} disabled={isClearingHistory || chatTurns.length === 0}>
              {isClearingHistory ? 'Clearing history...' : 'Clear saved history'}
            </Button>
            <Button variant="ghost" size="sm" onClick={loadSettings}>
              Refresh chat status
            </Button>
          </div>

          {actionMessage && <p className="mt-4 text-sm text-ion-blue-200">{actionMessage}</p>}
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Chat sync status</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>History sync</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatPreferences?.persistHistory ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Context carryover</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatPreferences?.contextCarryover ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Stored turns</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatTurns.length}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Last preference update</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatPreferences?.updatedAt ? new Date(chatPreferences.updatedAt).toLocaleString() : 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Profile controls</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Use the profile page to edit your display name and username, then return here for deployment and verification status.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Verification posture</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">New accounts must complete email verification before login. Existing verified operators continue through the normal workspace flow.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Cross-device continuity</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">When history sync stays enabled, assistant conversations reload from your account on desktop, mobile, and any other browser session tied to the same login.</p>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}