import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'

const capabilityCards = [
  {
    title: 'Sovereign public briefings',
    description: 'Public visitors can move through landing, platform, capabilities, architecture, and roadmap pages that explain the Sovereign runtime before they ever sign in.',
  },
  {
    title: 'Protected live workspace',
    description: 'Authenticated routes expose live Worker-backed status, event history, tools, simulations, settings, memory context, and a sovereign simulation inspector.',
  },
  {
    title: 'World-state operations',
    description: 'Cosmic simulations can now drive the sovereign world kernel, persist snapshots, and expose world metadata back into the workspace UI.',
  },
  {
    title: 'Cloudflare-first delivery',
    description: 'The site still exports static HTML into the public asset directory while the Worker handles auth, live APIs, and simulation stream upgrades.',
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
      <section className="grid gap-6 md:grid-cols-2">
        {capabilityCards.map((card) => (
          <GlassCard key={card.title} className="p-6">
            <h2 className="text-xl font-semibold text-quantum-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">{card.description}</p>
          </GlassCard>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Public discovery</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Architecture and roadmap now explain the sovereign rollout itself, not just the fact that public pages exist.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Public telemetry</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Public status cards show route counts, deployment metadata, and aggregate system totals while the deeper sovereign state remains session-scoped.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Simulation streaming</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Authenticated simulation views can now follow live run updates over websocket with polling fallback, keeping the UI aligned with persisted snapshots.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Workspace depth</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Protected analytics, events, simulations, tools, memory, and settings remain available after sign-in, with simulations now showing sovereign and multiverse-specific telemetry.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}