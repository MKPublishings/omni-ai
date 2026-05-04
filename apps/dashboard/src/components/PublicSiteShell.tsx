import Link from 'next/link'
import { ReactNode } from 'react'
import { AmbientBackground } from './AmbientBackground'
import { PublicAuthControls } from './PublicAuthControls'

interface PublicSiteShellProps {
  title: string
  subtitle: string
  children: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  heroMeta?: ReactNode
}

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/platform', label: 'Platform' },
  { href: '/capabilities', label: 'Capabilities' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/roadmap', label: 'Roadmap' },
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
  { label: 'Legal Notices', href: 'mailto:mail@ionirix.com', value: 'mail@ionirix.com' },
]

export function PublicSiteShell({ title, subtitle, children, actions, footer, heroMeta }: PublicSiteShellProps) {
  return (
    <div className="public-theme-shell relative min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />

      <div className="site-shell-frame relative z-10 mx-auto flex min-h-screen w-full flex-col py-4 sm:py-6">
        <header className="theme-public-header ix-glass-ambient flex flex-col gap-4 rounded-2xl border border-quantum-white/8 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-spectral-cyan-500 text-sm font-bold text-pine-black-900">
              IX
            </div>
            <div>
              <p className="theme-public-kicker text-sm font-semibold uppercase tracking-[0.24em] text-quantum-white/48">Ionirix</p>
              <p className="theme-public-brand text-base font-medium text-quantum-white">ION AI public surface</p>
            </div>
          </div>

          <nav className="theme-public-nav flex flex-wrap items-center gap-2 text-sm text-quantum-white/72 sm:gap-3">
            {publicLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full px-3 py-2 text-[13px] transition hover:bg-quantum-white/8 hover:text-quantum-white sm:text-sm">
                {link.label}
              </Link>
            ))}
            <PublicAuthControls />
          </nav>
        </header>

        <main className="flex-1 py-6 sm:py-8 md:py-10">
          <header className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div>
              <p className="theme-public-eyebrow text-sm font-semibold uppercase tracking-[0.28em] text-spectral-cyan-400">Public entry</p>
              <h1 className="theme-public-title mt-4 max-w-5xl text-[2.45rem] font-extrabold leading-[0.98] tracking-[-0.03em] text-quantum-white sm:text-[3.2rem] md:text-[4.25rem] lg:text-[5.25rem]">{title}</h1>
              <p className="theme-public-subtitle mt-4 max-w-3xl text-sm leading-6 text-quantum-white/72 sm:mt-5 sm:text-base sm:leading-7 md:text-lg">{subtitle}</p>
            </div>

            <div className="flex min-w-0 flex-col gap-4 md:items-end">
              {heroMeta}
              <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center md:justify-end">
                {actions}
              </div>
            </div>
          </header>

          <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6">{children}</div>
        </main>

        {footer ?? (
          <footer className="theme-public-footer border-t border-quantum-white/8 py-6 text-[10px] leading-5 text-quantum-white/56 sm:py-8 sm:text-sm sm:leading-6">
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
              <div className="space-y-3 sm:space-y-4">
                <p className="text-[10px] font-semibold text-quantum-white sm:text-sm">© 2026 Ionirix LLC. All rights reserved.</p>
                <p className="max-w-xl leading-5 text-quantum-white/60 sm:leading-7">
                  Ion is built by Mirnes as a sovereign intelligence product under Ionirix LLC. Legal, privacy, and security controls stay visible here without taking over the page above the fold.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Legal</p>
                <ul className="mt-3 space-y-1.5 text-quantum-white/64 sm:mt-4 sm:space-y-2">
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
                <ul className="mt-3 space-y-1.5 text-quantum-white/64 sm:mt-4 sm:space-y-2">
                  {companyItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-quantum-white/42">Contact</p>
                <ul className="mt-3 space-y-1.5 text-quantum-white/64 sm:mt-4 sm:space-y-2">
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