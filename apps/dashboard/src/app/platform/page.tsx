'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import { PublicStatusPanel } from '@/components/PublicStatusPanel'
import { PublicSiteShell } from '@/components/PublicSiteShell'
import { DashboardHealthStatus, fetchPublicHealth, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

export default function PlatformPage() {
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
      title="Platform view"
      subtitle="A public snapshot of the deployment envelope, sovereign runtime chain, and the path from browseable site to authenticated workspace."
      actions={
        <>
          <Link href="/architecture" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Architecture</Link>
          <Link href="/capabilities" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Capabilities</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Access workspace</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-quantum-white">Deployment topology</h2>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-quantum-white/72">
            <li>The dashboard exports to static HTML inside the public folder and is served through the Cloudflare Workers assets binding.</li>
            <li>The Worker now carries the Sovereign runtime edge layer: authenticated APIs, simulation websocket upgrades, and the Durable Object world-state bus.</li>
            <li>Cosmic runs can bridge from the Worker to the authoritative Python world kernel while multiverse runs stay deterministic at the edge.</li>
            <li>The site stays split cleanly between public briefings and protected operational surfaces, but both now describe the same runtime model.</li>
          </ul>
        </GlassCard>

        <PublicStatusPanel health={health} />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Public entry points</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The public shell now acts as the Sovereign briefing layer, surfacing runtime architecture, rollout status, and capabilities before the auth boundary.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Worker contract</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The edge contract now spans public health, authenticated simulation control, stream upgrades, and session-scoped access to sovereign world state.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Authoritative kernel path</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The sovereign path now runs from public explanation, to Worker edge orchestration, to a Python authoritative kernel for cosmic world-state execution.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}