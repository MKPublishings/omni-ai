import type { LayoutSchema, ReplayDiagnostics, SchemaMigrationMetadata, SpatialPreferences } from '@/types';

export type MigrationCompatibilityStatus = 'compatible' | 'normalize' | 'incompatible' | 'unknown';

export interface MigrationCompatibilityResult {
  status: MigrationCompatibilityStatus;
  label: string;
  reason: string;
}

export interface CompatibilitySummary {
  total: number;
  compatible: number;
  normalize: number;
  incompatible: number;
  unknown: number;
}

export interface SchemaBaselineDiff {
  surfaceId: string;
  liveVersion: string;
  baselineVersion: string;
  liveRevision: number | null;
  baselineRevision: number | null;
  zoneDelta: number;
  addedZones: string[];
  removedZones: string[];
  behaviorDelta: number;
  telemetryRuleDelta: number;
  addedReplayTargets: string[];
  removedReplayTargets: string[];
}

export interface NormalizationContext {
  baselineSchemaVersion: string;
  baselineSchemaMigration: SchemaMigrationMetadata | null;
  eventSchemaMigration: SchemaMigrationMetadata | null;
}

export interface ExportedDiffEvent {
  surfaceId: string;
  schemaVersion: string;
  schemaMigration: SchemaMigrationMetadata | null;
  timestamp: number;
  replayDiagnostics?: ReplayDiagnostics;
  mutations: Array<{
    zoneId: string;
    property: string;
    value: string | number | boolean;
    source: string;
    targetGroups?: string[];
  }>;
}

export interface ExportNormalizationPayload {
  schemaVersion: string;
  schemaMigration: SchemaMigrationMetadata | null;
  events: ExportedDiffEvent[];
}

export interface NormalizedDiffEvent {
  surfaceId: string;
  timestamp: number;
  schemaVersion: string;
  schemaFamily: string | null;
  schemaRevision: number | null;
  compatibility: MigrationCompatibilityResult;
  normalizationStrategy: string;
  replay: {
    sourceSurface: string | null;
    targetSurface: string | null;
    route: string | null;
    resolution: ReplayDiagnostics['resolution'] | null;
  };
  mutations: Array<{
    source: string;
    zoneId: string;
    property: string;
    valueText: string;
    targetGroups: string[];
    original: {
      property: string;
      valueText: string;
      targetGroups: string[];
    };
    normalized: {
      property: string;
      valueText: string;
      targetGroups: string[];
    };
  }>;
}

