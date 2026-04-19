'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'
import { PublicStatusPanel } from '@/components/PublicStatusPanel'
import { DashboardHealthStatus, fetchPublicHealth, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

const roadmapItems = [
  {
    phase: 'Live now',
    detail: 'Public landing, platform, capabilities, architecture, and roadmap pages now explain the Sovereign runtime, while the workspace exposes live sovereign and multiverse simulation inspection after login.',
  },
  {
    phase: 'Fixed recently',
    detail: 'Simulation state access is now session-scoped, legacy runtime stepping now uses real engines, and the simulation UI can follow persisted state over websocket with polling fallback.',
  },
  {
    phase: 'Operational next',
    detail: 'The public side can expand into richer world-kernel documentation, bridge examples, and operational explainers without moving the auth boundary.',
  },
  {
    phase: 'Workspace next',
    detail: 'Protected routes still have room for command-driven world control, deeper event filtering, richer history playback, and export workflows around sovereign state.',
  },
]

export default function RoadmapPage() {
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
      title="Roadmap"
      subtitle="A public view of what is already live in the Sovereign rollout, what was corrected in the runtime and UI path, and where the next surface area can grow."
      actions={
        <>
          <Link href="/capabilities" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Capabilities</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Sign in</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <GlassCard className="p-6">
          <h2 className="text-2xl font-semibold text-quantum-white">Delivery path</h2>
          <div className="mt-6 space-y-4">
            {roadmapItems.map((item) => (
              <div key={item.phase} className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">{item.phase}</p>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">{item.detail}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <PublicStatusPanel health={health} />
      </section>
    </PublicSiteShell>
  )
}