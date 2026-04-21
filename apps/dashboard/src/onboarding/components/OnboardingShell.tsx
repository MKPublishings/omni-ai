'use client'

import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { Button } from '@/components/Button'
import { GlassCard } from '@/components/GlassCard'
import type { AdaptiveBehavior, OnboardingState, ReflowLayout } from '@/onboarding'
import { ONBOARDING_STEPS } from '@/onboarding'
import { AdaptiveAssistPanel } from './AdaptiveAssistPanel'
import { ProgressRail } from './ProgressRail'

interface OnboardingShellProps {
  state: OnboardingState
  layout: ReflowLayout
  behaviors: AdaptiveBehavior[]
  mainContent: ReactNode
  onBack: () => void
  onNext: () => void
  onReset: () => void
  canGoBack: boolean
  nextLabel: string
  busy: boolean
  notice?: ReactNode
}

export function OnboardingShell({
  state,
  layout,
  behaviors,
  mainContent,
  onBack,
  onNext,
  onReset,
  canGoBack,
  nextLabel,
  busy,
  notice,
}: OnboardingShellProps) {
  const stepDefinition = ONBOARDING_STEPS.find((step) => step.id === state.currentStep)
  const compactRail = layout.breakpoint === 'mobile'

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-spectral-cyan-300">Ionirix sovereign onboarding</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold leading-tight text-quantum-white sm:text-5xl">Build the workspace before the workspace opens.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-quantum-white/72 sm:text-lg">
            This surface provisions the account boundary, forms the workspace shell, calibrates the layout system, and hands the user into the authenticated environment without ambiguous state.
          </p>
        </div>

        <GlassCard tier={2} className="rounded-[1.75rem] p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Current phase</p>
          <h2 className="mt-2 text-2xl font-semibold text-quantum-white">{stepDefinition?.title}</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/64">{stepDefinition?.description}</p>
        </GlassCard>
      </header>

      {notice ? <div className="mt-6">{notice}</div> : null}

      <section className={clsx('mt-6', layout.shellClassName)}>
        <div className={clsx(layout.railPlacement === 'top' ? 'order-1' : 'lg:col-start-1')}>
          <ProgressRail currentStep={state.currentStep} compact={compactRail} />
        </div>

        <div className={layout.contentClassName}>
          {mainContent}

          <GlassCard tier={2} className="mt-4 rounded-[1.75rem] p-4 sm:mt-5 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-quantum-white">Workspace target</p>
                <p className="mt-1 text-sm leading-6 text-quantum-white/64">
                  Primary route: {state.formation.primaryRoute} | Workspace ID: {state.formation.workspaceId}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="ghost" onClick={onReset} className="rounded-full px-5">
                  Reset draft
                </Button>
                <Button type="button" variant="secondary" onClick={onBack} disabled={!canGoBack || busy} className="rounded-full px-5">
                  Back
                </Button>
                <Button type="button" onClick={onNext} disabled={busy} className="rounded-full px-5" glow>
                  {busy ? 'Working...' : nextLabel}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        <aside className={layout.asideClassName}>
          <AdaptiveAssistPanel state={state} layout={layout} behaviors={behaviors} />
        </aside>
      </section>
    </div>
  )
}
