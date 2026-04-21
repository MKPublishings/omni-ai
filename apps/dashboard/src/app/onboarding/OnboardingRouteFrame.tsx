import type { ReactNode } from 'react'
import { AmbientBackground } from '@/components/AmbientBackground'
import { GlassCard } from '@/components/GlassCard'

interface OnboardingRouteFrameProps {
  eyebrow: string
  title: string
  description: string
  asideTitle: string
  asideBody: ReactNode
  children: ReactNode
}

export function OnboardingRouteFrame({
  eyebrow,
  title,
  description,
  asideTitle,
  asideBody,
  children,
}: OnboardingRouteFrameProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <header className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-spectral-cyan-300">{eyebrow}</p>
            <h1 className="mt-4 max-w-5xl text-4xl font-semibold leading-tight text-quantum-white sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-quantum-white/72 sm:text-lg">{description}</p>
          </div>

          <GlassCard tier={2} className="rounded-[1.75rem] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">{asideTitle}</p>
            <div className="mt-3 text-sm leading-6 text-quantum-white/68">{asideBody}</div>
          </GlassCard>
        </header>

        <section className="mt-6">{children}</section>
      </div>
    </div>
  )
}
