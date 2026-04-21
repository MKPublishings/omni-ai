'use client'

import { useEffect, useMemo, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AmbientBackground } from '@/components/AmbientBackground'
import { Button } from '@/components/Button'
import { GlassCard } from '@/components/GlassCard'
import { clearAuthSession, getStoredToken } from '@/lib/auth'
import { clearStoredDashboardTheme, writeStoredDashboardTheme } from '@/lib/dashboard-theme'
import { fetchDashboardUser, fetchOnboardingWorkspace } from '@/lib/dashboard'
import {
  clearPersistedOnboardingState,
  clearWorkspaceFormation,
  createInitialOnboardingState,
  evaluateAdaptiveBehaviors,
  firstInvalidStep,
  loadPersistedOnboardingState,
  onboardingReducer,
  resolveReflowLayout,
  savePersistedOnboardingState,
  saveWorkspaceFormation,
  submitOnboardingAccount,
  validateStep,
  getViewportProfile,
} from '@/onboarding'
import { OnboardingErrorBoundary } from './OnboardingErrorBoundary'
import { OnboardingShell } from './OnboardingShell'
import { AccountStep } from './steps/AccountStep'
import { ConfirmationStep } from './steps/ConfirmationStep'
import { PreferencesStep } from './steps/PreferencesStep'
import { WorkspaceStep } from './steps/WorkspaceStep'

function LoadingSurface() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />
      <div className="relative z-10 mx-auto max-w-[1440px] px-[5%] py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <div className="h-4 w-40 rounded-full bg-quantum-white/10" />
            <div className="h-12 w-full max-w-3xl rounded-[1.5rem] bg-quantum-white/10" />
            <div className="h-20 w-full max-w-2xl rounded-[1.5rem] bg-quantum-white/10" />
          </div>
          <div className="h-44 rounded-[2rem] bg-quantum-white/10" />
        </div>
      </div>
    </div>
  )
}

