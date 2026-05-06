import Link from 'next/link'
import { ReactNode, forwardRef, HTMLAttributes, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import {
  AssistantSparkIcon,
  ChevronRightIcon,
  CloseCrossIcon,
  EventsPulseIcon,
  LogoutGateIcon,
  MoonArcIcon,
  SearchOrbitIcon,
  SunGridIcon,
  ToolsStackIcon,
} from './icons'
import type { DashboardSearchEntry } from '@/lib/dashboard-search'

type SearchSuggestion =
  | { kind: 'result'; key: string; result: DashboardSearchEntry }
  | { kind: 'recent'; key: string; query: string }

interface CommandBarProps extends HTMLAttributes<HTMLDivElement> {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchResults?: DashboardSearchEntry[]
  recentSearches?: string[]
  searchOpen?: boolean
  onSearchOpenChange?: (value: boolean) => void
  onSearchSubmit?: () => void
  onSearchSelect?: (result: DashboardSearchEntry) => void
  onRecentSearchSelect?: (value: string) => void
  onClearSearch?: () => void
  onClearRecentSearches?: () => void
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
    searchResults = [],
    recentSearches = [],
    searchOpen = false,
    onSearchOpenChange,
    onSearchSubmit,
    onSearchSelect,
    onRecentSearchSelect,
    onClearSearch,
    onClearRecentSearches,
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
    const searchContainerRef = useRef<HTMLDivElement | null>(null)
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
    const normalizedSearchValue = String(searchValue || '').trim()
    const suggestions = useMemo<SearchSuggestion[]>(() => {
      if (normalizedSearchValue) {
        return searchResults.map((result) => ({ kind: 'result', key: result.href, result }))
      }

      return recentSearches.map((query) => ({ kind: 'recent', key: query, query }))
    }, [normalizedSearchValue, recentSearches, searchResults])

    useEffect(() => {
      setActiveSuggestionIndex(suggestions.length > 0 ? 0 : -1)
    }, [suggestions])

    useEffect(() => {
      if (!searchOpen) {
        return
      }

      const handlePointerDown = (event: MouseEvent) => {
        if (!searchContainerRef.current?.contains(event.target as Node)) {
          onSearchOpenChange?.(false)
        }
      }

      document.addEventListener('mousedown', handlePointerDown)
      return () => document.removeEventListener('mousedown', handlePointerDown)
    }, [onSearchOpenChange, searchOpen])

    const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
      if (suggestion.kind === 'result') {
        onSearchSelect?.(suggestion.result)
        return
      }

      onRecentSearchSelect?.(suggestion.query)
    }

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!searchOpen) {
          onSearchOpenChange?.(true)
        }
        setActiveSuggestionIndex((current) => {
          if (suggestions.length === 0) {
            return -1
          }

          return current < suggestions.length - 1 ? current + 1 : 0
        })
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveSuggestionIndex((current) => {
          if (suggestions.length === 0) {
            return -1
          }

          return current > 0 ? current - 1 : suggestions.length - 1
        })
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const activeSuggestion = activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : undefined
        if (activeSuggestion) {
          handleSuggestionSelect(activeSuggestion)
          return
        }

        onSearchSubmit?.()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onSearchOpenChange?.(false)
      }
    }

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
          <div ref={searchContainerRef} className="relative">
            <input
              type="search"
              placeholder="Search across Ionirix..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => onSearchOpenChange?.(true)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search across the dashboard"
              aria-expanded={searchOpen}
              aria-controls="dashboard-search-results"
              className="dashboard-search-input h-11 w-full rounded-2xl border pl-12 pr-12 text-left text-sm transition-all duration-quick ease-sovereign focus:outline-none focus:ring-2 focus:ring-ion-blue-500"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchOrbitIcon className="h-4 w-4 text-[color:var(--dashboard-topbar-muted)]" />
            </div>

            {normalizedSearchValue ? (
              <button
                type="button"
                aria-label="Clear current search"
                title="Clear current search"
                className="dashboard-search-clear absolute inset-y-1 right-1 inline-flex w-9 items-center justify-center rounded-xl"
                onClick={onClearSearch}
              >
                <CloseCrossIcon className="h-4 w-4" />
              </button>
            ) : null}

            {searchOpen && (suggestions.length > 0 || normalizedSearchValue) ? (
              <div
                id="dashboard-search-results"
                className="dashboard-search-panel absolute inset-x-0 top-[calc(100%+0.6rem)] z-40 overflow-hidden rounded-[1.35rem] border"
                role="listbox"
              >
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--dashboard-topbar-muted)]">
                      {normalizedSearchValue ? 'Search results' : 'Recent searches'}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--dashboard-topbar-muted)]">
                      {normalizedSearchValue
                        ? searchResults.length > 0
                          ? `${searchResults.length} routes matched`
                          : 'No workspace routes matched this query yet.'
                        : recentSearches.length > 0
                          ? 'Pick a recent query or clear the saved list.'
                          : 'Start typing to search across the workspace.'}
                    </p>
                  </div>

                  {!normalizedSearchValue && recentSearches.length > 0 ? (
                    <button
                      type="button"
                      className="dashboard-search-history-button inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                      onClick={onClearRecentSearches}
                    >
                      Clear history
                    </button>
                  ) : null}
                </div>

                {suggestions.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto px-2 py-2">
                    {suggestions.map((suggestion, index) => {
                      const active = index === activeSuggestionIndex

                      if (suggestion.kind === 'result') {
                        return (
                          <button
                            key={suggestion.key}
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={clsx('dashboard-search-option flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left', active && 'dashboard-search-option-active')}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSuggestionSelect(suggestion)}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[color:var(--dashboard-topbar-fg)]">{suggestion.result.title}</p>
                              <p className="mt-1 text-xs leading-5 text-[color:var(--dashboard-topbar-muted)]">{suggestion.result.description}</p>
                            </div>
                            <span className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-topbar-muted)]">
                              {suggestion.result.section}
                            </span>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={suggestion.key}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={clsx('dashboard-search-option flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left', active && 'dashboard-search-option-active')}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSuggestionSelect(suggestion)}
                        >
                          <span className="text-sm font-medium text-[color:var(--dashboard-topbar-fg)]">{suggestion.query}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--dashboard-topbar-muted)]">Recent</span>
                        </button>
                      )
                    })}
                  </div>
                ) : normalizedSearchValue ? (
                  <div className="px-4 py-4 text-sm text-[color:var(--dashboard-topbar-muted)]">
                    No results yet. Try route names like Assistant, Analytics, Events, or Settings.
                  </div>
                ) : null}
              </div>
            ) : null}
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