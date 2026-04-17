import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PremiumBadge } from '../ui/billing/PremiumBadge'
import { PRICING_PLANS } from '../ui/billing/PricingCard'
import { CHECKOUT_ENDPOINT } from '../ui/billing/UpgradeButton'
import { derivePremiumSnapshot } from '../ui/billing/usePremiumStatus'

test('pricing surface exposes monthly and yearly premium plans', () => {
  assert.equal(PRICING_PLANS.length, 2)
  assert.deepEqual(PRICING_PLANS.map((plan) => plan.interval), ['month', 'year'])
})

test('checkout button targets the live worker billing route', () => {
  assert.equal(CHECKOUT_ENDPOINT, '/api/billing/checkout')
})

test('premium snapshot elevates active premium tiers', () => {
  const snapshot = derivePremiumSnapshot({
    accessTier: 'free',
    activeEntitlement: {
      tier: 'premium',
      status: 'active',
    },
  })

  assert.equal(snapshot.isPremium, true)
  assert.equal(snapshot.accessTier, 'free')
})

test('premium badge renders a stable active label', () => {
  const markup = renderToStaticMarkup(createElement(PremiumBadge, { label: 'Premium active' }))

  assert.match(markup, /Premium active/)
})