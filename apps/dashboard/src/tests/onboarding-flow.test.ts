import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildWorkspaceFormation,
  createInitialOnboardingState,
  firstInvalidStep,
  onboardingReducer,
  validateStep,
} from '@/onboarding'

test('account step blocks forward transition until worker-compatible credentials are provided', () => {
  const initial = createInitialOnboardingState()
  const blocked = onboardingReducer(initial, { type: 'NEXT' })

  assert.equal(blocked.currentStep, 'account')
  assert.equal(blocked.errors.account?.length ? true : false, true)

  const ready = onboardingReducer(blocked, {
    type: 'UPDATE_ACCOUNT',
    payload: {
      displayName: 'Ion Operator',
      username: 'ion.operator',
      email: 'operator@ionirix.net',
      password: 'sovereign2026',
      confirmPassword: 'sovereign2026',
    },
  })

  const advanced = onboardingReducer(ready, { type: 'NEXT' })
  assert.equal(advanced.currentStep, 'workspace')
  assert.equal(validateStep(advanced, 'account').valid, true)
})

test('firstInvalidStep identifies the earliest unmet onboarding checkpoint', () => {
  const state = createInitialOnboardingState()

  assert.equal(firstInvalidStep(state), 'account')

  const accountReady = onboardingReducer(state, {
    type: 'UPDATE_ACCOUNT',
    payload: {
      displayName: 'Ion Builder',
      username: 'ionbuilder',
      email: 'builder@ionirix.net',
      password: 'builder2026',
      confirmPassword: 'builder2026',
    },
  })

  assert.equal(firstInvalidStep(accountReady), 'workspace')
})

test('workspace formation remains deterministic for identical onboarding input', () => {
  const seeded = createInitialOnboardingState()
  const withAccount = onboardingReducer(seeded, {
    type: 'UPDATE_ACCOUNT',
    payload: {
      displayName: 'Mirnes',
      username: 'mirnes',
      email: 'mirnes@ionirix.com',
      password: 'sovereign2026',
      confirmPassword: 'sovereign2026',
    },
  })
  const withWorkspace = onboardingReducer(withAccount, {
    type: 'UPDATE_WORKSPACE',
    payload: {
      name: 'Sovereign Operations',
      slug: 'sovereign-operations',
      role: 'operator',
      intent: 'Coordinate runtime operations, simulation inspection, and system telemetry from one persistent shell.',
      teamMode: true,
      capabilities: ['assistant', 'analytics', 'simulations'],
    },
  })
  const configured = onboardingReducer(withWorkspace, {
    type: 'UPDATE_PREFERENCES',
    payload: {
      theme: 'dark',
      density: 'compact',
      motion: 'reduced',
      layoutMode: 'focus',
      sidebarPosition: 'left',
      telemetryOptIn: true,
    },
  })

  const first = buildWorkspaceFormation(configured)
  const second = buildWorkspaceFormation(configured)

  assert.deepEqual(first, second)
  assert.equal(first.workspaceSlug, 'sovereign-operations')
  assert.equal(first.primaryRoute, '/assistant')
  assert.equal(first.modules.filter((module) => module.enabled).length, 3)
})