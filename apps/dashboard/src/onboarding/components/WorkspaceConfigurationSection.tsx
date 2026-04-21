'use client'

import { clsx } from 'clsx'
import { Input } from '@/components/Input'
import { CAPABILITY_CATALOG } from '@/onboarding'
import type { ExperienceLevel, WorkspaceCapabilityId, WorkspaceDraft } from '@/onboarding'

interface WorkspaceConfigurationSectionProps {
  value: WorkspaceDraft
  errors: string[]
  onChange: (payload: Partial<WorkspaceDraft>) => void
  onToggleCapability: (capability: WorkspaceCapabilityId) => void
  eyebrow: string
  title: string
  description?: string
  mobileDescription?: string
}

const roles: ExperienceLevel[] = ['founder', 'operator', 'builder', 'analyst']

const MOBILE_CAPABILITY_COPY: Partial<Record<WorkspaceCapabilityId, string>> = {
  assistant: 'Chat, reasoning, and guided actions.',
  analytics: 'Health views and totals.',
  automation: 'Tools, commands, and orchestration.',
  memory: 'Saved context and continuity.',
  simulations: 'Live simulation control.',
}

export function WorkspaceConfigurationSection({
  value,
  errors,
  onChange,
  onToggleCapability,
  eyebrow,
  title,
  description,
  mobileDescription,
}: WorkspaceConfigurationSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:gap-6">
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">{eyebrow}</p>
          <h2 className="mt-3 text-[1.9rem] font-semibold text-quantum-white sm:text-3xl">{title}</h2>
          {mobileDescription ? <p className="mt-4 text-sm leading-6 text-quantum-white/68 sm:hidden">{mobileDescription}</p> : null}
          {description ? <p className={clsx('mt-4 text-sm leading-6 text-quantum-white/68 sm:leading-7', mobileDescription ? 'hidden sm:block' : '')}>{description}</p> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.45rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-5">
            <label className="text-sm font-medium text-quantum-white">Workspace name</label>
            <p className="mt-1 text-xs leading-5 text-quantum-white/48">The primary label shown across the workspace shell.</p>
            <Input
              value={value.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="Workspace name"
              className="mt-3 h-12 rounded-2xl px-4"
            />
          </div>

          <div className="rounded-[1.45rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-5">
            <label className="text-sm font-medium text-quantum-white">Workspace slug</label>
            <p className="mt-1 text-xs leading-5 text-quantum-white/48">The URL-safe identifier used for workspace routing and formation.</p>
            <Input
              value={value.slug}
              onChange={(event) => onChange({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="workspace-slug"
              className="mt-3 h-12 rounded-2xl px-4"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-5">
          <label className="text-sm font-medium text-quantum-white">Operating role</label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onChange({ role })}
                className={clsx(
                  'rounded-2xl border px-3.5 py-3 text-left text-sm transition-colors sm:px-4',
                  value.role === role
                    ? 'border-spectral-cyan-400/40 bg-spectral-cyan-500/10 text-quantum-white'
                    : 'border-quantum-white/10 bg-pine-black-900/20 text-quantum-white/64 hover:text-quantum-white'
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-4 rounded-[1.6rem] border border-quantum-white/10 bg-black/10 px-4 py-4 text-sm text-quantum-white/72 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            Enable team-oriented workspace posture
            <span className="mt-1 block text-xs leading-5 text-quantum-white/48">Use the collaborative shell model for shared operations, memory, and launch paths.</span>
          </span>
          <input type="checkbox" checked={value.teamMode} onChange={(event) => onChange({ teamMode: event.target.checked })} className="h-4 w-4 rounded border-quantum-white/20 bg-transparent" />
        </label>

        <div className="rounded-[1.6rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-5">
          <label className="text-sm font-medium text-quantum-white">Workspace intent</label>
          <textarea
            value={value.intent}
            onChange={(event) => onChange({ intent: event.target.value })}
            placeholder="Describe what this workspace will govern, coordinate, or produce."
            className="mt-3 min-h-[160px] w-full rounded-[1.5rem] border border-quantum-white/12 bg-transparent px-4 py-3 text-sm text-quantum-white placeholder:text-quantum-white/40 focus:border-ion-blue-500 focus:outline-none focus:ring-2 focus:ring-ion-blue-500"
          />
        </div>
      </div>

      <div className="min-w-0 rounded-[1.75rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-6">
        <p className="text-sm font-medium text-quantum-white">Launch modules</p>
        <p className="mt-2 text-sm leading-6 text-quantum-white/60 sm:hidden">Choose the first surfaces this workspace should open with.</p>
        <p className="mt-2 hidden text-sm leading-6 text-quantum-white/60 sm:block">Select the surfaces this workspace should emphasize first. These choices determine the saved primary route and shell priority.</p>
        <div className="mt-4 grid gap-3">
          {CAPABILITY_CATALOG.map((capability) => {
            const active = value.capabilities.includes(capability.id)
            const mobileDescription = MOBILE_CAPABILITY_COPY[capability.id] || capability.description

            return (
              <button
                key={capability.id}
                type="button"
                onClick={() => onToggleCapability(capability.id)}
                className={clsx(
                  'min-w-0 rounded-[1.5rem] border p-3 text-left transition-colors sm:p-4',
                  active
                    ? 'border-spectral-cyan-400/40 bg-spectral-cyan-500/10'
                    : 'border-quantum-white/10 bg-pine-black-900/20 hover:border-quantum-white/20'
                )}
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-quantum-white">{capability.title}</h3>
                    <p className="mt-1 text-[13px] leading-5 text-quantum-white/62 sm:hidden">{mobileDescription}</p>
                    <p className="mt-2 hidden text-sm leading-6 text-quantum-white/62 sm:block">{capability.description}</p>
                  </div>
                  <span
                    className={clsx(
                      'inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]',
                      active ? 'bg-spectral-cyan-400 text-pine-black-900' : 'border border-quantum-white/12 text-quantum-white/56'
                    )}
                  >
                    {active ? 'Enabled' : 'Off'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="xl:col-span-2">
          <div className="rounded-[1.5rem] border border-amber-signal-500/24 bg-amber-signal-500/10 p-4">
            <ul className="space-y-2 text-sm leading-6 text-amber-signal-200">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}