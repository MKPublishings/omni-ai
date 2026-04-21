'use client'

import { clsx } from 'clsx'
import { GlassCard } from '@/components/GlassCard'
import type { PreferencesDraft } from '@/onboarding'

interface PreferencesStepProps {
  value: PreferencesDraft
  errors: string[]
  onChange: (payload: Partial<PreferencesDraft>) => void
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: T[]
  onChange: (nextValue: T) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-quantum-white">{label}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={clsx(
              'rounded-full border px-4 py-2 text-sm capitalize transition-colors',
              value === option
                ? 'border-spectral-cyan-400/40 bg-spectral-cyan-500/10 text-quantum-white'
                : 'border-quantum-white/10 bg-black/10 text-quantum-white/64 hover:text-quantum-white'
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PreferencesStep({ value, errors, onChange }: PreferencesStepProps) {
  return (
    <GlassCard className="rounded-[2rem] p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Preferences step</p>
            <h2 className="mt-3 text-3xl font-semibold text-quantum-white">Tune the shell behavior.</h2>
            <p className="mt-4 text-sm leading-7 text-quantum-white/68">
              These settings feed the reflow engine directly, so the shell arrangement and motion treatment remain deterministic when the user crosses devices.
            </p>
          </div>

          <SegmentedControl label="Theme" value={value.theme} options={['system', 'dark', 'light']} onChange={(theme) => onChange({ theme })} />
          <SegmentedControl label="Density" value={value.density} options={['compact', 'comfortable', 'spacious']} onChange={(density) => onChange({ density })} />
          <SegmentedControl label="Motion" value={value.motion} options={['full', 'reduced', 'none']} onChange={(motion) => onChange({ motion })} />
        </div>

        <div className="space-y-6">
          <SegmentedControl label="Layout mode" value={value.layoutMode} options={['grid', 'stack', 'focus']} onChange={(layoutMode) => onChange({ layoutMode })} />
          <SegmentedControl label="Sidebar position" value={value.sidebarPosition} options={['left', 'right', 'hidden']} onChange={(sidebarPosition) => onChange({ sidebarPosition })} />

          <label className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4 text-sm text-quantum-white/72">
            <span>
              Enable full onboarding telemetry capture
              <span className="mt-1 block text-xs text-quantum-white/48">Stores richer draft analytics for the workspace formation handoff.</span>
            </span>
            <input type="checkbox" checked={value.telemetryOptIn} onChange={(event) => onChange({ telemetryOptIn: event.target.checked })} className="h-4 w-4 rounded border-quantum-white/20 bg-transparent" />
          </label>
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
