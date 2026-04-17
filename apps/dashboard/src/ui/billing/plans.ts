import type { BillingInterval, BillingPriceIds } from './usePremiumStatus'

export type BillingPlanTier = 'premium' | 'enterprise'
export type BillingPlanKey = 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY' | 'ENTERPRISE_MONTHLY' | 'ENTERPRISE_YEARLY'

export interface BillingPlan {
  key: BillingPlanKey
  id: string
  label: string
  price: number
  priceDisplay: string
  billing: BillingInterval
  tier: BillingPlanTier
  headline: string
  description: string
  callout: string
  accent: 'cyan' | 'amber'
  featured?: boolean
  featureList: string[]
}

function resolvePublicPriceId(value: string | undefined, fallback: string): string {
  return String(value || '').trim() || fallback
}

export const PLANS: Record<BillingPlanKey, BillingPlan> = {
  PREMIUM_MONTHLY: {
    key: 'PREMIUM_MONTHLY',
    id: resolvePublicPriceId(process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID, 'price_1TN0JIBJEKcExtO66AR2kxnp'),
    label: 'Ionirix Premium - Monthly',
    price: 9.99,
    priceDisplay: '$9.99',
    billing: 'month',
    tier: 'premium',
    headline: 'Premium workspace access on the fastest possible path.',
    description: 'Turn on premium tools, upgraded retrieval, and the direct checkout flow without a long commitment.',
    callout: 'Starter path',
    accent: 'cyan',
    featureList: ['Premium workspace features', 'Recurring monthly billing', 'Instant Stripe checkout launch'],
  },
  PREMIUM_YEARLY: {
    key: 'PREMIUM_YEARLY',
    id: resolvePublicPriceId(process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID, 'price_1TN0OwBJEKcExtO6XWK1617l'),
    label: 'Ionirix Premium - Yearly',
    price: 89,
    priceDisplay: '$89',
    billing: 'year',
    tier: 'premium',
    headline: 'Lower annual cost for sustained premium use.',
    description: 'Ideal if you expect Ionirix to stay in your weekly workflow and want the cheaper annual rate.',
    callout: 'Save 25%',
    accent: 'amber',
    featured: true,
    featureList: ['Everything in Premium monthly', 'Yearly recurring billing', 'Best-value premium plan'],
  },
  ENTERPRISE_MONTHLY: {
    key: 'ENTERPRISE_MONTHLY',
    id: resolvePublicPriceId(process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID, 'price_1TN0SrBJEKcExtO6DpypdWEA'),
    label: 'Ionirix Enterprise - Monthly',
    price: 99.99,
    priceDisplay: '$99.99',
    billing: 'month',
    tier: 'enterprise',
    headline: 'Enterprise access for heavier usage and broader operational scope.',
    description: 'The monthly enterprise path keeps higher-capacity usage available without committing to annual billing.',
    callout: 'Heavy usage',
    accent: 'cyan',
    featureList: ['Enterprise entitlement tier', 'Recurring monthly billing', 'Designed for teams and advanced operators'],
  },
  ENTERPRISE_YEARLY: {
    key: 'ENTERPRISE_YEARLY',
    id: resolvePublicPriceId(process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID, 'price_1TN0W9BJEKcExtO6hpAoVcmV'),
    label: 'Ionirix Enterprise - Yearly',
    price: 999,
    priceDisplay: '$999',
    billing: 'year',
    tier: 'enterprise',
    headline: 'The annual enterprise plan for persistent team adoption.',
    description: 'Best fit for organizations that expect heavy recurring usage and want the enterprise lane locked in for the year.',
    callout: 'Best for teams',
    accent: 'amber',
    featureList: ['Everything in Enterprise monthly', 'Yearly recurring billing', 'Highest-commitment enterprise plan'],
  },
}

export const PRICING_PLANS = Object.values(PLANS)

export const PLAN_COMPARISON_ROWS = [
  {
    feature: 'Access tier',
    premium: 'Premium',
    enterprise: 'Enterprise',
  },
  {
    feature: 'Monthly price',
    premium: '$9.99',
    enterprise: '$99.99',
  },
  {
    feature: 'Yearly price',
    premium: '$89',
    enterprise: '$999',
  },
  {
    feature: 'Best fit',
    premium: 'Individual premium usage',
    enterprise: 'Teams and heavy usage',
  },
  {
    feature: 'Billing cadence',
    premium: 'Monthly or yearly recurring',
    enterprise: 'Monthly or yearly recurring',
  },
  {
    feature: 'Checkout path',
    premium: 'Worker-backed Stripe checkout',
    enterprise: 'Worker-backed Stripe checkout',
  },
]

export function getTierRank(tier: string | null | undefined): number {
  const normalized = String(tier || '').toLowerCase()
  if (normalized === 'enterprise') {
    return 2
  }
  if (normalized === 'premium') {
    return 1
  }
  return 0
}

export function isConcretePriceId(id: string): boolean {
  const normalized = String(id || '').trim()
  return Boolean(normalized) && !/xxx/i.test(normalized)
}

export function getPlanCadenceLabel(plan: BillingPlan): string {
  return plan.billing === 'year' ? '/year' : '/month'
}

export function getPlanActionLabel(plan: BillingPlan): string {
  if (plan.tier === 'enterprise') {
    return plan.billing === 'year' ? 'Choose enterprise yearly' : 'Choose enterprise monthly'
  }

  return plan.billing === 'year' ? 'Choose premium yearly' : 'Choose premium monthly'
}

export function resolveEffectivePlanId(plan: BillingPlan, priceIds?: Partial<BillingPriceIds> | null): string {
  const runtimeId = plan.tier === 'enterprise'
    ? plan.billing === 'year'
      ? priceIds?.enterpriseYearly
      : priceIds?.enterpriseMonthly
    : plan.billing === 'year'
      ? priceIds?.premiumYearly
      : priceIds?.premiumMonthly

  return String(runtimeId || '').trim() || plan.id
}