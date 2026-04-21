import type { OnboardingState, PersistedOnboardingState, WorkspaceFormation } from './types'

const DRAFT_KEY = 'ionirix:onboarding:draft'
const FORMATION_KEY = 'ionirix:onboarding:formation'

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

export function loadPersistedOnboardingState(): PersistedOnboardingState | null {
  if (typeof window === 'undefined') {
    return null
  }

  return safeParse<PersistedOnboardingState>(window.localStorage.getItem(DRAFT_KEY))
}

export function savePersistedOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(toPersistedState(state)))
}

export function clearPersistedOnboardingState(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(DRAFT_KEY)
}

export function saveWorkspaceFormation(formation: WorkspaceFormation): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(FORMATION_KEY, JSON.stringify(formation))
}

export function loadWorkspaceFormation(): WorkspaceFormation | null {
  if (typeof window === 'undefined') {
    return null
  }

  return safeParse<WorkspaceFormation>(window.localStorage.getItem(FORMATION_KEY))
}

export function clearWorkspaceFormation(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(FORMATION_KEY)
}
