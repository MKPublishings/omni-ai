'use client'

import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PremiumBadge } from './PremiumBadge'
import { UpgradeButton } from './UpgradeButton'
import { BillingInterval, usePremiumStatus } from './usePremiumStatus'

interface PricingPlan {
  interval: BillingInterval
  eyebrow: string
  price: string
  cadence: string
  headline: string
  copy: string
  features: string[]
  accent: 'cyan' | 'amber'
  featured?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    interval: 'month',
    eyebrow: 'Monthly orbit',
    price: '$24',
    cadence: '/month',
    headline: 'Fastest path into the premium workspace.',
    copy: 'Turn on premium search, retrieval recovery, and advanced operating surfaces without a long commitment.',
    features: ['Premium retrieval and recovery flows', 'Live billing verification and entitlement sync', 'Instant upgrade path from the workspace header'],
    accent: 'cyan',
  },
  {
    interval: 'year',
    eyebrow: 'Yearly command',
    price: '$228',
    cadence: '/year',
    headline: 'Best value for teams running Ionirix every week.',
    copy: 'Lock in the premium surface for a full year and keep billing overhead out of the way.',
    features: ['Two months effectively free', 'Preferred option for sustained workspace use', 'Highlighted for the default upgrade flow'],
    accent: 'amber',
    featured: true,
  },
]

export function PricingCard() {
  const premium = usePremiumStatus()

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <GlassCard tier={2} className="ion-billing-overview p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="ion-billing-kicker">Premium surface</p>
            <h2 className="mt-3 text-2xl font-semibold text-quantum-white md:text-3xl">Checkout is already live. The UI just needs to convert intent into payment.</h2>
          </div>
          {premium.isPremium ? <PremiumBadge /> : null}
        </div>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-quantum-white/72 md:text-base">
          The billing flow uses the Worker checkout route, verifies entitlement state on return, and keeps the workspace header synchronized with active premium access.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="ion-billing-stat-card">
            <p className="ion-billing-stat-label">Checkout route</p>
            <p className="ion-billing-stat-value">Worker-backed</p>
            <p className="ion-billing-stat-copy">POST /api/billing/checkout</p>
          </div>
          <div className="ion-billing-stat-card">
            <p className="ion-billing-stat-label">Entitlement sync</p>
            <p className="ion-billing-stat-value">Reactive</p>
            <p className="ion-billing-stat-copy">Header and return screens share live status.</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-quantum-white/10 bg-pine-black-900/36 p-5 text-sm leading-7 text-quantum-white/70">
          {premium.loading ? (
            <p>Checking current plan state...</p>
          ) : premium.isPremium ? (
            <p>Your account already resolves as premium. Return pages will still verify the final entitlement after Stripe redirects back.</p>
          ) : premium.signedIn ? (
            <p>Pick a billing interval and the button will create a checkout session against the live premium Worker.</p>
          ) : (
            <p>
              Premium checkout requires an authenticated session. <Link href="/login" className="text-spectral-cyan-300 underline underline-offset-4">Sign in first</Link> and the upgrade buttons will redirect you into Stripe.
            </p>
          )}
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-2">
        {PRICING_PLANS.map((plan) => (
          <GlassCard key={plan.interval} tier={1} glow={plan.featured ? 'amber' : 'cyan'} className="ion-billing-plan p-6 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ion-billing-plan-eyebrow">{plan.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-semibold text-quantum-white">{plan.price}<span className="text-base font-medium text-quantum-white/56">{plan.cadence}</span></h3>
              </div>
              {plan.featured ? <span className="ion-billing-highlight">Most efficient</span> : null}
            </div>

            <p className="mt-5 text-lg font-medium text-quantum-white">{plan.headline}</p>
            <p className="mt-3 text-sm leading-7 text-quantum-white/72">{plan.copy}</p>

            <ul className="mt-6 space-y-3 text-sm leading-6 text-quantum-white/74">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className={`ion-billing-feature-dot ion-billing-feature-dot-${plan.accent}`} aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              {premium.isPremium ? (
                <PremiumBadge label="Premium already active" className="w-full justify-center" />
              ) : (
                <UpgradeButton interval={plan.interval} fullWidth variant={plan.featured ? 'primary' : 'secondary'}>
                  {premium.signedIn ? `Start ${plan.interval === 'year' ? 'yearly' : 'monthly'} checkout` : 'Sign in to upgrade'}
                </UpgradeButton>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}