import type { SpatialPreferences } from './onboarding.types';
import type { SchemaMigrationMetadata } from './layout.types';

export type InteractionAction = 'click' | 'hover' | 'focus' | 'scroll' | 'drag';
export type LayoutMutationSource = 'reflow' | 'behavior' | 'telemetry' | 'replay';
export type CollisionSeverity = 'none' | 'low' | 'medium' | 'high';

export interface ReplayDiagnostics {
  sourceSurface: string;
  targetSurface: string;
  resolution: 'explicit-target' | 'routing-rule' | 'routing-default' | 'fallback-target';
  matchedRuleId?: string;
  schemaVersion?: string;
  migration?: SchemaMigrationMetadata;
}

export type IonirixEvent =
  | {
      type: 'INTERACTION';
      payload: {
        zoneId: string;
        action: InteractionAction;
        position: { x: number; y: number };
        timestamp: number;
      };
    }
  | {
      type: 'REFLOW_REQUEST';
      payload: {
        trigger: 'viewport' | 'interaction' | 'behavior' | 'state-change';
        source: string;
        priority: 'immediate' | 'deferred' | 'lazy';
      };
    }
  | {
      type: 'LAYOUT_CHANGE';
      payload: {
        surfaceId: string;
        previousLayout: string;
        nextLayout: string;
        mutations: Array<{ zoneId: string; property: string; value: string | number | boolean; source: LayoutMutationSource; targetGroups?: string[] }>;
        mutationBatches: Array<{
          source: LayoutMutationSource;
          mutations: Array<{ zoneId: string; property: string; value: string | number | boolean; targetGroups?: string[] }>;
        }>;
        replayDiagnostics?: ReplayDiagnostics;
        timestamp: number;
      };
    }
  | {
      type: 'BEHAVIOR_TRIGGER';
      payload: {
        behaviorId: string;
        targetZone: string;
        params: Record<string, unknown>;
      };
    }
  | {
      type: 'STATE_TRANSITION';
      payload: {
        machine: 'onboarding' | 'ui';
        from: string;
        to: string;
        event: string;
      };
    }
  | {
      type: 'SPATIAL_UPDATE';
      payload: {
        collisions: Array<{ zoneA: string; zoneB: string }>;
        balance: { horizontal: number; vertical: number };
      };
    }
  | {
      type: 'CALIBRATION_REPLAY';
      payload: {
        targetSurface: string;
        availableTargetSurfaces?: string[];
        sourceSurface: string;
        prefs: SpatialPreferences;
        origin: 'history-replay' | 'history-restore';
        diagnostics?: ReplayDiagnostics;
      };
    };

export type IonirixEventType = IonirixEvent['type'];
export type EventPayload<T extends IonirixEventType> = Extract<IonirixEvent, { type: T }>['payload'];