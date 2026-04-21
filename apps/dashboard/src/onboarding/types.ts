export type OnboardingStepId = 'account' | 'workspace' | 'preferences' | 'confirmation'

export type DashboardThemePreference = 'dark' | 'light' | 'system'
export type DensityPreference = 'compact' | 'comfortable' | 'spacious'
export type MotionPreference = 'full' | 'reduced' | 'none'
export type LayoutMode = 'grid' | 'stack' | 'focus'
export type SidebarPosition = 'left' | 'right' | 'hidden'
export type ExperienceLevel = 'founder' | 'operator' | 'builder' | 'analyst'
export type WorkspaceCapabilityId = 'assistant' | 'analytics' | 'automation' | 'memory' | 'simulations'

export interface OnboardingStepDefinition {
  id: OnboardingStepId
  title: string
  eyebrow: string
  description: string
}

export interface AccountDraft {
  displayName: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface WorkspaceDraft {
  name: string
  slug: string
  role: ExperienceLevel
  intent: string
  teamMode: boolean
  capabilities: WorkspaceCapabilityId[]
}

export interface PreferencesDraft {
  theme: DashboardThemePreference
  density: DensityPreference
  motion: MotionPreference
  layoutMode: LayoutMode
  sidebarPosition: SidebarPosition
  telemetryOptIn: boolean
}

export interface WorkspaceModule {
  id: string
  label: string
  route: string
  priority: number
  enabled: boolean
}

export interface WorkspaceFormation {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  primaryRoute: string
  capabilityScore: number
  shell: {
    layoutMode: LayoutMode
    sidebarPosition: SidebarPosition
    density: DensityPreference
    theme: DashboardThemePreference
    motion: MotionPreference
  }
  modules: WorkspaceModule[]
  orchestration: {
    telemetry: 'full' | 'essential'
    verification: 'email-required'
    collaboration: 'team' | 'solo'
  }
  summary: string[]
}

export interface StepValidation {
  valid: boolean
  errors: string[]
}

export interface OnboardingValidationMap {
  account: StepValidation
  workspace: StepValidation
  preferences: StepValidation
  confirmation: StepValidation
}

export interface AdaptiveBehavior {
  id: string
  label: string
  tone: 'neutral' | 'accent' | 'warning'
  description: string
}

export interface ViewportProfile {
  width: number
  height: number
  breakpoint: 'mobile' | 'tablet' | 'desktop'
}

export interface ReflowLayout {
  breakpoint: ViewportProfile['breakpoint']
  railPlacement: 'top' | 'left'
  assistPlacement: 'inline' | 'side'
  contentColumns: 1 | 2
  shellClassName: string
  contentClassName: string
  asideClassName: string
}

export interface OnboardingState {
  currentStep: OnboardingStepId
  status: 'editing' | 'submitting' | 'submitted' | 'verification-required' | 'error'
  account: AccountDraft
  workspace: WorkspaceDraft
  preferences: PreferencesDraft
  formation: WorkspaceFormation
  errors: Partial<Record<OnboardingStepId, string[]>>
  submissionError: string | null
  completedAt: string | null
}

export type OnboardingAction =
  | { type: 'HYDRATE'; payload: Partial<OnboardingState> }
  | { type: 'UPDATE_ACCOUNT'; payload: Partial<AccountDraft> }
  | { type: 'UPDATE_WORKSPACE'; payload: Partial<WorkspaceDraft> }
  | { type: 'TOGGLE_CAPABILITY'; capability: WorkspaceCapabilityId }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<PreferencesDraft> }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'BEGIN_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_VERIFICATION_REQUIRED' }
  | { type: 'SUBMIT_FAILURE'; message: string }
  | { type: 'RESET' }

export interface PersistedOnboardingState {
  currentStep: OnboardingStepId
  status: OnboardingState['status']
  account: Omit<AccountDraft, 'password' | 'confirmPassword'>
  workspace: WorkspaceDraft
  preferences: PreferencesDraft
  completedAt: string | null
}

export interface SignupResult {
  kind: 'authenticated' | 'verification-required'
  verificationUrl?: string | null
  verificationNotice: string
  workspaceProvisioned?: boolean
}
