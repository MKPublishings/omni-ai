import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PricingCard } from '@/ui/billing/PricingCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function PricingPage() {
  return (
    <PublicSiteShell
      title="Premium access is now a direct purchase path, not a manual handoff."
      subtitle="Choose a billing interval, create a Stripe checkout session against the live Worker, and return to a UI that verifies your entitlement automatically."
      actions={
        <>
          <Link href="/workspace" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Open workspace</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Sign in to upgrade</Link>
        </>
      }
    >
      <PricingCard />

      <section className="grid gap-5 md:grid-cols-3">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Live checkout trigger</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Buttons create Worker-backed Stripe checkout sessions and redirect immediately without exposing billing logic in the UI.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Return-state verification</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Success and cancel screens query the same entitlement routes used by the workspace header so the premium badge stays trustworthy.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Discoverable upgrade path</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Pricing is linked from the public nav and the workspace top bar, which keeps the purchase path visible before and after sign-in.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}