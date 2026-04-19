'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'
import { PublicStatusPanel } from '@/components/PublicStatusPanel'
import { DashboardHealthStatus, fetchPublicHealth, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

const architectureLayers = [
  {
    title: 'Static public shell',
    description: 'The public-facing pages export to flat HTML assets so Cloudflare can serve the Sovereign briefing layer without a Node runtime.',
  },
  {
    title: 'Worker route layer',
    description: 'The Worker resolves clean routes to exported HTML assets first, then switches into authenticated APIs and websocket upgrades for operational flows.',
  },
  {
    title: 'World-state bus',
    description: 'A Durable Object-backed world-state bus now carries edge-side sovereign coordination and isolates state per authenticated session boundary.',
  },
  {
    title: 'Authoritative kernel bridge',
    description: 'Cosmic runs can bridge from the Worker into the authoritative Python world kernel, preserving world snapshots and event logs in persisted simulation metadata.',
  },
  {
    title: 'Authenticated API surface',
    description: 'After sign-in, the Worker supplies auth state, event history, tools, simulation history, live state inspection, and session-scoped control routes.',
  },
  {
    title: 'D1-backed observability',
    description: 'Public status still draws from aggregate D1 queries, while protected views expose per-session simulation snapshots, history, and rollback-ready state.',
  },
]

export default function ArchitecturePage() {
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
      title="Architecture"
      subtitle="A public explanation of how exported pages, Worker routing, the world-state bus, and the authoritative kernel now combine into one deployable site."
      actions={
        <>
          <Link href="/roadmap" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Roadmap</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Open workspace</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-quantum-white">System layers</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {architectureLayers.map((layer) => (
              <div key={layer.title} className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-quantum-white">{layer.title}</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">{layer.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <PublicStatusPanel health={health} />
      </section>
    </PublicSiteShell>
  )
}