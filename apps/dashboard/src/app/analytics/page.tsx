'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import GlassCard from '@/components/GlassCard'
import StatCard from '@/components/StatCard'
import Table from '@/components/Table'
import { getDashboardData } from '@/lib/dashboard'
import { DashboardSystemEvent, DashboardSystemStatus, fetchSystemEvents, fetchSystemStatus, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

export default function AnalyticsPage() {
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [events, setEvents] = useState<DashboardSystemEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        const [nextStatus, nextEvents] = await Promise.all([fetchSystemStatus(), fetchSystemEvents(20)])
        if (!cancelled) {
          setStatus(nextStatus)
          setEvents(nextEvents)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load analytics')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
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

  const sourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of events) {
      counts.set(event.source, (counts.get(event.source) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([source, count]) => ({ source, count }))
  }, [events])

  const eventColumns = [
    { key: 'source', header: 'Source', sortable: true },
    { key: 'count', header: 'Events', sortable: true },
  ]

  return (
    <DashboardShell
      title="Analytics"
      subtitle="Operational telemetry, event density, and deployment-side signals for the live ION environment."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Environment" value={status?.environment.platform || 'Loading'} trend={{ direction: 'neutral', value: status?.environment.region || 'Region pending' }} />
        <StatCard title="Health" value={status?.status || 'Loading'} trend={{ direction: 'up', value: 'Worker responding' }} />
        <StatCard title="Event Volume" value={loading ? '...' : events.length} trend={{ direction: 'up', value: 'Recent event window' }} />
        <StatCard title="User Density" value={status?.counts.authUsers ?? '...'} trend={{ direction: 'neutral', value: 'Provisioned access' }} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Source breakdown</h2>
          <p className="mt-1 text-sm text-quantum-white/64">Which subsystems are producing the most activity in the current sample window.</p>
          <div className="mt-6">
            <Table data={sourceBreakdown} columns={eventColumns} loading={loading} emptyMessage="No analytics sources yet" />
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">System ratios</h2>
          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-quantum-white/72">
                <span>Tool execution to session ratio</span>
                <span>{status ? `${status.counts.toolExecutions}:${Math.max(status.counts.sessions, 1)}` : 'Loading'}</span>
              </div>
              <div className="h-3 rounded-full bg-quantum-white/8">
                <div className="h-3 rounded-full bg-spectral-cyan-500" style={{ width: status ? `${Math.min(100, (status.counts.toolExecutions / Math.max(status.counts.sessions, 1)) * 20)}%` : '10%' }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-quantum-white/72">
                <span>Simulation saturation</span>
                <span>{status ? `${status.counts.simulationRuns} runs` : 'Loading'}</span>
              </div>
              <div className="h-3 rounded-full bg-quantum-white/8">
                <div className="h-3 rounded-full bg-ion-blue-500" style={{ width: status ? `${Math.min(100, status.counts.simulationRuns * 10)}%` : '10%' }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-quantum-white/72">
                <span>Identity coverage</span>
                <span>{status ? `${status.counts.authUsers} users` : 'Loading'}</span>
              </div>
              <div className="h-3 rounded-full bg-quantum-white/8">
                <div className="h-3 rounded-full bg-amber-signal-500" style={{ width: status ? `${Math.min(100, status.counts.authUsers * 12)}%` : '10%' }} />
              </div>
            </div>
          </div>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}