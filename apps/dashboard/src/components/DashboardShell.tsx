'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { AmbientBackground } from './AmbientBackground'
import { NavigationRail, NavItem } from './NavigationRail'
import { CommandBar } from './CommandBar'
import { AuthUser, clearAuthSession, getStoredToken } from '@/lib/auth'
import { fetchDashboardUser, fetchOnboardingWorkspace, type DashboardOnboardingWorkspace } from '@/lib/dashboard'
import { GlassCard } from './GlassCard'
import { readStoredDashboardTheme, writeStoredDashboardTheme } from '@/lib/dashboard-theme'
import { sortRoutesByWorkspaceIntent, summarizeWorkspaceIntent } from '@/lib/workspace-shell'
import { PremiumBadge } from '@/ui/billing/PremiumBadge'
import { usePremiumStatus } from '@/ui/billing/usePremiumStatus'

interface DashboardShellProps {
  title: string
  subtitle: string
  children: ReactNode
  actions?: ReactNode
  hidePageIntroOnMobile?: boolean
  fullBleedOnMobile?: boolean
  hideWorkspaceIntentBanner?: boolean
}

interface NavigationEntry {
  href: string
  label: string
  icon: ReactNode
}

const navigationItems: NavigationEntry[] = [
  {
    href: '/pricing',
    label: 'Pricing',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.5 0-4.5 1.567-4.5 3.5S9.5 15 12 15s4.5 1.567 4.5 3.5S14.5 22 12 22m0-14V2m0 20v-2" /></svg>,
  },
  {
    href: '/billing/manage',
    label: 'Billing',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" /></svg>,
  },
  {
    href: '/workspace',
    label: 'Overview',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /></svg>,
  },
  {
    href: '/assistant',
    label: 'Ionirix',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l.707.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    href: '/events',
    label: 'Events',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>,
  },
  {
    href: '/simulations',
    label: 'Simulations',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>,
  },
  {
    href: '/tools',
    label: 'Tools',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1 1 0 011.35-.936l7 3.5a1 1 0 010 1.788l-7 3.5A1 1 0 0110 11.276V4.724a1 1 0 01.325-.407zM5 6h2v12H5z" /></svg>,
  },
  {
    href: '/memory',
    label: 'Memory',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" /></svg>,
  },
]

function buildBreadcrumbs(pathname: string): string[] {
  if (pathname === '/workspace') {
    return ['Dashboard', 'Overview']
  }

  const segments = pathname.split('/').filter(Boolean)
  return ['Dashboard', ...segments.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))]
}

function isNavigationItemActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true
  }

  if (href === '/workspace') {
    return pathname === '/workspace'
  }

  return pathname.startsWith(`${href}/`)
}

