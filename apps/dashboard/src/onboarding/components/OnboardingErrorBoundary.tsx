'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import { GlassCard } from '@/components/GlassCard'
import { clearPersistedOnboardingState } from '@/onboarding'

interface OnboardingErrorBoundaryProps {
  children: ReactNode
}

interface OnboardingErrorBoundaryState {
  hasError: boolean
}

export class OnboardingErrorBoundary extends Component<OnboardingErrorBoundaryProps, OnboardingErrorBoundaryState> {
  state: OnboardingErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): OnboardingErrorBoundaryState {
    return {
      hasError: true,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Onboarding rendering failure', error, errorInfo)
  }

  handleReset = () => {
    clearPersistedOnboardingState()
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <GlassCard className="mx-auto max-w-2xl rounded-[2rem] p-8 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-signal-400">Onboarding fallback</p>
        <h2 className="mt-4 text-3xl font-semibold text-quantum-white">The onboarding surface hit a rendering fault.</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-quantum-white/68">
          The safest recovery path is to clear the local onboarding draft and rebuild the workspace formation plan from a clean state.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={this.handleReset} className="rounded-full px-5">
            Reset onboarding
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.location.assign('/login')} className="rounded-full px-5">
            Return to login
          </Button>
        </div>
      </GlassCard>
    )
  }
}
