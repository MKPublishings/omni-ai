'use client'

import { useEffect, useState } from 'react'
import { authorizedFetch, getApiUrl } from '@/lib/auth'

export type BillingInterval = 'month' | 'year'

export interface PremiumEntitlementRecord {
  id?: string
  tier?: string
  status?: string
  source?: string
  updated_at?: string
}

export interface BillingSubscriptionRecord {
  id?: string
  plan_tier?: string
  status?: string
  provider_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  created_at?: string
  updated_at?: string
  metadata_json?: string
}

export interface BillingCustomerRecord {
  id?: string
  provider?: string
  provider_customer_id?: string
  email?: string
  status?: string
  updated_at?: string
}

interface PriceConfiguration {
  premiumMonthly: boolean
  premiumYearly: boolean
  enterpriseMonthly: boolean
  enterpriseYearly: boolean
}

export interface BillingPriceIds {
  premiumMonthly: string | null
  premiumYearly: string | null
  enterpriseMonthly: string | null
  enterpriseYearly: string | null
}

interface EntitlementsResponse {
  accessTier?: string
  activeEntitlement?: PremiumEntitlementRecord | null
  entitlements?: PremiumEntitlementRecord[]
}

interface BillingStatusResponse {
  customer?: BillingCustomerRecord | null
  subscriptions?: BillingSubscriptionRecord[]
  providerConfigured?: boolean
  priceConfiguration?: Partial<PriceConfiguration>
  priceIds?: Partial<BillingPriceIds>
}

export interface PremiumStatusSnapshot {
  accessTier: string
  isPremium: boolean
  activeEntitlement: PremiumEntitlementRecord | null
}

export interface PremiumStatusState extends PremiumStatusSnapshot {
  loading: boolean
  signedIn: boolean
  subscriptions: BillingSubscriptionRecord[]
  customer: BillingCustomerRecord | null
  providerConfigured: boolean
  priceConfiguration: PriceConfiguration
  priceIds: BillingPriceIds
  error: string
  lastCheckedAt: string | null
}

interface UsePremiumStatusOptions {
  pollMs?: number
}

const DEFAULT_PRICE_CONFIGURATION: PriceConfiguration = {
  premiumMonthly: false,
  premiumYearly: false,
  enterpriseMonthly: false,
  enterpriseYearly: false,
}

const DEFAULT_PRICE_IDS: BillingPriceIds = {
  premiumMonthly: null,
  premiumYearly: null,
  enterpriseMonthly: null,
  enterpriseYearly: null,
}

function hasActiveEntitlement(entitlement: PremiumEntitlementRecord | null | undefined): boolean {
  if (!entitlement) {
    return false
  }

  const tier = String(entitlement.tier || '').toLowerCase()
  const status = String(entitlement.status || '').toLowerCase()
  const premiumTier = tier === 'premium' || tier === 'enterprise'
  const activeStatus = !status || /active|trialing|paid|complete/.test(status)

  return premiumTier && activeStatus
}

export function derivePremiumSnapshot(input: {
  accessTier?: string | null
  activeEntitlement?: PremiumEntitlementRecord | null
}): PremiumStatusSnapshot {
  const accessTier = String(input.accessTier || 'free').toLowerCase() || 'free'
  const isPremium = accessTier === 'premium' || accessTier === 'enterprise' || hasActiveEntitlement(input.activeEntitlement)

  return {
    accessTier,
    isPremium,
    activeEntitlement: input.activeEntitlement || null,
  }
}

export function usePremiumStatus(options: UsePremiumStatusOptions = {}): PremiumStatusState & { refresh: () => void } {
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [state, setState] = useState<PremiumStatusState>({
    accessTier: 'free',
    isPremium: false,
    activeEntitlement: null,
    loading: true,
    signedIn: false,
    subscriptions: [],
    customer: null,
    providerConfigured: false,
    priceConfiguration: DEFAULT_PRICE_CONFIGURATION,
    priceIds: DEFAULT_PRICE_IDS,
    error: '',
    lastCheckedAt: null,
  })

  useEffect(() => {
    let cancelled = false
    const pollMs = options.pollMs ?? 60000

    const load = async () => {
      if (!cancelled) {
        setState((current) => ({ ...current, loading: true, error: '' }))
      }

      try {
        const [entitlementsResponse, billingResponse] = await Promise.all([
          authorizedFetch(getApiUrl('/api/account/entitlements/me'), {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          }),
          authorizedFetch(getApiUrl('/api/billing/subscription'), {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          }),
        ])

        if (entitlementsResponse.status === 401 || billingResponse.status === 401) {
          if (!cancelled) {
            setState({
              accessTier: 'free',
              isPremium: false,
              activeEntitlement: null,
              loading: false,
              signedIn: false,
              subscriptions: [],
              customer: null,
              providerConfigured: false,
              priceConfiguration: DEFAULT_PRICE_CONFIGURATION,
              priceIds: DEFAULT_PRICE_IDS,
              error: '',
              lastCheckedAt: new Date().toISOString(),
            })
          }
          return
        }

        const entitlementsPayload = await entitlementsResponse.json().catch(() => ({})) as EntitlementsResponse
        const billingPayload = await billingResponse.json().catch(() => ({})) as BillingStatusResponse

        if (!entitlementsResponse.ok) {
          throw new Error('Could not load entitlement state.')
        }

        if (!billingResponse.ok) {
          throw new Error('Could not load billing state.')
        }

        const snapshot = derivePremiumSnapshot({
          accessTier: entitlementsPayload.accessTier,
          activeEntitlement: entitlementsPayload.activeEntitlement,
        })

        if (!cancelled) {
          setState({
            ...snapshot,
            loading: false,
            signedIn: true,
            subscriptions: Array.isArray(billingPayload.subscriptions) ? billingPayload.subscriptions : [],
            customer: billingPayload.customer || null,
            providerConfigured: Boolean(billingPayload.providerConfigured),
            priceConfiguration: {
              ...DEFAULT_PRICE_CONFIGURATION,
              ...(billingPayload.priceConfiguration || {}),
            },
            priceIds: {
              ...DEFAULT_PRICE_IDS,
              ...(billingPayload.priceIds || {}),
            },
            error: '',
            lastCheckedAt: new Date().toISOString(),
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            signedIn: current.signedIn,
            error: error instanceof Error ? error.message : 'Unable to resolve premium status.',
            lastCheckedAt: new Date().toISOString(),
          }))
        }
      }
    }

    void load()
    const interval = window.setInterval(load, pollMs)
    window.addEventListener('focus', load)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', load)
    }
  }, [options.pollMs, refreshNonce])

  return {
    ...state,
    refresh: () => setRefreshNonce((value) => value + 1),
  }
}