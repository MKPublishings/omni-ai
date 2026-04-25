import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDashboardShellLayoutClasses,
  resolveDashboardShellArrangement,
} from '@/components/dashboard-shell-layout'
import type { DashboardOnboardingWorkspace } from '@/lib/dashboard'
import type { WorkspaceFormation } from '@/onboarding'

test('resolveDashboardShellArrangement prefers saved workspace preferences over formation fallback', () => {
  const workspace: DashboardOnboardingWorkspace = {
    id: 'workspace-1',
    userId: 'user-1',
    workspaceId: 'ix-123',
    workspaceName: 'Ionirix Ops',
    workspaceSlug: 'ionirix-ops',
    primaryRoute: '/workspace',
    capabilityScore: 4,
    provisioningStatus: 'active',
    source: 'test',
    shell: {
      layoutMode: 'grid',
      sidebarPosition: 'left',
    },
    modules: [],
    orchestration: {},
    summary: [],
    context: {
      preferences: {
        layoutMode: 'focus',
        sidebarPosition: 'right',
      },
    },
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }

  const fallbackFormation: WorkspaceFormation = {
    workspaceId: 'ix-fallback',
    workspaceName: 'Fallback',
    workspaceSlug: 'fallback',
    primaryRoute: '/workspace',
    capabilityScore: 1,
    shell: {
      layoutMode: 'stack',
      sidebarPosition: 'left',
      density: 'comfortable',
      theme: 'dark',
      motion: 'full',
    },
    modules: [],
    orchestration: {
      telemetry: 'essential',
      verification: 'email-required',
      collaboration: 'solo',
    },
    summary: [],
  }

  const arrangement = resolveDashboardShellArrangement(workspace, fallbackFormation)

  assert.deepEqual(arrangement, {
    layoutMode: 'focus',
    sidebarPosition: 'right',
  })
})

test('buildDashboardShellLayoutClasses mirrors the rail and narrows focus layouts', () => {
  const layout = buildDashboardShellLayoutClasses({
    layoutMode: 'focus',
    sidebarPosition: 'right',
  })

  assert.equal(layout.navHidden, false)
  assert.equal(layout.navSide, 'right')
  assert.match(layout.shellRowClassName, /md:flex-row-reverse/)
  assert.match(layout.frameClassName, /max-w-\[72rem\]/)
})

test('buildDashboardShellLayoutClasses hides navigation when requested', () => {
  const layout = buildDashboardShellLayoutClasses({
    layoutMode: 'stack',
    sidebarPosition: 'hidden',
  })

  assert.equal(layout.navHidden, true)
  assert.equal(layout.navSide, 'left')
  assert.match(layout.frameClassName, /max-w-\[84rem\]/)
})