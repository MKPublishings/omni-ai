'use client'

import { useMemo } from 'react'
import { clsx } from 'clsx'
import { DashboardSimulationRun } from '@/lib/dashboard'
import { useSimulationStream } from '@/hooks/useSimulationStream'

interface SimulationInspectorProps {
  simulationId: string | null
  selectedRun: DashboardSimulationRun | null
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return 'Awaiting activity'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Awaiting activity'
  }

  return date.toLocaleString()
}

function formatNumber(value: unknown): string {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '0'
}

function truncateId(value: string | undefined): string {
  if (!value) {
    return 'No selection'
  }

  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value
}

function connectionTone(state: 'idle' | 'loading' | 'connected' | 'polling' | 'error'): string {
  if (state === 'connected') return 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
  if (state === 'polling') return 'text-amber-200 border-amber-400/30 bg-amber-500/10'
  if (state === 'error') return 'text-rose-200 border-rose-400/30 bg-rose-500/10'
  return 'text-quantum-white/64 border-quantum-white/12 bg-quantum-white/6'
}

export function SimulationInspector({ simulationId, selectedRun }: SimulationInspectorProps) {
  const { simulation, state, snapshot, connectionState, loading, error, lastMessageAt } = useSimulationStream(simulationId)

  const activeSimulation = simulation || selectedRun
  const environment = (state?.environment || {}) as Record<string, unknown>
  const metadata = (state?.metadata || {}) as Record<string, unknown>
  const sovereignWorld = (metadata.sovereignWorld || {}) as Record<string, unknown>
  const sovereignSnapshot = (sovereignWorld.snapshot || {}) as Record<string, unknown>
  const sovereignMetadata = (sovereignSnapshot.metadata || {}) as Record<string, unknown>
  const multiverse = (metadata.multiverse || {}) as Record<string, unknown>
  const multiverseLastQuery = (multiverse.lastQuery || {}) as Record<string, unknown>
  const multiverseCoordinates = (multiverseLastQuery.coordinates || {}) as Record<string, unknown>
  const multiverseLastResult = (multiverse.lastResult || {}) as Record<string, unknown>
  const mode = String(environment.mode || activeSimulation?.mode || 'unknown')
  const entityCount = Array.isArray(state?.entities) ? state.entities.length : 0
  const signalKeys = useMemo(
    () => Object.keys((environment.signals as Record<string, unknown>) || {}).slice(0, 4),
    [environment]
  )

  if (!simulationId || !activeSimulation) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-quantum-white/12 bg-quantum-white/[0.035] p-6 text-sm leading-6 text-quantum-white/64">
        Select a simulation run to inspect its latest snapshot, live stream status, and mode-specific telemetry.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.35rem] border border-quantum-white/10 bg-quantum-white/[0.045] p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-quantum-white/44">Live Inspector</p>
          <h3 className="mt-2 text-lg font-semibold text-quantum-white">{truncateId(activeSimulation.id)}</h3>
          <p className="mt-1 text-sm text-quantum-white/64">{String(activeSimulation.mode || mode).toUpperCase()} run • status {String(activeSimulation.status || 'unknown')}</p>
        </div>

        <div className={clsx('rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]', connectionTone(connectionState))}>
          {connectionState}
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-2">
        <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Step</p>
          <p className="mt-3 text-2xl font-semibold text-quantum-white">{loading && !state ? '...' : formatNumber(state?.stepNumber ?? activeSimulation.current_step ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Entities</p>
          <p className="mt-3 text-2xl font-semibold text-quantum-white">{loading && !state ? '...' : formatNumber(entityCount)}</p>
        </div>
        <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Snapshot</p>
          <p className="mt-3 text-2xl font-semibold text-quantum-white">{snapshot ? formatNumber(snapshot.step) : '--'}</p>
        </div>
        <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Last update</p>
          <p className="mt-3 text-sm font-medium text-quantum-white">{formatTimestamp(lastMessageAt || state?.timestamp || activeSimulation.updated_at)}</p>
        </div>
      </div>

      {mode === 'cosmic' || String(metadata.source || '') === 'sovereign-world-kernel' ? (
        <section className="rounded-[1.35rem] border border-spectral-cyan-400/18 bg-spectral-cyan-500/[0.07] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-200/72">Sovereign Kernel</p>
              <h4 className="mt-2 text-lg font-semibold text-quantum-white">{String(environment.worldId || sovereignSnapshot.worldId || 'unbound-world')}</h4>
            </div>
            <div className="rounded-full border border-spectral-cyan-300/20 bg-pine-black-900/35 px-3 py-1 text-xs uppercase tracking-[0.2em] text-spectral-cyan-100/86">
              {String(environment.status || sovereignSnapshot.status || 'idle')}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-2">
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Kernel tick</p>
              <p className="mt-2 text-xl font-semibold text-quantum-white">{formatNumber(sovereignSnapshot.tick ?? state?.stepNumber ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Anomalies</p>
              <p className="mt-2 text-xl font-semibold text-quantum-white">{formatNumber(environment.anomalyCount)}</p>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Event log</p>
              <p className="mt-2 text-xl font-semibold text-quantum-white">{formatNumber(environment.eventCount)}</p>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Bridge</p>
              <p className="mt-2 text-sm font-medium text-quantum-white">{String(sovereignMetadata.bridge || 'local-simulation-bridge')}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Active agents</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(state?.entities || []).slice(0, 6).map((entity) => (
                  <span key={String(entity.id || Math.random())} className="rounded-full border border-quantum-white/10 bg-pine-black-900/40 px-3 py-1.5 text-xs text-quantum-white/86">
                    {String(entity.id || 'agent')} • {String(entity.type || 'entity')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Signal lanes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {signalKeys.length > 0 ? signalKeys.map((signalKey) => (
                  <span key={signalKey} className="rounded-full border border-spectral-cyan-300/18 bg-spectral-cyan-500/[0.08] px-3 py-1.5 text-xs text-spectral-cyan-100/90">
                    {signalKey}
                  </span>
                )) : <span className="text-sm text-quantum-white/54">No signal lanes in the latest snapshot.</span>}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {mode === 'multiverse' || String(metadata.source || '') === 'ionirix-multiverse-engine' ? (
        <section className="rounded-[1.35rem] border border-ion-blue-400/18 bg-ion-blue-500/[0.07] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ion-blue-100/72">Multiverse Probe</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">LOD</p>
              <p className="mt-2 text-xl font-semibold text-quantum-white">{formatNumber(environment.lodLevel)}</p>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Returned</p>
              <p className="mt-2 text-xl font-semibold text-quantum-white">{formatNumber(environment.returnedCount)}</p>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Matches</p>
              <p className="mt-2 text-xl font-semibold text-quantum-white">{formatNumber(environment.totalMatches)}</p>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Exec time</p>
              <p className="mt-2 text-xl font-semibold text-quantum-white">{formatNumber(multiverseLastResult.executionTimeMs || environment.executionTimeMs)} ms</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Query radius</p>
              <p className="mt-2 text-sm text-quantum-white">{formatNumber(multiverseCoordinates.radius)} MPC</p>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-pine-black-900/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-quantum-white/42">Coordinate vector</p>
              <p className="mt-2 text-sm text-quantum-white">
                {Array.isArray(multiverseCoordinates.values)
                  ? multiverseCoordinates.values.map((value) => formatNumber(value)).join(', ')
                  : '0, 0, 0'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="rounded-[1.35rem] border border-quantum-white/10 bg-quantum-white/[0.045] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-quantum-white/42">Inspector Notes</p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/68">
          <li>The live stream follows persisted snapshots, so it stays aligned with rollback and history endpoints.</li>
          <li>Cosmic runs surface sovereign kernel metadata such as world identity, bridge path, anomaly count, and event depth.</li>
          <li>If websocket delivery is unavailable, the panel falls back to authenticated polling automatically.</li>
        </ul>
      </div>
    </div>
  )
}