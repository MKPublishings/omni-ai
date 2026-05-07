import assert from 'node:assert/strict'
import test from 'node:test'
import type { DashboardOnboardingWorkspace } from '@/lib/dashboard'
import type { WorkspaceFormation } from '@/onboarding'
import { filterWorkspaceModuleRoutes, getEnabledWorkspaceModuleRoutes, resolveEnabledWorkspaceModuleRoutes } from '@/lib/workspace-shell'

const workspace: DashboardOnboardingWorkspace = {
  id: 'workspace-1',
  userId: 'user-1',
  workspaceId: 'ix-test',
  workspaceName: 'Ion Test',
  workspaceSlug: 'ion-test',
  primaryRoute: '/assistant',
  capabilityScore: 3,
  provisioningStatus: 'active',
  source: 'test',
  shell: {},
  modules: [
    { id: 'assistant', label: 'Ionirix Assistant', route: '/assistant', priority: 1, enabled: true },
    { id: 'analytics', label: 'Analytics', route: '/analytics', priority: 2, enabled: true },
    { id: 'automation', label: 'Tools and Automation', route: '/tools', priority: 3, enabled: false },
    { id: 'memory', label: 'Memory Context', route: '/memory', priority: 4, enabled: true },
    { id: 'simulations', label: 'Simulation Control', route: '/simulations', priority: 5, enabled: false },
  ],
  orchestration: {},
  summary: [],
  context: {},
  createdAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
}

test('getEnabledWorkspaceModuleRoutes returns only enabled module routes', () => {
  const enabledRoutes = getEnabledWorkspaceModuleRoutes(workspace)

  assert.deepEqual(Array.from(enabledRoutes ?? []), ['/assistant', '/analytics', '/memory'])
})

test('filterWorkspaceModuleRoutes hides disabled module routes while preserving shared routes', () => {
  const filtered = filterWorkspaceModuleRoutes(
    [
      { href: '/workspace', label: 'Overview' },
      { href: '/assistant', label: 'Assistant' },
      { href: '/analytics', label: 'Analytics' },
      { href: '/tools', label: 'Tools' },
      { href: '/simulations', label: 'Simulations' },
      { href: '/settings', label: 'Settings' },
    ],
    workspace,
  )

  assert.deepEqual(filtered.map((entry) => entry.href), ['/workspace', '/assistant', '/analytics', '/settings'])
})

test('resolveEnabledWorkspaceModuleRoutes prefers the latest local formation modules when available', () => {
  const formation: WorkspaceFormation = {
    workspaceId: 'ix-test',
    workspaceName: 'Ion Test',
    workspaceSlug: 'ion-test',
    primaryRoute: '/assistant',
    capabilityScore: 4,
    shell: {
      layoutMode: 'grid',
      sidebarPosition: 'left',
      density: 'comfortable',
      theme: 'dark',
      motion: 'full',
    },
    modules: [
      { id: 'assistant', label: 'Ionirix Assistant', route: '/assistant', priority: 1, enabled: true },
      { id: 'analytics', label: 'Analytics', route: '/analytics', priority: 2, enabled: true },
      { id: 'automation', label: 'Tools and Automation', route: '/tools', priority: 3, enabled: true },
      { id: 'memory', label: 'Memory Context', route: '/memory', priority: 4, enabled: true },
      { id: 'simulations', label: 'Simulation Control', route: '/simulations', priority: 5, enabled: true },
    ],
    orchestration: {
      telemetry: 'full',
      verification: 'email-required',
      collaboration: 'solo',
    },
    summary: [],
  }

  const enabledRoutes = resolveEnabledWorkspaceModuleRoutes(workspace, formation)

  assert.deepEqual(
    Array.from(enabledRoutes ?? []),
    ['/assistant', '/analytics', '/tools', '/memory', '/simulations'],
  )
})