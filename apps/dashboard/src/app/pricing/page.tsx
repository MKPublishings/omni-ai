import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PricingCard } from '@/ui/billing/PricingCard'
import { PlanComparisonGrid } from '@/ui/billing/PlanComparisonGrid'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function PricingPage() {
  return (
    <PublicSiteShell
      title="Choose the real Ionirix plan that matches your workload, then launch checkout directly from the pricing surface."
      subtitle="Premium covers the individual paid lane. Enterprise handles higher-capacity and team-oriented usage. Both tiers route through the live Worker-backed Stripe checkout and return to entitlement-aware UI state."
      actions={
        <>
          <Link href="/workspace" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Open workspace</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Sign in to upgrade</Link>
        </>
      }
    >
      <PricingCard />

      <PlanComparisonGrid />

      <section className="grid gap-5 md:grid-cols-3">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Upgrade modal</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Each card opens a glass-styled modal that summarizes the selected plan, current account state, and the Worker-backed checkout action.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Secure checkout integration</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">The UI can send the selected price ID, but the Worker still verifies it against configured Stripe environment values before creating a session.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Return-state verification</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">Success and cancel screens query the same entitlement routes used by the workspace header so paid status remains connected to the account after Stripe redirects back.</p>
        </GlassCard>
      </section>
    </PublicSiteShell>
  )
}