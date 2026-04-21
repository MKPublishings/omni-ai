import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PricingCard } from '@/ui/billing/PricingCard'
import { PlanComparisonGrid } from '@/ui/billing/PlanComparisonGrid'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function PricingPage() {
  return (
    <PublicSiteShell
      title="Pricing"
      subtitle="A public pricing surface for the current Ionirix access lanes: Premium for individual operators, Enterprise for heavier usage and team-oriented adoption, and a shared checkout path that keeps entitlement state connected after purchase."
      actions={
        <>
          <Link href="/workspace" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Open workspace</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Sign in to upgrade</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">Pricing overview</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                The pricing page is designed to do more than route someone into checkout. It explains how the paid lanes are positioned, what kind of usage each tier is meant to support, and how the account state remains connected to the product after payment completes. Premium is the direct path for individual operators who want the paid lane without unnecessary friction. Enterprise exists for heavier demand, broader organizational usage, and accounts that need a wider operational envelope.
              </p>
              <p>
                Both tiers move through the same Worker-backed Stripe integration, but the plans are not interchangeable in how they are framed. The comparison below is intended to make those differences explicit enough that a buyer can understand the tier structure before opening the upgrade flow.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h2 className="text-lg font-semibold text-quantum-white">Pricing posture</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                This page treats pricing as part of the platform architecture. Billing, entitlement refresh, return-state validation, and account verification all shape whether paid access feels trustworthy after checkout.
              </p>
              <p>
                The goal is clarity: what you are buying, which lane it places you in, and how that entitlement resolves when you return to the product.
              </p>
            </div>
          </aside>
        </GlassCard>
      </section>

      <PricingCard />

      <PlanComparisonGrid />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">How plan selection works</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Pricing now sits inside the broader public system rather than apart from it. A signed-in user can select a plan, launch checkout through the live Worker route, complete payment in Stripe, and return to a UI that checks the same entitlement state used elsewhere in the workspace. That means the pricing surface, return screens, and workspace header all describe the same account condition instead of each holding a partial view.
              </p>
              <p>
                This matters because a pricing page is only as good as the continuity around it. If checkout succeeds but entitlement state lags behind or contradicts itself, the billing surface becomes hard to trust. The current implementation is designed to avoid that failure mode by using the same live status routes across the relevant product surfaces.
              </p>
            </div>
          </article>
        </GlassCard>

        <div className="grid gap-6">
          <GlassCard className="p-6" interactive>
            <h2 className="text-lg font-semibold text-quantum-white">Premium lane</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">Premium is positioned for individual operators who want a paid workspace tier, direct recurring billing options, and the shortest route into the upgraded product state.</p>
          </GlassCard>
          <GlassCard className="p-6" interactive>
            <h2 className="text-lg font-semibold text-quantum-white">Enterprise lane</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">Enterprise is positioned for broader recurring usage, higher-capacity demand, and teams that need the stronger entitlement tier available in the current public pricing model.</p>
          </GlassCard>
          <GlassCard className="p-6" interactive>
            <h2 className="text-lg font-semibold text-quantum-white">Return-state trust</h2>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">After checkout, the system reuses live entitlement verification so the account state seen on pricing, the Stripe return screen, and the workspace surface stays aligned.</p>
          </GlassCard>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Upgrade modal</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Each card opens a glass-styled modal that summarizes the selected plan, current account state, and the Worker-backed checkout action.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Secure checkout integration</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">The UI can send the selected price ID, but the Worker still verifies it against configured Stripe environment values before creating a session.</p>
        </GlassCard>
        <GlassCard className="p-6" interactive>
          <h2 className="text-lg font-semibold text-quantum-white">Return-state verification</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Success and cancel screens query the same entitlement routes used by the workspace header so paid status remains connected to the account after Stripe redirects back.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}