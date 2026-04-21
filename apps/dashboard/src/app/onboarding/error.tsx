'use client'

import { useEffect } from 'react'
import { Button } from '@/components/Button'
import { GlassCard } from '@/components/GlassCard'
import { OnboardingRouteFrame } from './OnboardingRouteFrame'

export default function OnboardingRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Onboarding route failure', error)
  }, [error])

  return (
    <OnboardingRouteFrame
      eyebrow="Ionirix sovereign onboarding"
      title="The route hit a rendering fault."
      description="The onboarding shell did not complete its route render. Retry the route tree first, then clear the saved draft if the failure repeats."
      asideTitle="Recovery posture"
      asideBody={
        <ul className="space-y-2">
          <li>Retry the route tree without leaving the onboarding context.</li>
          <li>If the problem persists, restart from the public surface with a fresh draft.</li>
          <li>{error.digest ? `Digest: ${error.digest}` : 'No framework digest was attached to this route error.'}</li>
        </ul>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <GlassCard className="rounded-[2rem] p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-signal-400">Route failure</p>
          <h2 className="mt-4 text-3xl font-semibold text-quantum-white">The onboarding route could not finish rendering.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-quantum-white/68">
            Reset the route tree to retry the render. If the issue persists, clear the onboarding draft and re-enter the flow from the public surface.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={reset} className="rounded-full px-5">Retry route</Button>
            <Button type="button" variant="secondary" onClick={() => window.location.assign('/')} className="rounded-full px-5">Public home</Button>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="rounded-[2rem] p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Failure boundary</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/64">
            <li>The route-level boundary caught this failure before the interactive onboarding state mounted.</li>
            <li>Retrying here preserves a cleaner recovery path than forcing a full hard refresh immediately.</li>
            <li>Returning to public home exits the onboarding route and lets the flow start from a known entry state.</li>
          </ul>
        </GlassCard>
      </div>
    </OnboardingRouteFrame>
  )
}
