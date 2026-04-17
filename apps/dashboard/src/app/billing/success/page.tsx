import { CheckoutHandler } from '@/ui/billing/CheckoutHandler'
import { PublicSiteShell } from '@/components/PublicSiteShell'

export default function BillingSuccessPage() {
  return (
    <PublicSiteShell
      title="Checkout returned successfully."
      subtitle="The dashboard is now verifying whether the Stripe completion translated into an active premium entitlement for this account."
    >
      <CheckoutHandler mode="success" />
    </PublicSiteShell>
  )
}