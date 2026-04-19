import { GlassCard } from '@/components/GlassCard'
import { PLAN_COMPARISON_ROWS } from './plans'

export function PlanComparisonGrid() {
  return (
    <GlassCard tier={1} className="ion-billing-comparison p-6 md:p-7" interactive>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="ion-billing-kicker">Plan comparison</p>
          <h2 className="mt-3 text-2xl font-semibold text-quantum-white md:text-3xl">A detailed comparison of the Premium and Enterprise lanes.</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-quantum-white/68">Both tiers use the same live Worker checkout route and the same entitlement verification path after Stripe redirects back, but they are positioned for different scales of ongoing use.</p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[1.75rem] border border-quantum-white/10 bg-pine-black-900/28">
        <table className="min-w-[58rem] w-full border-collapse">
          <thead>
            <tr className="border-b border-quantum-white/8 bg-quantum-white/4 text-left text-sm font-semibold uppercase tracking-[0.16em] text-quantum-white/62">
              <th className="px-4 py-4 md:px-6">Capability</th>
              <th className="px-4 py-4 md:px-6">Detail</th>
              <th className="px-4 py-4 md:px-6">Premium</th>
              <th className="px-4 py-4 md:px-6">Enterprise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-quantum-white/8">
            {PLAN_COMPARISON_ROWS.map((row) => (
              <tr key={row.feature} className="align-top text-sm leading-7 text-quantum-white/72">
                <th scope="row" className="px-4 py-4 text-left font-medium text-quantum-white md:px-6">{row.feature}</th>
                <td className="px-4 py-4 text-quantum-white/60 md:px-6">{row.detail}</td>
                <td className="px-4 py-4 md:px-6">{row.premium}</td>
                <td className="px-4 py-4 md:px-6">{row.enterprise}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}