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
    detail: 'Public landing, platform, capabilities, architecture, and roadmap pages now explain the Sovereign runtime, while the workspace exposes live sovereign and multiverse simulation inspection after login. The public side now has enough informational depth to serve as an actual record of the system rather than a brief placeholder before authentication.',
  },
  {
    phase: 'Fixed recently',
    detail: 'Simulation state access is now session-scoped, legacy runtime stepping now uses real engines, and the simulation UI can follow persisted state over websocket with polling fallback. This correction path matters because it improves trust in the runtime, not just appearance in the interface.',
  },
  {
    phase: 'Operational next',
    detail: 'The public side can expand into richer world-kernel documentation, bridge examples, and operational explainers without moving the auth boundary. The roadmap now treats public explanation as an infrastructural layer that can continue to deepen over time.',
  },
  {
    phase: 'Workspace next',
    detail: 'Protected routes still have room for command-driven world control, deeper event filtering, richer history playback, and export workflows around sovereign state. The next phase of the workspace is less about surface variety and more about stronger operational continuity.',
  },
]

const roadmapPanels = [
  {
    title: 'Roadmap posture',
    body: 'The roadmap is now less about isolated feature drops and more about bringing the system into alignment. Public narrative, runtime boundaries, simulation state, identity workflows, and reasoning surfaces are increasingly being treated as parts of one architectural motion. The roadmap should therefore be read as a sequence of consolidation and expansion, not a loose collection of future ideas.',
  },
  {
    title: 'Why the sequence matters',
    body: 'The order of work matters because the platform depends on continuity. It is more valuable to make simulation state, billing flows, verification paths, and public explanation coherent than to ship disconnected additions quickly. The roadmap now reflects that principle more explicitly.',
  },
  {
    title: 'Public-side growth',
    body: 'Architecture, capabilities, roadmap, pricing, legal, and platform pages can continue to expand as a true public record. That growth is not peripheral to the product. It is part of how Ionirix explains its own logic, boundaries, and direction before a user enters the workspace.',
  },
]

const focusTracks = [
  {
    title: 'Simulation depth',
    body: 'Future work will likely continue to deepen authoritative world-state handling, simulation orchestration, richer history playback, and more trustworthy inspection of state transitions across time.',
  },
  {
    title: 'Operator control',
    body: 'Protected routes still have room for more command-driven control, clearer event filtering, stronger system memory flows, and more explicit pathways between observation and action.',
  },
  {
    title: 'Release clarity',
    body: 'The public side can continue to absorb valuation records, implementation notes, infrastructure explainers, and release framing so the system becomes easier to read from the outside as it grows on the inside.',
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
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">Roadmap overview</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The roadmap now describes more than a future feature queue. It shows how the Sovereign rollout is being stabilized, clarified, and extended across public explanation, runtime coordination, simulation continuity, and workspace depth. What is live today already reflects a substantial shift toward a more coherent platform shape.
              </p>
              <p>
                The next work is therefore not about adding random surface area. It is about reinforcing the integrity of the system: strengthening identity and entitlement flows, giving simulations deeper continuity, making the public side more explanatory, and expanding operator-grade control inside the workspace.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h2 className="text-lg font-semibold text-quantum-white">Roadmap lens</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                This page is meant to be read as a directional record. It explains what is already real, what was corrected, and where growth is most likely to create structural value.
              </p>
              <p>
                The emphasis is on continuity, not feature inflation. The strongest roadmap items are the ones that make the whole site more coherent across public and protected surfaces.
              </p>
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
        <GlassCard className="p-6" interactive>
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

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {roadmapPanels.map((panel) => (
          <GlassCard key={panel.title} className="p-6" interactive>
            <h2 className="text-lg font-semibold text-quantum-white">{panel.title}</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">{panel.body}</p>
          </GlassCard>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">What the next phase is trying to accomplish</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The next phase of the roadmap is aimed at strengthening trust in the system. That means public pages should better explain the runtime and its boundaries, while protected routes should give operators more durable control over state, history, tools, and simulation behavior. The roadmap is therefore both technical and editorial: it expands what the platform can do and improves how clearly the platform can describe itself.
              </p>
              <p>
                Better sizing and fit across larger monitors are part of the same logic. A system with richer reading surfaces and deeper operational panels should not remain artificially compressed into narrow widths when the available display can responsibly hold more structure. The site now has a broader shell so public and workspace surfaces can make better use of wide, portrait, and expanded displays.
              </p>
            </div>
          </article>
        </GlassCard>

        <div className="grid gap-6">
          {focusTracks.map((track) => (
            <GlassCard key={track.title} className="p-6" interactive>
              <h2 className="text-lg font-semibold text-quantum-white">{track.title}</h2>
              <p className="mt-3 text-sm leading-7 text-quantum-white/72">{track.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>
    </PublicSiteShell>
  )
}