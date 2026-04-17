import { Suspense } from 'react'
import { CheckoutHandler } from '@/ui/billing/CheckoutHandler'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function BillingCancelPage() {
  return (
    <PublicSiteShell
      title="Checkout was cancelled before activation."
      subtitle="No entitlement change is assumed. The screen still checks current premium state so the user can retry with confidence instead of guessing."
    >
      <Suspense fallback={<div className="rounded-3xl border border-quantum-white/10 bg-quantum-white/[0.03] p-6 text-sm text-quantum-white/68">Loading billing return state...</div>}>
        <CheckoutHandler mode="cancel" />
      </Suspense>
    </PublicSiteShell>
  )
}