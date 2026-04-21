import type { EventPayload, ReflowTrigger, ResolvedLayout } from '@/types';
import { ReflowEngine } from '../../engine/ReflowEngine';
import { BehaviorRegistry } from '../../registry/BehaviorRegistry';
import { EventBus } from '../EventBus';

export class ReflowHandler {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs = 16;
  private readonly reflowSubscription;
  private readonly calibrationReplaySubscription;

  constructor(
    private readonly bus: EventBus,
    private readonly engine: ReflowEngine,
    private readonly registry: BehaviorRegistry,
  ) {
    this.reflowSubscription = this.bus.on('REFLOW_REQUEST', this.handleReflowRequest.bind(this));
    this.calibrationReplaySubscription = this.bus.on('CALIBRATION_REPLAY', this.handleCalibrationReplay.bind(this));
  }

  private handleReflowRequest(payload: EventPayload<'REFLOW_REQUEST'>): void {
    if (payload.priority === 'immediate') {
      this.executeReflow(payload);
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const delay = payload.priority === 'lazy' ? 100 : this.debounceMs;
    this.debounceTimer = setTimeout(() => {
      this.executeReflow(payload);
    }, delay);
  }

  private executeReflow(payload: EventPayload<'REFLOW_REQUEST'>): void {
    const trigger: ReflowTrigger = {
      source: payload.source,
      type: payload.trigger,
      timestamp: Date.now(),
    };
    const result = this.engine.requestReflow(trigger);
    const activated = this.registry.evaluate(this.engine.getBehaviorContext(result.layout));
    const activeBehaviors = this.registry.getActive();
    const behaviorLayout = this.engine.applyBehaviors(result.layout, activeBehaviors);
    const finalLayout = this.engine.applyTelemetryMutations(behaviorLayout);
    const mutationBatches = [
      {
        source: 'reflow' as const,
        mutations: result.mutations.map((mutation) => ({
          zoneId: mutation.zoneId,
          property: mutation.property,
          value: mutation.nextValue,
          ...(mutation.targetGroups ? { targetGroups: mutation.targetGroups } : {}),
        })),
      },
      {
        source: 'behavior' as const,
        mutations: this.diffLayouts(result.layout, behaviorLayout),
      },
      {
        source: 'telemetry' as const,
        mutations: this.diffLayouts(behaviorLayout, finalLayout),
      },
    ].filter((batch) => batch.mutations.length > 0);

    this.engine.commit(finalLayout);
    activated.forEach((behavior) => {
      this.bus.emit('BEHAVIOR_TRIGGER', {
        behaviorId: behavior.id,
        targetZone: '*',
        params: { source: payload.source },
      });
    });
    const snapshot = this.engine.getSpatialSnapshot();

    if (snapshot) {
      this.bus.emit('SPATIAL_UPDATE', {
        collisions: snapshot.collisions.map((collision) => ({ zoneA: collision.zoneA, zoneB: collision.zoneB })),
        balance: snapshot.balance,
      });
    }
    this.bus.emit('LAYOUT_CHANGE', {
      surfaceId: finalLayout.id,
      previousLayout: this.hashLayout(result.layout),
      nextLayout: this.hashLayout(finalLayout),
      mutations: mutationBatches.flatMap((batch) => batch.mutations.map((mutation) => ({ ...mutation, source: batch.source }))),
      mutationBatches,
      timestamp: Date.now(),
    });
  }

  private handleCalibrationReplay(payload: EventPayload<'CALIBRATION_REPLAY'>): void {
    const currentLayout = this.engine.getCurrentLayout();

    const targetMatches = currentLayout && (currentLayout.id === payload.targetSurface || payload.availableTargetSurfaces?.includes(currentLayout.id));

    if (!currentLayout || !targetMatches) {
      return;
    }

    const replayedLayout = this.engine.applyCalibrationReplay(currentLayout, payload.prefs);
    const replayBatch = {
      source: 'replay' as const,
      mutations: this.diffLayouts(currentLayout, replayedLayout),
    };

    this.engine.commit(replayedLayout);
    this.bus.emit('LAYOUT_CHANGE', {
      surfaceId: replayedLayout.id,
      previousLayout: this.hashLayout(currentLayout),
      nextLayout: this.hashLayout(replayedLayout),
      mutations: replayBatch.mutations.map((mutation) => ({ ...mutation, source: 'replay' as const })),
      mutationBatches: replayBatch.mutations.length > 0 ? [replayBatch] : [],
      ...(payload.diagnostics ? { replayDiagnostics: payload.diagnostics } : {}),
      timestamp: Date.now(),
    });
  }

  private diffLayouts(previous: ResolvedLayout, next: ResolvedLayout): Array<{ zoneId: string; property: string; value: string | number | boolean; targetGroups?: string[] }> {
    return this.engine.diffLayouts(previous, next);
  }

  private hashLayout(layout: unknown): string {
    return JSON.stringify(layout).slice(0, 64);
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.reflowSubscription.unsubscribe();
    this.calibrationReplaySubscription.unsubscribe();
  }
}