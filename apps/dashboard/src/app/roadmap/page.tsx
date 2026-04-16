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
    detail: 'Public landing, platform, capabilities, architecture, and roadmap pages are exported and browseable before login.',
  },
  {
    phase: 'Fixed recently',
    detail: 'Worker asset resolution now prefers matching exported HTML assets for clean routes instead of collapsing routes back into the wrong page.',
  },
  {
    phase: 'Operational next',
    detail: 'The public side can now expand into documentation, examples, and richer status narratives without changing the auth boundary.',
  },
  {
    phase: 'Workspace next',
    detail: 'Protected routes still have room for deeper analytics, event filtering, memory browsing, and simulation workflows after sign-in.',
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
      subtitle="A public view of what is already live, what was corrected in the deploy path, and where the next surface area can grow."
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