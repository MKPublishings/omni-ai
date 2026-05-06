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
import {
  clearStoredDashboardRecentSearches,
  readStoredDashboardRecentSearches,
  recordDashboardRecentSearch,
  searchDashboardEntries,
  writeStoredDashboardRecentSearches,
} from '@/lib/dashboard-search'
import { useSiteAuthState } from '@/lib/site-auth'
import { GlassCard } from './GlassCard'
import { readStoredDashboardTheme, writeStoredDashboardTheme } from '@/lib/dashboard-theme'
import { sortRoutesByWorkspaceIntent, summarizeWorkspaceIntent } from '@/lib/workspace-shell'
import { PremiumBadge } from '@/ui/billing/PremiumBadge'
import { usePremiumStatus } from '@/ui/billing/usePremiumStatus'
import { loadWorkspaceFormation, type WorkspaceFormation } from '@/onboarding'
import {
  AnalyticsWaveIcon,
  AssistantSparkIcon,
  BillingCardIcon,
  EventsPulseIcon,
  MemoryArchiveIcon,
  OverviewGridIcon,
  PricingPulseIcon,
  ProfileHaloIcon,
  SettingsTuneIcon,
  SimulationOrbitIcon,
  ToolsStackIcon,
} from './icons'
import {
  buildDashboardShellLayoutClasses,
  DASHBOARD_SHELL_SETTINGS_UPDATED_EVENT,
  resolveDashboardShellArrangement,
  WORKSPACE_FORMATION_STORAGE_PREFIX,
} from './dashboard-shell-layout'

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
    icon: <PricingPulseIcon className="w-5 h-5" />,
  },
  {
    href: '/billing/manage',
    label: 'Billing',
    icon: <BillingCardIcon className="w-5 h-5" />,
  },
  {
    href: '/workspace',
    label: 'Overview',
    icon: <OverviewGridIcon className="w-5 h-5" />,
  },
  {
    href: '/assistant',
    label: 'Ionirix',
    icon: <AssistantSparkIcon className="w-5 h-5" />,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: <AnalyticsWaveIcon className="w-5 h-5" />,
  },
  {
    href: '/events',
    label: 'Events',
    icon: <EventsPulseIcon className="w-5 h-5" />,
  },
  {
    href: '/simulations',
    label: 'Simulations',
    icon: <SimulationOrbitIcon className="w-5 h-5" />,
  },
  {
    href: '/tools',
    label: 'Tools',
    icon: <ToolsStackIcon className="w-5 h-5" />,
  },
  {
    href: '/memory',
    label: 'Memory',
    icon: <MemoryArchiveIcon className="w-5 h-5" />,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <ProfileHaloIcon className="w-5 h-5" />,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <SettingsTuneIcon className="w-5 h-5" />,
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
  const { authResolved, hasWorkspaceSession, isSiteAuthenticated, sessionUser, signOut } = useSiteAuthState()
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [workspace, setWorkspace] = useState<DashboardOnboardingWorkspace | null>(null)
  const [localFormation, setLocalFormation] = useState<WorkspaceFormation | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const searchStorageScope = user ?? sessionUser ?? undefined

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
    setLocalFormation(loadWorkspaceFormation())

    if (!authResolved) {
      return
    }

    if (!hasWorkspaceSession) {
      if (!isSiteAuthenticated || !sessionUser) {
        router.push('/login')
        return
      }

      setUser(sessionUser)
      setWorkspace(null)
      return
    }

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
        if (sessionUser) {
          setUser(sessionUser)
          setWorkspace(null)
          return
        }

        clearAuthSession()
        router.push('/login')
      }
    }

    bootstrap()
  }, [authResolved, hasWorkspaceSession, isSiteAuthenticated, router, sessionUser])

  useEffect(() => {
    if (isMobileViewport) {
      setMobileNavOpen(false)
    }
    setSearchOpen(false)
    setSearchValue('')
  }, [pathname, isMobileViewport])

  useEffect(() => {
    setRecentSearches(readStoredDashboardRecentSearches(searchStorageScope))
  }, [searchStorageScope])

  useEffect(() => {
    const syncFormation = () => {
      setLocalFormation(loadWorkspaceFormation())
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(WORKSPACE_FORMATION_STORAGE_PREFIX)) {
        syncFormation()
      }
    }

    syncFormation()
    window.addEventListener(DASHBOARD_SHELL_SETTINGS_UPDATED_EVENT, syncFormation)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(DASHBOARD_SHELL_SETTINGS_UPDATED_EVENT, syncFormation)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const searchResults = useMemo(() => searchDashboardEntries(searchValue), [searchValue])

  const filteredNavigation = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return sortRoutesByWorkspaceIntent(navigationItems, workspace)
    }

    const matchedRoutes = new Set(searchResults.map((item) => item.href))

    return sortRoutesByWorkspaceIntent(
      navigationItems.filter((item) => matchedRoutes.has(item.href)),
      workspace
    )
  }, [searchResults, searchValue, workspace])

  const workspaceIntent = useMemo(() => summarizeWorkspaceIntent(workspace), [workspace])
  const shellArrangement = useMemo(() => resolveDashboardShellArrangement(workspace, localFormation), [workspace, localFormation])
  const shellLayout = useMemo(() => buildDashboardShellLayoutClasses(shellArrangement), [shellArrangement])

  const handleLogout = () => {
    void signOut().finally(() => {
      router.push('/login')
    })
  }

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const commitRecentSearch = (query: string) => {
    const nextRecentSearches = recordDashboardRecentSearch(query, recentSearches)
    setRecentSearches(nextRecentSearches)
    writeStoredDashboardRecentSearches(nextRecentSearches, searchStorageScope)
  }

  const handleSearchSelect = (href: string, query: string) => {
    if (query.trim()) {
      commitRecentSearch(query)
    }

    setSearchOpen(false)
    setSearchValue('')
    router.push(href)
  }

  const handleSearchSubmit = () => {
    const query = searchValue.trim()
    if (!query) {
      setSearchOpen(recentSearches.length > 0)
      return
    }

    commitRecentSearch(query)

    if (searchResults[0]) {
      handleSearchSelect(searchResults[0].href, query)
      return
    }

    setSearchOpen(true)
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setSearchOpen(recentSearches.length > 0)
  }

  const handleClearRecentSearches = () => {
    setRecentSearches([])
    clearStoredDashboardRecentSearches(searchStorageScope)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    setSearchOpen(true)
  }

  const handleRecentSearchSelect = (value: string) => {
    setSearchValue(value)
    setSearchOpen(true)
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
    if (shellLayout.navHidden) {
      return
    }

    if (isMobileViewport) {
      setMobileNavOpen((value) => !value)
      return
    }

    setNavCollapsed((value) => !value)
  }

  return (
    <div className="dashboard-theme-shell relative flex min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />

      <div className={shellLayout.shellRowClassName}>
        {isMobileViewport && mobileNavOpen && !shellLayout.navHidden && (
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="dashboard-mobile-overlay fixed inset-0 z-30 bg-pine-black-900/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {!shellLayout.navHidden && (
          <NavigationRail
            side={shellLayout.navSide}
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
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <CommandBar
            searchValue={searchValue}
            onSearchChange={handleSearchChange}
            searchResults={searchResults}
            recentSearches={recentSearches}
            searchOpen={searchOpen}
            onSearchOpenChange={setSearchOpen}
            onSearchSubmit={handleSearchSubmit}
            onSearchSelect={(result) => handleSearchSelect(result.href, searchValue.trim() || result.title)}
            onRecentSearchSelect={handleRecentSearchSelect}
            onClearSearch={handleClearSearch}
            onClearRecentSearches={handleClearRecentSearches}
            breadcrumbs={buildBreadcrumbs(pathname)}
            profileHref="/profile"
            userInitial={(user?.displayName || user?.username || 'I').charAt(0).toUpperCase()}
            isDarkMode={theme === 'dark'}
            onToggleTheme={handleToggleTheme}
            onToggleNavigation={handleToggleNavigation}
            navigationExpanded={shellLayout.navHidden ? false : navigationExpanded}
            navigationToggleVisible={!shellLayout.navHidden}
            onLogout={handleLogout}
            statusSlot={commandStatus}
          />

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-4 sm:py-5">
            <div
              className={clsx(
                shellLayout.frameClassName,
                fullBleedOnMobile && 'workspace-shell-frame-mobile-bleed site-content-frame-mobile-bleed'
              )}
            >
              {hasPageIntro ? (
                <div className={clsx(shellLayout.introClassName, hidePageIntroOnMobile ? 'hidden md:flex md:flex-col md:gap-4 xl:flex-row xl:items-start xl:justify-between' : 'flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between')}>
                  <div className={shellLayout.introCopyClassName}>
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