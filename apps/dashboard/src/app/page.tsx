'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import { PublicStatusPanel } from '@/components/PublicStatusPanel'
import { PublicSiteShell } from '@/components/PublicSiteShell'
import { DashboardHealthStatus, fetchPublicHealth, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

const roamCards = [
  {
    title: 'Platform',
    href: '/platform',
    description: 'See the Cloudflare deployment shape and a public health snapshot before login.',
  },
  {
    title: 'Capabilities',
    href: '/capabilities',
    description: 'Browse the current public and protected feature surfaces that the site now exposes.',
  },
  {
    title: 'Architecture',
    href: '/architecture',
    description: 'See how exported pages, Worker routing, and authenticated APIs fit together.',
  },
  {
    title: 'Roadmap',
    href: '/roadmap',
    description: 'Review what is already live, what was fixed, and what the next public iterations should target.',
  },
  {
    title: 'Workspace login',
    href: '/login',
    description: 'Enter the live authenticated workspace with tools, simulations, events, memory, and analytics.',
  },
]

export default function LandingPage() {
  const [health, setHealth] = useState<DashboardHealthStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const nextHealth = await fetchPublicHealth()
        if (!cancelled) {
          setHealth(nextHealth)
        }
      } catch {
        return undefined
      }
    }

    void load()
    const interval = window.setInterval(() => {
      void load()
    }, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <PublicSiteShell
      title="ION AI now has a real public front door and a larger workspace behind it."
      subtitle="Browse the public site, inspect the platform surface, and then step into the authenticated operational workspace when you are ready."
      actions={
        <>
          <Link href="/platform" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Explore platform</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Sign in</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-quantum-white">Browseable site map</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roamCards.map((card) => (
              <Link key={card.href} href={card.href} className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5 transition hover:border-spectral-cyan-500/40 hover:bg-quantum-white/[0.05]">
                <h3 className="text-lg font-semibold text-quantum-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">{card.description}</p>
              </Link>
            ))}
          </div>
        </GlassCard>

        <PublicStatusPanel health={health} />
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Public pages</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Home, platform, capabilities, architecture, and roadmap are now part of the exported site and work without authentication.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Workspace routes</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Overview, assistant, analytics, events, simulations, tools, memory, and settings are organized behind login.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Responsive layout</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The new structure avoids the old overlap problems by using stable grids and dedicated shells.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Cloudflare deploy path</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Every page exports into the public asset directory, then the Worker serves it through the existing assets binding.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}