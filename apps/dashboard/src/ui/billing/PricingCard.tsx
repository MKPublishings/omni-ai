'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/Button'
import { PremiumBadge } from './PremiumBadge'
import { usePremiumStatus } from './usePremiumStatus'
import { BillingUpgradeModal } from './BillingUpgradeModal'
import type { BillingPlan } from './plans'
import { getPlanActionLabel, getPlanCadenceLabel, getTierRank, PRICING_PLANS } from './plans'

function getTierSummary(accessTier: string): string {
  if (accessTier === 'enterprise') {
    return 'Your account already resolves as enterprise and does not need another enterprise checkout.'
  }
  if (accessTier === 'premium') {
    return 'Your account already resolves as premium. Enterprise plans remain available if you need the higher tier.'
  }
  return 'Choose the plan that matches your usage level and the UI will open a Worker-backed Stripe checkout session.'
}

export function PricingCard() {
  const premium = usePremiumStatus()
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null)
  const activePlanLabel = premium.accessTier === 'enterprise' ? 'Enterprise active' : 'Premium active'
  const currentTierRank = getTierRank(premium.accessTier)

  const handleSelectPlan = (plan: BillingPlan) => {
    setSelectedPlan(plan)
  }

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
        <GlassCard tier={2} className="ion-billing-overview p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ion-billing-kicker">Pricing surface</p>
              <h2 className="mt-3 text-2xl font-semibold text-quantum-white md:text-3xl">Four real plans, one live checkout route, and entitlement state that stays connected to the account.</h2>
            </div>
            {premium.isPremium ? <PremiumBadge label={activePlanLabel} /> : null}
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-quantum-white/72 md:text-base">
            Premium is the entry lane for individual use. Enterprise is the higher-capacity path for heavier usage and team-oriented adoption. Both tiers route through the same Worker-backed Stripe checkout integration.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="ion-billing-stat-card">
              <p className="ion-billing-stat-label">Premium tier</p>
              <p className="ion-billing-stat-value">$9.99/mo or $89/yr</p>
              <p className="ion-billing-stat-copy">Yearly premium is highlighted as the lower-cost recurring option.</p>
            </div>
            <div className="ion-billing-stat-card">
              <p className="ion-billing-stat-label">Enterprise tier</p>
              <p className="ion-billing-stat-value">$99.99/mo or $999/yr</p>
              <p className="ion-billing-stat-copy">Enterprise yearly is positioned for teams and heavier operational demand.</p>
            </div>
            <div className="ion-billing-stat-card">
              <p className="ion-billing-stat-label">Checkout integration</p>
              <p className="ion-billing-stat-value">POST /api/billing/checkout</p>
              <p className="ion-billing-stat-copy">The UI sends plan tier, billing cadence, and the selected price ID when available.</p>
            </div>
            <div className="ion-billing-stat-card">
              <p className="ion-billing-stat-label">Entitlement state</p>
              <p className="ion-billing-stat-value">Live and reactive</p>
              <p className="ion-billing-stat-copy">The pricing page, workspace header, and return screens all use the same live status routes.</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-quantum-white/10 bg-pine-black-900/36 p-5 text-sm leading-7 text-quantum-white/70">
            {premium.loading ? (
              <p>Checking current plan state...</p>
            ) : premium.isPremium ? (
              <p>{getTierSummary(premium.accessTier)}</p>
            ) : premium.signedIn ? (
              <p>{getTierSummary(premium.accessTier)}</p>
            ) : (
              <p>
                Checkout requires an authenticated session. <Link href="/login?next=%2Fpricing" className="text-spectral-cyan-300 underline underline-offset-4">Sign in first</Link> and the modal will continue into Stripe.
              </p>
            )}
          </div>
        </GlassCard>

        <div className="grid gap-5 md:grid-cols-2">
          {PRICING_PLANS.map((plan) => {
            const selectedTierRank = getTierRank(plan.tier)
            const alreadyIncluded = premium.isPremium && currentTierRank >= selectedTierRank

            return (
              <GlassCard key={plan.key} tier={1} glow={plan.featured ? 'amber' : 'cyan'} className="ion-billing-plan p-6 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="ion-billing-plan-eyebrow">{plan.label}</p>
                    <h3 className="mt-3 text-3xl font-semibold text-quantum-white">
                      {plan.priceDisplay}
                      <span className="text-base font-medium text-quantum-white/56">{getPlanCadenceLabel(plan)}</span>
                    </h3>
                  </div>
                  <span className="ion-billing-highlight">{plan.callout}</span>
                </div>

                <p className="mt-5 text-lg font-medium text-quantum-white">{plan.headline}</p>
                <p className="mt-3 text-sm leading-7 text-quantum-white/72">{plan.description}</p>

                <ul className="mt-6 space-y-3 text-sm leading-6 text-quantum-white/74">
                  {plan.featureList.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className={`ion-billing-feature-dot ion-billing-feature-dot-${plan.accent}`} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 space-y-3">
                  {alreadyIncluded ? (
                    <PremiumBadge label={activePlanLabel} className="w-full justify-center" />
                  ) : (
                    <Button type="button" variant={plan.featured ? 'primary' : 'secondary'} glow={plan.featured} className="w-full rounded-full" onClick={() => handleSelectPlan(plan)}>
                      {premium.signedIn ? getPlanActionLabel(plan) : 'Sign in to choose this plan'}
                    </Button>
                  )}
                  <p className="text-xs uppercase tracking-[0.18em] text-quantum-white/42">{plan.billing === 'year' ? 'Recurring yearly' : 'Recurring monthly'} • {plan.tier}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>

      <BillingUpgradeModal isOpen={Boolean(selectedPlan)} onClose={() => setSelectedPlan(null)} plan={selectedPlan} premium={premium} />
    </>
  )
}