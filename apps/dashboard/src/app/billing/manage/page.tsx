'use client'

import Link from 'next/link'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/Button'
import { PremiumBadge } from '@/ui/billing/PremiumBadge'
import { usePremiumStatus } from '@/ui/billing/usePremiumStatus'

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString()
}

function formatRelativePlan(tier?: string | null): string {
  const normalized = String(tier || '').toLowerCase()
  if (normalized === 'enterprise') {
    return 'Enterprise'
  }
  if (normalized === 'premium') {
    return 'Premium'
  }
  return 'Free'
}

function parseSubscriptionMetadata(metadataJson?: string): { interval?: string; priceId?: string } {
  if (!metadataJson) {
    return {}
  }

  try {
    const parsed = JSON.parse(metadataJson) as { interval?: string; priceId?: string }
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export default function BillingManagePage() {
  const billing = usePremiumStatus({ pollMs: 90000 })
  const activeLabel = billing.accessTier === 'enterprise' ? 'Enterprise active' : billing.isPremium ? 'Premium active' : 'Free plan'

  return (
    <DashboardShell
      title="Billing"
      subtitle="Review the account entitlement, Worker-backed subscription records, and the exact Stripe price IDs currently configured for this deployment."
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={billing.refresh}>Refresh billing</Button>
          <Link href="/pricing" className="inline-flex min-h-[2.5rem] items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Open pricing</Link>
        </>
      }
    >
      {billing.error ? <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{billing.error}</GlassCard> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-quantum-white">Account plan state</h2>
              <p className="mt-2 text-sm leading-6 text-quantum-white/72">This screen reads the same billing and entitlement routes used by the pricing page and workspace header.</p>
            </div>
            <PremiumBadge label={activeLabel} />
          </div>

          <dl className="mt-5 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Resolved access tier</dt>
              <dd className="font-medium text-quantum-white sm:text-right">{formatRelativePlan(billing.accessTier)}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Entitlement source</dt>
              <dd className="font-medium text-quantum-white sm:text-right">{billing.activeEntitlement?.source || 'Not available'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Entitlement status</dt>
              <dd className="font-medium text-quantum-white sm:text-right">{billing.activeEntitlement?.status || 'Not available'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Billing provider</dt>
              <dd className="font-medium text-quantum-white sm:text-right">{billing.customer?.provider || 'stripe'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Provider customer id</dt>
              <dd className="break-all font-medium text-quantum-white sm:text-right">{billing.customer?.provider_customer_id || 'Not available yet'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Last live sync</dt>
              <dd className="font-medium text-quantum-white sm:text-right">{formatDate(billing.lastCheckedAt)}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Deployment pricing map</h2>
          <p className="mt-2 text-sm leading-6 text-quantum-white/72">If a real Stripe price ID is configured on the Worker, it appears here and is also preferred by the pricing modal at runtime.</p>

          <dl className="mt-5 grid gap-4 text-sm text-quantum-white/72 md:grid-cols-2">
            <div className="rounded-2xl border border-quantum-white/8 bg-black/10 p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-quantum-white/46">Premium monthly</dt>
              <dd className="mt-2 break-all font-medium text-quantum-white">{billing.priceIds.premiumMonthly || 'Not configured'}</dd>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-black/10 p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-quantum-white/46">Premium yearly</dt>
              <dd className="mt-2 break-all font-medium text-quantum-white">{billing.priceIds.premiumYearly || 'Not configured'}</dd>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-black/10 p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-quantum-white/46">Enterprise monthly</dt>
              <dd className="mt-2 break-all font-medium text-quantum-white">{billing.priceIds.enterpriseMonthly || 'Not configured'}</dd>
            </div>
            <div className="rounded-2xl border border-quantum-white/8 bg-black/10 p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-quantum-white/46">Enterprise yearly</dt>
              <dd className="mt-2 break-all font-medium text-quantum-white">{billing.priceIds.enterpriseYearly || 'Not configured'}</dd>
            </div>
          </dl>
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-quantum-white">Subscription records</h2>
              <p className="mt-2 text-sm leading-6 text-quantum-white/72">These records come from the Worker billing table and Stripe webhook synchronization path.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-quantum-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-quantum-white/60">
              {billing.subscriptions.length} records
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {billing.subscriptions.length === 0 ? (
              <div className="rounded-2xl border border-quantum-white/8 bg-black/10 p-4 text-sm leading-6 text-quantum-white/68">
                No subscription records have been written for this account yet. Once Stripe checkout completes and the webhook is processed, records appear here automatically.
              </div>
            ) : (
              billing.subscriptions.map((subscription, index) => {
                const metadata = parseSubscriptionMetadata(subscription.metadata_json)
                return (
                  <div key={subscription.provider_subscription_id || subscription.id || `subscription-${index}`} className="rounded-2xl border border-quantum-white/8 bg-black/10 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-quantum-white">{formatRelativePlan(subscription.plan_tier)} subscription</h3>
                        <p className="mt-1 text-sm text-quantum-white/60">{subscription.status || 'Unknown status'} • {metadata.interval === 'year' ? 'Yearly' : metadata.interval === 'month' ? 'Monthly' : 'Interval unavailable'}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-quantum-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-quantum-white/56">
                        Updated {formatDate(subscription.updated_at)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-quantum-white/72 md:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.18em] text-quantum-white/42">Subscription id</dt>
                        <dd className="mt-1 break-all font-medium text-quantum-white">{subscription.provider_subscription_id || 'Not available'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.18em] text-quantum-white/42">Current period end</dt>
                        <dd className="mt-1 font-medium text-quantum-white">{formatDate(subscription.current_period_end)}</dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-xs uppercase tracking-[0.18em] text-quantum-white/42">Price id</dt>
                        <dd className="mt-1 break-all font-medium text-quantum-white">{metadata.priceId || 'Not available'}</dd>
                      </div>
                    </dl>
                  </div>
                )
              })
            )}
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Actions</h2>
          <div className="mt-5 space-y-3">
            <Link href="/pricing" className="inline-flex w-full items-center justify-center rounded-full bg-ion-blue-500 px-4 py-3 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">
              Change or upgrade plan
            </Link>
            <Link href="/settings" className="inline-flex w-full items-center justify-center rounded-full border border-quantum-white/12 px-4 py-3 text-sm text-quantum-white transition hover:bg-quantum-white/8">
              Open account settings
            </Link>
          </div>

          <ul className="mt-6 space-y-3 text-sm leading-6 text-quantum-white/72">
            <li>Checkout creation still runs through the live Worker route.</li>
            <li>Entitlements remain tied to the authenticated account and Stripe webhook events.</li>
            <li>There is no customer portal route in this codebase yet, so this screen is read-only plus upgrade navigation.</li>
          </ul>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}