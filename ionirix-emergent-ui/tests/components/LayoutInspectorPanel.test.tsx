import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import dashboardSchema from '@/core/schema/defaults/dashboard.schema.json';
import { getSchemaRevisionFixture } from '@/core/schema/defaults';
import { reflowEngine } from '@/core/engine';
import { eventBus } from '@/core/events';
import { LayoutInspectorPanel } from '@/components/modules';
import { loadInspectorViewState } from '@/utils';
import type { LayoutSchema } from '@/types';

describe('LayoutInspectorPanel', () => {
  beforeEach(() => {
    eventBus.clearHistory();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renders source-classified layout mutation batches from event history', () => {
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev',
      nextLayout: 'next',
      mutations: [
        { zoneId: 'main', property: 'visibility', value: 'collapsed', source: 'telemetry' },
        { zoneId: 'context', property: 'scale', value: 1.04, source: 'behavior', targetGroups: ['workspace-cluster'] },
      ],
      mutationBatches: [
        { source: 'telemetry', mutations: [{ zoneId: 'main', property: 'visibility', value: 'collapsed' }] },
        { source: 'behavior', mutations: [{ zoneId: 'context', property: 'scale', value: 1.04, targetGroups: ['workspace-cluster'] }] },
      ],
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    expect(screen.getByText('Mutation Batches')).toBeInTheDocument();
    expect(screen.getByText(/dashboard-root\s+@/i)).toBeInTheDocument();
    expect(screen.getByText(/telemetry: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/behavior -> context.scale = 1.04 \[workspace-cluster\]/i)).toBeInTheDocument();
  });

  it('filters and pins mutation batches', () => {
    const firstTimestamp = Date.now();
    const secondTimestamp = firstTimestamp + 1000;

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-1',
      nextLayout: 'next-1',
      mutations: [{ zoneId: 'main', property: 'visibility', value: 'collapsed', source: 'telemetry' }],
      mutationBatches: [{ source: 'telemetry', mutations: [{ zoneId: 'main', property: 'visibility', value: 'collapsed' }] }],
      timestamp: firstTimestamp,
    });
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'editorial-root',
      previousLayout: 'prev-2',
      nextLayout: 'next-2',
      mutations: [{ zoneId: 'context', property: 'scale', value: 1.02, source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'context', property: 'scale', value: 1.02 }] }],
      timestamp: secondTimestamp,
    });

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'dashboard-root' }));
    fireEvent.click(screen.getByRole('button', { name: 'telemetry' }));
    expect(screen.getByText(/telemetry -> main.visibility = collapsed/i)).toBeInTheDocument();
    expect(screen.queryByText(/replay -> context.scale = 1.02/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1 events · dominant telemetry/i)).toBeInTheDocument();

    const [pinButton] = screen.getAllByRole('button', { name: 'Pin' });
    expect(pinButton).toBeDefined();
    fireEvent.click(pinButton as HTMLElement);
    expect(screen.getByRole('button', { name: 'Unpin' })).toBeInTheDocument();
  });

  it('filters mutation batches by migration compatibility status', () => {
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-direct',
      nextLayout: 'next-direct',
      mutations: [{ zoneId: 'main', property: 'visibility', value: 'visible', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'main', property: 'visibility', value: 'visible' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 1 },
      },
      timestamp: Date.now(),
    });
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-normalize',
      nextLayout: 'next-normalize',
      mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'compressed', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'compressed' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 2 },
      },
      timestamp: Date.now() + 1,
    });

    reflowEngine.initialize(dashboardSchema as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'normalize' }));

    expect(screen.getByText(/compat: normalize/i)).toBeInTheDocument();
    expect(screen.getAllByText(/direct 1 · normalize 1/i)).toHaveLength(2);
    expect(screen.getByText(/replay -> main.data-telemetry-state = compressed/i)).toBeInTheDocument();
    expect(screen.queryByText(/replay -> main.visibility = visible/i)).not.toBeInTheDocument();
  });

  it('persists source, compatibility, and time-window filters per surface', () => {
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-direct',
      nextLayout: 'next-direct',
      mutations: [{ zoneId: 'main', property: 'visibility', value: 'visible', source: 'telemetry' }],
      mutationBatches: [{ source: 'telemetry', mutations: [{ zoneId: 'main', property: 'visibility', value: 'visible' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 1 },
      },
      timestamp: Date.now(),
    });
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-normalize',
      nextLayout: 'next-normalize',
      mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'compressed', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'compressed' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 2 },
      },
      timestamp: Date.now() + 1,
    });

    reflowEngine.initialize(dashboardSchema as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    const { unmount } = render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: '1m' }));
    fireEvent.click(screen.getByRole('button', { name: 'normalize' }));
    fireEvent.click(screen.getByRole('button', { name: 'replay' }));

    expect(loadInspectorViewState('dashboard-root')).toMatchObject({
      baselineRevision: 'live',
      timeWindow: '1m',
      compatibilityFilter: 'normalize',
      sourceFilter: 'replay',
      focusedBaselineSurface: null,
      focusedZoneId: null,
      focusedProperty: null,
    });

    unmount();
    render(<LayoutInspectorPanel />);

    expect(screen.getByRole('button', { name: '1m' }).className).toContain('is-active');
    expect(screen.getByRole('button', { name: 'normalize' }).className).toContain('is-active');
    expect(screen.getByRole('button', { name: 'replay' }).className).toContain('is-active');
  });

  it('limits summary and event rows to the selected time window', () => {
    const recentTimestamp = Date.now();
    const staleTimestamp = recentTimestamp - 10 * 60 * 1000;

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-stale',
      nextLayout: 'next-stale',
      mutations: [{ zoneId: 'main', property: 'visibility', value: 'collapsed', source: 'telemetry' }],
      mutationBatches: [{ source: 'telemetry', mutations: [{ zoneId: 'main', property: 'visibility', value: 'collapsed' }] }],
      timestamp: staleTimestamp,
    });
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'editorial-root',
      previousLayout: 'prev-recent',
      nextLayout: 'next-recent',
      mutations: [{ zoneId: 'context', property: 'scale', value: 1.02, source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'context', property: 'scale', value: 1.02 }] }],
      timestamp: recentTimestamp,
    });

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: '1m' }));

    expect(screen.getByText(/editorial-root\s+@/i)).toBeInTheDocument();
    expect(screen.queryByText(/dashboard-root\s+@/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1 events · dominant replay/i)).toBeInTheDocument();
  });

  it('exports the current filtered diff window as JSON', async () => {
    reflowEngine.initialize(dashboardSchema as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev',
      nextLayout: 'next',
      mutations: [{ zoneId: 'main', property: 'visibility', value: 'collapsed', source: 'telemetry' }],
      mutationBatches: [{ source: 'telemetry', mutations: [{ zoneId: 'main', property: 'visibility', value: 'collapsed' }] }],
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'compact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export Diff JSON' }));

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"profile": "compact"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"schemaVersion": "1.0.0"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"schemaMigration"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.not.stringContaining('"summary"'));
    await waitFor(() => {
      expect(screen.getByText(/Filtered diff copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it('renders replay diagnostics from layout history', () => {
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'editorial-root',
      previousLayout: 'prev-replay',
      nextLayout: 'next-replay',
      mutations: [{ zoneId: 'editorial-body', property: 'scale', value: 1.04, source: 'replay', targetGroups: ['content-cluster'] }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'editorial-body', property: 'scale', value: 1.04, targetGroups: ['content-cluster'] }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'editorial-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-spatial-capability-to-editorial',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 1 },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    expect(screen.getByText(/replay rule: route-spatial-capability-to-editorial/i)).toBeInTheDocument();
    expect(screen.getByText(/compat: direct/i)).toBeInTheDocument();
    expect(screen.getByText(/onboarding-root -> editorial-root/i)).toBeInTheDocument();
  });

  it('exports normalized diff artifacts with compatibility metadata', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev',
      nextLayout: 'next',
      mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'collapsed', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'collapsed' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 2 },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    expect(screen.getByText(/compat: normalize/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export Diff JSON' }));

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"normalization"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"status": "normalize"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"normalizationStrategy": "ionirix-emergent-ui:2->1"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"property": "telemetryState"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"valueText": "collapsed"'));
  });

  it('switches comparison baseline revisions through fixture controls', async () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev',
      nextLayout: 'next',
      mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'expanded', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'expanded' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '2.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 3, backwardCompatibleWith: [2] },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    expect(screen.getByText(/compat: normalize/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'revision 2' }));

    expect(screen.getByText(/compat: direct/i)).toBeInTheDocument();
    expect(screen.getByText(/Baseline Diff/i)).toBeInTheDocument();
    expect(screen.getByText(/Surface Baseline Matrix/i)).toBeInTheDocument();
    expect(loadInspectorViewState('dashboard-root')?.baselineRevision).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Export Diff JSON' }));

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"baselineRevision": 2'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"baselineDiff"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"schemaVersion": "1.1.0"'));
    await waitFor(() => {
      expect(screen.getByText(/Filtered diff copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it('drills into a surface from the baseline matrix', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-dashboard',
      nextLayout: 'next-dashboard',
      mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'expanded', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'expanded' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '2.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 3, backwardCompatibleWith: [2] },
      },
      timestamp: Date.now(),
    });
    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'editorial-root',
      previousLayout: 'prev-editorial',
      nextLayout: 'next-editorial',
      mutations: [{ zoneId: 'editorial-context', property: 'data-telemetry-state', value: 'anchored', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'editorial-context', property: 'data-telemetry-state', value: 'anchored' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'editorial-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-spatial-capability-to-editorial',
        schemaVersion: '2.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 3, backwardCompatibleWith: [2] },
      },
      timestamp: Date.now() + 1,
    });

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'revision 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect editorial-root Diff' }));

    expect(screen.getByText(/Focused Surface Diff: editorial-root/i)).toBeInTheDocument();
    expect(screen.getByText(/editorial-root\s+@/i)).toBeInTheDocument();
    expect(screen.queryByText(/dashboard-root\s+@/i)).not.toBeInTheDocument();
    expect(loadInspectorViewState('editorial-root')).toMatchObject({
      focusedBaselineSurface: 'editorial-root',
      focusedZoneId: null,
      focusedProperty: null,
    });
  });

  it('filters visible mutations to a focused baseline zone', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-dashboard',
      nextLayout: 'next-dashboard',
      mutations: [
        { zoneId: 'workspace-main', property: 'data-telemetry-state', value: 'expanded', source: 'replay' },
        { zoneId: 'command-bar', property: 'scale', value: 1.04, source: 'behavior' },
      ],
      mutationBatches: [
        { source: 'replay', mutations: [{ zoneId: 'workspace-main', property: 'data-telemetry-state', value: 'expanded' }] },
        { source: 'behavior', mutations: [{ zoneId: 'command-bar', property: 'scale', value: 1.04 }] },
      ],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '2.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 3, backwardCompatibleWith: [2] },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'revision 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect dashboard-root Diff' }));
    fireEvent.click(screen.getByRole('button', { name: 'workspace-main' }));

    expect(screen.getByText(/zone focus: workspace-main/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'data-telemetry-state' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/behavior: 1/i)).not.toBeInTheDocument();
    expect(loadInspectorViewState('dashboard-root')).toMatchObject({
      focusedBaselineSurface: 'dashboard-root',
      focusedZoneId: 'workspace-main',
      focusedProperty: null,
    });
  });

  it('filters visible mutations to a focused property within a focused zone', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-dashboard',
      nextLayout: 'next-dashboard',
      mutations: [
        { zoneId: 'workspace-main', property: 'data-telemetry-state', value: 'expanded', source: 'replay' },
        { zoneId: 'workspace-main', property: 'visibility', value: 'visible', source: 'telemetry' },
      ],
      mutationBatches: [
        {
          source: 'replay',
          mutations: [
            { zoneId: 'workspace-main', property: 'data-telemetry-state', value: 'expanded' },
            { zoneId: 'workspace-main', property: 'visibility', value: 'visible' },
          ],
        },
      ],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '2.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 3, backwardCompatibleWith: [2] },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'revision 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect dashboard-root Diff' }));
    fireEvent.click(screen.getByRole('button', { name: 'workspace-main' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'data-telemetry-state' })[0] as HTMLElement);

    expect(screen.getByText(/property focus: data-telemetry-state/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'data-telemetry-state' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'visibility' })).not.toBeInTheDocument();
    expect(loadInspectorViewState('dashboard-root')).toMatchObject({
      focusedZoneId: 'workspace-main',
      focusedProperty: 'data-telemetry-state',
    });
  });

  it('resets the persisted baseline revision for the current surface', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'revision 2' }));
    expect(loadInspectorViewState('dashboard-root')?.baselineRevision).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Reset Baseline' }));

    expect(loadInspectorViewState('dashboard-root')).toBeNull();
  });

  it('resets the full inspector posture for the current surface', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev-dashboard',
      nextLayout: 'next-dashboard',
      mutations: [{ zoneId: 'workspace-main', property: 'data-telemetry-state', value: 'expanded', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'workspace-main', property: 'data-telemetry-state', value: 'expanded' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '2.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 3, backwardCompatibleWith: [2] },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    fireEvent.click(screen.getByRole('button', { name: '1m' }));
    fireEvent.click(screen.getByRole('button', { name: 'replay' }));
    fireEvent.click(screen.getByRole('button', { name: 'revision 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect dashboard-root Diff' }));
    fireEvent.click(screen.getByRole('button', { name: 'workspace-main' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'data-telemetry-state' })[0] as HTMLElement);

    expect(loadInspectorViewState('dashboard-root')).toMatchObject({
      baselineRevision: 2,
      sourceFilter: 'replay',
      timeWindow: '1m',
      focusedBaselineSurface: 'dashboard-root',
      focusedZoneId: 'workspace-main',
      focusedProperty: 'data-telemetry-state',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Inspector View' }));

    expect(loadInspectorViewState('dashboard-root')).toBeNull();
    expect(screen.getByRole('button', { name: '1m' }).className).not.toContain('is-active');
    expect(screen.getByRole('button', { name: 'replay' }).className).not.toContain('is-active');
    expect(screen.getByRole('button', { name: 'revision 2' }).className).not.toContain('is-active');
    expect(screen.queryByText(/zone focus:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/property focus:/i)).not.toBeInTheDocument();
  });

  it('normalizes onboarding mutations when exporting against revision 2 fixtures', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('onboarding-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'onboarding-root',
      previousLayout: 'prev',
      nextLayout: 'next',
      mutations: [{ zoneId: 'calibration', property: 'pref.zoneCount', value: 4, source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'calibration', property: 'pref.zoneCount', value: 4 }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'onboarding-root',
        resolution: 'routing-default',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 1 },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'onboarding-root' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export Diff JSON' }));

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"property": "pref.primaryZoneCount"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"original"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"normalized"'));
  });

  it('renders original and normalized mutation snapshots inline for active events', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 1) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'dashboard-root',
      previousLayout: 'prev',
      nextLayout: 'next',
      mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'compressed', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'main', property: 'data-telemetry-state', value: 'compressed' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'dashboard-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-environment-to-dashboard',
        schemaVersion: '1.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 2 },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);

    expect(screen.getByText(/Normalized Snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/^Original$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Normalized$/i)).toBeInTheDocument();
    expect(screen.getByText(/telemetryState/i)).toBeInTheDocument();
  });

  it('normalizes editorial mutations when exporting revision 3 events against revision 2 fixtures', () => {
    reflowEngine.initialize((getSchemaRevisionFixture('editorial-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    eventBus.emit('LAYOUT_CHANGE', {
      surfaceId: 'editorial-root',
      previousLayout: 'prev',
      nextLayout: 'next',
      mutations: [{ zoneId: 'editorial-context', property: 'data-telemetry-state', value: 'anchored', source: 'replay' }],
      mutationBatches: [{ source: 'replay', mutations: [{ zoneId: 'editorial-context', property: 'data-telemetry-state', value: 'anchored' }] }],
      replayDiagnostics: {
        sourceSurface: 'onboarding-root',
        targetSurface: 'editorial-root',
        resolution: 'routing-rule',
        matchedRuleId: 'route-spatial-capability-to-editorial',
        schemaVersion: '2.0.0',
        migration: { family: 'ionirix-emergent-ui', revision: 3, backwardCompatibleWith: [2] },
      },
      timestamp: Date.now(),
    });

    render(<LayoutInspectorPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'editorial-root' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export Diff JSON' }));

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"property": "contextState"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"original": {'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"normalized": {'));
  });
});