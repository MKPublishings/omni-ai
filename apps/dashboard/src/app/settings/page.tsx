'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { fetchDashboardUser, fetchSystemStatus, DashboardSystemStatus } from '@/lib/dashboard'
import { AuthUser } from '@/lib/auth'

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchDashboardUser(), fetchSystemStatus()])
      .then(([userPayload, nextStatus]) => {
        setUser(userPayload.user)
        setStatus(nextStatus)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load settings'))
  }, [])

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
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Edit profile</Link>
            <span className="rounded-full border border-quantum-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-quantum-white/60">
              {user?.emailVerified ? 'Email verified' : 'Verification pending'}
            </span>
          </div>
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
          <h2 className="text-lg font-semibold text-quantum-white">Mobile behavior</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Settings and profile are now linked so the account flow stays coherent on both desktop and mobile instead of hiding the editable route.</p>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}