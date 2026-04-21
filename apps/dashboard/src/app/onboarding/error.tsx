'use client'

import { useEffect } from 'react'
import { AmbientBackground } from '@/components/AmbientBackground'
import { Button } from '@/components/Button'
import { GlassCard } from '@/components/GlassCard'

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
    <div className="relative min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <GlassCard className="w-full max-w-2xl rounded-[2rem] p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-signal-400">Route failure</p>
          <h1 className="mt-4 text-3xl font-semibold text-quantum-white">The onboarding route could not finish rendering.</h1>
          <p className="mt-4 text-sm leading-7 text-quantum-white/68">
            Reset the route tree to retry the render. If the issue persists, clear the onboarding draft and re-enter the flow from the public surface.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={reset} className="rounded-full px-5">Retry route</Button>
            <Button type="button" variant="secondary" onClick={() => window.location.assign('/')} className="rounded-full px-5">Public home</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
