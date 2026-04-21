'use client'

import { clsx } from 'clsx'
import type { PreferencesDraft } from '@/onboarding'

interface InterfacePreferencesSectionProps {
  value: PreferencesDraft
  errors: string[]
  onChange: (payload: Partial<PreferencesDraft>) => void
  eyebrow: string
  title: string
  description?: string
  mobileDescription?: string
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
    <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
      <p className="text-sm font-medium text-quantum-white">{label}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={clsx(
              'inline-flex min-h-[3rem] w-full items-center justify-center rounded-[1.15rem] border px-3 py-2.5 text-center text-[13px] font-medium capitalize leading-5 transition-colors sm:rounded-full sm:px-4 sm:text-sm',
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

export function InterfacePreferencesSection({
  value,
  errors,
  onChange,
  eyebrow,
  title,
  description,
  mobileDescription,
}: InterfacePreferencesSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.96fr)] xl:gap-6">
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">{eyebrow}</p>
          <h2 className="mt-3 text-[1.9rem] font-semibold text-quantum-white sm:text-3xl">{title}</h2>
          {mobileDescription ? <p className="mt-4 text-sm leading-6 text-quantum-white/68 sm:hidden">{mobileDescription}</p> : null}
          {description ? <p className={clsx('mt-4 text-sm leading-6 text-quantum-white/68 sm:leading-7', mobileDescription ? 'hidden sm:block' : '')}>{description}</p> : null}
        </div>

        <div className="rounded-[1.75rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-6">
          <p className="text-sm font-semibold text-quantum-white">Appearance and pace</p>
          <div className="mt-4 grid gap-4">
            <SegmentedControl label="Theme" value={value.theme} options={['system', 'dark', 'light']} onChange={(theme) => onChange({ theme })} />
            <SegmentedControl label="Density" value={value.density} options={['compact', 'comfortable', 'spacious']} onChange={(density) => onChange({ density })} />
            <SegmentedControl label="Motion" value={value.motion} options={['full', 'reduced', 'none']} onChange={(motion) => onChange({ motion })} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-6">
          <p className="text-sm font-semibold text-quantum-white">Shell arrangement</p>
          <div className="mt-4 grid gap-4">
            <SegmentedControl label="Layout mode" value={value.layoutMode} options={['grid', 'stack', 'focus']} onChange={(layoutMode) => onChange({ layoutMode })} />
            <SegmentedControl label="Sidebar position" value={value.sidebarPosition} options={['left', 'right', 'hidden']} onChange={(sidebarPosition) => onChange({ sidebarPosition })} />
          </div>
        </div>

        <label className="flex flex-col gap-4 rounded-[1.75rem] border border-quantum-white/10 bg-black/10 px-4 py-4 text-sm text-quantum-white/72 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
          <span>
            Enable full onboarding telemetry capture
            <span className="mt-1 block text-xs leading-5 text-quantum-white/48">Stores richer draft analytics for the workspace formation handoff.</span>
          </span>
          <input type="checkbox" checked={value.telemetryOptIn} onChange={(event) => onChange({ telemetryOptIn: event.target.checked })} className="h-4 w-4 rounded border-quantum-white/20 bg-transparent" />
        </label>
      </div>

      {errors.length > 0 ? (
        <div className="lg:col-span-2">
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