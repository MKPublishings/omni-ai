'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { AuthUser } from '@/lib/auth'
import { DashboardSystemStatus, fetchDashboardUser, fetchSystemStatus } from '@/lib/dashboard'

export default function MemoryPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)

  useEffect(() => {
    fetchDashboardUser().then((payload) => setUser(payload.user)).catch(() => undefined)
    fetchSystemStatus().then(setStatus).catch(() => undefined)
  }, [])

  return (
    <DashboardShell
      title="Memory"
      subtitle="Identity scope, session density, and the storage-oriented surfaces that support the broader ION operating environment."
    >
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
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Display name</dt>
              <dd className="font-medium text-quantum-white">{user?.displayName || 'Loading'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
              <dt>Username</dt>
              <dd className="font-medium text-quantum-white">{user?.username || 'Loading'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Role</dt>
              <dd className="font-medium text-quantum-white">{user?.role || 'Loading'}</dd>
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
        </GlassCard>
      </section>
    </DashboardShell>
  )
}