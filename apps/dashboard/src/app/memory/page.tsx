'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { AuthUser } from '@/lib/auth'
import { DashboardSystemStatus, fetchDashboardUser, fetchSystemStatus, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

export default function MemoryPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        const [userPayload, nextStatus] = await Promise.all([fetchDashboardUser(), fetchSystemStatus()])
        if (!cancelled) {
          setUser(userPayload.user)
          setStatus(nextStatus)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load memory page')
        }
      }
    }

    void load()
    const interval = window.setInterval(() => {
      void load()
    }, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <DashboardShell
      title="Memory"
      subtitle="Identity scope, session density, and the storage-oriented surfaces that support the broader ION operating environment."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Auth Users" value={status?.counts.authUsers ?? '...'} trend={{ direction: 'up', value: 'Identity records' }} />
        <StatCard title="Sessions" value={status?.counts.sessions ?? '...'} trend={{ direction: 'neutral', value: 'Active memory contexts' }} />
        <StatCard title="Tool History" value={status?.counts.toolExecutions ?? '...'} trend={{ direction: 'up', value: 'Logged operations' }} />
        <StatCard title="Simulation History" value={status?.counts.simulationRuns ?? '...'} trend={{ direction: 'neutral', value: 'Stored scenarios' }} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Identity context</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Display name</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{user?.displayName || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Username</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{user?.username || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Role</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{user?.role || 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Storage surfaces</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/72">
            <li>D1 stores credential, session, tool, and simulation records that feed the private workspace pages.</li>
            <li>The public site stays static, while authenticated pages pull live state from the Worker runtime after login.</li>
            <li>This page acts as a readable map of the identity and memory-adjacent state already tracked by the platform.</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Open profile</Link>
            <Link href="/settings" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Open settings</Link>
          </div>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}