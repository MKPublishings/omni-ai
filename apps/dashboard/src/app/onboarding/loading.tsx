import { AmbientBackground } from '@/components/AmbientBackground'

export default function LoadingOnboardingRoute() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <div className="h-4 w-40 rounded-full bg-quantum-white/10" />
            <div className="h-12 w-full max-w-3xl rounded-[1.5rem] bg-quantum-white/10" />
            <div className="h-20 w-full max-w-2xl rounded-[1.5rem] bg-quantum-white/10" />
          </div>
          <div className="h-44 rounded-[2rem] bg-quantum-white/10" />
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.5fr)_minmax(280px,0.82fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="h-[320px] rounded-[2rem] bg-quantum-white/10" />
          <div className="h-[420px] rounded-[2rem] bg-quantum-white/10" />
          <div className="h-[360px] rounded-[2rem] bg-quantum-white/10" />
        </div>
      </div>
    </div>
  )
}
