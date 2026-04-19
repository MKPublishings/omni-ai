'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import { PublicStatusPanel } from '@/components/PublicStatusPanel'
import { PublicSiteShell } from '@/components/PublicSiteShell'
import { DashboardHealthStatus, fetchPublicHealth, LIVE_REFRESH_INTERVAL_MS } from '@/lib/dashboard'

const platformPanels = [
  {
    title: 'Public runtime posture',
    body: 'The public side of Ionirix now acts as a true briefing surface. It explains what the platform is, how the site is delivered, where state begins to matter, and how a visitor moves from browseable context into authenticated operation. This turns the public shell into part of the platform architecture rather than a thin wrapper around it.',
  },
  {
    title: 'Edge governance',
    body: 'The Worker layer now carries much more than route forwarding. It governs identity boundaries, live API access, simulation stream upgrades, and the public health surface. In practice, this means the edge has become the place where explanation, access, and runtime control begin to converge.',
  },
  {
    title: 'Platform continuity',
    body: 'The platform view matters because it shows that the system is no longer split into unrelated pieces. Public pages, billing and verification paths, state coordination, and deeper simulation execution now read more clearly as parts of one operational model. That continuity is a platform capability in its own right.',
  },
]

const infrastructurePanels = [
  {
    title: 'Asset delivery',
    body: 'Static public assets still provide the first layer of reach. This keeps the browseable site fast and resilient while allowing the public surface to hold much more explanatory content than before.',
  },
  {
    title: 'Live route intelligence',
    body: 'As soon as a request moves beyond pure public content, the Worker route layer can take over. This introduces live control, authenticated APIs, and runtime-aware behavior only where they are actually needed.',
  },
  {
    title: 'State-aware execution',
    body: 'The platform now supports a clearer path from public surface to session-scoped state and onward into more authoritative simulation handling. That staged progression makes the system easier to trust and easier to reason about.',
  },
]

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
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">Platform overview</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The platform view is where the full shape of Ionirix becomes easier to see. The public shell, the Worker route layer, the state bus, and the deeper simulation bridge are not independent systems stitched together after the fact. They now behave more like coordinated layers in one runtime model.
              </p>
              <p>
                This page is therefore less about naming technologies and more about showing how the platform behaves as a whole. Public pages establish context. The Worker governs live access and control. Stateful coordination begins at the session boundary. Deeper authority appears only when the runtime needs a stronger execution model. The result is a platform that can stay legible while becoming more powerful.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h2 className="text-lg font-semibold text-quantum-white">Platform lens</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                This page should be read as a snapshot of the live platform envelope: what is served statically, what is handled at the edge, what becomes session-scoped, and what can move into a deeper kernel path when necessary.
              </p>
              <p>
                The goal is clarity. A strong platform is not only capable. It is also intelligible at the boundary where a person first encounters it.
              </p>
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <GlassCard className="p-6" interactive>
          <h2 className="text-2xl font-semibold text-quantum-white">Deployment topology</h2>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-quantum-white/72">
            <li>The dashboard exports to static HTML inside the public folder and is served through the Cloudflare Workers assets binding, keeping the public shell lean while preserving global reach.</li>
            <li>The Worker now carries the Sovereign runtime edge layer: authenticated APIs, simulation websocket upgrades, and the Durable Object world-state bus that coordinates live session-aware behavior.</li>
            <li>Cosmic runs can bridge from the Worker to the authoritative Python world kernel while multiverse runs stay deterministic at the edge, making the platform more explicit about where simulation authority actually sits.</li>
            <li>The site stays split cleanly between public briefings and protected operational surfaces, but both now describe the same runtime model rather than behaving like separate products.</li>
          </ul>
        </GlassCard>

        <PublicStatusPanel health={health} />
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {platformPanels.map((panel) => (
          <GlassCard key={panel.title} className="p-6" interactive>
            <h2 className="text-lg font-semibold text-quantum-white">{panel.title}</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">{panel.body}</p>
          </GlassCard>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Public entry points</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The public shell now acts as the Sovereign briefing layer, surfacing runtime architecture, rollout status, and capabilities before the auth boundary. This makes platform understanding part of the initial user experience rather than something hidden behind sign-in.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Worker contract</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The edge contract now spans public health, authenticated simulation control, stream upgrades, and session-scoped access to sovereign world state. The Worker is therefore both a routing layer and the first active control boundary for the runtime.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Authoritative kernel path</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">The sovereign path now runs from public explanation, to Worker edge orchestration, to a Python authoritative kernel for cosmic world-state execution. That layered path gives the platform more depth without forcing every interaction into the same runtime context.</p>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">How the platform behaves in practice</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                In practical terms, the platform now supports a cleaner progression from reading to operation. A visitor can inspect the public surface, understand what the system is trying to do, and then move into a workspace where state, tools, simulations, and identity-sensitive operations become available under the correct boundary conditions.
              </p>
              <p>
                This matters because platform quality is not just about backend strength or UI polish. It depends on whether the layers fit together in a way that preserves trust. The current architecture makes it easier to see where public explanation ends, where live control begins, and where deeper state authority must take over.
              </p>
              <p>
                That staged model also makes the platform more adaptable across different classes of workload. Static content can stay globally efficient. Edge logic can stay reactive. Session state can remain scoped. More authoritative simulation execution can be reached only when the task actually requires it. This is the kind of layered behavior that keeps a platform simple at the surface without making it shallow underneath.
              </p>
            </div>
          </article>
        </GlassCard>

        <div className="grid gap-6">
          {infrastructurePanels.map((panel) => (
            <GlassCard key={panel.title} className="p-6" interactive>
              <h2 className="text-lg font-semibold text-quantum-white">{panel.title}</h2>
              <p className="mt-3 text-sm leading-7 text-quantum-white/72">{panel.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>
    </PublicSiteShell>
  )
}