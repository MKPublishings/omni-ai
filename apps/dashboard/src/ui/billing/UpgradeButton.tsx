'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Button } from '@/components/Button'
import { authorizedFetch, getApiUrl } from '@/lib/auth'
import type { BillingInterval } from './usePremiumStatus'
import type { BillingPlanTier } from './plans'
import { isConcretePriceId } from './plans'

export const CHECKOUT_ENDPOINT = '/api/billing/checkout'
const AUTH_REQUIRED_ERROR = 'AUTH_REQUIRED'

interface CheckoutResponse {
  checkoutUrl?: string
  error?: string
}

export interface CheckoutPlanSelection {
  planTier: BillingPlanTier
  interval: BillingInterval
  priceId?: string
}

interface UpgradeButtonProps {
  plan: CheckoutPlanSelection
  className?: string
  fullWidth?: boolean
  variant?: 'primary' | 'secondary'
  children?: React.ReactNode
}

function getCheckoutLabel(plan: CheckoutPlanSelection): string {
  const intervalLabel = plan.interval === 'year' ? 'yearly' : 'monthly'
  return `Upgrade ${plan.planTier} ${intervalLabel}`
}

export function normalizeCheckoutError(payload: CheckoutResponse | null, fallback = 'Checkout could not be created.'): string {
  if (payload?.error && payload.error.trim()) {
    return payload.error.trim()
  }

  return fallback
}

export function buildCheckoutPayload(plan: CheckoutPlanSelection): Record<string, string> {
  const payload: Record<string, string> = {
    planTier: plan.planTier,
    interval: plan.interval,
  }

  if (plan.priceId && isConcretePriceId(plan.priceId)) {
    payload.priceId = plan.priceId
  }

  return payload
}

export async function requestCheckoutSession(plan: CheckoutPlanSelection): Promise<CheckoutResponse> {
  const response = await authorizedFetch(getApiUrl(CHECKOUT_ENDPOINT), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildCheckoutPayload(plan)),
  })

  const payload = await response.json().catch(() => ({})) as CheckoutResponse

  if (response.status === 401) {
    throw new Error(AUTH_REQUIRED_ERROR)
  }

  if (!response.ok) {
    throw new Error(normalizeCheckoutError(payload, `Checkout request failed with status ${response.status}.`))
  }

  if (!payload.checkoutUrl) {
    throw new Error('Checkout response did not include a redirect URL.')
  }

  return payload
}

export function UpgradeButton({ plan, className, fullWidth, variant = 'primary', children }: UpgradeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    try {
      setLoading(true)
      setError('')

      const payload = await requestCheckoutSession(plan)
      window.location.assign(payload.checkoutUrl as string)
    } catch (checkoutError) {
      if (checkoutError instanceof Error && checkoutError.message === AUTH_REQUIRED_ERROR) {
        router.push('/login?next=%2Fpricing')
        return
      }

      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be created.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={clsx('flex flex-col gap-2', fullWidth && 'w-full', className)}>
      <Button type="button" variant={variant} glow={variant === 'primary'} className={clsx(fullWidth && 'w-full rounded-full')} onClick={handleCheckout} disabled={loading}>
        {loading ? 'Redirecting to checkout...' : children || getCheckoutLabel(plan)}
      </Button>
      {error ? <p className="text-sm text-amber-signal-500">{error}</p> : null}
    </div>
  )
}