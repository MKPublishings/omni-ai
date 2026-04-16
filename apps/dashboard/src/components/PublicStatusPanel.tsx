import { GlassCard } from '@/components/GlassCard'
import { DashboardHealthStatus } from '@/lib/dashboard'

interface PublicStatusPanelProps {
  health: DashboardHealthStatus | null
}

export function PublicStatusPanel({ health }: PublicStatusPanelProps) {
  return (
    <GlassCard tier={2} className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-quantum-white sm:text-xl">Public status signal</h2>
      <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
        <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
          <dt>Status</dt>
          <dd className="text-right text-sm font-semibold uppercase tracking-[0.18em] text-quantum-white">{health?.status || 'Loading'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
          <dt>D1</dt>
          <dd className="text-right font-medium capitalize text-quantum-white">{health?.checks.d1 || 'Pending'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-quantum-white/8 pb-3">
          <dt>KV</dt>
          <dd className="text-right font-medium capitalize text-quantum-white">{health?.checks.kv || 'Pending'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Assets</dt>
          <dd className="text-right font-medium capitalize text-quantum-white">{health?.checks.assets || 'Pending'}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex min-h-[132px] flex-col justify-between rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 sm:min-h-[144px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-quantum-white/48">Deployment</p>
          <div className="mt-4">
            <p className="text-base font-semibold leading-6 text-quantum-white sm:text-lg">{health?.deployment.platform || 'Cloudflare Workers'}</p>
            <p className="mt-2 text-sm leading-6 text-quantum-white/64">{health?.deployment.environment || 'production'} · {health?.deployment.region || 'global-edge'}</p>
          </div>
        </div>
        <div className="flex min-h-[132px] flex-col justify-between rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 sm:min-h-[144px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-quantum-white/48">Live surface</p>
          <div className="mt-4">
            <p className="text-base font-semibold leading-6 text-quantum-white sm:text-lg">{health?.summary.publicRoutes ?? 0} public <span className="text-quantum-white/36">/</span> {health?.summary.workspaceRoutes ?? 0} workspace</p>
            <p className="mt-2 text-sm leading-6 text-quantum-white/64">Version {health?.deployment.version || '2.0.0'}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 sm:min-h-[140px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/48">Auth users</p>
          <p className="mt-4 text-3xl font-semibold leading-none tabular-nums text-quantum-white sm:text-[2.2rem]">{health?.summary.authUsers ?? 0}</p>
        </div>
        <div className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 sm:min-h-[140px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/48">Tool runs</p>
          <p className="mt-4 text-3xl font-semibold leading-none tabular-nums text-quantum-white sm:text-[2.2rem]">{health?.summary.toolExecutions ?? 0}</p>
        </div>
        <div className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4 sm:min-h-[140px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/48">Simulation runs</p>
          <p className="mt-4 text-3xl font-semibold leading-none tabular-nums text-quantum-white sm:text-[2.2rem]">{health?.summary.simulationRuns ?? 0}</p>
        </div>
      </div>
    </GlassCard>
  )
}