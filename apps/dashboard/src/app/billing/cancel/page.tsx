import { CheckoutHandler } from '@/ui/billing/CheckoutHandler'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function BillingCancelPage() {
  return (
    <PublicSiteShell
      title="Checkout was cancelled before activation."
      subtitle="No entitlement change is assumed. The screen still checks current premium state so the user can retry with confidence instead of guessing."
    >
      <CheckoutHandler mode="cancel" />
    </PublicSiteShell>
  )
}