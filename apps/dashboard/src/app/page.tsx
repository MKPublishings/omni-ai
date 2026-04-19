import Link from 'next/link'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function LandingPage() {
  return (
    <PublicSiteShell
      title="Ionirix — Sovereign Intelligence Architecture"
      subtitle="Public Entry Edition"
      heroMeta={
        <p className="dateline">April 19, 2026 | Public Entry Desk | New York Edition</p>
      }
      actions={
        <>
          <Link href="/platform" className="panel-action panel-action-secondary">Platform</Link>
          <Link href="/roadmap" className="panel-action panel-action-secondary">Roadmap</Link>
          <Link href="/login" className="panel-action panel-action-primary">Enter workspace</Link>
        </>
      }
      footer={
        <footer className="legal-footer">
          <section className="legal-panel">
            <p>© 2026 Ionirix LLC. All rights reserved.</p>

            <p>
              Ionirix is a sovereign intelligence architecture. All systems, interfaces, simulations,
              models, designs, and platform materials are the exclusive property of Ionirix LLC.
              Unauthorized reproduction, distribution, modification, or derivative use is strictly prohibited.
            </p>
          </section>

          <section className="legal-panel">
            <p>— Legal —</p>
            <ul>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/acceptable-use">Acceptable Use Policy</Link></li>
              <li><Link href="/security-compliance">Security &amp; Compliance</Link></li>
              <li><Link href="/data-processing-addendum">Data Processing Addendum (DPA)</Link></li>
              <li><Link href="/cookie-settings">Cookie Settings</Link></li>
            </ul>
          </section>

          <section className="legal-panel">
            <p>— Company —</p>
            <ul>
              <li>Ionirix LLC (New York, USA)</li>
              <li>Registered and operating in accordance with NYS corporate law.</li>
              <li>Trademark and brand assets protected under U.S. and international IP statutes.</li>
            </ul>
          </section>

          <section className="legal-panel">
            <p>— Contact —</p>
            <ul>
              <li>General Inquiries: <a href="mailto:support@ionirix.net">support@ionirix.net</a></li>
              <li>Security Reports: <a href="mailto:support@ionirix.net">support@ionirix.net</a></li>
              <li>Legal Notices: <a href="mailto:noreply@ionirix.com">noreply@ionirix.com</a></li>
            </ul>
          </section>
        </footer>
      }
    >
      <section className="panel newspaper-lead hover-panel">
        <article className="newspaper-article lead-article">
          <header>
            <p className="article-category">Lead</p>
            <h2 className="article-headline">A sovereign architecture enters the public surface with structure instead of noise.</h2>
            <p className="article-subhead">
              Ionirix is presented here as infrastructure: a system for reasoning, simulation, memory, and long-horizon creation. The public entry is meant to explain the architecture plainly, then direct the reader into the live operational surface.
            </p>
          </header>
          <p className="article-body">
            Ionirix is not framed as a generic assistant layer. It is a sovereign intelligence architecture designed to make complex work more legible, more continuous, and more intentional. Its purpose is to preserve clarity under scale, maintain operator agency, and provide a durable environment in which thought can move into execution without losing structure.
          </p>
          <p className="article-body">
            This entry page functions like a front-page edition: an ordered briefing on what the platform is, what has changed, and where it is heading. The newspaper logic is deliberate. Each panel acts as an article, each article holds a distinct layer of the system, and the whole page reads as a public record rather than a promotional surface.
          </p>
          <blockquote className="pull-quote">
            "Ionirix is being built to carry meaning, continuity, and direction through complexity."
          </blockquote>
        </article>
      </section>

      <section className="panel update-panel hover-panel">
        <article className="newspaper-article update-article">
          <header>
            <p className="article-category">Sovereign Update</p>
            <h2 className="article-headline">The latest work consolidates the system into a more legible operating form.</h2>
            <p className="article-subhead">
              The recent build cycle has focused on coherence: one kernel direction, one public story, one cleaner bridge between explanation, identity, billing, and live simulation infrastructure.
            </p>
          </header>

          <div className="article-split">
            <article className="article-column">
              <p className="article-body">
                The sovereign update includes the continued formation of a unified kernel, a broad UI overhaul, new public pages, billing integration, email verification, valuation-facing documents, simulation bus work, and the elevation of reasoning archetypes into explicit system structure.
              </p>
              <p className="article-body">
                Together these changes move Ionirix away from fragmented surfaces and toward a publication-grade architecture. The public side now explains the platform with greater precision, while the internal side continues to deepen its reasoning, event, and simulation capabilities.
              </p>
            </article>

            <aside className="article-sidebar">
              <p className="sidebar-title">Update Summary</p>
              <ul className="sidebar-list">
                <li>Unified kernel direction</li>
                <li>UI overhaul across public and workspace surfaces</li>
                <li>New public, legal, and pricing pages</li>
                <li>Billing integration and entitlement flows</li>
                <li>Email verification pathways</li>
                <li>Valuation and public record materials</li>
                <li>Simulation bus continuity</li>
                <li>Reasoning archetypes as system primitives</li>
              </ul>
            </aside>
          </div>
        </article>
      </section>

      <section className="panel about-panel hover-panel">
        <article className="newspaper-article about-article">
          <header>
            <p className="article-category">What Ionirix Is</p>
            <h2 className="article-headline">A sovereign intelligence architecture, explained plainly.</h2>
          </header>
          <p className="article-body">
            Ionirix is a system for structured reasoning, simulation, memory, and execution. It is designed to help a person or organization think clearly across long arcs of work rather than collapsing everything into isolated exchanges.
          </p>
          <p className="article-body">
            Its sovereign quality comes from internal coherence. The platform is being shaped as an architecture with its own logic, spatial order, and operational identity. That means the public entry, workspace surfaces, billing routes, legal pages, and simulation mechanisms are meant to reinforce one another instead of behaving like disconnected layers.
          </p>
          <aside className="article-sidebar">
            <p className="sidebar-title">Purpose</p>
            <p className="sidebar-copy">
              Clarity, agency, and long-horizon creation remain the central aims.
            </p>
          </aside>
        </article>
      </section>

      <section className="panel roadmap-panel hover-panel">
        <article className="newspaper-article roadmap-article">
          <header>
            <p className="article-category">Road Ahead</p>
            <h2 className="article-headline">The next phase extends deeper into infrastructure and continuity.</h2>
          </header>
          <p className="article-body">
            The coming direction is not cosmetic. It points toward deeper simulation orchestration, stronger public-to-private continuity, more operator-grade telemetry, and broader use of reasoning archetypes as active components inside the product.
          </p>
          <p className="article-body">
            Future work is expected to continue hardening identity, billing, and entitlement flows while expanding the system&apos;s ability to hold state, expose its logic, and support deliberate creation across longer time horizons.
          </p>
          <aside className="article-sidebar">
            <p className="sidebar-title">Highlights</p>
            <ul className="sidebar-list">
              <li>Authoritative world-state expansion</li>
              <li>Deeper simulation orchestration</li>
              <li>Stronger telemetry and inspection surfaces</li>
              <li>More explicit reasoning interfaces</li>
              <li>Further release and investor documentation</li>
            </ul>
          </aside>
        </article>
      </section>

      <section className="panel founders-note hover-panel">
        <article className="newspaper-article op-ed-article">
          <header>
            <p className="article-category">Founder&apos;s Note</p>
            <h2 className="article-headline">The architecture must keep its center.</h2>
          </header>
          <p className="article-body">
            Ionirix is being built with restraint on purpose. The goal is not velocity without form, but a system that can hold identity, intention, and continuity as it grows. If it succeeds, it will do so by remaining structurally honest at every layer.
          </p>
        </article>
      </section>

      <section className="panel systems-panel hover-panel">
        <article className="newspaper-article systems-article">
            <header>
            <p className="article-category">Systems</p>
            <h2 className="article-headline">The newspaper surface is rendered through panel logic.</h2>
            </header>
          <p className="article-body">
            Each section on this page is wrapped as a panel so the editorial form still follows Ionirix spatial logic. The result is a hybrid surface: article rhythm, panel geometry, hover-reactive affordance, and a clear hierarchy from headline to sidebar to note.
          </p>
          <p className="article-body">
            The effect should feel less like a dashboard card grid and more like a deliberate publication rendered through sovereign interface rules.
          </p>
          <aside className="article-sidebar">
            <p className="sidebar-title">Reading order</p>
            <p className="sidebar-copy">
              Headline, subhead, body, sidebars, and pull-quotes remain the organizing logic throughout the page.
            </p>
          </aside>
        </article>
      </section>
    </PublicSiteShell>
  )
}