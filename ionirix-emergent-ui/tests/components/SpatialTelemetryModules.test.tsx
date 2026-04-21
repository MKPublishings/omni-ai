import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSchemaRevisionFixture } from '@/core/schema/defaults';
import { reflowEngine } from '@/core/engine';
import { eventBus } from '@/core/events';
import dashboardSchema from '@/core/schema/defaults/dashboard.schema.json';
import editorialSchema from '@/core/schema/defaults/editorial.schema.json';
import { DashboardCommandCenter, EditorialContextPanel } from '@/components/modules';
import { loadReplayPreviewState } from '@/utils';
import type { LayoutSchema } from '@/types';

describe('spatial telemetry modules', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    eventBus.clearHistory();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders telemetry in the dashboard command center', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        { timestamp: Date.now(), surfaceId: 'onboarding', prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 }, draft: { x: 0, y: 0, width: 120, height: 80 }, source: 'interactive', targetSurface: 'dashboard-root', availableTargetSurfaces: ['dashboard-root', 'onboarding-root'] },
        { timestamp: Date.now() - 1000, surfaceId: 'onboarding', prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 }, draft: { x: 10, y: 10, width: 180, height: 100 }, source: 'interactive', targetSurface: 'onboarding-root', availableTargetSurfaces: ['dashboard-root', 'onboarding-root'] }
      ]),
    );
    reflowEngine.initialize(dashboardSchema as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    expect(screen.getByText('Visible Zones')).toBeInTheDocument();
    expect(screen.getByText('Latest Calibration')).toBeInTheDocument();
    expect(screen.getByText(/Replay target: dashboard-root/i)).toBeInTheDocument();
    expect(screen.getByText(/Replay route: explicit-target/i)).toBeInTheDocument();
    expect(screen.getByText(/Compatibility: direct/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replay Latest Calibration' }));
    expect(eventBus.getHistory().some((event) => event.type === 'CALIBRATION_REPLAY')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Replay 2' }));
    expect(eventBus.getHistory().filter((event) => event.type === 'CALIBRATION_REPLAY')).toHaveLength(2);
    expect(eventBus.getHistory().find((event) => event.type === 'CALIBRATION_REPLAY')?.payload.targetSurface).toBe('dashboard-root');
    expect(eventBus.getHistory().find((event) => event.type === 'CALIBRATION_REPLAY')?.payload.availableTargetSurfaces).toContain('dashboard-root');
    expect(eventBus.getHistory().filter((event) => event.type === 'CALIBRATION_REPLAY')[1]?.payload.targetSurface).toBe('onboarding-root');
  });

  it('renders calibration telemetry in the editorial context panel', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        { timestamp: Date.now(), surfaceId: 'onboarding', prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 }, draft: { x: 0, y: 0, width: 120, height: 80 }, source: 'interactive', targetSurface: 'editorial-root', availableTargetSurfaces: ['editorial-root', 'dashboard-root'] },
        { timestamp: Date.now() - 1000, surfaceId: 'onboarding', prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 }, draft: { x: 10, y: 10, width: 180, height: 100 }, source: 'interactive', targetSurface: 'dashboard-root', availableTargetSurfaces: ['editorial-root', 'dashboard-root'] }
      ]),
    );
    reflowEngine.initialize(editorialSchema as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<EditorialContextPanel />);

    expect(screen.getByText(/Calibration:/)).toBeInTheDocument();
    expect(screen.getByText(/History entries:/)).toBeInTheDocument();
    expect(screen.getByText(/Restore target: editorial-root/i)).toBeInTheDocument();
    expect(screen.getByText(/Replay route: explicit-target/i)).toBeInTheDocument();
    expect(screen.getByText(/Compatibility: direct/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore Latest Calibration' }));
    expect(eventBus.getHistory().some((event) => event.type === 'CALIBRATION_REPLAY')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Restore 2' }));
    expect(eventBus.getHistory().filter((event) => event.type === 'CALIBRATION_REPLAY')).toHaveLength(2);
    expect(eventBus.getHistory().find((event) => event.type === 'CALIBRATION_REPLAY')?.payload.targetSurface).toBe('editorial-root');
    expect(eventBus.getHistory().find((event) => event.type === 'CALIBRATION_REPLAY')?.payload.availableTargetSurfaces).toContain('editorial-root');
    expect(eventBus.getHistory().filter((event) => event.type === 'CALIBRATION_REPLAY')[1]?.payload.targetSurface).toBe('dashboard-root');
  });

  it('warns replay actions when a stored calibration requires normalization', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 0, y: 0, width: 120, height: 80 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 3) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    expect(screen.getByRole('button', { name: /Replay 1 · normalize/i })).toBeInTheDocument();
  });

  it('renders a normalized replay preview before commit', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));

    expect(eventBus.getHistory().some((event) => event.type === 'CALIBRATION_REPLAY')).toBe(false);

    const preview = screen.getByLabelText(/Normalized replay preview/i);
    expect(preview).toBeInTheDocument();
    expect((preview as HTMLTextAreaElement).value).toContain('"normalizationStrategy": "ionirix-emergent-ui:1->2"');
    expect((preview as HTMLTextAreaElement).value).toContain('"pref.navigationEdge"');
    expect((preview as HTMLTextAreaElement).value).toContain('"pref.layoutMode"');

    fireEvent.click(screen.getByRole('button', { name: 'Apply Previewed Replay' }));

    expect(eventBus.getHistory().filter((event) => event.type === 'CALIBRATION_REPLAY')).toHaveLength(1);
  });

  it('generates compact replay preview artifacts when the compact profile is selected', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'preview compact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));

    const preview = screen.getByLabelText(/Normalized replay preview/i) as HTMLTextAreaElement;
    expect(preview.value).toContain('"profile": "compact"');
    expect(preview.value).toContain('"manifest"');
    expect(preview.value).toContain('"semanticSummary"');
    expect(preview.value).not.toContain('"draft"');
  });

  it('persists replay preview state per target surface', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    const { unmount } = render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));
    expect(loadReplayPreviewState('dashboard-root', 'history-replay')?.payload).toContain('"normalizationStrategy": "ionirix-emergent-ui:1->2"');

    unmount();
    render(<DashboardCommandCenter />);

    expect(screen.getByLabelText(/Normalized replay preview/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Previewed Replay' })).not.toBeDisabled();
  });

  it('persists replay comparison posture per target surface', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    window.localStorage.setItem(
      'ionirix:replay-preview:dashboard-root:history-replay',
      JSON.stringify({
        payload: JSON.stringify({
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
          compatibility: {
            status: 'unknown',
            label: 'compat: unknown',
            reason: 'Stored preview lacks migration parity.',
          },
          normalization: {
            baselineSchemaVersion: '1.1.0',
            baselineSchemaMigration: { family: 'ionirix-emergent-ui', revision: 2, backwardCompatibleWith: [1] },
            events: [
              {
                surfaceId: 'dashboard-root',
                timestamp: Date.now() - 10,
                schemaVersion: '1.1.0',
                schemaFamily: 'ionirix-emergent-ui',
                schemaRevision: 2,
                compatibility: {
                  status: 'unknown',
                  label: 'compat: unknown',
                  reason: 'Stored preview lacks migration parity.',
                },
                normalizationStrategy: 'identity',
                replay: {
                  sourceSurface: 'onboarding',
                  targetSurface: 'dashboard-root',
                  route: 'stored-route',
                  resolution: 'explicit-target',
                },
                mutations: [
                  {
                    source: 'replay',
                    zoneId: 'calibration',
                    property: 'pref.layoutMode',
                    valueText: 'float',
                    targetGroups: [],
                    original: { property: 'pref.layoutMode', valueText: 'float', targetGroups: [] },
                    normalized: { property: 'pref.layoutMode', valueText: 'float', targetGroups: [] },
                  },
                ],
              },
            ],
          },
          calibration: {
            sourceSurface: 'onboarding',
            origin: 'history-replay',
            prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 },
            draft: { x: 0, y: 0, width: 100, height: 60 },
          },
        }),
        replayEvent: {
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
          sourceSurface: 'onboarding',
          prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 },
          origin: 'history-replay',
        },
      }),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    const { unmount } = render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'preview compact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));
    fireEvent.click(screen.getByRole('button', { name: 'normalize changed' }));

    expect(loadReplayPreviewState('dashboard-root', 'history-replay')).toMatchObject({
      previewProfile: 'compact',
      semanticFilter: 'normalization',
    });

    unmount();
    render(<DashboardCommandCenter />);

    expect(screen.getByRole('button', { name: 'preview compact' }).className).toContain('is-active');
    expect(screen.getByRole('button', { name: 'normalize changed' }).className).toContain('is-active');
    expect(screen.getByRole('button', { name: /Drift Summary/i })).toBeInTheDocument();
    expect(screen.getByText(/normalize changed: yes/i)).toBeInTheDocument();
    expect(screen.queryByText(/route changed: yes/i)).not.toBeInTheDocument();
  });

  it('clears persisted replay preview state on demand', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));
    expect(loadReplayPreviewState('dashboard-root', 'history-replay')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Previewed Replay' }));

    expect(loadReplayPreviewState('dashboard-root', 'history-replay')).toBeNull();
    expect(screen.queryByLabelText(/Normalized replay preview/i)).not.toBeInTheDocument();
  });

  it('shows a comparison before replacing a stored replay preview', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    window.localStorage.setItem(
      'ionirix:replay-preview:dashboard-root:history-replay',
      JSON.stringify({
        payload: JSON.stringify({
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
          compatibility: {
            status: 'unknown',
            label: 'compat: unknown',
            reason: 'Stored preview lacks migration parity.',
          },
          normalization: {
            baselineSchemaVersion: '1.1.0',
            baselineSchemaMigration: { family: 'ionirix-emergent-ui', revision: 2, backwardCompatibleWith: [1] },
            events: [
              {
                surfaceId: 'dashboard-root',
                timestamp: Date.now() - 10,
                schemaVersion: '1.1.0',
                schemaFamily: 'ionirix-emergent-ui',
                schemaRevision: 2,
                compatibility: {
                  status: 'unknown',
                  label: 'compat: unknown',
                  reason: 'Stored preview lacks migration parity.',
                },
                normalizationStrategy: 'identity',
                replay: {
                  sourceSurface: 'onboarding',
                  targetSurface: 'dashboard-root',
                  route: 'stored-route',
                  resolution: 'explicit-target',
                },
                mutations: [
                  {
                    source: 'replay',
                    zoneId: 'calibration',
                    property: 'pref.layoutMode',
                    valueText: 'float',
                    targetGroups: [],
                    original: { property: 'pref.layoutMode', valueText: 'float', targetGroups: [] },
                    normalized: { property: 'pref.layoutMode', valueText: 'float', targetGroups: [] },
                  },
                ],
              },
            ],
          },
          calibration: {
            sourceSurface: 'onboarding',
            origin: 'history-replay',
            prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 },
            draft: { x: 0, y: 0, width: 100, height: 60 },
          },
        }),
        replayEvent: {
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
          sourceSurface: 'onboarding',
          prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 },
          origin: 'history-replay',
        },
      }),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));

    expect(screen.getByText(/Preview Comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/Semantic Delta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Drift Summary/i })).toBeInTheDocument();
    expect(screen.getByText(/elevated/i)).toBeInTheDocument();
    expect(screen.getByText(/target changed/i)).toBeInTheDocument();
    expect(screen.getByText(/normalize changed: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/1 remaps added/i)).toBeInTheDocument();
    expect(screen.getByText(/route changed: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/added remaps: pref.sidebarPosition -> pref.navigationEdge/i)).toBeInTheDocument();
    expect((screen.getByLabelText(/Stored replay preview/i) as HTMLTextAreaElement).value).toContain('"targetSurface":"dashboard-root"');
    expect((screen.getByLabelText(/Candidate replay preview/i) as HTMLTextAreaElement).value).toContain('"normalizationStrategy": "ionirix-emergent-ui:1->2"');
    expect((screen.getByLabelText(/Candidate replay preview/i) as HTMLTextAreaElement).value).toContain('"semanticSummary"');
    expect(loadReplayPreviewState('dashboard-root', 'history-replay')?.payload).toContain('"targetSurface":"dashboard-root"');

    fireEvent.click(screen.getByRole('button', { name: /Normalization Drift/i }));

    expect(screen.getByText(/normalize changed: yes/i)).toBeInTheDocument();
    expect(screen.queryByText(/route changed: yes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/added remaps: pref.sidebarPosition -> pref.navigationEdge/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Replace Stored Preview' }));

    expect(loadReplayPreviewState('dashboard-root', 'history-replay')?.payload).toContain('"normalizationStrategy": "ionirix-emergent-ui:1->2"');
  });

  it('resets comparison posture without clearing the accepted replay preview', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    window.localStorage.setItem(
      'ionirix:replay-preview:dashboard-root:history-replay',
      JSON.stringify({
        payload: JSON.stringify({
          profile: 'full',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
          compatibility: {
            status: 'unknown',
            label: 'compat: unknown',
            reason: 'Stored preview lacks migration parity.',
          },
          semanticSummary: {
            sourceSurface: 'onboarding',
            targetSurface: 'dashboard-root',
            compatibilityStatus: 'unknown',
            compatibilityLabel: 'compat: unknown',
            route: 'stored-route',
            normalizationStrategy: 'identity',
            remappedProperties: [],
          },
          normalization: {
            baselineSchemaVersion: '1.1.0',
            baselineSchemaMigration: { family: 'ionirix-emergent-ui', revision: 2, backwardCompatibleWith: [1] },
            events: [],
          },
          calibration: {
            sourceSurface: 'onboarding',
            origin: 'history-replay',
            prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 },
            draft: { x: 0, y: 0, width: 100, height: 60 },
          },
        }),
        replayEvent: {
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
          sourceSurface: 'onboarding',
          prefs: { layoutMode: 'float', sidebarPosition: 'right', zoneCount: 5 },
          origin: 'history-replay',
        },
      }),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));
    fireEvent.click(screen.getByRole('button', { name: /Normalization Drift/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Comparison' }));

    expect(screen.queryByText(/Preview Comparison/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Normalized replay preview/i)).toBeInTheDocument();
    expect(loadReplayPreviewState('dashboard-root', 'history-replay')).toMatchObject({
      semanticFilter: 'all',
      candidatePayload: null,
      payload: expect.stringContaining('"targetSurface":"dashboard-root"'),
    });
  });

  it('copies the active replay preview artifact to the clipboard', async () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 12, y: 18, width: 160, height: 96 },
          source: 'interactive',
          targetSurface: 'dashboard-root',
          availableTargetSurfaces: ['dashboard-root'],
        },
      ]),
    );
    reflowEngine.initialize((getSchemaRevisionFixture('dashboard-root', 2) ?? dashboardSchema) as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'preview compact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Latest Replay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Preview JSON' }));

    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"profile": "compact"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"manifest"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"schemaVersion": "1.1.0"'));
    expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"driftSeverity": "stable"'));
    await waitFor(() => {
      expect(screen.getByText(/compact replay preview copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it('derives replay targets from calibration intent metadata when explicit targets are absent', () => {
    window.localStorage.setItem(
      'ionirix:calibration-history:onboarding',
      JSON.stringify([
        {
          timestamp: Date.now(),
          surfaceId: 'onboarding',
          prefs: { layoutMode: 'grid', sidebarPosition: 'left', zoneCount: 3 },
          draft: { x: 0, y: 0, width: 120, height: 80 },
          source: 'interactive',
          machineState: 'environmentSetup',
          selectedCapabilities: ['spatial'],
        },
      ]),
    );
    reflowEngine.initialize(dashboardSchema as LayoutSchema);
    reflowEngine.commit(reflowEngine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() }).layout);

    render(<DashboardCommandCenter />);

    expect(screen.getByText(/Replay target: dashboard-root/i)).toBeInTheDocument();
    expect(screen.getByText(/Replay route: route-environment-to-dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Compatibility: direct/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Replay Latest Calibration' }));

    const replayEvent = eventBus.getHistory().find((event) => event.type === 'CALIBRATION_REPLAY');
    expect(replayEvent?.payload.targetSurface).toBe('dashboard-root');
    expect(replayEvent?.payload.availableTargetSurfaces).toContain('dashboard-root');
    expect(replayEvent?.payload.availableTargetSurfaces).not.toContain('editorial-root');
    expect(replayEvent?.payload.diagnostics?.matchedRuleId).toBe('route-environment-to-dashboard');
    expect(replayEvent?.payload.diagnostics?.resolution).toBe('routing-rule');
  });
});