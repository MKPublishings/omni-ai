import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'

const capabilityCards = [
  {
    title: 'Sovereign public briefings',
    description: 'Public visitors can move through landing, platform, capabilities, architecture, and roadmap pages that explain the Sovereign runtime before they ever sign in. The public layer is no longer a thin wrapper around the product. It now acts as an explanatory surface that names the runtime, the deployment path, and the strategic direction of the platform in plain language.',
  },
  {
    title: 'Protected live workspace',
    description: 'Authenticated routes expose live Worker-backed status, event history, tools, simulations, settings, memory context, and a sovereign simulation inspector. The workspace is increasingly shaped as an operational environment rather than a simple dashboard, with clearer pathways between monitoring, reasoning, state inspection, and execution.',
  },
  {
    title: 'World-state operations',
    description: 'Cosmic simulations can now drive the sovereign world kernel, persist snapshots, and expose world metadata back into the workspace UI. This capability begins to turn simulation from a static scenario artifact into a stateful system surface that can be inspected, replayed, and reasoned over across sessions.',
  },
  {
    title: 'Cloudflare-first delivery',
    description: 'The site still exports static HTML into the public asset directory while the Worker handles auth, live APIs, and simulation stream upgrades. The result is a deployment model that keeps the public shell fast and browseable while reserving the dynamic, stateful, and identity-sensitive layers for the runtime boundary that actually governs them.',
  },
]

const editorialPanels = [
  {
    title: 'Reasoning surfaces',
    body: 'Ionirix is being built so reasoning is not hidden inside opaque interactions. Public briefings, workspace tools, and system routes increasingly reflect a shared cognitive structure: explanation on the outside, operational state on the inside, and continuity between the two. Reasoning archetypes contribute to this by turning internal modes of thought into explicit architectural elements rather than vague product language.',
  },
  {
    title: 'Identity and access',
    body: 'Billing integration, sign-in flows, entitlement checks, and email verification now form part of the product capability surface rather than administrative afterthoughts. This matters because sovereignty in software includes control over who crosses a boundary, how access is granted, how state persists, and how trust is maintained between public and authenticated routes.',
  },
  {
    title: 'Editorial public shell',
    body: 'The public side of the site now carries meaningful informational density. Architecture, roadmap, pricing, legal, and capability pages can be read as a coherent public record, allowing the platform to explain its own shape and direction before asking the visitor to enter the workspace. This capability is strategic because it turns explanation into part of the product itself.',
  },
]

const systemDepthPanels = [
  {
    title: 'Simulation continuity',
    body: 'Simulation state is no longer treated as disposable output. The system increasingly supports persisted snapshots, live run updates, world metadata, and a more durable path from engine execution into readable UI state.',
  },
  {
    title: 'Operational instrumentation',
    body: 'Public telemetry and protected inspection routes now work at different depths of the same system. Visitors can see aggregate health and route posture, while authenticated operators can move into event history, simulation status, and memory-aware tools.',
  },
  {
    title: 'Architectural clarity',
    body: 'The current site exposes a more unified story: static exports for public reach, Worker-backed control for identity and live APIs, and deeper kernel pathways for authoritative world-state behavior. That clarity is itself a capability because it reduces ambiguity across the product surface.',
  },
]

export default function CapabilitiesPage() {
  return (
    <PublicSiteShell
      title="Capabilities"
      subtitle="A public catalog of what the ION AI site now exposes across the Sovereign public shell and the authenticated operational workspace."
      actions={
        <>
          <Link href="/roadmap" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Roadmap</Link>
          <Link href="/platform" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Platform</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Sign in</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">Capability overview</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Ionirix now exposes a broader capability surface across both the public shell and the authenticated workspace. The platform no longer presents only isolated features. Instead, it increasingly reveals a connected operating model: public explanation, runtime access control, live system routes, simulation continuity, and a clearer relationship between interface and infrastructure.
              </p>
              <p>
                What follows is not a feature checklist in the usual marketing sense. It is a working catalog of platform abilities now visible in the product. Some capabilities are directly user-facing, such as public briefings or workspace simulation inspection. Others are infrastructural, such as the deployment model, session-aware state, or the growing coherence between billing, identity, and long-horizon operation.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h2 className="text-lg font-semibold text-quantum-white">Reading frame</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The capabilities page is meant to be read as a system inventory. Each panel describes not just what exists, but why that piece matters to the broader sovereign architecture.
              </p>
              <p>
                The emphasis is on coherence: public explanation, protected operations, live state, reasoning, and platform identity are being shaped into a single readable surface.
              </p>
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {capabilityCards.map((card) => (
          <GlassCard key={card.title} className="p-6" interactive>
            <h2 className="text-xl font-semibold text-quantum-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">{card.description}</p>
          </GlassCard>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {editorialPanels.map((panel) => (
          <GlassCard key={panel.title} className="p-6" interactive>
            <h2 className="text-lg font-semibold text-quantum-white">{panel.title}</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">{panel.body}</p>
          </GlassCard>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Public discovery</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Architecture and roadmap now explain the sovereign rollout itself, not just the fact that public pages exist. Discovery has become more substantive because the public layer now carries actual system meaning rather than acting purely as a gateway.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Public telemetry</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Public status cards show route counts, deployment metadata, and aggregate system totals while the deeper sovereign state remains session-scoped. This creates a cleaner distinction between browseable visibility and authenticated operational depth.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Simulation streaming</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Authenticated simulation views can now follow live run updates over websocket with polling fallback, keeping the UI aligned with persisted snapshots. This increases trust in the workspace by making the visible interface track the evolving state of the system more faithfully.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Workspace depth</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Protected analytics, events, simulations, tools, memory, and settings remain available after sign-in, with simulations now showing sovereign and multiverse-specific telemetry. The protected workspace is increasingly becoming a full operational environment rather than a thin management console.</p>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">Why these capabilities matter</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Capabilities are important here not because they inflate a product list, but because they reveal what kind of system Ionirix is becoming. A public shell that can explain itself, a workspace that can operate on live state, and a runtime model that preserves continuity across simulations and reasoning surfaces all point toward a platform with a stronger internal center of gravity.
              </p>
              <p>
                The long-term value of the platform depends on these elements reinforcing one another. Public discovery without architectural clarity is shallow. Simulation without continuity is brittle. Identity without operational trust is weak. Ionirix is strongest when these capabilities operate as parts of a single sovereign structure.
              </p>
            </div>
          </article>
        </GlassCard>

        <div className="grid gap-6">
          {systemDepthPanels.map((panel) => (
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