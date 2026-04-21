import { reflowEngine } from '@/core/engine';
import type { EventPayload } from '@/types';
import type { ReplayDiagnostics } from '@/types';
import type { OnboardingContext, ReplayRoutingCondition, SpatialPreferences } from '@/types';
import type { ReplayPreviewExportProfile } from './exportArtifacts';

const onboardingKey = 'ionirix:onboarding';
const calibrationDraftPrefix = 'ionirix:calibration-draft:';
const calibrationHistoryPrefix = 'ionirix:calibration-history:';
const inspectorViewPrefix = 'ionirix:inspector-view:';
const replayPreviewPrefix = 'ionirix:replay-preview:';
const calibrationPersistenceEvent = 'ionirix:calibration-persistence';

export type InspectorBaselineRevisionSelection = 'live' | 1 | 2 | 3;
export type InspectorSourceFilterSelection = 'all' | 'reflow' | 'behavior' | 'telemetry' | 'replay';
export type InspectorTimeWindowSelection = 'all' | '1m' | '5m' | '1h';
export type InspectorCompatibilitySelection = 'all' | 'compatible' | 'normalize' | 'incompatible' | 'unknown';

export interface InspectorViewState {
  baselineRevision: InspectorBaselineRevisionSelection;
  sourceFilter: InspectorSourceFilterSelection;
  timeWindow: InspectorTimeWindowSelection;
  compatibilityFilter: InspectorCompatibilitySelection;
  focusedBaselineSurface: string | null;
  focusedZoneId: string | null;
  focusedProperty: string | null;
}

export interface ReplayPreviewState {
  payload: string;
  replayEvent: EventPayload<'CALIBRATION_REPLAY'>;
  candidatePayload?: string | null;
  candidateReplayEvent?: EventPayload<'CALIBRATION_REPLAY'> | null;
  previewProfile?: ReplayPreviewExportProfile;
  semanticFilter?: ReplayPreviewSemanticFilterSelection;
}

export type ReplayPreviewSemanticFilterSelection = 'all' | 'target' | 'compatibility' | 'route' | 'normalization' | 'remaps';

export const loadOnboardingState = (): OnboardingContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(onboardingKey);
  return raw ? (JSON.parse(raw) as OnboardingContext) : null;
};

export const saveOnboardingState = (context: OnboardingContext): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(onboardingKey, JSON.stringify(context));
};

export interface CalibrationDraft {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CalibrationHistoryEntry {
  timestamp: number;
  surfaceId: string;
  prefs: SpatialPreferences;
  draft: CalibrationDraft;
  source: 'interactive' | 'recommended';
  targetSurface?: string;
  availableTargetSurfaces?: string[];
  machineState?: string;
  currentStep?: number;
  selectedCapabilities?: string[];
}

export interface CalibrationReplayPlan {
  targetSurface?: string;
  availableTargetSurfaces?: string[];
  diagnostics?: ReplayDiagnostics;
}

const emitCalibrationPersistenceEvent = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(calibrationPersistenceEvent));
};

export const loadCalibrationDraft = (surfaceId: string): CalibrationDraft | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(`${calibrationDraftPrefix}${surfaceId}`);
  return raw ? (JSON.parse(raw) as CalibrationDraft) : null;
};

export const saveCalibrationDraft = (surfaceId: string, draft: CalibrationDraft): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${calibrationDraftPrefix}${surfaceId}`, JSON.stringify(draft));
  emitCalibrationPersistenceEvent();
};

export const loadCalibrationHistory = (surfaceId: string): CalibrationHistoryEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(`${calibrationHistoryPrefix}${surfaceId}`);
  return raw ? (JSON.parse(raw) as CalibrationHistoryEntry[]) : [];
};

export const appendCalibrationHistory = (
  surfaceId: string,
  entry: Omit<CalibrationHistoryEntry, 'surfaceId' | 'timestamp'> & Partial<Pick<CalibrationHistoryEntry, 'timestamp'>>,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextEntry: CalibrationHistoryEntry = {
    surfaceId,
    timestamp: entry.timestamp ?? Date.now(),
    prefs: entry.prefs,
    draft: entry.draft,
    source: entry.source,
    ...(entry.targetSurface ? { targetSurface: entry.targetSurface } : {}),
    ...(entry.availableTargetSurfaces ? { availableTargetSurfaces: entry.availableTargetSurfaces } : {}),
    ...(entry.machineState ? { machineState: entry.machineState } : {}),
    ...(entry.currentStep !== undefined ? { currentStep: entry.currentStep } : {}),
    ...(entry.selectedCapabilities ? { selectedCapabilities: entry.selectedCapabilities } : {}),
  };
  const history = loadCalibrationHistory(surfaceId);
  window.localStorage.setItem(
    `${calibrationHistoryPrefix}${surfaceId}`,
    JSON.stringify([nextEntry, ...history].slice(0, 12)),
  );
  emitCalibrationPersistenceEvent();
};

export const subscribeCalibrationPersistence = (listener: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (
      event.key?.startsWith(calibrationDraftPrefix)
      || event.key?.startsWith(calibrationHistoryPrefix)
      || event.key?.startsWith(inspectorViewPrefix)
      || event.key?.startsWith(replayPreviewPrefix)
    ) {
      listener();
    }
  };

  window.addEventListener(calibrationPersistenceEvent, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(calibrationPersistenceEvent, listener);
    window.removeEventListener('storage', onStorage);
  };
};

export const loadInspectorViewState = (surfaceId: string): InspectorViewState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(`${inspectorViewPrefix}${surfaceId}`);
  return raw ? (JSON.parse(raw) as InspectorViewState) : null;
};

export const saveInspectorViewState = (surfaceId: string, state: InspectorViewState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${inspectorViewPrefix}${surfaceId}`, JSON.stringify(state));
  emitCalibrationPersistenceEvent();
};

