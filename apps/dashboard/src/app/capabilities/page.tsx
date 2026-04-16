import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'

const capabilityCards = [
  {
    title: 'Multi-page public surface',
    description: 'Public visitors can now move through a landing page, platform summary, capabilities view, architecture page, and roadmap before they ever sign in.',
  },
  {
    title: 'Protected live workspace',
    description: 'Authenticated routes expose live Worker-backed status, event history, tools, simulations, settings, and memory context.',
  },
  {
    title: 'Cloudflare-first delivery',
    description: 'The site exports static HTML into the public asset directory while the Worker continues to handle API and auth responsibilities.',
  },
  {
    title: 'Responsive structure',
    description: 'The earlier overlapping dashboard composition has been replaced with responsive grids and stable navigation shells.',
  },
]

export default function CapabilitiesPage() {
  return (
    <PublicSiteShell
      title="Capabilities"
      subtitle="A public catalog of what the ION AI site currently exposes across both public and authenticated sections."
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
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Architecture and roadmap now give visitors two more browseable stops before authentication.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Public telemetry</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Public status cards now show route counts, deployment metadata, and live database totals without requiring a session.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Worker asset routing</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Clean routes resolve to their exported HTML counterparts before falling back to the landing page.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Workspace depth</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Protected analytics, events, simulations, tools, memory, and settings remain available after sign-in.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}