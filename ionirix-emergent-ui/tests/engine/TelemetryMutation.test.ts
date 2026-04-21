import { describe, expect, it } from 'vitest';
import dashboardSchema from '@/core/schema/defaults/dashboard.schema.json';
import editorialSchema from '@/core/schema/defaults/editorial.schema.json';
import { ReflowEngine } from '@/core/engine/ReflowEngine';
import type { LayoutSchema } from '@/types';

describe('ReflowEngine telemetry mutations', () => {
  it('hides the editorial context zone when telemetry recommends a stacked layout', () => {
    const engine = new ReflowEngine();
    engine.setViewport({ width: 780, height: 900, density: 1 });
    engine.initialize(editorialSchema as LayoutSchema);

    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    const mutated = engine.applyTelemetryMutations(result.layout);

    expect(mutated.zones['editorial-context']?.visibility).toBe('hidden');
    expect(mutated.zones['editorial-body']?.metadata?.['data-telemetry-state']).toBe('immersive');
  });

  it('compresses the dashboard command bar when telemetry detects a stacked viewport', () => {
    const engine = new ReflowEngine();
    engine.setViewport({ width: 780, height: 900, density: 1 });
    engine.initialize(dashboardSchema as LayoutSchema);

    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    const mutated = engine.applyTelemetryMutations(result.layout);

    expect(mutated.zones['command-bar']?.visibility).toBe('collapsed');
    expect(mutated.zones['workspace-main']?.metadata?.['data-telemetry-state']).toBe('expanded');
  });

  it('respects telemetry conditions that include collision and priority thresholds', () => {
    const engine = new ReflowEngine();
    engine.setViewport({ width: 1440, height: 900, density: 1 });
    engine.initialize(editorialSchema as LayoutSchema);

    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    const replayed = engine.applyCalibrationReplay(result.layout, {
      layoutMode: 'stack',
      sidebarPosition: 'left',
      zoneCount: 2,
    });

    expect(replayed.zones['editorial-context']?.visibility).toBe('hidden');
    expect(replayed.zones['editorial-body']?.metadata?.['transition-source']).toBe('replay');
  });

  it('supports collision severity conditions in declarative telemetry rules', () => {
    const engine = new ReflowEngine();
    engine.setViewport({ width: 780, height: 900, density: 1 });
    engine.initialize(dashboardSchema as LayoutSchema);

    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    const mutated = engine.applyTelemetryMutations(result.layout);

    expect(mutated.zones['command-bar']?.visibility).toBe('collapsed');
    expect(mutated.zones['workspace-main']?.metadata?.['data-telemetry-state']).toBe('expanded');
  });

  it('supports relation-aware telemetry conditions in declarative rules', () => {
    const engine = new ReflowEngine();
    engine.setViewport({ width: 1440, height: 900, density: 1 });
    engine.initialize(editorialSchema as LayoutSchema);

    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    const replayed = engine.applyCalibrationReplay(result.layout, {
      layoutMode: 'stack',
      sidebarPosition: 'left',
      zoneCount: 2,
    });

    expect(replayed.zones['editorial-context']?.visibility).toBe('hidden');
    expect(replayed.zones['editorial-body']?.metadata?.['data-telemetry-state']).toBe('immersive');
  });

  it('supports inverse relation matching for grouped zone aliases in declarative rules', () => {
    const engine = new ReflowEngine();
    engine.setViewport({ width: 1440, height: 900, density: 1 });
    engine.initialize(editorialSchema as LayoutSchema);

    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    const mutated = engine.applyTelemetryMutations(result.layout);

    expect(mutated.zones['editorial-context']?.visibility).toBe('hidden');
    expect(mutated.zones['editorial-body']?.metadata?.['data-telemetry-state']).toBe('immersive');
  });

  it('supports telemetry mutations that target zone groups directly', () => {
    const engine = new ReflowEngine();
    engine.setViewport({ width: 780, height: 900, density: 1 });
    engine.initialize(dashboardSchema as LayoutSchema);

    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });
    const mutated = engine.applyTelemetryMutations(result.layout);

    expect(mutated.zones['workspace-main']?.metadata?.['data-telemetry-state']).toBe('expanded');
    expect(mutated.zones['workspace-main']?.metadata?.['transition-source']).toBe('telemetry');
  });
});