export const clearInspectorViewState = (surfaceId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(`${inspectorViewPrefix}${surfaceId}`);
  emitCalibrationPersistenceEvent();
};

const getReplayPreviewKey = (surfaceId: string, origin: EventPayload<'CALIBRATION_REPLAY'>['origin']): string => (
  `${replayPreviewPrefix}${surfaceId}:${origin}`
);

export const loadReplayPreviewState = (
  surfaceId: string,
  origin: EventPayload<'CALIBRATION_REPLAY'>['origin'],
): ReplayPreviewState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(getReplayPreviewKey(surfaceId, origin));
  return raw ? (JSON.parse(raw) as ReplayPreviewState) : null;
};

export const saveReplayPreviewState = (
  surfaceId: string,
  origin: EventPayload<'CALIBRATION_REPLAY'>['origin'],
  state: ReplayPreviewState | null,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const key = getReplayPreviewKey(surfaceId, origin);

  if (!state) {
    window.localStorage.removeItem(key);
    emitCalibrationPersistenceEvent();
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(state));
  emitCalibrationPersistenceEvent();
};

export const clearReplayPreviewState = (
  surfaceId: string,
  origin: EventPayload<'CALIBRATION_REPLAY'>['origin'],
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getReplayPreviewKey(surfaceId, origin));
  emitCalibrationPersistenceEvent();
};

const matchesReplayRoutingCondition = (
  entry: CalibrationHistoryEntry,
  condition: ReplayRoutingCondition | undefined,
): boolean => {
  if (!condition) {
    return true;
  }

  const checks = [
    condition.machineState === undefined
      ? true
      : entry.machineState !== undefined && condition.machineState.includes(entry.machineState),
    condition.currentStep === undefined
      ? true
      : entry.currentStep !== undefined && condition.currentStep.includes(entry.currentStep),
    condition.includesCapabilities === undefined
      ? true
      : condition.includesCapabilities.every((capability) => entry.selectedCapabilities?.includes(capability)),
  ];

  return checks.every(Boolean);
};

export const resolveCalibrationReplayPlan = (
  entry: CalibrationHistoryEntry,
  fallbackTargetSurface?: string,
  fallbackAvailableTargetSurfaces?: string[],
): CalibrationReplayPlan => {
  const sourceSchema = reflowEngine.getSchemaForSurfaceId(entry.surfaceId);
  const replayRouting = sourceSchema?.surface.replayRouting;
  const matchedRoute = replayRouting?.rules?.find((rule) => matchesReplayRoutingCondition(entry, rule.when));
  const targetSurface = entry.targetSurface ?? matchedRoute?.targetSurface ?? replayRouting?.defaultTargetSurface ?? sourceSchema?.surface.replayTargetSurface ?? fallbackTargetSurface;
  const availableTargetSurfaces = Array.from(
    new Set(
      [
        ...(entry.availableTargetSurfaces
          ?? matchedRoute?.availableTargetSurfaces
          ?? replayRouting?.availableTargetSurfaces
          ?? sourceSchema?.surface.replayTargetSurfaces
          ?? fallbackAvailableTargetSurfaces
          ?? []),
        ...(targetSurface ? [targetSurface] : []),
      ].filter(Boolean),
    ),
  );
  const diagnostics: ReplayDiagnostics | undefined = targetSurface
    ? {
        sourceSurface: entry.surfaceId,
        targetSurface,
        resolution: entry.targetSurface
          ? 'explicit-target'
          : matchedRoute
            ? 'routing-rule'
            : replayRouting?.defaultTargetSurface || sourceSchema?.surface.replayTargetSurface
              ? 'routing-default'
              : 'fallback-target',
        ...(matchedRoute ? { matchedRuleId: matchedRoute.id } : {}),
        ...(sourceSchema ? { schemaVersion: sourceSchema.version } : {}),
        ...(sourceSchema?.migration ? { migration: sourceSchema.migration } : {}),
      }
    : undefined;

  return {
    ...(targetSurface ? { targetSurface } : {}),
    ...(availableTargetSurfaces.length > 0 ? { availableTargetSurfaces } : {}),
    ...(diagnostics ? { diagnostics } : {}),
  };
};