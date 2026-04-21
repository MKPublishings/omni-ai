import { GlassCard } from '@/components/GlassCard'
import { OnboardingRouteFrame } from './OnboardingRouteFrame'

export default function LoadingOnboardingRoute() {
  return (
    <OnboardingRouteFrame
      eyebrow="Ionirix sovereign onboarding"
      title="Loading the formation surface."
      description="The route is restoring the onboarding shell, checking session state, and rebuilding the draft posture before the interactive flow opens."
      asideTitle="Route status"
      asideBody={
        <ul className="space-y-2">
          <li>Checking for an active authenticated workspace.</li>
          <li>Restoring any compatible local onboarding draft.</li>
          <li>Recomputing the responsive panel layout.</li>
        </ul>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(216px,0.68fr)_minmax(0,1.35fr)_minmax(16.25rem,0.8fr)]">
        <GlassCard className="rounded-[2rem] p-5 sm:p-6">
          <div className="space-y-4">
            <div className="h-4 w-28 rounded-full bg-quantum-white/10" />
            <div className="h-5 w-full rounded-full bg-quantum-white/10" />
            <div className="h-5 w-4/5 rounded-full bg-quantum-white/10" />
            <div className="h-5 w-3/5 rounded-full bg-quantum-white/10" />
          </div>
        </GlassCard>

        <GlassCard className="rounded-[2rem] p-6 sm:p-8">
          <div className="space-y-5">
            <div className="h-4 w-32 rounded-full bg-quantum-white/10" />
            <div className="h-12 w-full rounded-[1.25rem] bg-quantum-white/10" />
            <div className="h-12 w-full rounded-[1.25rem] bg-quantum-white/10" />
            <div className="h-32 w-full rounded-[1.5rem] bg-quantum-white/10" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-14 rounded-[1.25rem] bg-quantum-white/10" />
              <div className="h-14 rounded-[1.25rem] bg-quantum-white/10" />
            </div>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="rounded-[2rem] p-5 sm:p-6">
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-quantum-white/10" />
            <div className="h-14 rounded-[1.25rem] bg-quantum-white/10" />
            <div className="h-14 rounded-[1.25rem] bg-quantum-white/10" />
            <div className="h-14 rounded-[1.25rem] bg-quantum-white/10" />
          </div>
        </GlassCard>
      </div>
    </OnboardingRouteFrame>
  )
}
