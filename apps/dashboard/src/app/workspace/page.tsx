'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { Table } from '@/components/Table'
import {
  DashboardOnboardingWorkspace,
  DashboardSystemEvent,
  DashboardSystemStatus,
  fetchOnboardingWorkspace,
  fetchSystemEvents,
  fetchSystemStatus,
  formatDuration,
  LIVE_REFRESH_INTERVAL_MS,
  summarizeEventPayload,
} from '@/lib/dashboard'
import { summarizeWorkspaceIntent } from '@/lib/workspace-shell'

export default function WorkspacePage() {
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [events, setEvents] = useState<DashboardSystemEvent[]>([])
  const [workspace, setWorkspace] = useState<DashboardOnboardingWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const [nextStatus, nextEvents, nextWorkspace] = await Promise.all([
          fetchSystemStatus(),
          fetchSystemEvents(8),
          fetchOnboardingWorkspace().catch(() => null),
        ])

        if (!cancelled) {
          setStatus(nextStatus)
          setEvents(nextEvents)
          setWorkspace(nextWorkspace)
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

  const workspaceIntent = summarizeWorkspaceIntent(workspace)
  const priorityRoutes = workspaceIntent?.priorityRoutes.slice(0, 3) ?? []

  const routeLabels: Record<string, string> = {
    '/assistant': 'Assistant',
    '/analytics': 'Analytics',
    '/tools': 'Tools',
    '/memory': 'Memory',
    '/simulations': 'Simulations',
    '/workspace': 'Overview',
  }

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
      title="Systems"
      subtitle={workspaceIntent
        ? `${workspaceIntent.focusLabel} across system health, live event flow, and the routes most relevant to the current workspace intent.`
        : 'A multi-page operational workspace for system health, sovereign simulations, event activity, tools, and agent operations.'}
    >
      {error && (
        <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">
          {error}
        </GlassCard>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <GlassCard className="p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-spectral-cyan-300">Systems surface</p>
              <h2 className="mt-3 text-3xl font-semibold text-quantum-white">Keep the operational tiles aligned to the workspace shell.</h2>
              <p className="mt-4 text-sm leading-7 text-quantum-white/68">
                {workspaceIntent?.focusDescription || 'This overview concentrates system health, recent events, and launch paths into one operational surface.'}
              </p>
            </div>
            <div className="grid gap-3 sm:min-w-[15rem] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Focus</p>
                <p className="mt-2 text-lg font-semibold text-quantum-white">{workspaceIntent?.focusLabel || 'System overview'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Primary route</p>
                <p className="mt-2 text-lg font-semibold text-quantum-white">{workspaceIntent?.primaryRoute || '/workspace'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Enabled modules</p>
                <p className="mt-2 text-lg font-semibold text-quantum-white">{workspaceIntent?.enabledModuleCount ?? 0}</p>
              </div>
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Posture</p>
                <p className="mt-2 text-lg font-semibold text-quantum-white">{workspaceIntent?.collaborationLabel || 'System posture'}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6 sm:p-7">
          <h2 className="text-xl font-semibold text-quantum-white">Configured shell snapshot</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Workspace</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{workspace?.workspaceName || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Role</dt>
              <dd className="break-words font-medium capitalize text-quantum-white sm:text-right">{workspaceIntent?.roleLabel || 'builder'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Capability score</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{workspace?.capabilityScore ?? 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Provisioning</dt>
              <dd className="break-words font-medium capitalize text-quantum-white sm:text-right">{workspace?.provisioningStatus || 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>
      </section>

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
          trend={{ direction: 'neutral', value: 'Sovereign + multiverse archive' }}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
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
            <h2 className="text-lg font-semibold text-quantum-white">Intent-driven launch paths</h2>
            <div className="mt-4 grid gap-3">
              {priorityRoutes.map((route) => (
                <Link key={route} href={route} className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 transition hover:border-quantum-white/16 hover:bg-quantum-white/[0.06]">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-quantum-white">{routeLabels[route] || route}</h3>
                  <p className="mt-2 text-sm leading-6 text-quantum-white/72">Route prioritized from the current workspace intent and enabled module selection.</p>
                </Link>
              ))}
              {priorityRoutes.length === 0 ? (
                <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 text-sm leading-6 text-quantum-white/72">
                  Save workspace settings to project intent into the systems launch order.
                </div>
              ) : null}
            </div>
          </GlassCard>

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
            <h2 className="text-lg font-semibold text-quantum-white">Intent-aligned shell notes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/72">
              <li>{workspaceIntent?.focusLabel || 'Workspace focus'} now influences route priority and the contextual banner across authenticated surfaces.</li>
              <li>Saved workspace intent now feeds this systems page directly instead of remaining a passive onboarding field.</li>
              <li>Overview tiles now use the same tighter fit and summary-card structure as the updated settings layout.</li>
            </ul>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-quantum-white">Sovereign launch points</h2>
            <div className="mt-4 grid gap-3">
              <Link href={workspaceIntent?.primaryRoute || '/simulations'} className="rounded-2xl border border-spectral-cyan-400/18 bg-spectral-cyan-500/[0.08] p-4 transition hover:border-spectral-cyan-300/30 hover:bg-spectral-cyan-500/[0.12]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-spectral-cyan-100">Live inspector</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Open the route most aligned with the current shell focus, then branch into sovereign and multiverse runs with live state streaming.</p>
              </Link>
              <Link href="/events" className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 transition hover:border-quantum-white/16 hover:bg-quantum-white/[0.06]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-quantum-white">Event traces</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Review the recent event stream feeding simulation state changes and worker-side operational activity.</p>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </DashboardShell>
  )
}