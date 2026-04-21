import { useEffect, useState } from 'react';
import { reflowEngine } from '@/core/engine';
import { getDefaultSchemaBySurfaceId, getSchemaRevisionFixture } from '@/core/schema/defaults';
import { GlassCard } from '@/components/surfaces';
import { useEventHistory } from '@/hooks';
import { IonButton } from '@/components/primitives';
import type { ExportProfile, LayoutMutationSource } from '@/types';
import {
  buildSchemaBaselineDiff,
  clearInspectorViewState,
  normalizeDiffExportArtifacts,
  resolveMigrationCompatibility,
  summarizeCompatibilityStatuses,
  loadInspectorViewState,
  saveInspectorViewState,
  type InspectorBaselineRevisionSelection,
  type InspectorCompatibilitySelection,
  type InspectorSourceFilterSelection,
  type InspectorTimeWindowSelection,
  type MigrationCompatibilityStatus,
} from '@/utils';

const timeWindows = {
  all: Number.POSITIVE_INFINITY,
  '1m': 60_000,
  '5m': 300_000,
  '1h': 3_600_000,
} as const;

type TimeWindowKey = keyof typeof timeWindows;
type CompatibilityFilter = 'all' | MigrationCompatibilityStatus;
type BaselineRevisionSelection = InspectorBaselineRevisionSelection;

interface SurfaceBaselineMatrixEntry {
  surfaceId: string;
  diff: NonNullable<ReturnType<typeof buildSchemaBaselineDiff>>;
}

const fallbackExportProfiles: Record<string, ExportProfile> = {
  compact: {
    includeSummary: true,
    includeMutationBatches: false,
    includeLayoutHashes: false,
    maxEvents: 3,
    maxMutationsPerEvent: 2,
  },
  audit: {
    includeSummary: true,
    includeMutationBatches: true,
    includeLayoutHashes: true,
    maxEvents: 6,
    maxMutationsPerEvent: 4,
  },
  full: {
    includeSummary: true,
    includeMutationBatches: true,
    includeLayoutHashes: true,
    maxEvents: 12,
    maxMutationsPerEvent: 12,
  },
};

