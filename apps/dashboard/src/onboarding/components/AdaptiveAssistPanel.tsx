'use client'

import { GlassCard } from '@/components/GlassCard'
import type { AdaptiveBehavior, OnboardingState, ReflowLayout } from '@/onboarding'

interface AdaptiveAssistPanelProps {
  state: OnboardingState
  layout: ReflowLayout
  behaviors: AdaptiveBehavior[]
}

export function AdaptiveAssistPanel({ state, layout, behaviors }: AdaptiveAssistPanelProps) {
  const enabledModules = state.formation.modules.filter((module) => module.enabled)

  return (
    <div className="space-y-4">
      <GlassCard tier={2} className="rounded-[1.75rem] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Adaptive posture</p>
        <h2 className="mt-2 text-xl font-semibold text-quantum-white">Reflow-aware shell</h2>
        <dl className="mt-5 grid gap-3 text-sm text-quantum-white/68">
          <div className="flex flex-col gap-1 rounded-2xl border border-quantum-white/10 bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <dt>Viewport mode</dt>
            <dd className="font-medium text-quantum-white">{layout.breakpoint}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-quantum-white/10 bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <dt>Layout posture</dt>
            <dd className="font-medium text-quantum-white">{state.preferences.layoutMode}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-quantum-white/10 bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <dt>Sidebar anchor</dt>
            <dd className="font-medium text-quantum-white">{state.preferences.sidebarPosition}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-quantum-white/10 bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <dt>Enabled launch modules</dt>
            <dd className="font-medium text-quantum-white">{enabledModules.length}</dd>
          </div>
        </dl>
      </GlassCard>

      <GlassCard tier={3} className="rounded-[1.75rem] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Adaptive behaviors</p>
        {behaviors.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-quantum-white/64">No exceptional behaviors are active. The surface is running in its baseline deterministic mode.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {behaviors.map((behavior) => (
              <article key={behavior.id} className="rounded-2xl border border-quantum-white/10 bg-black/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-quantum-white">{behavior.label}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">{behavior.tone}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-quantum-white/62">{behavior.description}</p>
              </article>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard tier={3} className="rounded-[1.75rem] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Formation summary</p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/64">
          {state.formation.summary.map((item) => (
            <li key={item} className="rounded-2xl border border-quantum-white/10 bg-black/10 px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  )
}
