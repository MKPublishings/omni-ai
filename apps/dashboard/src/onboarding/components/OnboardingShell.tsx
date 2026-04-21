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
  const enabledModules = state.formation.modules.filter((module) => module.enabled)
  const copyrightYear = new Date().getFullYear()

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:px-10">
      <header className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(21rem,0.82fr)] xl:items-stretch">
        <GlassCard className="rounded-[2rem] p-6 sm:p-7 lg:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-spectral-cyan-300">Ionirix sovereign onboarding</p>
          <h1 className="mt-4 max-w-5xl text-3xl font-semibold leading-tight text-quantum-white sm:text-4xl xl:text-[3.4rem]">Build the workspace before the workspace opens.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-quantum-white/72 sm:text-base">
            This flow provisions the account boundary, shapes the workspace shell, calibrates the interface system, and hands the user into the authenticated environment without layout drift or ambiguous state.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Phase</p>
              <p className="mt-2 text-lg font-semibold text-quantum-white">{stepDefinition?.title}</p>
            </div>
            <div className="rounded-[1.35rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Primary route</p>
              <p className="mt-2 text-lg font-semibold text-quantum-white">{state.formation.primaryRoute}</p>
            </div>
            <div className="rounded-[1.35rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Enabled modules</p>
              <p className="mt-2 text-lg font-semibold text-quantum-white">{enabledModules.length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="rounded-[2rem] p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Current phase</p>
          <h2 className="mt-3 text-2xl font-semibold text-quantum-white sm:text-[2rem]">{stepDefinition?.title}</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/64">{stepDefinition?.description}</p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[1.35rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Workspace target</p>
              <p className="mt-2 text-sm leading-6 text-quantum-white/66">{state.formation.workspaceName} · {state.formation.workspaceId}</p>
            </div>
            <div className="rounded-[1.35rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Shell posture</p>
              <p className="mt-2 text-sm leading-6 text-quantum-white/66">{state.preferences.layoutMode} layout · {state.preferences.density} density · {state.preferences.motion} motion</p>
            </div>
          </div>
        </GlassCard>
      </header>

      {notice ? <div className="mt-5">{notice}</div> : null}

      <section className={clsx('mt-5 flex-1', layout.shellClassName)}>
        <div className={clsx('min-w-0', layout.railPlacement === 'top' ? 'order-1' : 'lg:col-start-1')}>
          <ProgressRail currentStep={state.currentStep} compact={compactRail} />
        </div>

        <div className={layout.contentClassName}>
          {mainContent}

          <GlassCard tier={2} className="rounded-[1.9rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-quantum-white">Workspace target</p>
                <p className="mt-1 text-sm leading-6 text-quantum-white/64">
                  Primary route: {state.formation.primaryRoute} · Workspace ID: {state.formation.workspaceId}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 xl:justify-end">
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

      <footer className="mt-6 border-t border-quantum-white/10 pt-4 text-center text-xs uppercase tracking-[0.2em] text-quantum-white/42 sm:mt-8">
        Copyright {copyrightYear} Ionirix. All rights reserved.
      </footer>
    </div>
  )
}