export function DashboardShell({ title, subtitle, children, actions, hidePageIntroOnMobile = false, fullBleedOnMobile = false, hideWorkspaceIntentBanner = false }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const premium = usePremiumStatus()
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [workspace, setWorkspace] = useState<DashboardOnboardingWorkspace | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const syncViewport = () => {
      setIsMobileViewport(media.matches)
      if (!media.matches) {
        setMobileNavOpen(false)
      }
    }

    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    const savedTheme = readStoredDashboardTheme()
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    document.documentElement.dataset.dashboardTheme = theme
    writeStoredDashboardTheme(theme)
  }, [theme])

  useEffect(() => {
    const bootstrap = async () => {
      const token = getStoredToken()

      if (!token) {
        router.push('/login')
        return
      }

      try {
        const [payload, nextWorkspace] = await Promise.all([
          fetchDashboardUser(),
          fetchOnboardingWorkspace().catch(() => null),
        ])
        setUser(payload.user)
        setWorkspace(nextWorkspace)
      } catch {
        clearAuthSession()
        router.push('/login')
      }
    }

    bootstrap()
  }, [router])

  useEffect(() => {
    if (isMobileViewport) {
      setMobileNavOpen(false)
    }
  }, [pathname, isMobileViewport])

  const filteredNavigation = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return sortRoutesByWorkspaceIntent(navigationItems, workspace)
    }

    return sortRoutesByWorkspaceIntent(
      navigationItems.filter((item) => item.label.toLowerCase().includes(query)),
      workspace
    )
  }, [searchValue, workspace])

  const workspaceIntent = useMemo(() => summarizeWorkspaceIntent(workspace), [workspace])

  const handleLogout = () => {
    clearAuthSession()
    router.push('/login')
  }

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const navigationExpanded = isMobileViewport ? mobileNavOpen : !navCollapsed
  const hasPageIntro = Boolean(title || subtitle || actions)

  const premiumStatus = premium.loading
    ? <span className="hidden rounded-full border border-quantum-white/12 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-quantum-white/52 xl:inline-flex">Checking plan</span>
    : premium.isPremium
      ? <PremiumBadge compact label={premium.accessTier === 'enterprise' ? 'Enterprise active' : 'Premium active'} />
      : <Link href="/pricing" className="hidden rounded-full border border-spectral-cyan-500/22 bg-spectral-cyan-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-spectral-cyan-100 transition hover:bg-spectral-cyan-500/16 xl:inline-flex">Upgrade</Link>

  const commandStatus = (
    <>
      {workspaceIntent ? (
        <span className="hidden rounded-full border border-quantum-white/12 bg-quantum-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-quantum-white/68 xl:inline-flex">
          {workspaceIntent.focusLabel}
        </span>
      ) : null}
      {premiumStatus}
    </>
  )

  const handleToggleNavigation = () => {
    if (isMobileViewport) {
      setMobileNavOpen((value) => !value)
      return
    }

    setNavCollapsed((value) => !value)
  }

  return (
    <div className="dashboard-theme-shell relative flex min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />

      <div className="relative z-10 flex min-h-screen w-full">
        {isMobileViewport && mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="dashboard-mobile-overlay fixed inset-0 z-30 bg-pine-black-900/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <NavigationRail
          collapsed={navCollapsed}
          mobileOpen={isMobileViewport ? mobileNavOpen : true}
          mobileViewport={isMobileViewport}
          onRequestClose={() => setMobileNavOpen(false)}
          userName={user?.displayName || 'Loading'}
          userRole={user?.role || 'Member'}
          userInitial={(user?.displayName || user?.username || 'I').charAt(0).toUpperCase()}
        >
          {filteredNavigation.map((item) => (
            <NavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              active={isNavigationItemActive(pathname, item.href)}
              collapsed={isMobileViewport ? false : navCollapsed}
              onClick={() => router.push(item.href)}
            />
          ))}
        </NavigationRail>

        <div className="flex min-w-0 flex-1 flex-col">
          <CommandBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            breadcrumbs={buildBreadcrumbs(pathname)}
            profileHref="/profile"
            userInitial={(user?.displayName || user?.username || 'I').charAt(0).toUpperCase()}
            isDarkMode={theme === 'dark'}
            onToggleTheme={handleToggleTheme}
            onToggleNavigation={handleToggleNavigation}
            navigationExpanded={navigationExpanded}
            onLogout={handleLogout}
            statusSlot={commandStatus}
          />

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-4 sm:py-5">
            <div
              className={clsx(
                'workspace-shell-frame site-content-frame mx-auto flex w-full min-w-0 flex-col gap-5 sm:gap-6',
                fullBleedOnMobile && 'workspace-shell-frame-mobile-bleed site-content-frame-mobile-bleed'
              )}
            >
              {hasPageIntro ? (
                <div className={clsx('workspace-page-intro', hidePageIntroOnMobile ? 'hidden md:flex md:flex-col md:gap-4 xl:flex-row xl:items-start xl:justify-between' : 'flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between')}>
                  <div className="workspace-page-intro-copy min-w-0">
                    {title ? <h1 className="theme-page-title text-2xl font-bold text-quantum-white sm:text-3xl">{title}</h1> : null}
                    {subtitle ? <p className="theme-page-subtitle mt-2 max-w-3xl text-sm leading-6 text-quantum-white/64 md:text-base">{subtitle}</p> : null}
                  </div>

                  {actions && <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">{actions}</div>}
                </div>
              ) : null}

              {workspaceIntent && pathname !== '/settings' && !hideWorkspaceIntentBanner ? (
                <GlassCard tier={2} className="rounded-[1.6rem] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Workspace intent</p>
                      <h2 className="mt-2 text-lg font-semibold text-quantum-white">{workspaceIntent.focusLabel} for {workspaceIntent.workspaceName}</h2>
                      <p className="mt-2 max-w-4xl text-sm leading-6 text-quantum-white/68">{workspaceIntent.focusDescription}</p>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap xl:justify-end">
                      <span className="inline-flex items-center rounded-full border border-quantum-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-quantum-white/58">
                        {workspaceIntent.collaborationLabel}
                      </span>
                      <Link href={workspaceIntent.primaryRoute} className="inline-flex items-center rounded-full border border-spectral-cyan-500/22 bg-spectral-cyan-500/10 px-4 py-2 text-sm font-medium text-spectral-cyan-100 transition hover:bg-spectral-cyan-500/16">
                        Open focus route
                      </Link>
                      <Link href="/settings" className="inline-flex items-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8">
                        Adjust shell
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              ) : null}

              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}