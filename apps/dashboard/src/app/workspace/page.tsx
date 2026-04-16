'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { Table } from '@/components/Table'
import {
  DashboardSystemEvent,
  DashboardSystemStatus,
  fetchSystemEvents,
  fetchSystemStatus,
  formatDuration,
  LIVE_REFRESH_INTERVAL_MS,
  summarizeEventPayload,
} from '@/lib/dashboard'

export default function WorkspacePage() {
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [events, setEvents] = useState<DashboardSystemEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const [nextStatus, nextEvents] = await Promise.all([
          fetchSystemStatus(),
          fetchSystemEvents(8),
        ])

        if (!cancelled) {
          setStatus(nextStatus)
          setEvents(nextEvents)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard overview')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    const interval = window.setInterval(load, LIVE_REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const tableColumns = [
    { key: 'type', header: 'Event Type', sortable: true },
    { key: 'source', header: 'Source', sortable: true },
    {
      key: 'summary',
      header: 'Summary',
      render: (_value: string, row: DashboardSystemEvent) => summarizeEventPayload(row.data),
    },
    {
      key: 'createdAt',
      header: 'Recorded',
      sortable: true,
      render: (_value: string, row: DashboardSystemEvent) => new Date(row.createdAt).toLocaleString(),
    },
  ]

  return (
    <DashboardShell
      title="ION control surface"
      subtitle="A multi-page operational workspace for system health, events, tools, simulations, and agent activity."
    >
      {error && (
        <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">
          {error}
        </GlassCard>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Registered Users"
          value={loading || !status ? '...' : status.counts.authUsers}
          trend={{ direction: 'up', value: 'Identity online' }}
        />
        <StatCard
          title="Active Sessions"
          value={loading || !status ? '...' : status.counts.sessions}
          trend={{ direction: 'neutral', value: 'Live auth contexts' }}
        />
        <StatCard
          title="Tool Executions"
          value={loading || !status ? '...' : status.counts.toolExecutions}
          trend={{ direction: 'up', value: 'Pipeline activity' }}
        />
        <StatCard
          title="Simulation Runs"
          value={loading || !status ? '...' : status.counts.simulationRuns}
          trend={{ direction: 'neutral', value: 'Scenario memory' }}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-quantum-white">Recent system events</h2>
              <p className="mt-1 text-sm text-quantum-white/64">A live snapshot of the Worker event stream feeding the dashboard.</p>
            </div>
            {status && (
              <span className="inline-flex w-fit rounded-full border border-quantum-white/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-quantum-white/64">
                {status.status}
              </span>
            )}
          </div>

          <div className="mt-6">
            <Table data={events} columns={tableColumns} loading={loading} emptyMessage="No system events recorded yet" />
          </div>
        </GlassCard>

        <div className="grid gap-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-quantum-white">System envelope</h2>
            <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
              <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt>Runtime version</dt>
                <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.version || 'Loading'}</dd>
              </div>
              <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt>Platform</dt>
                <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.environment.platform || 'Cloudflare Workers'}</dd>
              </div>
              <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt>Region</dt>
                <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.environment.region || 'Global edge'}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt>Uptime</dt>
                <dd className="break-words font-medium text-quantum-white sm:text-right">{status ? formatDuration(status.uptime) : 'Loading'}</dd>
              </div>
            </dl>
          </GlassCard>

          <GlassCard tier={2} className="p-6">
            <h2 className="text-lg font-semibold text-quantum-white">What changed in this build</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/72">
              <li>Public landing, platform, and capabilities pages are now browseable before login.</li>
              <li>The workspace now lives on its own protected route, keeping public and private navigation separate.</li>
              <li>Additional events and memory pages expand the site beyond the first dashboard pass.</li>
            </ul>
          </GlassCard>
        </div>
      </section>
    </DashboardShell>
  )
}