'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import { PublicStatusPanel } from '@/components/PublicStatusPanel'
import { PublicSiteShell } from '@/components/PublicSiteShell'
import { DashboardHealthStatus, fetchPublicHealth, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

const roamCards = [
  {
    title: 'Pricing',
    href: '/pricing',
    description: 'Move directly into the new premium purchase flow and trigger checkout against the live Worker billing routes.',
  },
  {
    title: 'Platform',
    href: '/platform',
    description: 'See the edge deployment shape, sovereign runtime path, and public health snapshot before login.',
  },
  {
    title: 'Capabilities',
    href: '/capabilities',
    description: 'Browse the sovereign world, simulation streaming, and protected control-surface capabilities now exposed.',
  },
  {
    title: 'Architecture',
    href: '/architecture',
    description: 'See how exported pages, Worker routing, Durable Objects, and the authoritative world kernel fit together.',
  },
  {
    title: 'Roadmap',
    href: '/roadmap',
    description: 'Review what is already live in the Sovereign rollout, what was hardened, and what the next UI iterations should target.',
  },
  {
    title: 'Workspace login',
    href: '/login',
    description: 'Enter the authenticated workspace with live simulation inspection, events, tools, memory, and analytics.',
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
      title="ION AI now exposes the Sovereign runtime from the public shell through the live workspace."
      subtitle="Browse the public site, inspect the edge-to-kernel platform shape, and then step into the authenticated workspace for live sovereign and multiverse operations."
      actions={
        <>
          <Link href="/pricing" className="rounded-full border border-spectral-cyan-500/18 bg-spectral-cyan-500/10 px-4 py-2 text-sm text-spectral-cyan-100 transition hover:bg-spectral-cyan-500/18">View pricing</Link>
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
          <h2 className="text-lg font-semibold text-quantum-white">Public briefings</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Home, platform, capabilities, architecture, and roadmap now explain the Sovereign runtime, deploy shape, and operational posture without requiring login.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Workspace routes</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Overview, assistant, analytics, events, simulations, tools, memory, and settings stay behind login, with the simulations view now exposing live sovereign inspection.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Live runtime UI</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The workspace now exposes live simulation history, sovereign kernel telemetry, multiverse query metadata, and stream-aware inspection rather than static scenario tables alone.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Cloudflare deploy path</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Every public page still exports into the asset directory, while the Worker handles auth, simulation APIs, websocket upgrades, and the world-state bus boundary.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}