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
      subtitle="A public snapshot of the deployment envelope, system shape, and the path from browseable site to authenticated workspace."
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
            <li>The dashboard exports to static assets inside the public folder and is served through Cloudflare Workers assets.</li>
            <li>Worker routes continue to supply authenticated system state, event history, tools, and simulations after sign-in.</li>
            <li>The site is now split cleanly between public browseable pages and protected workspace surfaces.</li>
          </ul>
        </GlassCard>

        <PublicStatusPanel health={health} />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Public entry points</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The public shell now exposes five exported entry points before login, making the site navigable without falling directly into the auth gate.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Worker contract</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The unauthenticated status endpoint now reports deployment metadata, route counts, and live database-backed totals instead of only raw dependency placeholders.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Auth boundary</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Protected operational pages remain behind client-side auth while public pages focus on architecture, platform posture, and discoverability.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}