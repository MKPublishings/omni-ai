import { buildUserScopedStorageKey } from '@/lib/auth'
import type { OnboardingState, PersistedOnboardingState, WorkspaceFormation } from './types'

const DRAFT_KEY = 'ionirix:onboarding:draft'
const FORMATION_KEY = 'ionirix:onboarding:formation'

function resolveOnboardingScopeHints(state?: OnboardingState, scopeHint?: string) {
  const hints = [
    scopeHint,
    state?.account.email,
    state?.account.username,
  ]

  return Array.from(new Set(hints.map((value) => String(value || '').trim()).filter(Boolean)))
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
  if (typeof window === 'undefined') {
    return null
  }

  return safeParse<PersistedOnboardingState>(window.localStorage.getItem(buildUserScopedStorageKey(DRAFT_KEY, scopeHint)))
}

export function savePersistedOnboardingState(state: OnboardingState, scopeHint?: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const payload = JSON.stringify(toPersistedState(state))
  const scopeHints = resolveOnboardingScopeHints(state, scopeHint)

  if (scopeHints.length === 0) {
    window.localStorage.setItem(buildUserScopedStorageKey(DRAFT_KEY), payload)
    return
  }

  scopeHints.forEach((hint) => {
    window.localStorage.setItem(buildUserScopedStorageKey(DRAFT_KEY, hint), payload)
  })
}

export function clearPersistedOnboardingState(scopeHint?: string | string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const scopeHints = Array.isArray(scopeHint) ? scopeHint : scopeHint ? [scopeHint] : []
  if (scopeHints.length === 0) {
    window.localStorage.removeItem(buildUserScopedStorageKey(DRAFT_KEY))
    return
  }

  scopeHints.forEach((hint) => {
    window.localStorage.removeItem(buildUserScopedStorageKey(DRAFT_KEY, hint))
  })
}

export function saveWorkspaceFormation(formation: WorkspaceFormation, scopeHint?: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(buildUserScopedStorageKey(FORMATION_KEY, scopeHint), JSON.stringify(formation))
}

export function loadWorkspaceFormation(scopeHint?: string): WorkspaceFormation | null {
  if (typeof window === 'undefined') {
    return null
  }

  return safeParse<WorkspaceFormation>(window.localStorage.getItem(buildUserScopedStorageKey(FORMATION_KEY, scopeHint)))
}

export function clearWorkspaceFormation(scopeHint?: string | string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const scopeHints = Array.isArray(scopeHint) ? scopeHint : scopeHint ? [scopeHint] : []
  if (scopeHints.length === 0) {
    window.localStorage.removeItem(buildUserScopedStorageKey(FORMATION_KEY))
    return
  }

  scopeHints.forEach((hint) => {
    window.localStorage.removeItem(buildUserScopedStorageKey(FORMATION_KEY, hint))
  })
}
