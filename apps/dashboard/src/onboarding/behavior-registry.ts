import type { AdaptiveBehavior, OnboardingState, ReflowLayout } from './types'

export function evaluateAdaptiveBehaviors(state: OnboardingState, layout: ReflowLayout): AdaptiveBehavior[] {
  const behaviors: AdaptiveBehavior[] = []

  if (layout.breakpoint === 'mobile') {
    behaviors.push({
      id: 'compact-stack',
      label: 'Compact stack',
      tone: 'neutral',
      description: 'Progress, guidance, and confirmation surfaces collapse into a single vertical flow for smaller screens.',
    })
  }

  if (state.currentStep === 'account' && (state.errors.account?.length ?? 0) > 0) {
    behaviors.push({
      id: 'guided-validation',
      label: 'Guided validation',
      tone: 'warning',
      description: 'The account step is surfacing strict validation so the Worker signup contract is satisfied before transition.',
    })
  }

  if (state.preferences.motion !== 'full') {
    behaviors.push({
      id: 'reduced-motion',
      label: 'Reduced motion',
      tone: 'neutral',
      description: 'Transitions shift toward opacity and position changes instead of larger motion arcs.',
    })
  }

  if (state.currentStep === 'confirmation') {
    behaviors.push({
      id: 'launch-readiness',
      label: 'Launch readiness',
      tone: 'accent',
      description: 'Formation output, verification posture, and primary route are elevated so the user can attest before launch.',
    })
  }

  if (state.workspace.teamMode) {
    behaviors.push({
      id: 'team-briefing',
      label: 'Team briefing',
      tone: 'accent',
      description: 'Collaboration mode is active, so guidance emphasizes shared operational shells and explicit launch modules.',
    })
  }

  return behaviors
}
