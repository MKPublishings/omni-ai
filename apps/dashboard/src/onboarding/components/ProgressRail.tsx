'use client'

import { clsx } from 'clsx'
import { GlassCard } from '@/components/GlassCard'
import { ONBOARDING_STEPS } from '@/onboarding'
import type { OnboardingStepId } from '@/onboarding'

interface ProgressRailProps {
  currentStep: OnboardingStepId
  compact?: boolean
}

function getCompactStepTitle(stepId: OnboardingStepId) {
  switch (stepId) {
    case 'account':
      return 'Account setup'
    case 'workspace':
      return 'Workspace setup'
    case 'preferences':
      return 'Interface tuning'
    case 'confirmation':
      return 'Confirm and launch'
    default:
      return ''
  }
}

export function ProgressRail({ currentStep, compact = false }: ProgressRailProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex((step) => step.id === currentStep)

  return (
    <GlassCard tier={2} className="rounded-[1.7rem] p-4 sm:rounded-[1.85rem] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Flow state</p>
          <h2 className="mt-2 text-lg font-semibold text-quantum-white">Onboarding sequence</h2>
        </div>
        <div className="rounded-full border border-quantum-white/12 px-3 py-1 text-xs text-quantum-white/64">
          {currentIndex + 1}/{ONBOARDING_STEPS.length}
        </div>
      </div>

      <div className={clsx('mt-4 grid gap-3.5 sm:mt-5 sm:gap-4', compact ? 'grid-cols-1' : 'grid-cols-1')}>
        {ONBOARDING_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isComplete = index < currentIndex

          return (
            <article
              key={step.id}
              className={clsx(
                'min-w-0 rounded-[1.35rem] border px-4 py-4 transition-colors duration-300 sm:rounded-[1.5rem] sm:px-4.5 sm:py-4.5',
                isActive && 'border-spectral-cyan-400/40 bg-spectral-cyan-500/10',
                isComplete && 'border-emerald-400/24 bg-emerald-400/8',
                !isActive && !isComplete && 'border-quantum-white/10 bg-black/10',
              )}
            >
              <div className="flex items-start justify-between gap-3.5">
                <div className="min-w-0 pr-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-quantum-white/45">Stage {index + 1} · {step.eyebrow}</p>
                  <h3 className="mt-2 text-[0.98rem] font-semibold leading-6 text-quantum-white sm:text-[1.02rem]">
                    {compact ? getCompactStepTitle(step.id) : step.title}
                  </h3>
                </div>
                <span className={clsx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  isActive && 'bg-spectral-cyan-400 text-pine-black-900',
                  isComplete && 'bg-emerald-400 text-pine-black-900',
                  !isActive && !isComplete && 'border border-quantum-white/12 text-quantum-white/72',
                )}>
                  {index + 1}
                </span>
              </div>
              {!compact ? <p className="mt-3 max-w-[34ch] text-sm leading-6 text-quantum-white/64">{step.description}</p> : null}
            </article>
          )
        })}
      </div>
    </GlassCard>
  )
}
