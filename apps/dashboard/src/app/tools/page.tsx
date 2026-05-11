'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { Table } from '@/components/Table'
import { DashboardImageRuntimeConfig, DashboardSystemStatus, DashboardToolMetadata, fetchImageRuntimeConfig, fetchSystemStatus, fetchTools, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

export default function ToolsPage() {
  const [tools, setTools] = useState<DashboardToolMetadata[]>([])
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [imageRuntime, setImageRuntime] = useState<DashboardImageRuntimeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        const [toolList, nextStatus, nextImageRuntime] = await Promise.all([fetchTools(), fetchSystemStatus(), fetchImageRuntimeConfig()])
        if (!cancelled) {
          setTools(toolList)
          setStatus(nextStatus)
          setImageRuntime(nextImageRuntime)
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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-quantum-white">Image runtime</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-quantum-white/68">
                Live operator view of the dashboard image surface. This reflects the effective local runtime target, queue backing, and checkpoint defaults used by the assistant image flow.
              </p>
            </div>
            <div className="rounded-full border border-quantum-white/12 bg-quantum-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-quantum-white/58">
              {imageRuntime?.queue.runtime === 'kv' ? 'durable queue' : 'memory queue'}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Gateway Mode" value={imageRuntime?.gateway.mock ? 'Mock' : 'ion'} trend={{ direction: 'neutral', value: imageRuntime?.gateway.defaultCheckpoint || 'Awaiting runtime' }} />
            <StatCard title="Queue Runtime" value={imageRuntime?.queue.runtime || '...'} trend={{ direction: 'neutral', value: imageRuntime?.queue.stateBinding || 'Binding' }} />
            <StatCard title="Queue Capacity" value={imageRuntime?.queue.maxQueueSize ?? '...'} trend={{ direction: 'neutral', value: `${imageRuntime?.queue.maxConcurrentJobs ?? '...'} concurrent` }} />
            <StatCard title="Safety" value={imageRuntime?.safety.enabled ? 'On' : 'Off'} trend={{ direction: 'neutral', value: `${imageRuntime?.safety.rateLimitPerHour ?? '...'} req/hr` }} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-quantum-white/10 bg-quantum-white/[0.04] p-4 text-sm text-quantum-white/72">
              <div className="text-[11px] uppercase tracking-[0.2em] text-quantum-white/46">Gateway</div>
              <div className="mt-3 space-y-2 break-all">
                <div><span className="text-quantum-white/42">Host:</span> {imageRuntime?.gateway.host || '...'}</div>
                <div><span className="text-quantum-white/42">WS:</span> {imageRuntime?.gateway.wsUrl || '...'}</div>
                <div><span className="text-quantum-white/42">Checkpoint:</span> {imageRuntime?.gateway.defaultCheckpoint || '...'}</div>
                <div><span className="text-quantum-white/42">Timeout:</span> {imageRuntime?.gateway.requestTimeoutMs ?? '...'} ms</div>
              </div>
            </div>
            <div className="rounded-3xl border border-quantum-white/10 bg-quantum-white/[0.04] p-4 text-sm text-quantum-white/72">
              <div className="text-[11px] uppercase tracking-[0.2em] text-quantum-white/46">Queue and Storage</div>
              <div className="mt-3 space-y-2 break-all">
                <div><span className="text-quantum-white/42">Binding:</span> {imageRuntime?.queue.stateBinding || '...'}</div>
                <div><span className="text-quantum-white/42">Namespace:</span> {imageRuntime?.queue.stateNamespace || '...'}</div>
                <div><span className="text-quantum-white/42">Images:</span> {imageRuntime?.storage.imageStoragePath || '...'}</div>
                <div><span className="text-quantum-white/42">Metadata:</span> {imageRuntime?.storage.metadataDbUrl || '...'}</div>
              </div>
            </div>
          </div>
        </GlassCard>
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