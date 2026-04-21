import type { OnboardingStepDefinition, WorkspaceCapabilityId } from './types'

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: 'account',
    eyebrow: 'Identity',
    title: 'Establish the account boundary',
    description: 'Provision the sovereign account record that will anchor workspace access and verification.',
  },
  {
    id: 'workspace',
    eyebrow: 'Formation',
    title: 'Shape the workspace shell',
    description: 'Define the workspace name, operational posture, and the first modules that should surface at launch.',
  },
  {
    id: 'preferences',
    eyebrow: 'Calibration',
    title: 'Calibrate interface behavior',
    description: 'Set theme, density, motion, and shell posture so the layout behaves deterministically across devices.',
  },
  {
    id: 'confirmation',
    eyebrow: 'Attestation',
    title: 'Confirm and launch',
    description: 'Review the generated workspace formation plan, create the account, and hand the user into the live surface.',
  },
]

export const CAPABILITY_CATALOG: Array<{
  id: WorkspaceCapabilityId
  title: string
  description: string
  route: string
}> = [
  {
    id: 'assistant',
    title: 'Ionirix Assistant',
    description: 'Agent reasoning, long-horizon conversation continuity, and guided execution surfaces.',
    route: '/assistant',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Operational totals, health views, and higher-order evaluation surfaces.',
    route: '/analytics',
  },
  {
    id: 'automation',
    title: 'Tools and Automation',
    description: 'Tool execution, orchestration hooks, and command-driven operational control.',
    route: '/tools',
  },
  {
    id: 'memory',
    title: 'Memory Context',
    description: 'Persistent context surfaces, saved operational memory, and long-arc continuity.',
    route: '/memory',
  },
  {
    id: 'simulations',
    title: 'Simulation Control',
    description: 'Sovereign and multiverse simulation inspection with live state movement.',
    route: '/simulations',
  },
]

export const DEFAULT_CAPABILITIES: WorkspaceCapabilityId[] = ['assistant', 'analytics', 'memory']

export const PASSWORD_REQUIREMENTS = 'At least 8 characters, including one letter and one number.'
