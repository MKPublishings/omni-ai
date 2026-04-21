import { DEFAULT_CAPABILITIES, ONBOARDING_STEPS } from './config'
import { buildWorkspaceFormation } from './workspace-formation'
import type {
  AccountDraft,
  OnboardingAction,
  OnboardingState,
  OnboardingStepId,
  OnboardingValidationMap,
  PreferencesDraft,
  StepValidation,
  WorkspaceDraft,
} from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{2,31})$/
const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const stepOrder = ONBOARDING_STEPS.map((step) => step.id)

const defaultAccount: AccountDraft = {
  displayName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const defaultWorkspace: WorkspaceDraft = {
  name: 'Ionirix Workspace',
  slug: 'ionirix-workspace',
  role: 'builder',
  intent: '',
  teamMode: false,
  capabilities: DEFAULT_CAPABILITIES,
}

const defaultPreferences: PreferencesDraft = {
  theme: 'system',
  density: 'comfortable',
  motion: 'full',
  layoutMode: 'grid',
  sidebarPosition: 'left',
  telemetryOptIn: true,
}

function buildState(partial?: Partial<OnboardingState>): OnboardingState {
  const seed: OnboardingState = {
    currentStep: 'account',
    status: 'editing',
    formation: {} as OnboardingState['formation'],
    errors: {},
    submissionError: null,
    completedAt: null,
    ...partial,
    account: {
      ...defaultAccount,
      ...partial?.account,
    },
    workspace: {
      ...defaultWorkspace,
      ...partial?.workspace,
    },
    preferences: {
      ...defaultPreferences,
      ...partial?.preferences,
    },
  }

  return {
    ...seed,
    formation: buildWorkspaceFormation(seed),
  }
}

export function createInitialOnboardingState(): OnboardingState {
  return buildState()
}

function validateAccount(account: AccountDraft): StepValidation {
  const errors: string[] = []

  if (account.displayName.trim().length < 2) {
    errors.push('Display name must be at least 2 characters.')
  }
  if (!USERNAME_PATTERN.test(account.username.trim().toLowerCase())) {
    errors.push('Username must be 3-32 characters and may use letters, numbers, dots, dashes, or underscores.')
  }
  if (!EMAIL_PATTERN.test(account.email.trim().toLowerCase())) {
    errors.push('A valid email address is required.')
  }
  if (account.password.length < 8) {
    errors.push('Password must be at least 8 characters.')
  }
  if (!/[a-zA-Z]/.test(account.password) || !/\d/.test(account.password)) {
    errors.push('Password must include at least one letter and one number.')
  }
  if (account.password !== account.confirmPassword) {
    errors.push('Password confirmation must match.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateWorkspace(workspace: WorkspaceDraft): StepValidation {
  const errors: string[] = []

  if (workspace.name.trim().length < 3) {
    errors.push('Workspace name must be at least 3 characters.')
  }
  if (!WORKSPACE_SLUG_PATTERN.test(workspace.slug.trim().toLowerCase())) {
    errors.push('Workspace slug must use lowercase letters, numbers, and hyphens only.')
  }
  if (workspace.intent.trim().length < 24) {
    errors.push('Workspace intent should explain the operating context in at least 24 characters.')
  }
  if (workspace.capabilities.length < 2) {
    errors.push('Select at least two launch modules so the workspace opens with real operational depth.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validatePreferences(preferences: PreferencesDraft): StepValidation {
  const errors: string[] = []

  if (preferences.layoutMode === 'focus' && preferences.sidebarPosition === 'hidden') {
    errors.push('Focus mode requires a visible sidebar so the shell can maintain orientation.')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateConfirmation(state: OnboardingState): StepValidation {
  const previous = [
    validateAccount(state.account),
    validateWorkspace(state.workspace),
    validatePreferences(state.preferences),
  ]
  const errors = previous.flatMap((result) => result.errors)

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validateAllSteps(state: OnboardingState): OnboardingValidationMap {
  return {
    account: validateAccount(state.account),
    workspace: validateWorkspace(state.workspace),
    preferences: validatePreferences(state.preferences),
    confirmation: validateConfirmation(state),
  }
}

export function validateStep(state: OnboardingState, step: OnboardingStepId): StepValidation {
  const validations = validateAllSteps(state)
  return validations[step]
}

function moveToStep(state: OnboardingState, step: OnboardingStepId): OnboardingState {
  return buildState({
    ...state,
    currentStep: step,
  })
}

function nextStep(currentStep: OnboardingStepId): OnboardingStepId {
  const currentIndex = stepOrder.indexOf(currentStep)
  return stepOrder[Math.min(stepOrder.length - 1, currentIndex + 1)]
}

function previousStep(currentStep: OnboardingStepId): OnboardingStepId {
  const currentIndex = stepOrder.indexOf(currentStep)
  return stepOrder[Math.max(0, currentIndex - 1)]
}

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'HYDRATE':
      return buildState({
        ...state,
        ...action.payload,
        status: 'editing',
        submissionError: null,
      })
    case 'UPDATE_ACCOUNT':
      return buildState({
        ...state,
        account: {
          ...state.account,
          ...action.payload,
        },
        errors: {
          ...state.errors,
          account: undefined,
        },
        submissionError: null,
        status: 'editing',
      })
    case 'UPDATE_WORKSPACE':
      return buildState({
        ...state,
        workspace: {
          ...state.workspace,
          ...action.payload,
        },
        errors: {
          ...state.errors,
          workspace: undefined,
        },
        submissionError: null,
        status: 'editing',
      })
    case 'TOGGLE_CAPABILITY': {
      const hasCapability = state.workspace.capabilities.includes(action.capability)
      const capabilities = hasCapability
        ? state.workspace.capabilities.filter((capability) => capability !== action.capability)
        : [...state.workspace.capabilities, action.capability]

      return buildState({
        ...state,
        workspace: {
          ...state.workspace,
          capabilities,
        },
        errors: {
          ...state.errors,
          workspace: undefined,
        },
        submissionError: null,
        status: 'editing',
      })
    }
    case 'UPDATE_PREFERENCES':
      return buildState({
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
        errors: {
          ...state.errors,
          preferences: undefined,
        },
        submissionError: null,
        status: 'editing',
      })
    case 'NEXT': {
      const result = validateStep(state, state.currentStep)
      if (!result.valid) {
        return buildState({
          ...state,
          errors: {
            ...state.errors,
            [state.currentStep]: result.errors,
          },
        })
      }

      return moveToStep(state, nextStep(state.currentStep))
    }
    case 'BACK':
      return moveToStep({
        ...state,
        submissionError: null,
        status: state.status === 'error' ? 'editing' : state.status,
      }, previousStep(state.currentStep))
    case 'BEGIN_SUBMIT':
      return buildState({
        ...state,
        status: 'submitting',
        submissionError: null,
      })
    case 'SUBMIT_SUCCESS':
      return buildState({
        ...state,
        status: 'submitted',
        completedAt: new Date().toISOString(),
      })
    case 'SUBMIT_VERIFICATION_REQUIRED':
      return buildState({
        ...state,
        status: 'verification-required',
        completedAt: new Date().toISOString(),
      })
    case 'SUBMIT_FAILURE':
      return buildState({
        ...state,
        status: 'error',
        submissionError: action.message,
      })
    case 'RESET':
      return createInitialOnboardingState()
    default:
      return state
  }
}

export function firstInvalidStep(state: OnboardingState): OnboardingStepId | null {
  const validations = validateAllSteps(state)
  return stepOrder.find((step) => !validations[step].valid) ?? null
}
