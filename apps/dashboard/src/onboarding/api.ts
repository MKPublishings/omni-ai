import { getApiUrl, storeAuthSession } from '@/lib/auth'
import type { AccountDraft, PreferencesDraft, SignupResult, WorkspaceDraft, WorkspaceFormation } from './types'

interface OnboardingProvisioningPayload {
  formation: WorkspaceFormation
  context: {
    workspace: WorkspaceDraft
    preferences: PreferencesDraft
  }
}

interface SignupResponse {
  verificationRequired?: boolean
  verificationUrl?: string | null
  verificationEmailSent?: boolean
  verificationEmailError?: string
  token?: string
  sessionId?: string
  expiresAt?: string
  user?: {
    id: string
    username: string
    email: string
    displayName: string
    role: string
    emailVerified: boolean
  }
  accessTier?: string
  workspaceProvisioned?: boolean
  workspaceProvisionError?: string | null
  error?: string
}

export async function submitOnboardingAccount(account: AccountDraft, onboarding?: OnboardingProvisioningPayload): Promise<SignupResult> {
  const response = await fetch(getApiUrl('/api/auth/signup'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: account.email.trim(),
      password: account.password,
      displayName: account.displayName.trim(),
      username: account.username.trim().toLowerCase(),
      ...(onboarding ? { onboarding } : {}),
    }),
  })

  const payload = await response.json().catch(() => ({} as SignupResponse)) as SignupResponse

  if (!response.ok) {
    throw new Error(payload.error || 'Account provisioning failed.')
  }

  if (payload.token && payload.sessionId && payload.expiresAt && payload.user) {
    storeAuthSession({
      token: payload.token,
      sessionId: payload.sessionId,
      expiresAt: payload.expiresAt,
      user: payload.user,
      ...(payload.accessTier ? { accessTier: payload.accessTier } : {}),
    })

    return {
      kind: 'authenticated',
      verificationNotice: payload.workspaceProvisioned === false
        ? 'Account created and authenticated. Server-side workspace provisioning did not complete, so the local formation backup is being retained.'
        : 'Account created and authenticated. Routing into the workspace now.',
      workspaceProvisioned: payload.workspaceProvisioned,
    }
  }

  const emailDelivered = Boolean(payload.verificationEmailSent)

  return {
    kind: 'verification-required',
    verificationUrl: payload.verificationUrl ?? null,
    verificationNotice: emailDelivered
      ? `Account created. Verification email has been issued before workspace access opens.${payload.workspaceProvisioned === false ? ' Workspace provisioning fell back to the local draft because the server write did not complete.' : ''}`
      : `Account created, but verification email delivery failed${payload.verificationEmailError ? `: ${payload.verificationEmailError}` : '.'}${payload.workspaceProvisioned === false ? ' Workspace provisioning also remained local-only.' : ''}`,
    workspaceProvisioned: payload.workspaceProvisioned,
  }
}
