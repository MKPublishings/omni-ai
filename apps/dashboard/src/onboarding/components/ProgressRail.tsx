'use client'

import { clsx } from 'clsx'
import { GlassCard } from '@/components/GlassCard'
import { ONBOARDING_STEPS } from '@/onboarding'
import type { OnboardingStepId } from '@/onboarding'

interface ProgressRailProps {
  currentStep: OnboardingStepId
  compact?: boolean
}

export function ProgressRail({ currentStep, compact = false }: ProgressRailProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex((step) => step.id === currentStep)

  return (
    <GlassCard tier={2} className="rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Flow state</p>
          <h2 className="mt-2 text-lg font-semibold text-quantum-white">Onboarding sequence</h2>
        </div>
        <div className="rounded-full border border-quantum-white/12 px-3 py-1 text-xs text-quantum-white/64">
          {currentIndex + 1}/{ONBOARDING_STEPS.length}
        </div>
      </div>

      <div className={clsx('mt-5 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-1')}>
        {ONBOARDING_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isComplete = index < currentIndex

          return (
            <article
              key={step.id}
              className={clsx(
                'rounded-2xl border p-4 transition-colors duration-300',
                isActive && 'border-spectral-cyan-400/40 bg-spectral-cyan-500/10',
                isComplete && 'border-emerald-400/24 bg-emerald-400/8',
                !isActive && !isComplete && 'border-quantum-white/10 bg-black/10',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-quantum-white/45">{step.eyebrow}</p>
                  <h3 className="mt-2 text-sm font-semibold text-quantum-white">{step.title}</h3>
                </div>
                <span className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  isActive && 'bg-spectral-cyan-400 text-pine-black-900',
                  isComplete && 'bg-emerald-400 text-pine-black-900',
                  !isActive && !isComplete && 'border border-quantum-white/12 text-quantum-white/72',
                )}>
                  {index + 1}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-quantum-white/64">{step.description}</p>
            </article>
          )
        })}
      </div>
    </GlassCard>
  )
}
