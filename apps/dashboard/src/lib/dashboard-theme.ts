import { buildUserScopedStorageKey } from './auth'

export type DashboardTheme = 'dark' | 'light'

const THEME_KEY = 'ion-dashboard-theme'

export function readStoredDashboardTheme(scopeHint?: string): DashboardTheme | null {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(buildUserScopedStorageKey(THEME_KEY, scopeHint))
  return value === 'dark' || value === 'light' ? value : null
}

export function writeStoredDashboardTheme(theme: DashboardTheme, scopeHint?: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(buildUserScopedStorageKey(THEME_KEY, scopeHint), theme)
}

export function clearStoredDashboardTheme(scopeHint?: string | string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const scopeHints = Array.isArray(scopeHint) ? scopeHint : scopeHint ? [scopeHint] : []
  if (scopeHints.length === 0) {
    window.localStorage.removeItem(buildUserScopedStorageKey(THEME_KEY))
    return
  }

  scopeHints.forEach((hint) => {
    window.localStorage.removeItem(buildUserScopedStorageKey(THEME_KEY, hint))
  })
}