'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Button } from '@/components/Button'
import { authorizedFetch, getApiUrl, getStoredToken } from '@/lib/auth'
import type { BillingInterval } from './usePremiumStatus'

export const CHECKOUT_ENDPOINT = '/api/billing/checkout'

interface CheckoutResponse {
  checkoutUrl?: string
  error?: string
}

interface UpgradeButtonProps {
  interval: BillingInterval
  className?: string
  fullWidth?: boolean
  variant?: 'primary' | 'secondary'
  children?: React.ReactNode
}

function getCheckoutLabel(interval: BillingInterval): string {
  return interval === 'year' ? 'Upgrade yearly' : 'Upgrade monthly'
}

export function normalizeCheckoutError(payload: CheckoutResponse | null, fallback = 'Checkout could not be created.'): string {
  if (payload?.error && payload.error.trim()) {
    return payload.error.trim()
  }

  return fallback
}

export async function requestCheckoutSession(interval: BillingInterval): Promise<CheckoutResponse> {
  const response = await authorizedFetch(getApiUrl(CHECKOUT_ENDPOINT), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planTier: 'premium',
      interval,
    }),
  })

  const payload = await response.json().catch(() => ({})) as CheckoutResponse

  if (!response.ok) {
    throw new Error(normalizeCheckoutError(payload, `Checkout request failed with status ${response.status}.`))
  }

  if (!payload.checkoutUrl) {
    throw new Error('Checkout response did not include a redirect URL.')
  }

  return payload
}

export function UpgradeButton({ interval, className, fullWidth, variant = 'primary', children }: UpgradeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    if (!getStoredToken()) {
      router.push('/login?next=%2Fpricing')
      return
    }

    try {
      setLoading(true)
      setError('')

      const payload = await requestCheckoutSession(interval)
      window.location.assign(payload.checkoutUrl as string)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be created.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={clsx('flex flex-col gap-2', fullWidth && 'w-full', className)}>
      <Button type="button" variant={variant} glow={variant === 'primary'} className={clsx(fullWidth && 'w-full rounded-full')} onClick={handleCheckout} disabled={loading}>
        {loading ? 'Redirecting to checkout...' : children || getCheckoutLabel(interval)}
      </Button>
      {error ? <p className="text-sm text-amber-signal-500">{error}</p> : null}
    </div>
  )
}