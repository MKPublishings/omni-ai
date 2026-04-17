import { GlassCard } from '@/components/GlassCard'
import { PLAN_COMPARISON_ROWS } from './plans'

export function PlanComparisonGrid() {
  return (
    <GlassCard tier={1} className="ion-billing-comparison p-6 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="ion-billing-kicker">Plan comparison</p>
          <h2 className="mt-3 text-2xl font-semibold text-quantum-white md:text-3xl">Premium for individuals. Enterprise for teams and heavier operational demand.</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-quantum-white/68">Both tiers use the same live Worker checkout route and the same entitlement verification path after Stripe redirects back.</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-quantum-white/10 bg-pine-black-900/28">
        <div className="grid grid-cols-[minmax(140px,1.1fr)_minmax(120px,0.95fr)_minmax(120px,0.95fr)] border-b border-quantum-white/8 bg-quantum-white/4 px-4 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-quantum-white/62 md:px-6">
          <span>Capability</span>
          <span>Premium</span>
          <span>Enterprise</span>
        </div>

        <div className="divide-y divide-quantum-white/8">
          {PLAN_COMPARISON_ROWS.map((row) => (
            <div key={row.feature} className="grid grid-cols-[minmax(140px,1.1fr)_minmax(120px,0.95fr)_minmax(120px,0.95fr)] gap-4 px-4 py-4 text-sm leading-7 text-quantum-white/72 md:px-6">
              <span className="font-medium text-quantum-white">{row.feature}</span>
              <span>{row.premium}</span>
              <span>{row.enterprise}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}