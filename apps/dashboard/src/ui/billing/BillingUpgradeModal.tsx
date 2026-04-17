'use client'

import Link from 'next/link'
import { Modal } from '@/components/Modal'
import { PremiumBadge } from './PremiumBadge'
import { UpgradeButton } from './UpgradeButton'
import type { PremiumStatusState } from './usePremiumStatus'
import type { BillingPlan } from './plans'
import { getTierRank, isConcretePriceId, resolveEffectivePlanId } from './plans'

interface BillingUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  plan: BillingPlan | null
  premium: PremiumStatusState
}

export function BillingUpgradeModal({ isOpen, onClose, plan, premium }: BillingUpgradeModalProps) {
  if (!plan) {
    return null
  }

  const currentTierRank = getTierRank(premium.accessTier)
  const selectedTierRank = getTierRank(plan.tier)
  const alreadyIncluded = premium.isPremium && currentTierRank >= selectedTierRank
  const effectivePriceId = resolveEffectivePlanId(plan, premium.priceIds)
  const priceIdVisible = isConcretePriceId(effectivePriceId)
  const activeLabel = premium.accessTier === 'enterprise' ? 'Enterprise active' : 'Premium active'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm checkout" size="lg" className="ion-billing-modal-shell">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="ion-billing-modal-panel">
          <p className="ion-billing-kicker">Selected plan</p>
          <h3 className="mt-3 text-2xl font-semibold text-quantum-white">{plan.label}</h3>
          <p className="mt-4 text-4xl font-semibold text-quantum-white">
            {plan.priceDisplay}
            <span className="text-base font-medium text-quantum-white/56">{plan.billing === 'year' ? '/year' : '/month'}</span>
          </p>
          <p className="mt-4 text-sm leading-7 text-quantum-white/72">{plan.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="ion-billing-highlight">{plan.callout}</span>
            <span className="ion-billing-plan-chip">{plan.tier}</span>
            <span className="ion-billing-plan-chip">{plan.billing === 'year' ? 'Recurring yearly' : 'Recurring monthly'}</span>
          </div>

          <div className="mt-6 rounded-3xl border border-quantum-white/10 bg-pine-black-900/36 p-4 text-sm leading-7 text-quantum-white/68">
            <p>The dashboard calls the live Worker checkout route and the Worker validates the selected plan against its configured Stripe price IDs before creating the session.</p>
            <p className="mt-3 ion-billing-price-id">
              {priceIdVisible ? `Price ID: ${effectivePriceId}` : 'Price ID is being enforced on the Worker environment and is not exposed in this build.'}
            </p>
          </div>
        </div>

        <div className="ion-billing-modal-panel ion-billing-modal-panel-strong">
          <p className="ion-billing-kicker">Checkout state</p>

          {premium.loading ? (
            <div className="mt-4 flex items-center gap-3 text-sm text-quantum-white/68">
              <span className="ion-billing-spinner" aria-hidden="true" />
              Checking current entitlement state...
            </div>
          ) : alreadyIncluded ? (
            <div className="mt-4 space-y-4">
              <PremiumBadge label={activeLabel} />
              <p className="text-sm leading-7 text-quantum-white/72">This account already has access at or above the selected plan. The pricing surface is reflecting the entitlement that came back from the live Worker.</p>
            </div>
          ) : premium.signedIn ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-7 text-quantum-white/72">Stripe checkout will open immediately after the Worker creates a session for this plan.</p>
              <UpgradeButton
                plan={{
                  planTier: plan.tier,
                  interval: plan.billing,
                  priceId: effectivePriceId,
                }}
                fullWidth
                variant={plan.featured ? 'primary' : 'secondary'}
              >
                Continue to checkout
              </UpgradeButton>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-7 text-quantum-white/72">An authenticated session is required before a Stripe checkout session can be created.</p>
              <Link href="/login?next=%2Fpricing" className="inline-flex w-full items-center justify-center rounded-full bg-ion-blue-500 px-4 py-3 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">
                Sign in to continue
              </Link>
            </div>
          )}

          <ul className="mt-6 space-y-3 text-sm leading-6 text-quantum-white/72">
            {plan.featureList.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className={`ion-billing-feature-dot ion-billing-feature-dot-${plan.accent}`} aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}