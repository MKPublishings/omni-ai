'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'
import { GlassCard } from '@/components/GlassCard'
import { PremiumBadge } from './PremiumBadge'
import { usePremiumStatus } from './usePremiumStatus'

type CheckoutHandlerMode = 'success' | 'cancel'

interface CheckoutHandlerProps {
  mode: CheckoutHandlerMode
}

export function CheckoutHandler({ mode }: CheckoutHandlerProps) {
  const searchParams = useSearchParams()
  const premium = usePremiumStatus({ pollMs: mode === 'success' ? 8000 : 30000 })
  const sessionId = searchParams.get('session_id')
  const isSuccess = mode === 'success'

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <GlassCard tier={1} glow={isSuccess ? 'cyan' : 'amber'} className="p-6 md:p-7">
        <p className="ion-billing-kicker">{isSuccess ? 'Stripe return' : 'Checkout interrupted'}</p>
        <h1 className="mt-3 text-3xl font-semibold text-quantum-white md:text-4xl">
          {isSuccess ? 'Verifying your premium access.' : 'Checkout was cancelled before activation.'}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-quantum-white/72 md:text-base">
          {isSuccess
            ? 'The dashboard is polling the live entitlement routes so the UI can switch into premium state as soon as Stripe and the Worker finish the handoff.'
            : 'No premium changes were committed. You can return to pricing immediately, or continue inside the workspace and upgrade later.'}
        </p>

        <div className="mt-6 rounded-3xl border border-quantum-white/10 bg-pine-black-900/36 p-5">
          {premium.loading ? (
            <div className="flex items-center gap-3 text-sm text-quantum-white/72">
              <span className="ion-billing-spinner" aria-hidden="true" />
              <span>{isSuccess ? 'Waiting for premium confirmation...' : 'Checking current plan state...'}</span>
            </div>
          ) : premium.isPremium ? (
            <div className="space-y-4">
              <PremiumBadge label="Premium confirmed" />
              <p className="text-sm leading-7 text-quantum-white/72">
                Your account resolves as {premium.accessTier}. The workspace header will now show the active premium badge instead of the upgrade prompt.
              </p>
            </div>
          ) : premium.signedIn ? (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-amber-signal-500">
                {isSuccess
                  ? 'Checkout returned successfully, but the premium entitlement is not active yet. Refresh in a few seconds if the webhook is still finishing.'
                  : 'Your entitlement still resolves as free. Restart checkout whenever you are ready.'}
              </p>
              <Button type="button" variant="secondary" className="rounded-full" onClick={premium.refresh}>Refresh premium status</Button>
            </div>
          ) : (
            <p className="text-sm leading-7 text-quantum-white/72">
              There is no active local session on this device. Sign in to verify the billing result against your account state.
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/pricing" className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-ion-blue-500 px-5 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">
            {isSuccess ? 'Open pricing options' : 'Retry pricing'}
          </Link>
          <Link href="/workspace" className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-quantum-white/12 px-5 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">
            Return to workspace
          </Link>
        </div>
      </GlassCard>

      <GlassCard tier={2} className="p-6 md:p-7">
        <h2 className="text-xl font-semibold text-quantum-white">Return telemetry</h2>
        <dl className="mt-5 space-y-4 text-sm text-quantum-white/72">
          <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <dt>Return state</dt>
            <dd className="font-medium text-quantum-white">{isSuccess ? 'success' : 'cancel'}</dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <dt>Session id</dt>
            <dd className="break-all font-medium text-quantum-white">{sessionId || 'not provided'}</dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <dt>Resolved access tier</dt>
            <dd className="font-medium capitalize text-quantum-white">{premium.accessTier}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <dt>Last verification</dt>
            <dd className="font-medium text-quantum-white">{premium.lastCheckedAt ? new Date(premium.lastCheckedAt).toLocaleString() : 'Pending'}</dd>
          </div>
        </dl>

        <div className="mt-6 rounded-3xl border border-quantum-white/8 bg-quantum-white/[0.03] p-5 text-sm leading-7 text-quantum-white/68">
          {premium.error || 'The handler reads from the same Worker routes that power the workspace header so users are never left in a stale post-checkout state.'}
        </div>
      </GlassCard>
    </section>
  )
}