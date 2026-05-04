import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function LandingPage() {
  return (
    <PublicSiteShell
      title="Sovereign intelligence for operators who need ionic speed, unmatched privacy, and total continuity."
      subtitle="Ion gives you private, persistent workspace for serious work - not another disposable chat."
      heroMeta={
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-quantum-white/68 sm:justify-end">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">Live</span>
          <span className="rounded-full border border-spectral-cyan-400/20 bg-spectral-cyan-500/10 px-3 py-1 text-spectral-cyan-100">Sovereign Intelligence</span>
          <span className="rounded-full border border-quantum-white/10 bg-quantum-white/5 px-3 py-1 text-quantum-white/74">Built by Mirnes</span>
        </div>
      }
      actions={
        <>
          <Link
            href="/login?mode=signup&next=%2Fassistant%3Fstarter%3DGive%2520me%2520a%252060-second%2520tour%2520of%2520ION%2520and%2520suggest%2520my%2520first%2520three%2520actions."
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full bg-ion-blue-500 px-6 py-3 text-base font-semibold text-quantum-white transition hover:bg-ion-blue-600"
            data-analytics-event="cta_try_ion_now"
            data-analytics-location="homepage-hero"
          >
            Try Ion Now
          </Link>
          <Link
            href="/login?next=%2Fworkspace"
            className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-quantum-white/12 px-6 py-3 text-base text-quantum-white transition hover:bg-quantum-white/8"
            data-analytics-event="cta_access_dashboard"
            data-analytics-location="homepage-hero"
          >
            Access Dashboard
          </Link>
          <Link href="/pricing" className="inline-flex min-h-[3rem] items-center justify-center rounded-full border border-spectral-cyan-400/20 bg-spectral-cyan-500/10 px-6 py-3 text-base text-spectral-cyan-100 transition hover:bg-spectral-cyan-500/16">View Pricing</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <header>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">What Ion Is</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-quantum-white">A private reasoning workspace that keeps context, memory, and execution connected.</h2>
            </header>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-spectral-cyan-300">Speed</p>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Move from prompt to working output without rebuilding context every time.</p>
              </div>
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-spectral-cyan-300">Privacy</p>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">A sovereign operating model with clear ownership, legal links, and account control.</p>
              </div>
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-spectral-cyan-300">Continuity</p>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Reason across longer arcs of work with memory, simulation, and persistent state.</p>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-quantum-white/72">
              In plain terms: Ion is for founders, operators, and teams who want more than a one-off chatbot. It is designed to help you think, plan, and ship inside the same system.
            </p>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Trust Signals</p>
            <h2 className="mt-4 text-2xl font-semibold text-quantum-white">Live product, real account flow, clear ownership.</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-quantum-white/72">
              <li>Live dashboard access with email verification and persistent workspace routing.</li>
              <li>Worker-backed billing and entitlement checks across pricing, return states, and workspace UI.</li>
              <li>Built by Mirnes under Ionirix LLC with visible privacy, terms, and security pages.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-spectral-cyan-400/20 bg-spectral-cyan-500/10 p-4 text-sm leading-6 text-spectral-cyan-100">
              Start with email, clear verification, and land in the assistant with a guided first question.
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <GlassCard className="p-6" interactive>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">How It Works</p>
          <h2 className="mt-4 text-xl font-semibold text-quantum-white">1. Start fast</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Create an account in a few fields and enter a guided first session instead of a blank dashboard.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">How It Works</p>
          <h2 className="mt-4 text-xl font-semibold text-quantum-white">2. Ask better questions</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Use Ion for planning, analysis, research, simulation, and execution paths that need memory and continuity.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">How It Works</p>
          <h2 className="mt-4 text-xl font-semibold text-quantum-white">3. Stay in control</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Keep pricing, security, and workspace state aligned so the product feels reliable when traffic starts hitting it.</p>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Why People Convert</p>
            <h2 className="mt-4 text-2xl font-semibold text-quantum-white">Benefit-focused reasons to try Ion now.</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-quantum-white">Fewer resets</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Ion keeps context and routing intact so deeper work does not collapse into disconnected chats.</p>
              </div>
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-quantum-white">Clearer execution</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Turn prompts into plans, outputs, and next actions inside one operating surface.</p>
              </div>
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-quantum-white">Sovereign posture</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">The system emphasizes ownership, privacy, and platform continuity over generic assistant polish.</p>
              </div>
              <div className="rounded-2xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <h3 className="text-lg font-semibold text-quantum-white">Real upgrade path</h3>
                <p className="mt-2 text-sm leading-6 text-quantum-white/72">Pricing, verification, and billing already connect to live account state instead of static mockups.</p>
              </div>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Founder Note</p>
            <blockquote className="mt-4 text-2xl font-semibold leading-tight text-quantum-white">
              “Built by Mirnes to make high-context work feel directed, not chaotic.”
            </blockquote>
            <p className="mt-4 text-sm leading-7 text-quantum-white/72">
              The product positioning is simple: Ion is an operating environment for smart people who want capability, independence, and continuity in the same place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login?mode=signup&next=%2Fassistant%3Fstarter%3DHelp%2520me%2520plan%2520my%2520next%2520high-leverage%2520move."
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-ion-blue-500 px-5 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600"
                data-analytics-event="cta_try_ion_now"
                data-analytics-location="homepage-founder-note"
              >
                Sign Up Free
              </Link>
              <Link href="/platform" className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-quantum-white/12 px-5 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">See platform</Link>
            </div>
          </aside>
        </GlassCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <GlassCard className="p-6" interactive>
          <h2 className="text-2xl font-semibold text-quantum-white">Use cases</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-quantum-white/72">
            <li>Founders mapping launch plans, narratives, and execution checklists.</li>
            <li>Operators building systems, runbooks, and decision support loops.</li>
            <li>Creators turning rough ideas into structured outputs faster.</li>
            <li>Teams needing a more durable workspace than one-shot consumer chat.</li>
          </ul>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-2xl font-semibold text-quantum-white">Before you enter</h2>
          <p className="mt-4 text-sm leading-7 text-quantum-white/72">
            Legal, privacy, and security links remain visible in the footer, but the first impression now stays focused on the product, the value, and the fastest route to a live prompt.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/terms" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Terms</Link>
            <Link href="/privacy" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Privacy</Link>
            <Link href="/security-compliance" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Security</Link>
          </div>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}