function DraftRecoverySurface({ onReset }: { onReset: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-black-900">
      <AmbientBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-[5%] py-10 sm:px-4">
        <GlassCard className="w-full max-w-2xl rounded-[2rem] p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-signal-400">Draft recovery required</p>
          <h1 className="mt-4 text-3xl font-semibold text-quantum-white">The saved onboarding draft could not be restored safely.</h1>
          <p className="mt-4 text-sm leading-7 text-quantum-white/68">
            The local draft shape is no longer valid for the current route build. Clear it and restart the flow so the route can regenerate a deterministic formation plan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={onReset} className="rounded-full px-5">Reset local draft</Button>
            <Button type="button" variant="secondary" onClick={() => window.location.assign('/')} className="rounded-full px-5">Public home</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

export function OnboardingPage() {
  const router = useRouter()
  const [state, dispatch] = useReducer(onboardingReducer, undefined, createInitialOnboardingState)
  const [isHydrating, setIsHydrating] = useState(true)
  const [draftRecoveryRequired, setDraftRecoveryRequired] = useState(false)
  const [authRedirecting, setAuthRedirecting] = useState(true)
  const [verificationNotice, setVerificationNotice] = useState('')
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null)
  const [viewport, setViewport] = useState(() => ({ width: 1440, height: 960 }))

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setAuthRedirecting(false)
      return
    }

    let cancelled = false

    const redirectAuthenticatedUser = async () => {
      try {
        await fetchDashboardUser()
        const workspace = await fetchOnboardingWorkspace().catch(() => null)
        if (!cancelled) {
          router.replace(workspace?.primaryRoute || '/workspace')
        }
      } catch {
        clearAuthSession()
        if (!cancelled) {
          setAuthRedirecting(false)
        }
      }
    }

    redirectAuthenticatedUser()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (authRedirecting) {
      return
    }

    try {
      const persisted = loadPersistedOnboardingState()
      if (persisted) {
        dispatch({
          type: 'HYDRATE',
          payload: {
            currentStep: persisted.currentStep,
            status: 'editing',
            account: {
              ...persisted.account,
              password: '',
              confirmPassword: '',
            },
            workspace: persisted.workspace,
            preferences: persisted.preferences,
            completedAt: persisted.completedAt,
          },
        })
      }
    } catch {
      setDraftRecoveryRequired(true)
    } finally {
      setIsHydrating(false)
    }
  }, [authRedirecting])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    if (isHydrating || draftRecoveryRequired) {
      return
    }

    savePersistedOnboardingState(state)
  }, [draftRecoveryRequired, isHydrating, state])

  const layout = useMemo(() => resolveReflowLayout(getViewportProfile(viewport.width, viewport.height), state), [state, viewport.height, viewport.width])
  const behaviors = useMemo(() => evaluateAdaptiveBehaviors(state, layout), [layout, state])
  const stepErrors = state.errors[state.currentStep] ?? []

  const notice = state.submissionError || verificationNotice ? (
    <GlassCard tier={2} className="rounded-[1.75rem] border border-transparent p-5">
      {state.submissionError ? <p className="text-sm leading-7 text-amber-signal-300">{state.submissionError}</p> : null}
      {verificationNotice ? <p className="text-sm leading-7 text-spectral-cyan-200">{verificationNotice}</p> : null}
      {verificationUrl ? (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={() => window.location.assign(verificationUrl)} className="rounded-full px-5">
            Open verification link
          </Button>
        </div>
      ) : null}
    </GlassCard>
  ) : undefined

  const canGoBack = state.currentStep !== 'account'
  const nextLabel = state.currentStep === 'confirmation' ? 'Create account' : 'Continue'
  const onboardingScopeHints = [state.account.email, state.account.username].map((value) => String(value || '').trim()).filter(Boolean)

  const handleReset = () => {
    clearPersistedOnboardingState()
    clearPersistedOnboardingState(onboardingScopeHints)
    clearWorkspaceFormation()
    clearWorkspaceFormation(onboardingScopeHints)
    clearStoredDashboardTheme()
    clearStoredDashboardTheme(onboardingScopeHints)
    setVerificationNotice('')
    setVerificationUrl(null)
    dispatch({ type: 'RESET' })
  }

  const handleNext = async () => {
    setVerificationNotice('')
    setVerificationUrl(null)

    if (state.currentStep !== 'confirmation') {
      dispatch({ type: 'NEXT' })
      return
    }

    const firstInvalid = firstInvalidStep(state)
    if (firstInvalid) {
      if (firstInvalid !== state.currentStep) {
        dispatch({ type: 'HYDRATE', payload: { currentStep: firstInvalid } })
      } else {
        dispatch({ type: 'NEXT' })
      }
      return
    }

    dispatch({ type: 'BEGIN_SUBMIT' })

    try {
      saveWorkspaceFormation(state.formation, state.account.email || state.account.username)

      if (state.preferences.theme !== 'system' && typeof window !== 'undefined') {
        writeStoredDashboardTheme(state.preferences.theme, state.account.email || state.account.username)
      }

      const result = await submitOnboardingAccount(state.account, {
        formation: state.formation,
        context: {
          workspace: state.workspace,
          preferences: state.preferences,
        },
      })

      if (result.kind === 'verification-required') {
        dispatch({ type: 'SUBMIT_VERIFICATION_REQUIRED' })
        setVerificationNotice(result.verificationNotice)
        setVerificationUrl(result.verificationUrl ?? null)
        router.push(`/verify-email?email=${encodeURIComponent(state.account.email.trim())}`)
        return
      }

      dispatch({ type: 'SUBMIT_SUCCESS' })
      if (result.workspaceProvisioned !== false) {
        clearPersistedOnboardingState()
        clearPersistedOnboardingState(onboardingScopeHints)
        clearWorkspaceFormation()
        clearWorkspaceFormation(onboardingScopeHints)
      }
      router.push(state.formation.primaryRoute)
    } catch (error) {
      dispatch({
        type: 'SUBMIT_FAILURE',
        message: error instanceof Error ? error.message : 'Account provisioning failed.',
      })
    }
  }

  const mainContent = (() => {
    switch (state.currentStep) {
      case 'account':
        return <AccountStep value={state.account} errors={stepErrors} onChange={(payload) => dispatch({ type: 'UPDATE_ACCOUNT', payload })} />
      case 'workspace':
        return (
          <WorkspaceStep
            value={state.workspace}
            errors={stepErrors}
            onChange={(payload) => dispatch({ type: 'UPDATE_WORKSPACE', payload })}
            onToggleCapability={(capability) => dispatch({ type: 'TOGGLE_CAPABILITY', capability })}
          />
        )
      case 'preferences':
        return <PreferencesStep value={state.preferences} errors={stepErrors} onChange={(payload) => dispatch({ type: 'UPDATE_PREFERENCES', payload })} />
      case 'confirmation':
        return <ConfirmationStep state={state} errors={validateStep(state, 'confirmation').errors} />
      default:
        return null
    }
  })()

  if (authRedirecting || isHydrating) {
    return <LoadingSurface />
  }

  if (draftRecoveryRequired) {
    return <DraftRecoverySurface onReset={handleReset} />
  }

  return (
    <OnboardingErrorBoundary>
      <div className="relative min-h-screen overflow-hidden bg-pine-black-900">
        <AmbientBackground />
        <OnboardingShell
          state={state}
          layout={layout}
          behaviors={behaviors}
          mainContent={mainContent}
          onBack={() => dispatch({ type: 'BACK' })}
          onNext={handleNext}
          onReset={handleReset}
          canGoBack={canGoBack}
          nextLabel={nextLabel}
          busy={state.status === 'submitting'}
          notice={notice}
        />
      </div>
    </OnboardingErrorBoundary>
  )
}
