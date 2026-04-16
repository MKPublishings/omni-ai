import Link from 'next/link'
import { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'

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
  onLogout?: () => void
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
    onLogout,
    className,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'dashboard-topbar border-b px-3 py-3 sm:px-4 md:px-6',
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

          <button
            type="button"
            aria-label={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
            title={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
            className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            onClick={onToggleNavigation}
          >
            <svg
              className={clsx('h-4 w-4 transition-transform duration-standard', navigationExpanded && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="w-full lg:mx-8 lg:max-w-xl lg:flex-1">
          <div className="relative">
            <input
              type="search"
              placeholder="Search across Ionirix..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="dashboard-search-input h-11 w-full rounded-2xl border pl-10 pr-4 text-sm transition-all duration-quick ease-sovereign focus:outline-none focus:ring-2 focus:ring-ion-blue-500"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-[color:var(--dashboard-topbar-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 lg:flex-1 lg:justify-end">
          <div className="hidden items-center gap-2 lg:flex">
            <button
              type="button"
              aria-label={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
              title={navigationExpanded ? 'Collapse navigation' : 'Expand navigation'}
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
              onClick={onToggleNavigation}
            >
              <svg
                className={clsx('h-4 w-4 transition-transform duration-standard', navigationExpanded && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/assistant"
              aria-label="Open assistant"
              title="Open assistant"
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l.707.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </Link>

            <Link
              href="/events"
              aria-label="Open events"
              title="Open events"
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.683L4 21l4.868-2.317z" />
              </svg>
            </Link>

            <Link
              href="/tools"
              aria-label="Open tools"
              title="Open tools"
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1 1 0 011.35-.936l7 3.5a1 1 0 010 1.788l-7 3.5A1 1 0 0110 11.276V4.724a1 1 0 01.325-.407zM5 6h2v12H5z" />
              </svg>
            </Link>

            <button
              type="button"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="dashboard-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full"
              onClick={onToggleTheme}
            >
              {isDarkMode ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646a9 9 0 1011.708 11.708z" />
                </svg>
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
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }
)

CommandBar.displayName = 'CommandBar'