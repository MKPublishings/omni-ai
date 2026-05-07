import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { loadHierarchyCommandCenterData } from '@/lib/hierarchy-command-center'

const metricCards = [
  {
    label: 'Constitutional points',
    key: 'points',
    detail: 'All declared points registered into one sovereign order.',
  },
  {
    label: 'Traceable features',
    key: 'features',
    detail: 'Feature handlers remain mapped to the hierarchy charter.',
  },
  {
    label: 'Authorized events',
    key: 'events',
    detail: 'The bus topology is constrained to declared event names.',
  },
  {
    label: 'Inbound subscriptions',
    key: 'subscriptions',
    detail: 'Cross-point listeners remain explicit and auditable.',
  },
] as const

export default async function HierarchyPage() {
  const data = await loadHierarchyCommandCenterData()

  return (
    <DashboardShell
      title="Hierarchy"
      subtitle="Eight-point constitutional command center embedded into the workspace shell with compliance visibility and bus topology intelligence."
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(21rem,0.82fr)]">
        <GlassCard className="overflow-hidden p-6 sm:p-7">
          <div className="relative">
            <div className="absolute inset-x-[35%] top-[-8rem] h-56 rounded-full bg-spectral-cyan-400/15 blur-3xl" aria-hidden="true" />
            <div className="absolute right-[-3rem] top-8 h-40 w-40 rounded-full bg-ion-blue-500/15 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-spectral-cyan-300">Constitutional runtime</p>
                <h2 className="mt-3 text-3xl font-semibold text-quantum-white sm:text-4xl">Sovereign command over all eight points.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-quantum-white/72">
                  This workspace view mirrors the hierarchy package directly: point manifests, validator sections, and event-bus topology remain visible inside the dashboard rather than living in a detached docs surface.
                </p>
              </div>
              <div className="grid min-w-0 gap-3 sm:min-w-[18rem] sm:grid-cols-2 lg:w-[18rem] lg:grid-cols-1">
                <div className="rounded-[1.5rem] border border-spectral-cyan-400/18 bg-spectral-cyan-400/8 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Snapshot</p>
                  <p className="mt-2 text-base font-semibold text-quantum-white">{new Date(data.generatedAt).toLocaleString()}</p>
                </div>
                <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Critical violations</p>
                  <p className="mt-2 text-2xl font-semibold text-quantum-white">{data.summary.criticalViolations}</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6 sm:p-7">
          <h2 className="text-xl font-semibold text-quantum-white">Audit spine</h2>
          <div className="mt-4 grid gap-3">
            {data.auditSections.map((section) => (
              <article key={section.title} className="rounded-[1.35rem] border border-quantum-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-quantum-white">{section.title}</h3>
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${section.status === 'pass' ? 'border-emerald-400/30 text-emerald-300' : section.status === 'warn' ? 'border-amber-400/30 text-amber-300' : 'border-rose-400/30 text-rose-300'}`}>
                    {section.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-quantum-white/68">{section.detail}</p>
              </article>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <GlassCard key={card.key} className="p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-quantum-white">{data.summary[card.key]}</p>
            <p className="mt-3 text-sm leading-6 text-quantum-white/68">{card.detail}</p>
          </GlassCard>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <GlassCard className="p-6 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-quantum-white">Eight points in force</h2>
              <p className="mt-2 text-sm leading-6 text-quantum-white/68">Ranked modules, executable features, and traceable subscriptions.</p>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-quantum-white/46">Constitutional ordering</p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {data.points.map((point) => (
              <article key={point.pointId} className="rounded-[1.75rem] border border-quantum-white/8 bg-quantum-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-spectral-cyan-300">{point.slug}</p>
                    <h3 className="mt-2 text-lg font-semibold text-quantum-white">{point.title}</h3>
                    <p className="mt-2 text-sm text-quantum-white/58">{point.features.length} features · {point.subscriptions.length} subscriptions</p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-spectral-cyan-400/18 bg-spectral-cyan-400/8 text-sm font-semibold text-quantum-white">
                    {point.pointId}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {point.features.map((feature) => (
                    <span key={feature.id} className="rounded-full border border-quantum-white/10 bg-black/10 px-3 py-2 text-xs tracking-[0.02em] text-quantum-white/72">
                      {feature.title}
                    </span>
                  ))}
                </div>

                <div className="mt-4 space-y-3 text-sm text-quantum-white/66">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-quantum-white/44">Templates</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {point.templates.length > 0 ? point.templates.map((template) => (
                        <span key={template} className="rounded-full border border-quantum-white/8 px-3 py-1.5 text-xs text-quantum-white/64">
                          {template.split('/').pop()}
                        </span>
                      )) : <span className="text-xs text-quantum-white/42">No generated template snapshot</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-quantum-white/44">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {point.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-quantum-white/8 px-3 py-1.5 text-xs text-quantum-white/64">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </GlassCard>

        <div className="grid gap-6">
          {data.points.map((point) => (
            <GlassCard key={`${point.pointId}-topology`} tier={2} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-quantum-white">{point.pointId}</h3>
                  <p className="mt-1 text-sm text-quantum-white/56">{point.slug}</p>
                </div>
                <span className="rounded-full border border-quantum-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-quantum-white/52">
                  Bus topology
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-spectral-cyan-300">Emits</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-quantum-white/68">
                    {(data.busTopology.emitters[point.pointId] ?? []).map((eventName) => (
                      <li key={eventName} className="rounded-2xl border border-quantum-white/8 bg-black/10 px-3 py-2">{eventName}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ion-blue-300">Subscribes</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-quantum-white/68">
                    {(data.busTopology.subscribers[point.pointId] ?? []).map((eventName) => (
                      <li key={eventName} className="rounded-2xl border border-quantum-white/8 bg-black/10 px-3 py-2">{eventName}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </DashboardShell>
  )
}