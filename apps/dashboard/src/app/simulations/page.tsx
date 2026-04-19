'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { SimulationInspector } from '@/components/SimulationInspector'
import { StatCard } from '@/components/StatCard'
import { Table } from '@/components/Table'
import { DashboardSimulationRun, fetchSimulationHistory, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

export default function SimulationsPage() {
  const [runs, setRuns] = useState<DashboardSimulationRun[]>([])
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(null)
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

  useEffect(() => {
    if (runs.length === 0) {
      setSelectedSimulationId(null)
      return
    }

    if (!selectedSimulationId || !runs.some((run) => run.id === selectedSimulationId)) {
      setSelectedSimulationId(runs[0]?.id || null)
    }
  }, [runs, selectedSimulationId])

  const completedRuns = useMemo(() => runs.filter((run) => run.status === 'completed').length, [runs])
  const activeRuns = useMemo(() => runs.filter((run) => run.status === 'running').length, [runs])
  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedSimulationId) || null,
    [runs, selectedSimulationId]
  )

  const columns = [
    {
      key: 'mode',
      header: 'Mode',
      sortable: true,
      render: (value: string, row: DashboardSimulationRun) => (
        <button
          type="button"
          onClick={() => setSelectedSimulationId(row.id)}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${row.id === selectedSimulationId ? 'border-spectral-cyan-300/36 bg-spectral-cyan-400/14 text-spectral-cyan-100' : 'border-quantum-white/10 bg-quantum-white/[0.03] text-quantum-white/78 hover:border-quantum-white/18 hover:bg-quantum-white/[0.06]'}`}
        >
          {String(value || row.mode || 'unknown')}
        </button>
      ),
    },
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
          <p className="mt-2 text-sm leading-6 text-quantum-white/64">Select any run in the mode column to open the live inspector. Active sovereign and multiverse runs will stream snapshot changes into the panel beside the archive.</p>
          <div className="mt-6">
            <Table data={runs} columns={columns} loading={loading} emptyMessage="No simulation runs have been recorded for this session" />
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Live simulation inspector</h2>
          <div className="mt-5">
            <SimulationInspector simulationId={selectedSimulationId} selectedRun={selectedRun} />
          </div>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}