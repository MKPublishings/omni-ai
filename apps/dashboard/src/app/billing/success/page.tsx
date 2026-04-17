import { Suspense } from 'react'
import { CheckoutHandler } from '@/ui/billing/CheckoutHandler'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function BillingSuccessPage() {
  return (
    <PublicSiteShell
      title="Checkout returned successfully."
      subtitle="The dashboard is now verifying whether the Stripe completion translated into an active premium entitlement for this account."
    >
      <Suspense fallback={<div className="rounded-3xl border border-quantum-white/10 bg-quantum-white/[0.03] p-6 text-sm text-quantum-white/68">Loading billing return state...</div>}>
        <CheckoutHandler mode="success" />
      </Suspense>
    </PublicSiteShell>
  )
}