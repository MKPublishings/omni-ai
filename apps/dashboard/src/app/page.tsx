import Link from 'next/link'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function LandingPage() {
  return (
    <PublicSiteShell
      title="Ionirix public record: sovereign intelligence architecture enters the open surface."
      subtitle="A front-page briefing on the system now taking shape: a unified kernel, a rebuilt public surface, live billing and verification paths, new editorial pages, and the infrastructure required for long-horizon reasoning and simulation."
      actions={
        <>
          <Link href="/platform" className="editorial-action editorial-action-secondary">Platform</Link>
          <Link href="/roadmap" className="editorial-action editorial-action-secondary">Roadmap</Link>
          <Link href="/login" className="editorial-action editorial-action-primary">Enter workspace</Link>
        </>
      }
      footer={
        <footer className="editorial-footer legal-placeholder">
          <section>
            <p className="footer-label">Legal</p>
            <p className="footer-note">Full sovereign legal block placeholder. Insert corporate, policy, compliance, and notice language here.</p>
          </section>
        </footer>
      }
    >
      <header className="editorial-hero">
        <p className="editorial-dateline">New York Edition | April 19, 2026 | Sovereign Update Desk</p>
        <div className="editorial-hero-grid">
          <article className="lead-story">
            <p className="section-kicker">Update</p>
            <h2 className="article-headline">The public surface has been rebuilt to read the system clearly.</h2>
            <p className="article-subhead">
              Ionirix now presents itself as an intelligible public record rather than a collection of disconnected screens. The result is a unified entry page, a cleaner editorial structure, and a more direct path from explanation into operation.
            </p>
          </article>

          <aside className="hero-sidebar">
            <section>
              <p className="section-kicker">About Ionirix</p>
              <p className="body-copy">
                Ionirix is a sovereign intelligence architecture built to increase clarity, preserve agency, and support long-horizon creation. It is designed as infrastructure for reasoning, simulation, memory, and world-aware execution rather than as a disposable interface layer.
              </p>
            </section>
            <blockquote className="pull-quote">
              "The aim is not more noise. The aim is durable clarity under complexity."
            </blockquote>
          </aside>
        </div>
      </header>

      <section className="editorial-columns">
        <article className="news-column main-column">
          <header>
            <p className="section-kicker">Architecture</p>
            <h2 className="section-headline">A unified kernel is becoming the center of record.</h2>
          </header>
          <p className="body-copy">
            The latest Sovereign Update consolidates the platform around a clearer kernel model. Public pages, worker-backed routes, simulation pathways, verification flows, and paid access now describe the same underlying system rather than parallel versions of it.
          </p>
          <p className="body-copy">
            This matters because the platform is no longer being introduced as an abstract concept. It is being exposed as an operational stack: a public briefing layer, an authenticated workspace, a simulation bus, and a reasoning surface tied to a long-horizon architecture.
          </p>

          <aside className="article-sidebar">
            <p className="sidebar-label">Systems note</p>
            <p className="sidebar-copy">
              The public shell, billing routes, account verification, simulation transport, and editorial pages now reinforce the same infrastructural story.
            </p>
          </aside>
        </article>

        <article className="news-column secondary-column">
          <header>
            <p className="section-kicker">What&apos;s New</p>
            <h2 className="section-headline">The Sovereign Update, summarized.</h2>
          </header>
          <ul className="update-list">
            <li>Unified kernel direction established across the public surface and workspace model.</li>
            <li>UI overhaul completed for the public shell, workspace posture, and editorial information flow.</li>
            <li>New public pages added for architecture, capabilities, platform, roadmap, pricing, and legal policy surfaces.</li>
            <li>Billing integration connected to live Worker-backed checkout and entitlement-aware return flows.</li>
            <li>Email verification introduced to support cleaner account activation and recovery pathways.</li>
            <li>Valuation and investor-facing documentation surfaced as part of a more coherent public record.</li>
            <li>Simulation bus and stream-aware inspection continue to define the operational runtime layer.</li>
            <li>Reasoning archetypes are now treated as system primitives rather than decorative copy.</li>
          </ul>
        </article>

        <article className="news-column secondary-column">
          <header>
            <p className="section-kicker">Philosophy</p>
            <h2 className="section-headline">Why Ionirix exists.</h2>
          </header>
          <p className="body-copy">
            Ionirix is being built for work that extends beyond a single query or session. Its purpose is to help people reason with continuity, maintain authorship over direction, and build toward outcomes that require memory, structure, and sustained intent.
          </p>
          <p className="body-copy">
            In simple terms: the platform exists to make complex creation more legible. It aims to reduce fragmentation between thought, tools, systems, and execution, while preserving the operator&apos;s sense of agency inside that process.
          </p>
        </article>
      </section>

      <section className="editorial-columns editorial-columns-expanded">
        <article className="feature-article">
          <header>
            <p className="section-kicker">Systems</p>
            <h2 className="section-headline">What the platform now contains.</h2>
          </header>
          <p className="body-copy">
            The visible surface now includes public editorial pages, pricing and billing paths, email verification, legal records, and a cleaner map into the workspace. Behind the login boundary, the system continues to expose simulations, analytics, events, tools, memory, and settings through a more coherent operational frame.
          </p>
          <p className="body-copy">
            The deeper direction remains infrastructural: a simulation bus that can carry live state, reasoning archetypes that can structure cognition more deliberately, and a public-to-private continuity that treats explanation as part of the system rather than a separate marketing layer.
          </p>
        </article>

        <article className="feature-article">
          <header>
            <p className="section-kicker">About Ionirix</p>
            <h2 className="section-headline">A plain-language definition.</h2>
          </header>
          <p className="body-copy">
            Ionirix is a platform for reasoning, simulation, and structured execution. It combines a public narrative layer, authenticated tools, and system memory so that work can move from idea to sustained development without losing continuity.
          </p>
          <p className="body-copy">
            It is sovereign in the sense that it is being designed to hold its own logic, identity, and operational structure. The objective is not merely access to intelligence-like outputs, but the creation of a durable architecture through which operators can think, build, and govern outcomes over time.
          </p>
        </article>

        <aside className="editorial-sidebar-stack">
          <article className="sidebar-panel">
            <header>
              <p className="section-kicker">Road Ahead</p>
              <h2 className="section-headline">The next build horizon.</h2>
            </header>
            <ul className="road-list">
              <li>Deeper simulation orchestration tied to authoritative world state.</li>
              <li>Expanded reasoning archetype interfaces across workspace and public briefings.</li>
              <li>Stronger investor, valuation, and release documentation surfaces.</li>
              <li>More explicit system telemetry, live status, and operator-grade inspection panels.</li>
              <li>Further hardening of billing, identity, and entitlement transitions.</li>
            </ul>
          </article>

          <article className="sidebar-panel founders-note">
            <header>
              <p className="section-kicker">Founder&apos;s Note</p>
            </header>
            <p className="body-copy">
              Ionirix is being built slowly enough to keep its center of gravity. The point is to construct an architecture that can carry meaning, not just output; continuity, not just activity; direction, not just motion.
            </p>
          </article>
        </aside>
      </section>
    </PublicSiteShell>
  )
}