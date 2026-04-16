'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { Table } from '@/components/Table'
import { DashboardSimulationRun, fetchSimulationHistory, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

export default function SimulationsPage() {
  const [runs, setRuns] = useState<DashboardSimulationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        const payload = await fetchSimulationHistory(16)
        if (!cancelled) {
          setRuns(payload)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load simulations')
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

  const completedRuns = useMemo(() => runs.filter((run) => run.status === 'completed').length, [runs])
  const activeRuns = useMemo(() => runs.filter((run) => run.status === 'running').length, [runs])

  const columns = [
    { key: 'mode', header: 'Mode', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'current_step', header: 'Step', render: (value: number | undefined) => value ?? 0 },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleString(),
    },
  ]

  return (
    <DashboardShell
      title="Simulations"
      subtitle="Review run history, current execution posture, and the scenario archive attached to your authenticated session."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Runs" value={loading ? '...' : runs.length} trend={{ direction: 'up', value: 'Historical archive' }} />
        <StatCard title="Completed" value={loading ? '...' : completedRuns} trend={{ direction: 'up', value: 'Resolved trajectories' }} />
        <StatCard title="Running" value={loading ? '...' : activeRuns} trend={{ direction: activeRuns > 0 ? 'up' : 'neutral', value: 'Live scenarios' }} />
        <StatCard title="Latest Mode" value={runs[0]?.mode || 'None'} trend={{ direction: 'neutral', value: 'Newest entry' }} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Simulation history</h2>
          <div className="mt-6">
            <Table data={runs} columns={columns} loading={loading} emptyMessage="No simulation runs have been recorded for this session" />
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Operator notes</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/72">
            <li>Simulation history is scoped to the authenticated session returned by the Worker.</li>
            <li>Once new scenarios execute, this page will export their records into the static site shell automatically.</li>
            <li>The responsive layout keeps the archive and context panel separated on desktop and stacked on mobile.</li>
          </ul>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}