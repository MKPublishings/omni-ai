import Link from 'next/link'
import { ReactNode, forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'
import {
  AssistantSparkIcon,
  ChevronRightIcon,
  EventsPulseIcon,
  LogoutGateIcon,
  MoonArcIcon,
  SearchOrbitIcon,
  SunGridIcon,
  ToolsStackIcon,
} from './icons'

interface CommandBarProps extends HTMLAttributes<HTMLDivElement> {
  searchValue?: string
  onSearchChange?: (value: string) => void
  breadcrumbs?: string[]
  profileHref?: string
  userInitial?: string
  isDarkMode?: boolean
  onToggleTheme?: () => void
  onToggleNavigation?: () => void
  navigationExpanded?: boolean
  navigationToggleVisible?: boolean
  onLogout?: () => void
  statusSlot?: ReactNode
}

export const CommandBar = forwardRef<HTMLDivElement, CommandBarProps>(
  ({
    searchValue,
    onSearchChange,
    breadcrumbs = [],
    profileHref = '/profile',
    userInitial = 'I',
    isDarkMode = true,
    onToggleTheme,
    onToggleNavigation,
    navigationExpanded,
    navigationToggleVisible = true,
    onLogout,
    statusSlot,
    className,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'workspace-commandbar dashboard-topbar border-b px-3 py-3 sm:px-4 md:px-6',
          'flex flex-col gap-3 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:py-0',
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 lg:min-w-[14rem] lg:flex-1 lg:justify-start">
          <div className="flex min-w-0 items-center space-x-2 sm:space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ion-blue-500">
              <span className="text-quantum-white font-bold text-sm">IX</span>
            </div>
            {breadcrumbs.length > 0 && (
              <nav className="flex min-w-0 items-center space-x-2 overflow-x-auto whitespace-nowrap pb-1">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <span className="mx-2 text-[color:var(--dashboard-topbar-muted)]">/</span>
                    )}
                    <span className={clsx(
                      'dashboard-breadcrumb text-xs font-medium sm:text-sm',
                      index === breadcrumbs.length - 1
                        ? 'dashboard-breadcrumb-active'
                        : 'dashboard-breadcrumb-muted'
                    )}>
                      {crumb}
                    </span>
                  </div>
                ))}
              </nav>
            )}
          </div>

          {navigationToggleVisible && (
            <button
              type="button"
              aria-label={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
              title={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
              onClick={onToggleNavigation}
            >
              <ChevronRightIcon className={clsx('h-4 w-4 transition-transform duration-standard', navigationExpanded && 'rotate-180')} />
            </button>
          )}
        </div>

        <div className="workspace-commandbar-search w-full lg:mx-8 lg:flex-1">
          <div className="relative">
            <input
              type="search"
              placeholder="Search across Ionirix..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="dashboard-search-input h-11 w-full rounded-2xl border px-12 text-center text-sm transition-all duration-quick ease-sovereign focus:outline-none focus:ring-2 focus:ring-ion-blue-500"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchOrbitIcon className="h-4 w-4 text-[color:var(--dashboard-topbar-muted)]" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 lg:flex-1 lg:justify-end">
          {navigationToggleVisible && (
            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                aria-label={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
                title={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
                className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
                onClick={onToggleNavigation}
              >
                <ChevronRightIcon className={clsx('h-4 w-4 transition-transform duration-standard', navigationExpanded && 'rotate-180')} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {statusSlot ? <div className="hidden xl:flex xl:items-center xl:gap-2">{statusSlot}</div> : null}

            <Link
              href="/assistant"
              aria-label="Open assistant"
              title="Open assistant"
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              <AssistantSparkIcon className="h-4 w-4" />
            </Link>

            <Link
              href="/events"
              aria-label="Open events"
              title="Open events"
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              <EventsPulseIcon className="h-4 w-4" />
            </Link>

            <Link
              href="/tools"
              aria-label="Open tools"
              title="Open tools"
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              <ToolsStackIcon className="h-4 w-4" />
            </Link>

            <button
              type="button"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
              onClick={onToggleTheme}
            >
              {isDarkMode ? (
                <SunGridIcon className="h-4 w-4" />
              ) : (
                <MoonArcIcon className="h-4 w-4" />
              )}
            </button>

            <Link
              href={profileHref}
              aria-label="Open profile"
              title="Open profile"
              className="dashboard-profile-button inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">{userInitial}</span>
            </Link>

            <button
              type="button"
              aria-label="Log out"
              title="Log out"
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
              onClick={onLogout}
            >
              <LogoutGateIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }
)

CommandBar.displayName = 'CommandBar'