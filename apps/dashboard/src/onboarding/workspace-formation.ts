import { CAPABILITY_CATALOG } from './config'
import type { OnboardingState, WorkspaceFormation, WorkspaceModule } from './types'

function normalizeSlugPart(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hashSeed(input: string): string {
  let hash = 2166136261

  for (const char of input) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function buildModules(state: OnboardingState): WorkspaceModule[] {
  const selected = new Set(state.workspace.capabilities)

  return CAPABILITY_CATALOG.map((capability, index) => ({
    id: capability.id,
    label: capability.title,
    route: capability.route,
    priority: index + 1,
    enabled: selected.has(capability.id),
  })).sort((left, right) => {
    if (left.enabled !== right.enabled) {
      return left.enabled ? -1 : 1
    }

    return left.priority - right.priority
  })
}

export function buildWorkspaceFormation(state: OnboardingState): WorkspaceFormation {
  const workspaceSlug = normalizeSlugPart(state.workspace.slug || state.workspace.name || state.account.username || 'ionirix-workspace')
  const capabilityScore = state.workspace.capabilities.length * (state.workspace.teamMode ? 2 : 1)
  const workspaceId = `ix-${hashSeed([
    workspaceSlug,
    state.workspace.role,
    state.preferences.layoutMode,
    state.preferences.sidebarPosition,
    state.workspace.capabilities.join(','),
  ].join(':'))}`
  const modules = buildModules(state)
  const primaryRoute = modules.find((module) => module.enabled)?.route || '/workspace'

  return {
    workspaceId,
    workspaceName: state.workspace.name.trim() || 'Ionirix Workspace',
    workspaceSlug,
    primaryRoute,
    capabilityScore,
    shell: {
      layoutMode: state.preferences.layoutMode,
      sidebarPosition: state.preferences.sidebarPosition,
      density: state.preferences.density,
      theme: state.preferences.theme,
      motion: state.preferences.motion,
    },
    modules,
    orchestration: {
      telemetry: state.preferences.telemetryOptIn ? 'full' : 'essential',
      verification: 'email-required',
      collaboration: state.workspace.teamMode ? 'team' : 'solo',
    },
    summary: [
      `${state.workspace.teamMode ? 'Team' : 'Solo'} workspace shell routed through ${primaryRoute}.`,
      `${state.preferences.layoutMode} layout with ${state.preferences.sidebarPosition} sidebar positioning.`,
      `${modules.filter((module) => module.enabled).length} modules enabled for initial launch.`,
      `Telemetry posture locked to ${state.preferences.telemetryOptIn ? 'full' : 'essential'} collection.`,
    ],
  }
}