export interface CalibrationReplayPreview {
  targetSurface: string;
  availableTargetSurfaces: string[];
  compatibility: MigrationCompatibilityResult;
  normalization: ReturnType<typeof normalizeDiffExportArtifacts>;
  semanticSummary: ReplayPreviewSemanticSummary;
  calibration: {
    sourceSurface: string;
    origin: 'history-replay' | 'history-restore';
    prefs: SpatialPreferences;
    draft: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface CalibrationReplayPreviewInput {
  sourceSurface: string;
  targetSurface: string;
  availableTargetSurfaces?: string[];
  origin: 'history-replay' | 'history-restore';
  timestamp: number;
  prefs: SpatialPreferences;
  draft: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  schemaVersion: string;
  schemaMigration: SchemaMigrationMetadata | null;
  diagnostics?: ReplayDiagnostics;
}

export interface ReplayPreviewSemanticSummary {
  sourceSurface: string;
  targetSurface: string;
  compatibilityStatus: MigrationCompatibilityStatus;
  compatibilityLabel: string;
  route: string;
  normalizationStrategy: string;
  remappedProperties: string[];
}

export interface ReplayPreviewSemanticDiff {
  targetChanged: boolean;
  compatibilityChanged: boolean;
  routeChanged: boolean;
  normalizationChanged: boolean;
  addedRemaps: string[];
  removedRemaps: string[];
}

export interface ReplayPreviewDriftSummary {
  changedSignals: number;
  totalSignals: number;
  remapDeltaCount: number;
  severity: 'stable' | 'moderate' | 'elevated';
  summary: string;
}

export interface ReplayPreviewArtifactManifest {
  profile: ReplayPreviewExportProfile;
  sourceSurface: string;
  targetSurface: string;
  origin: 'history-replay' | 'history-restore';
  schemaVersion: string;
  schemaRevision: number | null;
  compatibilityStatus: MigrationCompatibilityStatus;
  compatibilityLabel: string;
  normalizationStrategy: string;
  driftSeverity: ReplayPreviewDriftSummary['severity'];
  exportedAt: string;
}

export type ReplayPreviewExportProfile = 'compact' | 'full';

export interface ReplayPreviewArtifactOptions {
  driftSummary?: ReplayPreviewDriftSummary | null;
  exportedAt?: string;
}

type NormalizationHook = (event: NormalizedDiffEvent, context: NormalizationContext) => NormalizedDiffEvent;

const identityNormalization: NormalizationHook = (event) => event;

const normalizationHooks: Record<string, NormalizationHook> = {
  'ionirix-emergent-ui:1->2': (event) => ({
    ...event,
    mutations: event.mutations.map((mutation) => ({
      ...mutation,
      property: mutation.property === 'pref.sidebarPosition'
        ? 'pref.navigationEdge'
        : mutation.property === 'pref.zoneCount' && event.surfaceId === 'onboarding-root'
          ? 'pref.primaryZoneCount'
          : mutation.property,
      normalized: {
        ...mutation.normalized,
        property: mutation.property === 'pref.sidebarPosition'
          ? 'pref.navigationEdge'
          : mutation.property === 'pref.zoneCount' && event.surfaceId === 'onboarding-root'
            ? 'pref.primaryZoneCount'
            : mutation.normalized.property,
      },
    })),
  }),
  'ionirix-emergent-ui:2->1': (event) => ({
    ...event,
    replay: {
      ...event.replay,
      route: event.replay.route ?? 'legacy-revision-normalized',
    },
    mutations: event.mutations.map((mutation) => ({
      ...mutation,
      property: mutation.property === 'data-telemetry-state' ? 'telemetryState' : mutation.property,
      normalized: {
        ...mutation.normalized,
        property: mutation.property === 'data-telemetry-state' ? 'telemetryState' : mutation.normalized.property,
      },
    })),
  }),
  'ionirix-emergent-ui:3->2': (event) => ({
    ...event,
    mutations: event.mutations.map((mutation) => ({
      ...mutation,
      property: mutation.property === 'data-telemetry-state' && event.surfaceId === 'editorial-root'
        ? 'contextState'
        : mutation.property,
      normalized: {
        ...mutation.normalized,
        property: mutation.property === 'data-telemetry-state' && event.surfaceId === 'editorial-root'
          ? 'contextState'
          : mutation.normalized.property,
      },
    })),
  }),
};

const asRevisionSet = (migration: SchemaMigrationMetadata | null | undefined): Set<number> => new Set(migration?.backwardCompatibleWith ?? []);

const emptyCompatibilitySummary = (): CompatibilitySummary => ({
  total: 0,
  compatible: 0,
  normalize: 0,
  incompatible: 0,
  unknown: 0,
});

export const resolveMigrationCompatibility = (
  baseline: SchemaMigrationMetadata | null | undefined,
  candidate: SchemaMigrationMetadata | null | undefined,
): MigrationCompatibilityResult => {
  if (!baseline || !candidate) {
    return {
      status: 'unknown',
      label: 'compat: unknown',
      reason: 'Migration metadata is unavailable for direct comparison.',
    };
  }

  if (baseline.family !== candidate.family) {
    return {
      status: 'incompatible',
      label: 'compat: incompatible',
      reason: `Schema families differ (${candidate.family} vs ${baseline.family}).`,
    };
  }

  if (baseline.revision === candidate.revision) {
    return {
      status: 'compatible',
      label: 'compat: direct',
      reason: `Schema revision ${candidate.revision} matches the active surface.`,
    };
  }

  const baselineCompatible = asRevisionSet(baseline).has(candidate.revision);
  const candidateCompatible = asRevisionSet(candidate).has(baseline.revision);

  if (baselineCompatible || candidateCompatible) {
    return {
      status: 'compatible',
      label: 'compat: direct',
      reason: `Schema revisions ${candidate.revision} and ${baseline.revision} are marked backward-compatible.`,
    };
  }

  return {
    status: 'normalize',
    label: 'compat: normalize',
    reason: `Schema family matches, but revision ${candidate.revision} should be normalized to compare against revision ${baseline.revision}.`,
  };
};

export const summarizeCompatibilityStatuses = (
  baseline: SchemaMigrationMetadata | null | undefined,
  candidates: Array<SchemaMigrationMetadata | null | undefined>,
): CompatibilitySummary => candidates.reduce((summary, candidate) => {
  const compatibility = resolveMigrationCompatibility(baseline, candidate);

  summary.total += 1;
  summary[compatibility.status] += 1;
  return summary;
}, emptyCompatibilitySummary());

export const buildSchemaBaselineDiff = (
  liveSchema: LayoutSchema | null | undefined,
  baselineSchema: LayoutSchema | null | undefined,
): SchemaBaselineDiff | null => {
  if (!liveSchema || !baselineSchema) {
    return null;
  }

  const liveZones = liveSchema.surface.zones.map((zone) => zone.id);
  const baselineZones = baselineSchema.surface.zones.map((zone) => zone.id);
  const liveReplayTargets = liveSchema.surface.replayTargetSurfaces ?? (liveSchema.surface.replayTargetSurface ? [liveSchema.surface.replayTargetSurface] : []);
  const baselineReplayTargets = baselineSchema.surface.replayTargetSurfaces ?? (baselineSchema.surface.replayTargetSurface ? [baselineSchema.surface.replayTargetSurface] : []);

  return {
    surfaceId: liveSchema.surface.id,
    liveVersion: liveSchema.version,
    baselineVersion: baselineSchema.version,
    liveRevision: liveSchema.migration?.revision ?? null,
    baselineRevision: baselineSchema.migration?.revision ?? null,
    zoneDelta: baselineZones.length - liveZones.length,
    addedZones: baselineZones.filter((zoneId) => !liveZones.includes(zoneId)),
    removedZones: liveZones.filter((zoneId) => !baselineZones.includes(zoneId)),
    behaviorDelta: (baselineSchema.behaviors?.length ?? 0) - (liveSchema.behaviors?.length ?? 0),
    telemetryRuleDelta: (baselineSchema.telemetry?.rules.length ?? 0) - (liveSchema.telemetry?.rules.length ?? 0),
    addedReplayTargets: baselineReplayTargets.filter((surfaceId) => !liveReplayTargets.includes(surfaceId)),
    removedReplayTargets: liveReplayTargets.filter((surfaceId) => !baselineReplayTargets.includes(surfaceId)),
  };
};

const resolveNormalizationStrategy = (
  baseline: SchemaMigrationMetadata | null,
  candidate: SchemaMigrationMetadata | null,
): string => {
  if (!baseline || !candidate) {
    return 'canonical';
  }

  if (baseline.family !== candidate.family) {
    return 'canonical';
  }

  if (baseline.revision === candidate.revision) {
    return 'identity';
  }

  return `${candidate.family}:${candidate.revision}->${baseline.revision}`;
};

const applyNormalizationStrategy = (
  event: NormalizedDiffEvent,
  context: NormalizationContext,
): NormalizedDiffEvent => {
  const strategy = resolveNormalizationStrategy(context.baselineSchemaMigration, context.eventSchemaMigration);
  const normalize = normalizationHooks[strategy] ?? identityNormalization;

  return {
    ...normalize({ ...event, normalizationStrategy: strategy }, context),
    normalizationStrategy: strategy,
  };
};

export const normalizeDiffExportArtifacts = (payload: ExportNormalizationPayload) => ({
  baselineSchemaVersion: payload.schemaVersion,
  baselineSchemaMigration: payload.schemaMigration,
  events: payload.events.map<NormalizedDiffEvent>((event) => ({
    surfaceId: event.surfaceId,
    timestamp: event.timestamp,
    schemaVersion: event.schemaVersion,
    schemaFamily: event.schemaMigration?.family ?? null,
    schemaRevision: event.schemaMigration?.revision ?? null,
    compatibility: resolveMigrationCompatibility(payload.schemaMigration, event.replayDiagnostics?.migration ?? event.schemaMigration),
    normalizationStrategy: 'identity',
    replay: {
      sourceSurface: event.replayDiagnostics?.sourceSurface ?? null,
      targetSurface: event.replayDiagnostics?.targetSurface ?? null,
      route: event.replayDiagnostics?.matchedRuleId ?? null,
      resolution: event.replayDiagnostics?.resolution ?? null,
    },
    mutations: event.mutations.map((mutation) => ({
      source: mutation.source,
      zoneId: mutation.zoneId,
      property: mutation.property,
      valueText: String(mutation.value),
      targetGroups: mutation.targetGroups ?? [],
      original: {
        property: mutation.property,
        valueText: String(mutation.value),
        targetGroups: mutation.targetGroups ?? [],
      },
      normalized: {
        property: mutation.property,
        valueText: String(mutation.value),
        targetGroups: mutation.targetGroups ?? [],
      },
    })),
  })).map((event, index) => applyNormalizationStrategy(event, {
    baselineSchemaVersion: payload.schemaVersion,
    baselineSchemaMigration: payload.schemaMigration,
    eventSchemaMigration: payload.events[index]?.replayDiagnostics?.migration ?? payload.events[index]?.schemaMigration ?? null,
  })),
});

export const buildCalibrationReplayPreview = (input: CalibrationReplayPreviewInput): CalibrationReplayPreview => {
  const compatibility = resolveMigrationCompatibility(input.schemaMigration, input.diagnostics?.migration ?? null);
  const normalization = normalizeDiffExportArtifacts({
    schemaVersion: input.schemaVersion,
    schemaMigration: input.schemaMigration,
    events: [
      {
        surfaceId: input.targetSurface,
        schemaVersion: input.schemaVersion,
        schemaMigration: input.schemaMigration,
        timestamp: input.timestamp,
        ...(input.diagnostics ? { replayDiagnostics: input.diagnostics } : {}),
        mutations: [
          { zoneId: 'calibration', property: 'pref.layoutMode', value: input.prefs.layoutMode, source: 'replay' },
          { zoneId: 'calibration', property: 'pref.sidebarPosition', value: input.prefs.sidebarPosition, source: 'replay' },
          { zoneId: 'calibration', property: 'pref.zoneCount', value: input.prefs.zoneCount, source: 'replay' },
          { zoneId: 'calibration', property: 'draft.width', value: input.draft.width, source: 'replay' },
          { zoneId: 'calibration', property: 'draft.height', value: input.draft.height, source: 'replay' },
        ],
      },
    ],
  });

  const semanticSummary: ReplayPreviewSemanticSummary = {
    sourceSurface: input.sourceSurface,
    targetSurface: input.targetSurface,
    compatibilityStatus: compatibility.status,
    compatibilityLabel: compatibility.label,
    route: normalization.events[0]?.replay.route ?? normalization.events[0]?.replay.resolution ?? 'none',
    normalizationStrategy: normalization.events[0]?.normalizationStrategy ?? 'identity',
    remappedProperties: Array.from(new Set(
      (normalization.events[0]?.mutations ?? [])
        .filter((mutation) => mutation.original.property !== mutation.normalized.property)
        .map((mutation) => `${mutation.original.property} -> ${mutation.normalized.property}`),
    )),
  };

  return {
    targetSurface: input.targetSurface,
    availableTargetSurfaces: input.availableTargetSurfaces ?? [input.targetSurface],
    compatibility,
    normalization,
    semanticSummary,
    calibration: {
      sourceSurface: input.sourceSurface,
      origin: input.origin,
      prefs: input.prefs,
      draft: input.draft,
    },
  };
};

export const buildReplayPreviewSemanticSummary = (previewPayload: string | null): ReplayPreviewSemanticSummary | null => {
  if (!previewPayload) {
    return null;
  }

  try {
    const preview = JSON.parse(previewPayload) as CalibrationReplayPreview;
    if (preview.semanticSummary) {
      return preview.semanticSummary;
    }

    const normalizedEvent = preview.normalization.events[0];
    const remappedProperties = Array.from(new Set(
      (normalizedEvent?.mutations ?? [])
        .filter((mutation) => mutation.original.property !== mutation.normalized.property)
        .map((mutation) => `${mutation.original.property} -> ${mutation.normalized.property}`),
    ));

    return {
      sourceSurface: preview.calibration.sourceSurface,
      targetSurface: preview.targetSurface,
      compatibilityStatus: preview.compatibility.status,
      compatibilityLabel: preview.compatibility.label,
      route: normalizedEvent?.replay.route ?? normalizedEvent?.replay.resolution ?? 'none',
      normalizationStrategy: normalizedEvent?.normalizationStrategy ?? 'identity',
      remappedProperties,
    };
  } catch {
    return null;
  }
};

export const compareReplayPreviewSummaries = (
  storedPreview: ReplayPreviewSemanticSummary | null,
  candidatePreview: ReplayPreviewSemanticSummary | null,
): ReplayPreviewSemanticDiff | null => {
  if (!storedPreview || !candidatePreview) {
    return null;
  }

  return {
    targetChanged: storedPreview.targetSurface !== candidatePreview.targetSurface,
    compatibilityChanged: storedPreview.compatibilityStatus !== candidatePreview.compatibilityStatus,
    routeChanged: storedPreview.route !== candidatePreview.route,
    normalizationChanged: storedPreview.normalizationStrategy !== candidatePreview.normalizationStrategy,
    addedRemaps: candidatePreview.remappedProperties.filter((property) => !storedPreview.remappedProperties.includes(property)),
    removedRemaps: storedPreview.remappedProperties.filter((property) => !candidatePreview.remappedProperties.includes(property)),
  };
};

export const buildReplayPreviewArtifact = (
  preview: CalibrationReplayPreview,
  profile: ReplayPreviewExportProfile,
  options?: ReplayPreviewArtifactOptions,
) => {
  const artifact = profile === 'compact'
    ? {
      profile,
      targetSurface: preview.targetSurface,
      availableTargetSurfaces: preview.availableTargetSurfaces,
      compatibility: preview.compatibility,
      semanticSummary: preview.semanticSummary,
      calibration: {
        sourceSurface: preview.calibration.sourceSurface,
        origin: preview.calibration.origin,
        prefs: preview.calibration.prefs,
      },
      normalization: {
        baselineSchemaVersion: preview.normalization.baselineSchemaVersion,
        baselineSchemaMigration: preview.normalization.baselineSchemaMigration,
        events: preview.normalization.events.slice(0, 1).map((event) => ({
          surfaceId: event.surfaceId,
          timestamp: event.timestamp,
          compatibility: event.compatibility,
          normalizationStrategy: event.normalizationStrategy,
          replay: event.replay,
          mutations: event.mutations.slice(0, 2).map((mutation) => ({
            zoneId: mutation.zoneId,
            source: mutation.source,
            original: mutation.original,
            normalized: mutation.normalized,
          })),
        })),
      },
    }
    : {
      profile,
      ...preview,
    };

  return {
    ...artifact,
    manifest: buildReplayPreviewArtifactManifest(artifact, profile, options),
  };
};

export const serializeReplayPreviewArtifact = (
  preview: CalibrationReplayPreview,
  profile: ReplayPreviewExportProfile,
  options?: ReplayPreviewArtifactOptions,
): string => JSON.stringify(buildReplayPreviewArtifact(preview, profile, options), null, 2);

const resolveReplayPreviewDriftSeverity = (
  compatibilityStatus: MigrationCompatibilityStatus | null | undefined,
  driftSummary?: ReplayPreviewDriftSummary | null,
): ReplayPreviewDriftSummary['severity'] => {
  if (driftSummary) {
    return driftSummary.severity;
  }

  if (compatibilityStatus === 'incompatible') {
    return 'elevated';
  }

  if (compatibilityStatus === 'normalize' || compatibilityStatus === 'unknown') {
    return 'moderate';
  }

  return 'stable';
};

const buildReplayPreviewArtifactManifest = (
  artifact: {
    targetSurface: string;
    compatibility: MigrationCompatibilityResult;
    semanticSummary?: ReplayPreviewSemanticSummary;
    calibration: {
      sourceSurface: string;
      origin: 'history-replay' | 'history-restore';
    };
    normalization: {
      baselineSchemaVersion?: string;
      baselineSchemaMigration?: SchemaMigrationMetadata | null;
      events?: Array<{ normalizationStrategy?: string }>;
    };
  },
  profile: ReplayPreviewExportProfile,
  options?: ReplayPreviewArtifactOptions,
): ReplayPreviewArtifactManifest => ({
  profile,
  sourceSurface: artifact.calibration.sourceSurface,
  targetSurface: artifact.targetSurface,
  origin: artifact.calibration.origin,
  schemaVersion: artifact.normalization.baselineSchemaVersion ?? 'unknown',
  schemaRevision: artifact.normalization.baselineSchemaMigration?.revision ?? null,
  compatibilityStatus: artifact.compatibility.status,
  compatibilityLabel: artifact.compatibility.label,
  normalizationStrategy: artifact.semanticSummary?.normalizationStrategy ?? artifact.normalization.events?.[0]?.normalizationStrategy ?? 'identity',
  driftSeverity: resolveReplayPreviewDriftSeverity(artifact.compatibility.status, options?.driftSummary),
  exportedAt: options?.exportedAt ?? new Date().toISOString(),
});

export const serializeReplayPreviewPayload = (
  previewPayload: string | null,
  profileFallback: ReplayPreviewExportProfile,
  options?: ReplayPreviewArtifactOptions,
): string | null => {
  if (!previewPayload) {
    return null;
  }

  try {
    const artifact = JSON.parse(previewPayload) as {
      profile?: ReplayPreviewExportProfile;
      targetSurface: string;
      compatibility: MigrationCompatibilityResult;
      semanticSummary?: ReplayPreviewSemanticSummary;
      calibration: {
        sourceSurface: string;
        origin: 'history-replay' | 'history-restore';
      };
      normalization: {
        baselineSchemaVersion?: string;
        baselineSchemaMigration?: SchemaMigrationMetadata | null;
        events?: Array<{ normalizationStrategy?: string }>;
      };
    };
    const profile = artifact.profile ?? profileFallback;

    return JSON.stringify({
      ...artifact,
      profile,
      manifest: buildReplayPreviewArtifactManifest(artifact, profile, options),
    }, null, 2);
  } catch {
    return previewPayload;
  }
};

export const summarizeReplayPreviewDiff = (
  diff: ReplayPreviewSemanticDiff | null,
): ReplayPreviewDriftSummary | null => {
  if (!diff) {
    return null;
  }

  const changedSignals = [
    diff.targetChanged,
    diff.compatibilityChanged,
    diff.routeChanged,
    diff.normalizationChanged,
  ].filter(Boolean).length;
  const remapDeltaCount = diff.addedRemaps.length + diff.removedRemaps.length;
  const severity: ReplayPreviewDriftSummary['severity'] = changedSignals >= 3 || remapDeltaCount >= 2
    ? 'elevated'
    : changedSignals >= 1 || remapDeltaCount >= 1
      ? 'moderate'
      : 'stable';

  return {
    changedSignals,
    totalSignals: 4,
    remapDeltaCount,
    severity,
    summary: `${changedSignals}/4 semantic signals changed · ${remapDeltaCount} remap delta${remapDeltaCount === 1 ? '' : 's'}`,
  };
};