import Link from 'next/link'
import { ReactNode } from 'react'
import { AmbientBackground } from './AmbientBackground'

interface PublicSiteShellProps {
  title: string
  subtitle: string
  children: ReactNode
  actions?: ReactNode
  footer?: ReactNode
}

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/platform', label: 'Platform' },
  { href: '/capabilities', label: 'Capabilities' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/login', label: 'Login' },
  { href: '/workspace', label: 'Workspace' },
]

const legalItems = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/acceptable-use', label: 'Acceptable Use Policy' },
  { href: '/security-compliance', label: 'Security & Compliance' },
  { href: '/data-processing-addendum', label: 'Data Processing Addendum (DPA)' },
  { href: '/cookie-settings', label: 'Cookie Settings' },
]

const companyItems = [
  'Ionirix LLC (New York, USA)',
  'Registered and operating in accordance with NYS corporate law.',
  'Trademark and brand assets protected under U.S. and international IP statutes.',
]

const contactItems = [
  { label: 'General Inquiries', href: 'mailto:support@ionirix.net', value: 'support@ionirix.net' },
  { label: 'Security Reports', href: 'mailto:support@ionirix.net', value: 'support@ionirix.net' },
  { label: 'Legal Notices', href: 'mailto:noreply@ionirix.com', value: 'noreply@ionirix.com' },
]

export function PublicSiteShell({ title, subtitle, children, actions, footer }: PublicSiteShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-6 lg:px-8">
        <header className="ix-glass-ambient flex flex-col gap-4 rounded-2xl border border-quantum-white/8 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-spectral-cyan-500 text-sm font-bold text-pine-black-900">
              IX
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-quantum-white/48">Ionirix</p>
              <p className="text-base font-medium text-quantum-white">ION AI public surface</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-quantum-white/72">
            {publicLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full px-3 py-2 transition hover:bg-quantum-white/8 hover:text-quantum-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 py-8 md:py-10">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-spectral-cyan-400">Public entry</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-quantum-white md:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-quantum-white/72 md:text-lg">{subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              {actions}
            </div>
          </section>

          <div className="mt-10 grid gap-6">{children}</div>
        </main>

        {footer ?? (
          <footer className="border-t border-quantum-white/8 py-8 text-sm text-quantum-white/56">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-quantum-white">© 2026 Ionirix LLC. All rights reserved.</p>
                <p className="max-w-xl leading-7 text-quantum-white/60">
                  Ionirix is a sovereign intelligence architecture. All systems, interfaces, simulations, models, designs, and platform materials are the exclusive property of Ionirix LLC. Unauthorized reproduction, distribution, modification, or derivative use is strictly prohibited.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Legal</p>
                <ul className="mt-4 space-y-2 text-quantum-white/64">
                  {legalItems.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="transition hover:text-quantum-white">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Company</p>
                <ul className="mt-4 space-y-2 text-quantum-white/64">
                  {companyItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Contact</p>
                <ul className="mt-4 space-y-2 text-quantum-white/64">
                  {contactItems.map((item) => (
                    <li key={item.label}>
                      <span className="text-quantum-white/50">{item.label}:</span>{' '}
                      <a href={item.href} className="transition hover:text-quantum-white">
                        {item.value}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}