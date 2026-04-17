import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PremiumBadge } from '../ui/billing/PremiumBadge'
import { PLANS, PRICING_PLANS, resolveEffectivePlanId } from '../ui/billing/plans'
import { buildCheckoutPayload, CHECKOUT_ENDPOINT } from '../ui/billing/UpgradeButton'
import { derivePremiumSnapshot } from '../ui/billing/usePremiumStatus'

test('pricing surface exposes the real four plans', () => {
  assert.equal(PRICING_PLANS.length, 4)
  assert.deepEqual(
    PRICING_PLANS.map((plan) => `${plan.tier}:${plan.billing}`),
    ['premium:month', 'premium:year', 'enterprise:month', 'enterprise:year']
  )
  assert.equal(PLANS.PREMIUM_MONTHLY.price, 9.99)
  assert.equal(PLANS.PREMIUM_YEARLY.price, 89)
  assert.equal(PLANS.ENTERPRISE_MONTHLY.price, 99.99)
  assert.equal(PLANS.ENTERPRISE_YEARLY.price, 999)
})

test('checkout button targets the live worker billing route', () => {
  assert.equal(CHECKOUT_ENDPOINT, '/api/billing/checkout')
})

test('checkout payload includes a concrete price id when available', () => {
  const payload = buildCheckoutPayload({
    planTier: 'enterprise',
    interval: 'year',
    priceId: 'price_enterprise_yearly_live',
  })

  assert.deepEqual(payload, {
    planTier: 'enterprise',
    interval: 'year',
    priceId: 'price_enterprise_yearly_live',
  })
})

test('runtime price ids override placeholder plan ids', () => {
  const resolved = resolveEffectivePlanId(PLANS.PREMIUM_MONTHLY, {
    premiumMonthly: 'price_runtime_premium_monthly',
  })

  assert.equal(resolved, 'price_runtime_premium_monthly')
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