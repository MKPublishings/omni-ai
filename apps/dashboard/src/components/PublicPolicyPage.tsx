import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { PublicSiteShell } from '@/components/PublicSiteShell'

interface PolicySection {
  title: string
  paragraphs: string[]
}

interface PublicPolicyPageProps {
  title: string
  subtitle: string
  sections: PolicySection[]
}

export function PublicPolicyPage({ title, subtitle, sections }: PublicPolicyPageProps) {
  return (
    <PublicSiteShell
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <Link href="/platform" className="rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">Platform</Link>
          <Link href="/login" className="rounded-full bg-ion-blue-500 px-4 py-2 text-sm font-medium text-quantum-white transition hover:bg-ion-blue-600">Access workspace</Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <GlassCard className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-400">Legal surface</p>
          <h2 className="mt-4 text-2xl font-semibold text-quantum-white">Ionirix public policy record</h2>
          <p className="mt-3 text-sm leading-7 text-quantum-white/72">
            These public terms describe how Ionirix LLC governs access to the browseable site, the authenticated workspace boundary, and the data or security expectations attached to that boundary.
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Policy metadata</h2>
          <dl className="mt-4 space-y-3 text-sm text-quantum-white/72">
            <div className="flex items-start justify-between gap-6">
              <dt className="text-quantum-white/48">Entity</dt>
              <dd className="text-right">Ionirix LLC</dd>
            </div>
            <div className="flex items-start justify-between gap-6">
              <dt className="text-quantum-white/48">Jurisdiction</dt>
              <dd className="text-right">New York, USA</dd>
            </div>
            <div className="flex items-start justify-between gap-6">
              <dt className="text-quantum-white/48">Last updated</dt>
              <dd className="text-right">April 19, 2026</dd>
            </div>
            <div className="flex items-start justify-between gap-6">
              <dt className="text-quantum-white/48">Contact</dt>
              <dd className="text-right">
                <a href="mailto:support@ionirix.net" className="transition hover:text-quantum-white">support@ionirix.net</a>
              </dd>
            </div>
          </dl>
        </GlassCard>
      </section>

      <section className="grid gap-6">
        {sections.map((section) => (
          <GlassCard key={section.title} className="p-6">
            <h2 className="text-xl font-semibold text-quantum-white">{section.title}</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-quantum-white/72">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </GlassCard>
        ))}
      </section>
    </PublicSiteShell>
  )
}