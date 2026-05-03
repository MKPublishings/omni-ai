import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function LandingPage() {
  return (
    <PublicSiteShell
      title="Ionirix — Sovereign Intelligence Architecture"
      subtitle="Public Entry Edition"
      heroMeta={
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-quantum-white/48">April 19, 2026 | Public Entry Desk | New York Edition</p>
      }
      actions={
        <>
          <Link href="/onboarding" className="rounded-full border border-spectral-cyan-400/20 bg-spectral-cyan-500/10 px-4 py-2 text-sm text-spectral-cyan-100 transition hover:bg-spectral-cyan-500/16">Start onboarding</Link>
          <Link href="/platform" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Platform</Link>
          <Link href="/roadmap" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Roadmap</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Enter workspace</Link>
        </>
      }
      footer={
        <footer className="border-t border-quantum-white/8 py-6 text-[10px] leading-5 text-quantum-white/56 sm:py-8 sm:text-sm sm:leading-6">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
            <section className="space-y-3 sm:space-y-4">
            <p>© 2026 Ionirix LLC. All rights reserved.</p>

            <p>
              Ionirix is a sovereign intelligence architecture. All systems, interfaces, simulations,
              models, designs, and platform materials are the exclusive property of Ionirix LLC.
              Unauthorized reproduction, distribution, modification, or derivative use is strictly prohibited.
            </p>
            </section>

            <section>
            <p>— Legal —</p>
            <ul className="mt-3 space-y-1.5 text-quantum-white/64 sm:mt-4 sm:space-y-2">
              <li><Link href="/terms" className="transition hover:text-quantum-white">Terms of Service</Link></li>
              <li><Link href="/privacy" className="transition hover:text-quantum-white">Privacy Policy</Link></li>
              <li><Link href="/acceptable-use" className="transition hover:text-quantum-white">Acceptable Use Policy</Link></li>
              <li><Link href="/security-compliance" className="transition hover:text-quantum-white">Security &amp; Compliance</Link></li>
              <li><Link href="/data-processing-addendum" className="transition hover:text-quantum-white">Data Processing Addendum (DPA)</Link></li>
              <li><Link href="/cookie-settings" className="transition hover:text-quantum-white">Cookie Settings</Link></li>
            </ul>
            </section>

            <section>
            <p>— Company —</p>
            <ul className="mt-3 space-y-1.5 text-quantum-white/64 sm:mt-4 sm:space-y-2">
              <li>Ionirix LLC (New York, USA)</li>
              <li>Registered and operating in accordance with NYS corporate law.</li>
              <li>Trademark and brand assets protected under U.S. and international IP statutes.</li>
            </ul>
            </section>

            <section>
            <p>— Contact —</p>
            <ul className="mt-3 space-y-1.5 text-quantum-white/64 sm:mt-4 sm:space-y-2">
              <li>General Inquiries: <a href="mailto:support@ionirix.net" className="transition hover:text-quantum-white">support@ionirix.net</a></li>
              <li>Security Reports: <a href="mailto:support@ionirix.net" className="transition hover:text-quantum-white">support@ionirix.net</a></li>
              <li>Legal Notices: <a href="mailto:mail@ionirix.com" className="transition hover:text-quantum-white">mail@ionirix.com</a></li>
            </ul>
            </section>
          </div>
        </footer>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Lead Article</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-quantum-white">A sovereign architecture enters the public surface with structure instead of noise.</h2>
              <p className="mt-4 text-base leading-7 text-quantum-white/72">
                Ionirix is presented here as infrastructure: a system for reasoning, simulation, memory, and long-horizon creation. The public entry is meant to explain the architecture plainly, then direct the reader into the live operational surface.
              </p>
            </header>
            <div className="mt-6 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Ionirix is not framed as a generic assistant layer. It is a sovereign intelligence architecture designed to make complex work more legible, more continuous, and more intentional. Its purpose is to preserve clarity under scale, maintain operator agency, and provide a durable environment in which thought can move into execution without losing structure.
              </p>
              <p>
                This page is meant to be read like a public edition. Each section carries a distinct layer of the system, from the underlying architecture to the latest update cycle, from platform intent to the near-term roadmap. The result should feel less like a landing page and more like an editorial surface for a system becoming real.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Public Entry Note</p>
            <blockquote className="mt-4 text-2xl font-semibold leading-tight text-quantum-white">
              &ldquo;Ionirix is being built to carry meaning, continuity, and direction through complexity.&rdquo;
            </blockquote>
            <div className="mt-6 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The public shell now acts as a readable record of the platform instead of a thin outer wrapper. Visitors can understand what Ionirix is, what changed recently, and where the system is heading before crossing into the protected workspace.
              </p>
              <p>
                The same design logic used on the capabilities and roadmap pages now governs the public entry: large glass panels, clear hierarchy, deliberate spacing, and enough density to reward actual reading.
              </p>
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
          <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Sovereign Update</p>
              <h2 className="mt-4 text-2xl font-semibold text-quantum-white">The latest work consolidates the system into a more legible operating form.</h2>
              <p className="mt-4 text-sm leading-7 text-quantum-white/72">
                The recent build cycle has focused on coherence: one kernel direction, one public story, and one cleaner bridge between explanation, identity, billing, and live simulation infrastructure.
              </p>
            </header>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-quantum-white">Structural work</h3>
                <div className="mt-3 space-y-3 text-sm leading-6 text-quantum-white/72">
                  <p>
                    The platform continues to orient around a unified kernel model. Public pages, worker-backed routes, simulations, verification flows, and billing paths now describe the same underlying system rather than adjacent versions of it.
                  </p>
                  <p>
                    That alignment matters because Ionirix is no longer being introduced as an abstract concept. It is being exposed as an operational stack with a readable public record and a protected workspace built around live state, system memory, and reasoning structure.
                  </p>
                </div>
              </article>

              <aside className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-quantum-white">What&apos;s New</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-quantum-white/72">
                  <li>Unified kernel direction established across the public surface and workspace model.</li>
                  <li>UI overhaul completed for the public shell and operational posture.</li>
                  <li>New public, legal, pricing, architecture, and roadmap pages added.</li>
                  <li>Billing integration connected to live Worker-backed checkout and entitlement flows.</li>
                  <li>Email verification introduced for activation and recovery pathways.</li>
                  <li>Valuation and public record documentation brought into the broader surface.</li>
                  <li>Simulation bus continuity reinforced across the runtime layer.</li>
                  <li>Reasoning archetypes elevated into explicit system primitives.</li>
                </ul>
              </aside>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h3 className="text-lg font-semibold text-quantum-white">Update Context</h3>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The public side now explains the platform with greater precision, while the internal side continues to deepen its reasoning, event, and simulation capabilities.
              </p>
              <p>
                This is the same logic seen on the roadmap and capabilities pages: each panel is meant to stand as a compact article with enough depth to read on its own, while still contributing to the larger story of the system.
            </p>
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard className="p-6" interactive>
          <article>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">What Ionirix Is</p>
              <h2 className="mt-4 text-xl font-semibold text-quantum-white">A sovereign intelligence architecture, explained plainly.</h2>
            </header>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Ionirix is a system for structured reasoning, simulation, memory, and execution. It is designed to help a person or organization think clearly across long arcs of work rather than collapsing everything into isolated exchanges.
              </p>
              <p>
                Its sovereign quality comes from internal coherence. The public entry, workspace surfaces, billing routes, legal pages, and simulation mechanisms are meant to reinforce one another instead of behaving like disconnected layers.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <article>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Philosophy</p>
              <h2 className="mt-4 text-xl font-semibold text-quantum-white">Clarity, agency, and long-horizon creation remain the center.</h2>
            </header>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The platform exists to make complex creation more legible. It aims to reduce fragmentation between thought, tools, systems, and execution while preserving the operator&apos;s sense of authorship over the process.
              </p>
              <p>
                This is why Ionirix is being built as architecture rather than a thin interface wrapper. The system is meant to hold continuity and direction, not merely produce isolated outputs.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h2 className="text-xl font-semibold text-quantum-white">Purpose</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Ionirix is being shaped to support work that extends beyond a single prompt, a single page, or a single state transition.
              </p>
              <p>
                The system is intended to help people think with continuity, govern outcomes over time, and move from concept to execution without losing the structure of the work itself.
              </p>
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Road Ahead</p>
              <h2 className="mt-4 text-2xl font-semibold text-quantum-white">The next phase extends deeper into infrastructure and continuity.</h2>
            </header>
            <div className="mt-6 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The coming direction is not cosmetic. It points toward deeper simulation orchestration, stronger public-to-private continuity, more operator-grade telemetry, and broader use of reasoning archetypes as active components inside the product.
              </p>
              <p>
                Future work is expected to continue hardening identity, billing, and entitlement flows while expanding the system&apos;s ability to hold state, expose its logic, and support deliberate creation across longer time horizons.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Operational next</p>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Authoritative world-state expansion, deeper simulation orchestration, stronger system telemetry, and clearer inspection pathways remain near-term priorities.</p>
              </div>
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Public next</p>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">The public side can continue to grow into richer system documentation, reasoning explainers, valuation records, and clearer access to platform intent without moving the auth boundary.</p>
              </div>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h2 className="text-lg font-semibold text-quantum-white">Highlights</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-quantum-white/72">
              <li>Authoritative world-state expansion</li>
              <li>Deeper simulation orchestration</li>
              <li>Stronger telemetry and inspection surfaces</li>
              <li>More explicit reasoning interfaces</li>
              <li>Further release and investor documentation</li>
            </ul>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <GlassCard className="p-6" interactive>
          <article>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Founder&apos;s Note</p>
              <h2 className="mt-4 text-xl font-semibold text-quantum-white">The architecture must keep its center.</h2>
            </header>
            <p className="mt-4 text-sm leading-7 text-quantum-white/72">
              Ionirix is being built with restraint on purpose. The goal is not velocity without form, but a system that can hold identity, intention, and continuity as it grows. If it succeeds, it will do so by remaining structurally honest at every layer.
            </p>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <article>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Systems</p>
              <h2 className="mt-4 text-xl font-semibold text-quantum-white">The public surface now reads more like a record than a wrapper.</h2>
            </header>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Each section on this page is wrapped in the same glass-panel logic used elsewhere on the public surface. The goal is a readable set of hovering panels that feel consistent with the capabilities and roadmap pages while still carrying more editorial density.
              </p>
              <p>
                Headline, subhead, body, sidebars, and compact internal panels remain the organizing logic throughout the page, but the visual language now stays inside Ionirix&apos;s established public-page system.
              </p>
            </div>
          </article>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}