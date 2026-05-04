import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PricingCard } from '@/ui/billing/PricingCard'
import { PlanComparisonGrid } from '@/ui/billing/PlanComparisonGrid'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function PricingPage() {
  return (
    <PublicSiteShell
      title="Pricing"
      subtitle="Choose the lane that matches your usage, then move through a live checkout flow that keeps billing, entitlement, and workspace access aligned."
      actions={
        <>
          <Link href="/workspace" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Open workspace</Link>
          <Link href="/login?mode=signup&next=%2Fpricing" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600" data-analytics-event="cta_pricing_signup" data-analytics-location="pricing-hero">Sign up to upgrade</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
        <GlassCard className="p-6" interactive>
          <article>
            <h2 className="text-2xl font-semibold text-quantum-white">Pricing overview</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Premium is the fastest path for an individual operator who wants more capability without extra process. Enterprise is for broader usage, higher demand, and accounts that need the strongest entitlement lane available in the public product.
              </p>
              <p>
                Both tiers use the same Worker-backed Stripe integration, but the decision is straightforward: choose the plan that matches your usage level, upgrade, and return to a workspace that reflects the new state immediately.
              </p>
            </div>
          </article>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <aside>
            <h2 className="text-lg font-semibold text-quantum-white">Pricing posture</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              <p>
                Pricing only converts when the surrounding experience feels trustworthy. That means clear plan language, visible account state, and a return flow that does not leave the user guessing whether the upgrade actually worked.
              </p>
              <p>
                The goal is clarity: what you get, who each lane is for, and what happens the moment you come back from checkout.
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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <GlassCard className="p-6" interactive>
          <h2 className="text-2xl font-semibold text-quantum-white">FAQ</h2>
          <div className="mt-5 space-y-5 text-sm leading-7 text-quantum-white/72">
            <div>
              <h3 className="font-semibold text-quantum-white">What does sovereign intelligence mean here?</h3>
              <p className="mt-2">It means Ion is positioned as a system with clear ownership, visible policies, durable workspace state, and tighter continuity between public messaging, account access, and product behavior.</p>
            </div>
            <div>
              <h3 className="font-semibold text-quantum-white">How private is my account flow?</h3>
              <p className="mt-2">Account creation, verification, billing, and entitlement checks are all routed through the same product stack. Privacy and terms links remain public and easy to audit before signup.</p>
            </div>
            <div>
              <h3 className="font-semibold text-quantum-white">What happens after I upgrade?</h3>
              <p className="mt-2">The return screen and workspace header read the same live entitlement routes, so the account should resolve into the correct paid state as soon as checkout completes.</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6" interactive>
          <h2 className="text-xl font-semibold text-quantum-white">Ready to choose a lane?</h2>
          <p className="mt-4 text-sm leading-7 text-quantum-white/72">Start with a free account, review the live plan state, and move into checkout only when you are ready.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?mode=signup&next=%2Fpricing" className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-ion-blue-500 px-5 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600" data-analytics-event="cta_pricing_signup" data-analytics-location="pricing-faq">Create free account</Link>
            <Link href="/login?next=%2Fpricing" className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-quantum-white/12 px-5 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Sign in</Link>
          </div>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}