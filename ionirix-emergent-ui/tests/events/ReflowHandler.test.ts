import { describe, expect, it } from 'vitest';
import onboardingSchema from '@/core/schema/defaults/onboarding.schema.json';
import editorialSchema from '@/core/schema/defaults/editorial.schema.json';
import { ReflowEngine } from '@/core/engine/ReflowEngine';
import { EventBus } from '@/core/events/EventBus';
import { ReflowHandler } from '@/core/events/handlers/ReflowHandler';
import { BehaviorRegistry, registerDefaultBehaviors } from '@/core/registry';
import type { LayoutSchema } from '@/types';

describe('ReflowHandler layout change batches', () => {
  it('classifies behavior-driven mutations separately from telemetry mutations', () => {
    const bus = new EventBus();
    const engine = new ReflowEngine();
    const registry = registerDefaultBehaviors(BehaviorRegistry.getInstance());
    const handler = new ReflowHandler(bus, engine, registry);

    engine.initialize(onboardingSchema as LayoutSchema);
    engine.setFocusedZone('context-panel');
    engine.recordInteraction('context-panel:1');
    engine.recordInteraction('context-panel:2');
    engine.recordInteraction('context-panel:3');

    bus.emit('REFLOW_REQUEST', { trigger: 'viewport', source: 'test-behavior', priority: 'immediate' });

    const layoutChange = bus.getHistory().find((event) => event.type === 'LAYOUT_CHANGE');
    expect(layoutChange?.payload.mutationBatches.some((batch) => batch.source === 'behavior')).toBe(true);
    expect(layoutChange?.payload.mutationBatches.some((batch) => batch.source === 'behavior' && batch.mutations.some((mutation) => mutation.targetGroups?.includes('primary-content')))).toBe(true);
    expect(layoutChange?.payload.surfaceId).toBe('onboarding-root');

    handler.dispose();
    bus.dispose();
  });

  it('classifies telemetry-driven mutations separately from reflow mutations', () => {
    const bus = new EventBus();
    const engine = new ReflowEngine();
    const registry = registerDefaultBehaviors(BehaviorRegistry.getInstance());
    const handler = new ReflowHandler(bus, engine, registry);

    engine.setViewport({ width: 780, height: 900, density: 1 });
    engine.initialize(editorialSchema as LayoutSchema);

    bus.emit('REFLOW_REQUEST', { trigger: 'viewport', source: 'test-telemetry', priority: 'immediate' });

    const layoutChange = bus.getHistory().find((event) => event.type === 'LAYOUT_CHANGE');
    expect(layoutChange?.payload.mutationBatches.some((batch) => batch.source === 'telemetry')).toBe(true);
    expect(layoutChange?.payload.surfaceId).toBe('editorial-root');

    handler.dispose();
    bus.dispose();
  });

  it('annotates replay batches with semantic target groups', () => {
    const bus = new EventBus();
    const engine = new ReflowEngine();
    const registry = registerDefaultBehaviors(BehaviorRegistry.getInstance());
    const handler = new ReflowHandler(bus, engine, registry);

    engine.setViewport({ width: 780, height: 900, density: 1 });
    engine.initialize(editorialSchema as LayoutSchema);
    engine.commit(engine.requestReflow({ source: 'initial', type: 'viewport', timestamp: Date.now() }).layout);

    bus.emit('CALIBRATION_REPLAY', {
      targetSurface: 'editorial-root',
      availableTargetSurfaces: ['editorial-root'],
      sourceSurface: 'onboarding-root',
      prefs: { layoutMode: 'stack', sidebarPosition: 'left', zoneCount: 2 },
      origin: 'history-restore',
    });

    const layoutChange = bus.getHistory().filter((event) => event.type === 'LAYOUT_CHANGE').at(-1);
    expect(layoutChange?.payload.mutationBatches.some((batch) => batch.source === 'replay' && batch.mutations.some((mutation) => mutation.targetGroups?.includes('content-cluster')))).toBe(true);

    handler.dispose();
    bus.dispose();
  });
});