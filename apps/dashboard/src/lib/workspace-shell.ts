import type { DashboardOnboardingWorkspace } from '@/lib/dashboard'

export interface WorkspaceIntentSummary {
  workspaceName: string
  intent: string
  focusLabel: string
  focusDescription: string
  roleLabel: string
  collaborationLabel: string
  enabledModuleCount: number
  primaryRoute: string
  priorityRoutes: string[]
}

const capabilityRouteMap: Record<string, string> = {
  assistant: '/assistant',
  analytics: '/analytics',
  automation: '/tools',
  memory: '/memory',
  simulations: '/simulations',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function normalizeIntent(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function includesKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword))
}

function inferFocusLabel(intent: string, capabilityIds: string[], role: string): string {
  const normalizedIntent = intent.toLowerCase()

  if (includesKeyword(normalizedIntent, ['simulate', 'simulation', 'multiverse', 'world', 'scenario'])) {
    return 'Simulation command'
  }

  if (includesKeyword(normalizedIntent, ['analy', 'telemetry', 'observe', 'insight', 'measure'])) {
    return 'Analytics watch'
  }

  if (includesKeyword(normalizedIntent, ['autom', 'orchestr', 'pipeline', 'execute', 'runtime', 'operate', 'ops', 'coordinate'])) {
    return 'Operations control'
  }

  if (includesKeyword(normalizedIntent, ['memory', 'context', 'knowledge', 'archive', 'recall'])) {
    return 'Memory continuity'
  }

  if (includesKeyword(normalizedIntent, ['build', 'design', 'create', 'ship', 'prototype'])) {
    return 'Builder studio'
  }

  if (capabilityIds.includes('simulations')) {
    return 'Simulation command'
  }

  if (capabilityIds.includes('analytics')) {
    return 'Analytics watch'
  }

  if (capabilityIds.includes('automation')) {
    return 'Operations control'
  }

  if (role === 'analyst') {
    return 'Analytics watch'
  }

  if (role === 'operator') {
    return 'Operations control'
  }

  return 'Workspace focus'
}

function inferFocusDescription(intent: string, primaryRoute: string, enabledModuleCount: number): string {
  if (intent) {
    return intent.length > 180 ? `${intent.slice(0, 177)}...` : intent
  }

  return `The workspace is configured to open through ${primaryRoute} with ${enabledModuleCount} enabled modules in the current shell.`
}

export function summarizeWorkspaceIntent(workspace: DashboardOnboardingWorkspace | null): WorkspaceIntentSummary | null {
  if (!workspace) {
    return null
  }

  const workspaceContext = asRecord(workspace.context?.workspace)
  const intent = normalizeIntent(workspaceContext.intent)
  const role = typeof workspaceContext.role === 'string' ? workspaceContext.role : 'builder'
  const teamMode = typeof workspaceContext.teamMode === 'boolean'
    ? workspaceContext.teamMode
    : workspace.orchestration?.collaboration === 'team'

  const enabledModules = Array.isArray(workspace.modules) ? workspace.modules.filter((module) => module.enabled) : []
  const capabilityIds = enabledModules.map((module) => module.id)
  const prioritizedModuleRoutes = capabilityIds
    .map((capabilityId) => capabilityRouteMap[capabilityId])
    .filter((route): route is string => Boolean(route))

  const priorityRoutes = Array.from(new Set([workspace.primaryRoute, ...prioritizedModuleRoutes]))

  return {
    workspaceName: workspace.workspaceName,
    intent,
    focusLabel: inferFocusLabel(intent, capabilityIds, role),
    focusDescription: inferFocusDescription(intent, workspace.primaryRoute, enabledModules.length),
    roleLabel: role,
    collaborationLabel: teamMode ? 'Team posture' : 'Solo posture',
    enabledModuleCount: enabledModules.length,
    primaryRoute: workspace.primaryRoute,
    priorityRoutes,
  }
}

export function sortRoutesByWorkspaceIntent<T extends { href: string }>(items: T[], workspace: DashboardOnboardingWorkspace | null): T[] {
  const summary = summarizeWorkspaceIntent(workspace)
  if (!summary) {
    return items
  }

  const routeOrder = new Map(summary.priorityRoutes.map((route, index) => [route, index]))

  return [...items].sort((left, right) => {
    const leftPriority = routeOrder.has(left.href) ? routeOrder.get(left.href)! : Number.POSITIVE_INFINITY
    const rightPriority = routeOrder.has(right.href) ? routeOrder.get(right.href)! : Number.POSITIVE_INFINITY

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return 0
  })
}