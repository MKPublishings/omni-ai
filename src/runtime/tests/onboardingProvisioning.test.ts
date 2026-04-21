import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProvisionWorkspaceInput } from '../../onboarding/provisioning';

test('parseProvisionWorkspaceInput accepts a valid onboarding formation payload', () => {
  const result = parseProvisionWorkspaceInput({
    formation: {
      workspaceId: 'ix-12345678',
      workspaceName: 'Sovereign Operations',
      workspaceSlug: 'sovereign-operations',
      primaryRoute: '/assistant',
      capabilityScore: 6,
      shell: {
        layoutMode: 'focus',
      },
      modules: [
        {
          id: 'assistant',
          label: 'Ionirix Assistant',
          route: '/assistant',
          priority: 1,
          enabled: true,
        },
      ],
      orchestration: {
        telemetry: 'full',
      },
      summary: ['Team workspace shell routed through /assistant.'],
    },
    context: {
      workspace: {
        role: 'operator',
      },
      preferences: {
        theme: 'dark',
      },
    },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.formation.workspaceSlug, 'sovereign-operations');
    assert.equal(result.data.formation.modules.length, 1);
  }
});

test('parseProvisionWorkspaceInput rejects incomplete formation payloads', () => {
  const result = parseProvisionWorkspaceInput({
    formation: {
      workspaceId: 'ix-12345678',
      workspaceName: 'Broken Formation',
      workspaceSlug: 'broken-formation',
      capabilityScore: 1,
      shell: {},
      modules: [],
      orchestration: {},
      summary: [],
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /At least one workspace module is required/);
  }
});