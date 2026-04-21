'use client'

import { clsx } from 'clsx'
import { GlassCard } from '@/components/GlassCard'
import { Input } from '@/components/Input'
import { CAPABILITY_CATALOG } from '@/onboarding'
import type { ExperienceLevel, WorkspaceDraft, WorkspaceCapabilityId } from '@/onboarding'

interface WorkspaceStepProps {
  value: WorkspaceDraft
  errors: string[]
  onChange: (payload: Partial<WorkspaceDraft>) => void
  onToggleCapability: (capability: WorkspaceCapabilityId) => void
}

const roles: ExperienceLevel[] = ['founder', 'operator', 'builder', 'analyst']

export function WorkspaceStep({ value, errors, onChange, onToggleCapability }: WorkspaceStepProps) {
  return (
    <GlassCard className="rounded-[2rem] p-6 sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Workspace step</p>
            <h2 className="mt-3 text-3xl font-semibold text-quantum-white">Define the launch shell.</h2>
          </div>

          <Input value={value.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Workspace name" className="h-12 rounded-2xl px-4" />
          <Input value={value.slug} onChange={(event) => onChange({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="workspace-slug" className="h-12 rounded-2xl px-4" autoCapitalize="none" autoCorrect="off" />

          <div>
            <label className="text-sm font-medium text-quantum-white">Operating role</label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onChange({ role })}
                  className={clsx(
                    'rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                    value.role === role
                      ? 'border-spectral-cyan-400/40 bg-spectral-cyan-500/10 text-quantum-white'
                      : 'border-quantum-white/10 bg-black/10 text-quantum-white/64 hover:text-quantum-white'
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-quantum-white/10 bg-black/10 px-4 py-3 text-sm text-quantum-white/72">
            <span>Enable team-oriented workspace posture</span>
            <input type="checkbox" checked={value.teamMode} onChange={(event) => onChange({ teamMode: event.target.checked })} className="h-4 w-4 rounded border-quantum-white/20 bg-transparent" />
          </label>

          <div>
            <label className="text-sm font-medium text-quantum-white">Workspace intent</label>
            <textarea
              value={value.intent}
              onChange={(event) => onChange({ intent: event.target.value })}
              placeholder="Describe what this workspace will govern, coordinate, or produce."
              className="mt-3 min-h-[160px] w-full rounded-[1.5rem] border border-quantum-white/12 bg-transparent px-4 py-3 text-sm text-quantum-white placeholder:text-quantum-white/40 focus:border-ion-blue-500 focus:outline-none focus:ring-2 focus:ring-ion-blue-500"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-quantum-white">Launch modules</p>
          <div className="mt-4 grid gap-3">
            {CAPABILITY_CATALOG.map((capability) => {
              const active = value.capabilities.includes(capability.id)

              return (
                <button
                  key={capability.id}
                  type="button"
                  onClick={() => onToggleCapability(capability.id)}
                  className={clsx(
                    'rounded-[1.5rem] border p-4 text-left transition-colors',
                    active
                      ? 'border-spectral-cyan-400/40 bg-spectral-cyan-500/10'
                      : 'border-quantum-white/10 bg-black/10 hover:border-quantum-white/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-quantum-white">{capability.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-quantum-white/62">{capability.description}</p>
                    </div>
                    <span className={clsx(
                      'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]',
                      active ? 'bg-spectral-cyan-400 text-pine-black-900' : 'border border-quantum-white/12 text-quantum-white/56'
                    )}>
                      {active ? 'Enabled' : 'Off'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-amber-signal-500/24 bg-amber-signal-500/10 p-4">
          <ul className="space-y-2 text-sm leading-6 text-amber-signal-200">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </GlassCard>
  )
}
