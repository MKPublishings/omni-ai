import { buildUserScopedStorageKey, getStoredUser } from '@/lib/auth'
import type { OnboardingState, PersistedOnboardingState, WorkspaceFormation } from './types'

const DRAFT_KEY = 'ionirix:onboarding:draft'
const FORMATION_KEY = 'ionirix:onboarding:formation'

function resolveOnboardingScopeHints(state?: OnboardingState, scopeHint?: string) {
  const hints = [
    scopeHint,
    getStoredUser()?.id,
    getStoredUser()?.email,
    getStoredUser()?.username,
    state?.account.email,
    state?.account.username,
  ]

  return Array.from(new Set(hints.map((value) => String(value || '').trim()).filter(Boolean)))
}

function resolveScopeHintList(scopeHint?: string | string[]): string[] {
  const baseHints = Array.isArray(scopeHint) ? scopeHint : scopeHint ? [scopeHint] : []
  const storedUser = getStoredUser()

  return Array.from(new Set([
    ...baseHints,
    String(storedUser?.id || '').trim(),
    String(storedUser?.email || '').trim(),
    String(storedUser?.username || '').trim(),
  ].filter(Boolean)))
}

function readScopedLocalStorage<T>(baseKey: string, scopeHint?: string | string[]): T | null {
  if (typeof window === 'undefined') {
    return null
  }

  const scopeHints = resolveScopeHintList(scopeHint)
  if (scopeHints.length === 0) {
    return safeParse<T>(window.localStorage.getItem(buildUserScopedStorageKey(baseKey)))
  }

  for (const hint of scopeHints) {
    const parsed = safeParse<T>(window.localStorage.getItem(buildUserScopedStorageKey(baseKey, hint)))
    if (parsed) {
      return parsed
    }
  }

  return safeParse<T>(window.localStorage.getItem(buildUserScopedStorageKey(baseKey)))
}

function writeScopedLocalStorage(baseKey: string, value: string, scopeHint?: string | string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const scopeHints = resolveScopeHintList(scopeHint)
  if (scopeHints.length === 0) {
    window.localStorage.setItem(buildUserScopedStorageKey(baseKey), value)
    return
  }

  scopeHints.forEach((hint) => {
    window.localStorage.setItem(buildUserScopedStorageKey(baseKey, hint), value)
  })
}

function removeScopedLocalStorage(baseKey: string, scopeHint?: string | string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const scopeHints = resolveScopeHintList(scopeHint)
  if (scopeHints.length === 0) {
    window.localStorage.removeItem(buildUserScopedStorageKey(baseKey))
    return
  }

  scopeHints.forEach((hint) => {
    window.localStorage.removeItem(buildUserScopedStorageKey(baseKey, hint))
  })

  window.localStorage.removeItem(buildUserScopedStorageKey(baseKey))
}

function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function toPersistedState(state: OnboardingState): PersistedOnboardingState {
  return {
    currentStep: state.currentStep,
    status: state.status,
    account: {
      displayName: state.account.displayName,
      username: state.account.username,
      email: state.account.email,
    },
    workspace: state.workspace,
    preferences: state.preferences,
    completedAt: state.completedAt,
  }
}

export function loadPersistedOnboardingState(scopeHint?: string): PersistedOnboardingState | null {
  return readScopedLocalStorage<PersistedOnboardingState>(DRAFT_KEY, scopeHint)
}

export function savePersistedOnboardingState(state: OnboardingState, scopeHint?: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const payload = JSON.stringify(toPersistedState(state))
  const scopeHints = resolveOnboardingScopeHints(state, scopeHint)

  writeScopedLocalStorage(DRAFT_KEY, payload, scopeHints)
}

export function clearPersistedOnboardingState(scopeHint?: string | string[]): void {
  removeScopedLocalStorage(DRAFT_KEY, scopeHint)
}

export function saveWorkspaceFormation(formation: WorkspaceFormation, scopeHint?: string): void {
  writeScopedLocalStorage(FORMATION_KEY, JSON.stringify(formation), scopeHint)
}

export function loadWorkspaceFormation(scopeHint?: string): WorkspaceFormation | null {
  return readScopedLocalStorage<WorkspaceFormation>(FORMATION_KEY, scopeHint)
}

export function clearWorkspaceFormation(scopeHint?: string | string[]): void {
  removeScopedLocalStorage(FORMATION_KEY, scopeHint)
}
