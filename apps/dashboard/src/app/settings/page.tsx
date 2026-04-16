'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { fetchDashboardUser, fetchSystemStatus, DashboardSystemStatus } from '@/lib/dashboard'
import { AuthUser } from '@/lib/auth'

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)

  useEffect(() => {
    fetchDashboardUser().then((payload) => setUser(payload.user)).catch(() => undefined)
    fetchSystemStatus().then(setStatus).catch(() => undefined)
  }, [])

  return (
    <DashboardShell
      title="Settings"
      subtitle="Account details, deployment context, and environment facts for the current signed-in operator."
    >
      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Account</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Display name</dt>
              <dd className="font-medium text-quantum-white">{user?.displayName || 'Loading'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Username</dt>
              <dd className="font-medium text-quantum-white">{user?.username || 'Loading'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Email</dt>
              <dd className="font-medium text-quantum-white">{user?.email || 'Loading'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Role</dt>
              <dd className="font-medium uppercase tracking-[0.2em] text-quantum-white">{user?.role || 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Deployment context</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Platform</dt>
              <dd className="font-medium text-quantum-white">{status?.environment.platform || 'Cloudflare Workers'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Region</dt>
              <dd className="font-medium text-quantum-white">{status?.environment.region || 'Global edge'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Runtime</dt>
              <dd className="font-medium text-quantum-white">{status?.version || 'Loading'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Status</dt>
              <dd className="font-medium text-quantum-white">{status?.status || 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}