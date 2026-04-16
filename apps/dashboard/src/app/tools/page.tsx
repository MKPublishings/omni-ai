'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { Table } from '@/components/Table'
import { DashboardSystemStatus, DashboardToolMetadata, fetchSystemStatus, fetchTools, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

export default function ToolsPage() {
  const [tools, setTools] = useState<DashboardToolMetadata[]>([])
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        const [toolList, nextStatus] = await Promise.all([fetchTools(), fetchSystemStatus()])
        if (!cancelled) {
          setTools(toolList)
          setStatus(nextStatus)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load tools')
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

  const describedTools = useMemo(() => tools.filter((tool) => tool.description).length, [tools])

  const columns = [
    { key: 'name', header: 'Tool', sortable: true },
    { key: 'version', header: 'Version', sortable: true, render: (value: string | undefined) => value || 'n/a' },
    { key: 'description', header: 'Description', render: (value: string | undefined) => value || 'No description provided' },
  ]

  return (
    <DashboardShell
      title="Tools registry"
      subtitle="Browse the registered operational tools exposed by the Worker runtime and watch execution capacity alongside overall system counts."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Registered Tools" value={loading ? '...' : tools.length} trend={{ direction: 'up', value: 'Registry surface' }} />
        <StatCard title="Described Tools" value={loading ? '...' : describedTools} trend={{ direction: 'neutral', value: 'Documented metadata' }} />
        <StatCard title="Executions Logged" value={status?.counts.toolExecutions ?? '...'} trend={{ direction: 'up', value: 'Historical operations' }} />
        <StatCard title="Sessions" value={status?.counts.sessions ?? '...'} trend={{ direction: 'neutral', value: 'Auth contexts' }} />
      </section>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-quantum-white">Registry catalog</h2>
        <div className="mt-6">
          <Table data={tools} columns={columns} loading={loading} emptyMessage="No tools were returned by the live registry" />
        </div>
      </GlassCard>
    </DashboardShell>
  )
}