export function LayoutInspectorPanel() {
  const events = useEventHistory('LAYOUT_CHANGE');
  const [activeFilter, setActiveFilter] = useState<LayoutMutationSource | 'all'>('all');
  const [activeSurface, setActiveSurface] = useState<string | 'all'>('all');
  const [activeWindow, setActiveWindow] = useState<TimeWindowKey>('all');
  const [activeCompatibility, setActiveCompatibility] = useState<CompatibilityFilter>('all');
  const [activeBaselineRevision, setActiveBaselineRevision] = useState<BaselineRevisionSelection>('live');
  const [focusedBaselineSurface, setFocusedBaselineSurface] = useState<string | null>(null);
  const [focusedZoneId, setFocusedZoneId] = useState<string | null>(null);
  const [focusedProperty, setFocusedProperty] = useState<string | null>(null);
  const [pinnedTimestamp, setPinnedTimestamp] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportPreview, setExportPreview] = useState<string | null>(null);
  const currentSurfaceId = reflowEngine.getCurrentLayout()?.id ?? (activeSurface !== 'all' ? activeSurface : 'dashboard-root');
  const currentSchema = reflowEngine.getSchemaForSurfaceId(currentSurfaceId) ?? getDefaultSchemaBySurfaceId(currentSurfaceId);
  const baselineSchema = activeBaselineRevision === 'live'
    ? currentSchema
    : getSchemaRevisionFixture(currentSurfaceId, activeBaselineRevision) ?? currentSchema;
  const baselineDiff = activeBaselineRevision === 'live' ? null : buildSchemaBaselineDiff(currentSchema, baselineSchema);
  const exportProfiles = baselineSchema?.surface.exportProfiles ?? fallbackExportProfiles;
  const exportProfileKeys = Object.keys(exportProfiles);
  const [activeExportProfile, setActiveExportProfile] = useState<string>(baselineSchema?.surface.defaultExportProfile ?? exportProfileKeys[0] ?? 'audit');
  const cutoff = timeWindows[activeWindow] === Number.POSITIVE_INFINITY ? 0 : Date.now() - timeWindows[activeWindow];
  const timeFilteredEvents = cutoff === 0 ? events : events.filter((event) => event.payload.timestamp >= cutoff);
  const latestChanges = [...timeFilteredEvents].slice(-6).reverse();
  const pinnedEvent = pinnedTimestamp ? latestChanges.find((event) => event.payload.timestamp === pinnedTimestamp) : null;
  const visibleChanges = pinnedEvent ? [pinnedEvent] : latestChanges;
  const availableSurfaces = Array.from(new Set(timeFilteredEvents.map((event) => event.payload.surfaceId)));

  const filteredChanges = visibleChanges
    .filter((event) => activeSurface === 'all' || event.payload.surfaceId === activeSurface)
    .filter((event) => {
      if (activeCompatibility === 'all') {
        return true;
      }

      const eventSchema = reflowEngine.getSchemaForSurfaceId(event.payload.surfaceId) ?? getDefaultSchemaBySurfaceId(event.payload.surfaceId);
      const compatibility = resolveMigrationCompatibility(baselineSchema?.migration ?? null, event.payload.replayDiagnostics?.migration ?? eventSchema?.migration ?? null);

      return compatibility.status === activeCompatibility;
    })
    .map((event) => ({
      ...event,
      payload: {
        ...event.payload,
        mutationBatches:
          activeFilter === 'all'
            ? event.payload.mutationBatches
            : event.payload.mutationBatches.filter((batch) => batch.source === activeFilter),
        mutations:
          activeFilter === 'all'
            ? event.payload.mutations
            : event.payload.mutations.filter((mutation) => mutation.source === activeFilter),
      },
    }))
    .map((event) => ({
      ...event,
      payload: {
        ...event.payload,
        mutationBatches: focusedZoneId
          ? event.payload.mutationBatches
            .map((batch) => ({
              ...batch,
              mutations: batch.mutations.filter((mutation) => mutation.zoneId === focusedZoneId),
            }))
            .filter((batch) => batch.mutations.length > 0)
          : event.payload.mutationBatches,
        mutations: focusedZoneId
          ? event.payload.mutations.filter((mutation) => mutation.zoneId === focusedZoneId)
          : event.payload.mutations,
      },
    }))
    .map((event) => ({
      ...event,
      payload: {
        ...event.payload,
        mutationBatches: focusedProperty
          ? event.payload.mutationBatches
            .map((batch) => ({
              ...batch,
              mutations: batch.mutations.filter((mutation) => mutation.property === focusedProperty),
            }))
            .filter((batch) => batch.mutations.length > 0)
          : event.payload.mutationBatches,
        mutations: focusedProperty
          ? event.payload.mutations.filter((mutation) => mutation.property === focusedProperty)
          : event.payload.mutations,
      },
    }))
    .filter((event) => event.payload.mutations.length > 0);
  const aggregatedMetrics = availableSurfaces.map((surfaceId) => {
    const surfaceEvents = timeFilteredEvents.filter((event) => event.payload.surfaceId === surfaceId);
    const sourceCounts = surfaceEvents.flatMap((event) => event.payload.mutations).reduce<Record<string, number>>((acc, mutation) => {
      acc[mutation.source] = (acc[mutation.source] ?? 0) + 1;
      return acc;
    }, {});
    const dominantSource = Object.entries(sourceCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'none';

    return {
      surfaceId,
      eventCount: surfaceEvents.length,
      mutationCount: surfaceEvents.reduce((sum, event) => sum + event.payload.mutations.length, 0),
      dominantSource,
      compatibilitySummary: summarizeCompatibilityStatuses(
        baselineSchema?.migration ?? null,
        surfaceEvents.map((event) => {
          const eventSchema = reflowEngine.getSchemaForSurfaceId(event.payload.surfaceId) ?? getDefaultSchemaBySurfaceId(event.payload.surfaceId);
          return event.payload.replayDiagnostics?.migration ?? eventSchema?.migration ?? null;
        }),
      ),
    };
  });
  const overallCompatibilitySummary = summarizeCompatibilityStatuses(
    baselineSchema?.migration ?? null,
    timeFilteredEvents.map((event) => {
      const eventSchema = reflowEngine.getSchemaForSurfaceId(event.payload.surfaceId) ?? getDefaultSchemaBySurfaceId(event.payload.surfaceId);
      return event.payload.replayDiagnostics?.migration ?? eventSchema?.migration ?? null;
    }),
  );
  const exportProfile = exportProfiles[activeExportProfile] ?? fallbackExportProfiles.audit ?? {
    includeSummary: true,
    includeMutationBatches: true,
    includeLayoutHashes: true,
    maxEvents: 6,
    maxMutationsPerEvent: 4,
  };
  const exportedEvents = filteredChanges.slice(0, exportProfile.maxEvents ?? filteredChanges.length).map((event) => ({
    surfaceId: event.payload.surfaceId,
    schemaVersion: reflowEngine.getSchemaForSurfaceId(event.payload.surfaceId)?.version ?? getDefaultSchemaBySurfaceId(event.payload.surfaceId)?.version ?? 'unknown',
    schemaMigration: reflowEngine.getSchemaForSurfaceId(event.payload.surfaceId)?.migration ?? getDefaultSchemaBySurfaceId(event.payload.surfaceId)?.migration ?? null,
    timestamp: event.payload.timestamp,
    ...(exportProfile.includeLayoutHashes ? { previousLayout: event.payload.previousLayout, nextLayout: event.payload.nextLayout } : {}),
    ...(exportProfile.includeMutationBatches ? { mutationBatches: event.payload.mutationBatches } : {}),
    ...(event.payload.replayDiagnostics ? { replayDiagnostics: event.payload.replayDiagnostics } : {}),
    mutations: event.payload.mutations.slice(0, exportProfile.maxMutationsPerEvent ?? event.payload.mutations.length),
  }));
  const normalizedExport = normalizeDiffExportArtifacts({
    schemaVersion: baselineSchema?.version ?? 'unknown',
    schemaMigration: baselineSchema?.migration ?? null,
    events: exportedEvents,
  });
  const baselineMatrix: SurfaceBaselineMatrixEntry[] = activeBaselineRevision === 'live'
    ? []
    : availableSurfaces.map((surfaceId) => {
      const liveSchema = reflowEngine.getSchemaForSurfaceId(surfaceId) ?? getDefaultSchemaBySurfaceId(surfaceId);
      const comparisonBaseline = getSchemaRevisionFixture(surfaceId, activeBaselineRevision) ?? liveSchema;
      const diff = buildSchemaBaselineDiff(liveSchema, comparisonBaseline);

      return diff ? { surfaceId, diff } : null;
    }).filter((entry): entry is SurfaceBaselineMatrixEntry => entry !== null);
  const focusedBaselineDiff = baselineMatrix.find((entry) => entry.surfaceId === focusedBaselineSurface)?.diff ?? null;
  const focusedBaselineLiveSchema = focusedBaselineSurface
    ? reflowEngine.getSchemaForSurfaceId(focusedBaselineSurface) ?? getDefaultSchemaBySurfaceId(focusedBaselineSurface)
    : null;
  const focusableZoneIds = Array.from(new Set([
    ...(focusedBaselineDiff?.addedZones ?? []),
    ...(focusedBaselineDiff?.removedZones ?? []),
    ...(focusedBaselineLiveSchema?.surface.zones.map((zone) => zone.id) ?? []),
  ]));

  const exportPayload = {
    generatedAt: new Date().toISOString(),
    schemaVersion: baselineSchema?.version ?? 'unknown',
    schemaMigration: baselineSchema?.migration ?? null,
    profile: activeExportProfile,
    filters: {
      timeWindow: activeWindow,
      surface: activeSurface,
      source: activeFilter,
      compatibility: activeCompatibility,
      baselineRevision: activeBaselineRevision,
      focusedBaselineSurface,
      focusedZoneId,
      focusedProperty,
      pinnedTimestamp,
    },
    ...(baselineDiff ? { baselineDiff } : {}),
    ...(exportProfile.includeSummary ? { summary: { surfaces: aggregatedMetrics, compatibility: overallCompatibilitySummary } } : {}),
    normalization: normalizedExport,
    events: exportedEvents,
  };

  const exportDiff = async () => {
    const nextExportPreview = JSON.stringify(exportPayload, null, 2);

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(nextExportPreview);
      setExportStatus('Filtered diff copied to clipboard.');
      setExportPreview(null);
      return;
    }

    setExportStatus('Clipboard unavailable. Showing export payload below.');
    setExportPreview(nextExportPreview);
  };

  useEffect(() => {
    const savedState = loadInspectorViewState(currentSurfaceId);

    setActiveBaselineRevision(savedState?.baselineRevision ?? 'live');
    setActiveFilter(savedState?.sourceFilter ?? 'all');
    setActiveWindow(savedState?.timeWindow ?? 'all');
    setActiveCompatibility(savedState?.compatibilityFilter ?? 'all');
    setFocusedBaselineSurface(savedState?.focusedBaselineSurface ?? null);
    setFocusedZoneId(savedState?.focusedZoneId ?? null);
    setFocusedProperty(savedState?.focusedProperty ?? null);
  }, [currentSurfaceId]);

  useEffect(() => {
    if (
      activeBaselineRevision === 'live'
      && activeFilter === 'all'
      && activeWindow === 'all'
      && activeCompatibility === 'all'
      && focusedBaselineSurface === null
      && focusedZoneId === null
      && focusedProperty === null
    ) {
      clearInspectorViewState(currentSurfaceId);
      return;
    }

    saveInspectorViewState(currentSurfaceId, {
      baselineRevision: activeBaselineRevision,
      sourceFilter: activeFilter as InspectorSourceFilterSelection,
      timeWindow: activeWindow as InspectorTimeWindowSelection,
      compatibilityFilter: activeCompatibility as InspectorCompatibilitySelection,
      focusedBaselineSurface,
      focusedZoneId,
      focusedProperty,
    });
  }, [currentSurfaceId, activeBaselineRevision, activeCompatibility, activeFilter, activeWindow, focusedBaselineSurface, focusedZoneId, focusedProperty]);

  useEffect(() => {
    if (!exportProfiles[activeExportProfile]) {
      setActiveExportProfile(baselineSchema?.surface.defaultExportProfile ?? exportProfileKeys[0] ?? 'audit');
    }
  }, [activeExportProfile, baselineSchema, exportProfileKeys, exportProfiles]);

  useEffect(() => {
    if (baselineMatrix.length === 0) {
      setFocusedBaselineSurface(null);
      return;
    }

    if (focusedBaselineSurface && baselineMatrix.some((entry) => entry.surfaceId === focusedBaselineSurface)) {
      return;
    }

    setFocusedBaselineSurface(baselineMatrix[0]?.surfaceId ?? null);
  }, [baselineMatrix, focusedBaselineSurface]);

  const resetBaselineRevision = () => {
    setActiveBaselineRevision('live');
    setFocusedBaselineSurface(null);
    setFocusedZoneId(null);
    setFocusedProperty(null);
  };

  const resetInspectorView = () => {
    clearInspectorViewState(currentSurfaceId);
    setActiveFilter('all');
    setActiveSurface('all');
    setActiveWindow('all');
    setActiveCompatibility('all');
    setActiveBaselineRevision('live');
    setFocusedBaselineSurface(null);
    setFocusedZoneId(null);
    setFocusedProperty(null);
    setPinnedTimestamp(null);
    setExportStatus(null);
    setExportPreview(null);
  };

  const focusSurfaceDiff = (surfaceId: string) => {
    saveInspectorViewState(surfaceId, {
      baselineRevision: activeBaselineRevision,
      sourceFilter: activeFilter as InspectorSourceFilterSelection,
      timeWindow: activeWindow as InspectorTimeWindowSelection,
      compatibilityFilter: activeCompatibility as InspectorCompatibilitySelection,
      focusedBaselineSurface: surfaceId,
      focusedZoneId: null,
      focusedProperty: null,
    });
    setFocusedBaselineSurface(surfaceId);
    setFocusedZoneId(null);
    setFocusedProperty(null);
    setActiveSurface(surfaceId);
    setPinnedTimestamp(null);
  };

  const focusZoneDiff = (zoneId: string | null) => {
    setFocusedZoneId(zoneId);
    setFocusedProperty(null);
    setPinnedTimestamp(null);
  };

  const focusPropertyDiff = (property: string | null) => {
    setFocusedProperty(property);
    setPinnedTimestamp(null);
  };

  return (
    <GlassCard className="layout-inspector-panel" depth={1}>
      <p className="eyebrow">Layout Inspector</p>
      <h3>Mutation Batches</h3>
      <div className="history-action-row">
        <p className="layout-inspector-entry__timestamp">Export the current filtered diff window for debugging or review.</p>
        <div className="history-action-row__actions">
          <IonButton label="Reset Inspector View" onClick={resetInspectorView} variant="ghost" />
          <IonButton disabled={activeBaselineRevision === 'live'} label="Reset Baseline" onClick={resetBaselineRevision} variant="ghost" />
          <IonButton label="Export Diff JSON" onClick={() => void exportDiff()} variant="ghost" />
        </div>
      </div>
      {exportStatus ? <p className="layout-inspector-export-status">{exportStatus}</p> : null}
      <div className="module-chip-row">
        {exportProfileKeys.map((profileKey) => (
          <button
            key={profileKey}
            className={`module-chip layout-inspector-filter ${activeExportProfile === profileKey ? 'is-active' : ''}`}
            onClick={() => setActiveExportProfile(profileKey)}
            type="button"
          >
            {profileKey}
          </button>
        ))}
      </div>
      {aggregatedMetrics.length > 0 ? (
        <div className="telemetry-grid layout-inspector-summary-grid">
          <div className="metric-card">
            <span className="eyebrow">Compatibility Window</span>
            <strong className="metric-value">{overallCompatibilitySummary.total}</strong>
            <span>direct {overallCompatibilitySummary.compatible} · normalize {overallCompatibilitySummary.normalize}</span>
            <span>incompatible {overallCompatibilitySummary.incompatible} · unknown {overallCompatibilitySummary.unknown}</span>
          </div>
          {aggregatedMetrics.map((metric) => (
            <div key={metric.surfaceId} className="metric-card">
              <span className="eyebrow">{metric.surfaceId}</span>
              <strong className="metric-value">{metric.mutationCount}</strong>
              <span>{metric.eventCount} events · dominant {metric.dominantSource}</span>
              <span>direct {metric.compatibilitySummary.compatible} · normalize {metric.compatibilitySummary.normalize}</span>
            </div>
          ))}
        </div>
      ) : null}
      {baselineDiff ? (
        <div className="layout-inspector-baseline-diff">
          <p className="eyebrow">Baseline Diff</p>
          <div className="telemetry-grid layout-inspector-summary-grid">
            <div className="metric-card">
              <span className="eyebrow">Version</span>
              <strong className="metric-value">{baselineDiff.baselineVersion}</strong>
              <span>live {baselineDiff.liveVersion}</span>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Zone Delta</span>
              <strong className="metric-value">{baselineDiff.zoneDelta}</strong>
              <span>added {baselineDiff.addedZones.length} · removed {baselineDiff.removedZones.length}</span>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Behavior Delta</span>
              <strong className="metric-value">{baselineDiff.behaviorDelta}</strong>
              <span>telemetry delta {baselineDiff.telemetryRuleDelta}</span>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Replay Targets</span>
              <strong className="metric-value">{baselineDiff.addedReplayTargets.length - baselineDiff.removedReplayTargets.length}</strong>
              <span>added {baselineDiff.addedReplayTargets.join(', ') || 'none'}</span>
              <span>removed {baselineDiff.removedReplayTargets.join(', ') || 'none'}</span>
            </div>
          </div>
        </div>
      ) : null}
      {baselineMatrix.length > 0 ? (
        <div className="layout-inspector-baseline-diff">
          <p className="eyebrow">Surface Baseline Matrix</p>
          <div className="telemetry-grid layout-inspector-summary-grid">
            {baselineMatrix.map(({ surfaceId, diff }) => (
              <div key={surfaceId} className="metric-card layout-inspector-matrix-card">
                <span className="eyebrow">{surfaceId}</span>
                <strong className="metric-value">r{diff?.baselineRevision ?? 'live'}</strong>
                <span>zones {diff?.zoneDelta ?? 0} · behavior {diff?.behaviorDelta ?? 0}</span>
                <span>telemetry {diff?.telemetryRuleDelta ?? 0} · replay {(diff?.addedReplayTargets.length ?? 0) - (diff?.removedReplayTargets.length ?? 0)}</span>
                <IonButton label={`Inspect ${surfaceId} Diff`} onClick={() => focusSurfaceDiff(surfaceId)} variant="ghost" />
              </div>
            ))}
          </div>
          {focusedBaselineDiff ? (
            <div className="layout-inspector-baseline-drilldown">
              <div className="history-action-row">
                <p className="eyebrow">Focused Surface Diff: {focusedBaselineSurface}</p>
                <div className="history-action-row__actions">
                  {focusedZoneId ? <span className="module-chip">zone focus: {focusedZoneId}</span> : null}
                  {focusedProperty ? <span className="module-chip">property focus: {focusedProperty}</span> : null}
                  <IonButton disabled={!focusedProperty} label="Show All Properties" onClick={() => focusPropertyDiff(null)} variant="ghost" />
                  <IonButton disabled={!focusedZoneId} label="Show All Zones" onClick={() => focusZoneDiff(null)} variant="ghost" />
                </div>
              </div>
              <p className="layout-inspector-entry__timestamp">live r{focusedBaselineDiff.liveRevision ?? 'n/a'}{' -> '}baseline r{focusedBaselineDiff.baselineRevision ?? 'n/a'}</p>
              <div className="layout-inspector-drilldown-grid">
                <div className="layout-inspector-normalized-card">
                  <p className="eyebrow">Added Zones</p>
                  <ul className="module-list">
                    {(focusedBaselineDiff.addedZones.length ? focusedBaselineDiff.addedZones : ['none']).map((zoneId) => (
                      <li key={`added-${zoneId}`}>
                        {zoneId === 'none' ? zoneId : (
                          <button className={`module-chip layout-inspector-filter ${focusedZoneId === zoneId ? 'is-active' : ''}`} onClick={() => focusZoneDiff(zoneId)} type="button">
                            {zoneId}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="layout-inspector-normalized-card">
                  <p className="eyebrow">Removed Zones</p>
                  <ul className="module-list">
                    {(focusedBaselineDiff.removedZones.length ? focusedBaselineDiff.removedZones : ['none']).map((zoneId) => (
                      <li key={`removed-${zoneId}`}>
                        {zoneId === 'none' ? zoneId : (
                          <button className={`module-chip layout-inspector-filter ${focusedZoneId === zoneId ? 'is-active' : ''}`} onClick={() => focusZoneDiff(zoneId)} type="button">
                            {zoneId}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="layout-inspector-normalized-card">
                  <p className="eyebrow">Replay Targets</p>
                  <ul className="module-list">
                    <li>added: {focusedBaselineDiff.addedReplayTargets.join(', ') || 'none'}</li>
                    <li>removed: {focusedBaselineDiff.removedReplayTargets.join(', ') || 'none'}</li>
                  </ul>
                </div>
                <div className="layout-inspector-normalized-card">
                  <p className="eyebrow">Zone Focus</p>
                  <div className="module-chip-row">
                    {focusableZoneIds.map((zoneId) => (
                      <button
                        key={`focus-zone-${zoneId}`}
                        className={`module-chip layout-inspector-filter ${focusedZoneId === zoneId ? 'is-active' : ''}`}
                        onClick={() => focusZoneDiff(zoneId)}
                        type="button"
                      >
                        {zoneId}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="module-chip-row">
        {([
          { label: 'live baseline', value: 'live' as const },
          { label: 'revision 1', value: 1 as const },
          { label: 'revision 2', value: 2 as const },
          { label: 'revision 3', value: 3 as const },
        ]).map((option) => (
          <button
            key={option.label}
            className={`module-chip layout-inspector-filter ${activeBaselineRevision === option.value ? 'is-active' : ''}`}
            onClick={() => setActiveBaselineRevision(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="module-chip-row">
        {(['all', '1m', '5m', '1h'] as const).map((windowKey) => (
          <button
            key={windowKey}
            className={`module-chip layout-inspector-filter ${activeWindow === windowKey ? 'is-active' : ''}`}
            onClick={() => setActiveWindow(windowKey)}
            type="button"
          >
            {windowKey}
          </button>
        ))}
      </div>
      <div className="module-chip-row">
        {(['all', 'compatible', 'normalize', 'incompatible', 'unknown'] as const).map((status) => (
          <button
            key={status}
            className={`module-chip layout-inspector-filter ${activeCompatibility === status ? 'is-active' : ''}`}
            onClick={() => setActiveCompatibility(status)}
            type="button"
          >
            {status === 'compatible' ? 'direct' : status}
          </button>
        ))}
      </div>
      <div className="module-chip-row">
        {(['all', ...availableSurfaces] as const).map((surface) => (
          <button
            key={surface}
            className={`module-chip layout-inspector-filter ${activeSurface === surface ? 'is-active' : ''}`}
            onClick={() => setActiveSurface(surface)}
            type="button"
          >
            {surface}
          </button>
        ))}
      </div>
      <div className="module-chip-row">
        {(['all', 'reflow', 'behavior', 'telemetry', 'replay'] as const).map((source) => (
          <button
            key={source}
            className={`module-chip layout-inspector-filter ${activeFilter === source ? 'is-active' : ''}`}
            onClick={() => setActiveFilter(source)}
            type="button"
          >
            {source}
          </button>
        ))}
      </div>
      {filteredChanges.length > 0 ? (
        <div className="layout-inspector-stack">
          {filteredChanges.map((event, index) => (
            <section key={`${event.payload.timestamp}-${index}`} className="layout-inspector-entry">
              {(() => {
                const eventSchema = reflowEngine.getSchemaForSurfaceId(event.payload.surfaceId) ?? getDefaultSchemaBySurfaceId(event.payload.surfaceId);
                const compatibility = resolveMigrationCompatibility(baselineSchema?.migration ?? null, event.payload.replayDiagnostics?.migration ?? eventSchema?.migration ?? null);

                return (
                  <>
              <div className="history-action-row">
                <p className="layout-inspector-entry__timestamp">{event.payload.surfaceId} @ {new Date(event.payload.timestamp).toLocaleTimeString()}</p>
                <IonButton
                  label={pinnedTimestamp === event.payload.timestamp ? 'Unpin' : 'Pin'}
                  onClick={() => setPinnedTimestamp((current) => (current === event.payload.timestamp ? null : event.payload.timestamp))}
                  variant="ghost"
                />
              </div>
              <div className="module-chip-row">
                {event.payload.mutationBatches.map((batch) => (
                  <span key={`${event.payload.timestamp}-${batch.source}`} className="module-chip">
                    {batch.source}: {batch.mutations.length}
                  </span>
                ))}
                <span className={`module-chip layout-inspector-compatibility layout-inspector-compatibility--${compatibility.status}`} title={compatibility.reason}>
                  {compatibility.label}
                </span>
                {event.payload.replayDiagnostics ? (
                  <span className="module-chip">
                    replay rule: {event.payload.replayDiagnostics.matchedRuleId ?? event.payload.replayDiagnostics.resolution}
                  </span>
                ) : null}
              </div>
              <p className="layout-inspector-entry__timestamp" title={compatibility.reason}>
                {compatibility.reason}
              </p>
              {event.payload.replayDiagnostics ? (
                <p className="layout-inspector-entry__timestamp">
                  {`${event.payload.replayDiagnostics.sourceSurface} -> ${event.payload.replayDiagnostics.targetSurface}`}
                  {event.payload.replayDiagnostics.schemaVersion ? ` · schema ${event.payload.replayDiagnostics.schemaVersion}` : ''}
                </p>
              ) : null}
              <ul className="module-list">
                {event.payload.mutations.slice(0, 4).map((mutation, mutationIndex) => (
                  <li key={`${event.payload.timestamp}-${mutation.zoneId}-${mutation.property}-${mutationIndex}`}>
                    {mutation.source}{' -> '}{mutation.zoneId}.
                    {focusedZoneId ? (
                      <button className={`module-chip layout-inspector-filter ${focusedProperty === mutation.property ? 'is-active' : ''}`} onClick={() => focusPropertyDiff(mutation.property)} type="button">
                        {mutation.property}
                      </button>
                    ) : mutation.property}
                    {' = '}{String(mutation.value)}
                    {mutation.targetGroups?.length ? ` [${mutation.targetGroups.join(', ')}]` : ''}
                  </li>
                ))}
              </ul>
              {normalizedExport.events[index]?.mutations.length ? (
                <div className="layout-inspector-normalized-grid">
                  <p className="eyebrow">Normalized Snapshot</p>
                  {normalizedExport.events[index].mutations.slice(0, 3).map((mutation, mutationIndex) => (
                    <div key={`${event.payload.timestamp}-${mutation.zoneId}-${mutation.property}-normalized-${mutationIndex}`} className="layout-inspector-normalized-card">
                      <p className="layout-inspector-entry__timestamp">{mutation.zoneId} · {mutation.source}</p>
                      <div className="layout-inspector-normalized-columns">
                        <div>
                          <p className="eyebrow">Original</p>
                          <p className="layout-inspector-entry__timestamp">
                            {focusedZoneId ? (
                              <button className={`module-chip layout-inspector-filter ${focusedProperty === mutation.original.property ? 'is-active' : ''}`} onClick={() => focusPropertyDiff(mutation.original.property)} type="button">
                                {mutation.original.property}
                              </button>
                            ) : mutation.original.property}
                          </p>
                          <strong>{mutation.original.valueText}</strong>
                        </div>
                        <div>
                          <p className="eyebrow">Normalized</p>
                          <p className="layout-inspector-entry__timestamp">
                            {focusedZoneId ? (
                              <button className={`module-chip layout-inspector-filter ${focusedProperty === mutation.normalized.property ? 'is-active' : ''}`} onClick={() => focusPropertyDiff(mutation.normalized.property)} type="button">
                                {mutation.normalized.property}
                              </button>
                            ) : mutation.normalized.property}
                          </p>
                          <strong>{mutation.normalized.valueText}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
                  </>
                );
              })()}
            </section>
          ))}
        </div>
      ) : (
        <p>No layout diffs recorded for the selected surface and filter.</p>
      )}
      {exportPreview ? (
        <textarea aria-label="Exported diff payload" className="layout-inspector-export-preview" readOnly value={exportPreview} />
      ) : null}
    </GlassCard>
  );
}