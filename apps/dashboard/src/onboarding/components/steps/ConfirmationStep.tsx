'use client'

import { GlassCard } from '@/components/GlassCard'
import type { OnboardingState } from '@/onboarding'

interface ConfirmationStepProps {
  state: OnboardingState
  errors: string[]
}

export function ConfirmationStep({ state, errors }: ConfirmationStepProps) {
  const enabledModules = state.formation.modules.filter((module) => module.enabled)

  return (
    <GlassCard className="rounded-[1.9rem] p-5 sm:rounded-[2rem] sm:p-8 lg:p-9">
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] xl:gap-6">
        <div className="space-y-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Confirmation step</p>
          <h2 className="mt-3 text-[1.9rem] font-semibold text-quantum-white sm:text-3xl">Review the formation output.</h2>
          <p className="mt-4 text-sm leading-6 text-quantum-white/68 sm:leading-7">
            Account provisioning will create the identity boundary first, then the onboarding client will persist the generated workspace plan locally and hand the user into verification or the live workspace route.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Account</p>
              <h3 className="mt-2 text-lg font-semibold text-quantum-white">{state.account.displayName}</h3>
              <p className="mt-2 text-sm leading-6 text-quantum-white/62">@{state.account.username} · {state.account.email}</p>
            </article>
            <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Workspace</p>
              <h3 className="mt-2 text-lg font-semibold text-quantum-white">{state.formation.workspaceName}</h3>
              <p className="mt-2 text-sm leading-6 text-quantum-white/62">/{state.formation.workspaceSlug} · {state.workspace.teamMode ? 'Team posture' : 'Solo posture'}</p>
            </article>
          </div>

          <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Workspace intent</p>
            <p className="mt-3 text-sm leading-7 text-quantum-white/68">{state.workspace.intent}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Capability score</p>
              <h3 className="mt-2 text-2xl font-semibold text-quantum-white">{state.formation.capabilityScore}</h3>
            </article>
            <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Telemetry</p>
              <h3 className="mt-2 text-lg font-semibold capitalize text-quantum-white">{state.formation.orchestration.telemetry}</h3>
            </article>
            <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Collaboration</p>
              <h3 className="mt-2 text-lg font-semibold capitalize text-quantum-white">{state.formation.orchestration.collaboration}</h3>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Primary launch route</p>
            <h3 className="mt-2 text-xl font-semibold text-quantum-white">{state.formation.primaryRoute}</h3>
            <p className="mt-2 text-sm leading-6 text-quantum-white/62">{state.formation.workspaceId}</p>
          </article>

          <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Enabled modules</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-quantum-white/64">
              {enabledModules.map((module) => (
                <li key={module.id}>{module.label} · {module.route}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-quantum-white/44">Shell calibration</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-quantum-white/64">
              <li>Theme: {state.preferences.theme}</li>
              <li>Density: {state.preferences.density}</li>
              <li>Motion: {state.preferences.motion}</li>
              <li>Layout: {state.preferences.layoutMode}</li>
              <li>Sidebar: {state.preferences.sidebarPosition}</li>
            </ul>
          </article>
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
