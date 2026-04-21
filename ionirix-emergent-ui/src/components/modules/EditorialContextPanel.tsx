import { useEffect, useState } from 'react';
import { eventBus } from '@/core/events';
import { reflowEngine } from '@/core/engine';
import { IonButton } from '@/components/primitives';
import { GlassCard } from '@/components/surfaces';
import { useCalibrationHistory, useSpatialTelemetry } from '@/hooks';
import {
  type ReplayPreviewExportProfile,
  type ReplayPreviewSemanticFilterSelection,
  buildReplayPreviewSemanticSummary,
  serializeReplayPreviewArtifact,
  serializeReplayPreviewPayload,
  compareReplayPreviewSummaries,
  buildCalibrationReplayPreview,
  clearReplayPreviewState,
  loadReplayPreviewState,
  resolveCalibrationReplayPlan,
  resolveMigrationCompatibility,
  saveReplayPreviewState,
  summarizeReplayPreviewDiff,
} from '@/utils';
import type { EventPayload } from '@/types';

export function EditorialContextPanel() {
  const previewOrigin = 'history-restore' as const;
  const telemetry = useSpatialTelemetry();
  const history = useCalibrationHistory('onboarding');
  const [previewPayload, setPreviewPayload] = useState<string | null>(null);
  const [previewReplayEvent, setPreviewReplayEvent] = useState<EventPayload<'CALIBRATION_REPLAY'> | null>(null);
  const [candidatePreviewPayload, setCandidatePreviewPayload] = useState<string | null>(null);
  const [candidatePreviewReplayEvent, setCandidatePreviewReplayEvent] = useState<EventPayload<'CALIBRATION_REPLAY'> | null>(null);
  const [previewProfile, setPreviewProfile] = useState<ReplayPreviewExportProfile>('full');
  const [activeSemanticFilter, setActiveSemanticFilter] = useState<ReplayPreviewSemanticFilterSelection>('all');
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);
  const currentLayout = reflowEngine.getCurrentLayout();
  const targetSurface = currentLayout?.id ?? 'editorial-root';
  const availableTargetSurfaces = currentLayout?.id ? [currentLayout.id] : ['editorial-root'];
  const latestReplayPlan = history[0] ? resolveCalibrationReplayPlan(history[0], targetSurface, availableTargetSurfaces) : null;
  const replayCompatibility = latestReplayPlan?.diagnostics
    ? resolveMigrationCompatibility(
      reflowEngine.getSchemaForSurfaceId(latestReplayPlan.targetSurface ?? targetSurface)?.migration ?? null,
      latestReplayPlan.diagnostics.migration ?? null,
    )
    : null;
  const commitPreview = (payload: string, replayEvent: EventPayload<'CALIBRATION_REPLAY'>) => {
    setPreviewPayload(payload);
    setPreviewReplayEvent(replayEvent);
    setCandidatePreviewPayload(null);
    setCandidatePreviewReplayEvent(null);
  };
  const storedPreviewSummary = buildReplayPreviewSemanticSummary(previewPayload);
  const candidatePreviewSummary = buildReplayPreviewSemanticSummary(candidatePreviewPayload);
  const candidatePreviewDiff = compareReplayPreviewSummaries(storedPreviewSummary, candidatePreviewSummary);
  const driftSummary = summarizeReplayPreviewDiff(candidatePreviewDiff);
  const semanticBadgeLabels = candidatePreviewDiff
    ? [
      candidatePreviewDiff.targetChanged ? { key: 'target' as const, label: 'target changed' } : null,
      candidatePreviewDiff.compatibilityChanged ? { key: 'compatibility' as const, label: 'compat changed' } : null,
      candidatePreviewDiff.routeChanged ? { key: 'route' as const, label: 'route changed' } : null,
      candidatePreviewDiff.normalizationChanged ? { key: 'normalization' as const, label: 'normalize changed' } : null,
      candidatePreviewDiff.addedRemaps.length > 0 || candidatePreviewDiff.removedRemaps.length > 0
        ? { key: 'remaps' as const, label: `${candidatePreviewDiff.addedRemaps.length} remaps added` }
        : null,
    ].filter(Boolean) as Array<{ key: ReplayPreviewSemanticFilterSelection; label: string }>
    : [];
  const semanticSummaryCards = candidatePreviewDiff ? [
    {
      key: 'all' as const,
      title: 'Drift Summary',
      value: driftSummary?.severity ?? 'stable',
      detail: driftSummary?.summary ?? 'No semantic drift detected.',
    },
    {
      key: 'target' as const,
      title: 'Target Drift',
      value: candidatePreviewDiff.targetChanged ? 'changed' : 'stable',
      detail: `${storedPreviewSummary?.targetSurface ?? 'unknown'} -> ${candidatePreviewSummary?.targetSurface ?? 'unknown'}`,
    },
    {
      key: 'compatibility' as const,
      title: 'Compatibility Drift',
      value: candidatePreviewDiff.compatibilityChanged ? 'changed' : 'stable',
      detail: `${storedPreviewSummary?.compatibilityLabel ?? 'unknown'} -> ${candidatePreviewSummary?.compatibilityLabel ?? 'unknown'}`,
    },
    {
      key: 'route' as const,
      title: 'Route Drift',
      value: candidatePreviewDiff.routeChanged ? 'changed' : 'stable',
      detail: `${storedPreviewSummary?.route ?? 'none'} -> ${candidatePreviewSummary?.route ?? 'none'}`,
    },
    {
      key: 'normalization' as const,
      title: 'Normalization Drift',
      value: candidatePreviewDiff.normalizationChanged ? 'changed' : 'stable',
      detail: `${storedPreviewSummary?.normalizationStrategy ?? 'identity'} -> ${candidatePreviewSummary?.normalizationStrategy ?? 'identity'}`,
    },
    {
      key: 'remaps' as const,
      title: 'Remap Drift',
      value: `${candidatePreviewDiff.addedRemaps.length + candidatePreviewDiff.removedRemaps.length}`,
      detail: `${candidatePreviewDiff.addedRemaps.length} added · ${candidatePreviewDiff.removedRemaps.length} removed`,
    },
  ] : [];

  const copyPayload = async (payload: string | null, label: string) => {
    const exportPayload = serializeReplayPreviewPayload(payload, previewProfile, { driftSummary });

    if (!exportPayload) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(exportPayload);
      setPreviewStatus(`${label} copied to clipboard.`);
      return;
    }

    setPreviewStatus(`Clipboard unavailable. ${label} remains in the preview panel.`);
  };

  const restoreCalibration = (entryIndex = 0) => {
    const entry = history[entryIndex];

    if (!entry || !reflowEngine.getCurrentLayout()) {
      return;
    }

    const replayPlan = resolveCalibrationReplayPlan(entry, targetSurface, availableTargetSurfaces);

    eventBus.emit('CALIBRATION_REPLAY', {
      targetSurface: replayPlan.targetSurface ?? targetSurface,
      availableTargetSurfaces: replayPlan.availableTargetSurfaces ?? availableTargetSurfaces,
      sourceSurface: entry.surfaceId,
      prefs: entry.prefs,
      origin: 'history-restore',
      ...(replayPlan.diagnostics ? { diagnostics: replayPlan.diagnostics } : {}),
    });
  };

  const previewCalibration = (entryIndex = 0) => {
    const entry = history[entryIndex];

    if (!entry) {
      return;
    }

    const replayPlan = resolveCalibrationReplayPlan(entry, targetSurface, availableTargetSurfaces);
    const targetSchema = reflowEngine.getSchemaForSurfaceId(replayPlan.targetSurface ?? targetSurface);
    const replayEvent: EventPayload<'CALIBRATION_REPLAY'> = {
      targetSurface: replayPlan.targetSurface ?? targetSurface,
      availableTargetSurfaces: replayPlan.availableTargetSurfaces ?? availableTargetSurfaces,
      sourceSurface: entry.surfaceId,
      prefs: entry.prefs,
      origin: 'history-restore',
      ...(replayPlan.diagnostics ? { diagnostics: replayPlan.diagnostics } : {}),
    };

    const nextPreviewPayload = serializeReplayPreviewArtifact(buildCalibrationReplayPreview({
      sourceSurface: entry.surfaceId,
      targetSurface: replayEvent.targetSurface,
      availableTargetSurfaces: replayEvent.availableTargetSurfaces ?? availableTargetSurfaces,
      origin: replayEvent.origin,
      timestamp: entry.timestamp,
      prefs: entry.prefs,
      draft: entry.draft,
      schemaVersion: targetSchema?.version ?? 'unknown',
      schemaMigration: targetSchema?.migration ?? null,
      ...(replayPlan.diagnostics ? { diagnostics: replayPlan.diagnostics } : {}),
    }), previewProfile);

    if (previewPayload && previewPayload !== nextPreviewPayload) {
      setCandidatePreviewPayload(nextPreviewPayload);
      setCandidatePreviewReplayEvent(replayEvent);
      setPreviewStatus(null);
      return;
    }

    commitPreview(nextPreviewPayload, replayEvent);
    setPreviewStatus(null);
  };

  const applyPreviewedReplay = () => {
    if (!previewReplayEvent || !reflowEngine.getCurrentLayout()) {
      return;
    }

    eventBus.emit('CALIBRATION_REPLAY', previewReplayEvent);
  };

  const clearPreviewedReplay = () => {
    setPreviewPayload(null);
    setPreviewReplayEvent(null);
    setCandidatePreviewPayload(null);
    setCandidatePreviewReplayEvent(null);
    setPreviewStatus(null);
    clearReplayPreviewState(targetSurface, previewOrigin);
  };

  const resetComparisonState = () => {
    setCandidatePreviewPayload(null);
    setCandidatePreviewReplayEvent(null);
    setActiveSemanticFilter('all');
    setPreviewStatus(null);
  };

  const keepStoredPreview = () => {
    resetComparisonState();
  };

  const replaceStoredPreview = () => {
    if (!candidatePreviewPayload || !candidatePreviewReplayEvent) {
      return;
    }

    commitPreview(candidatePreviewPayload, candidatePreviewReplayEvent);
    setActiveSemanticFilter('all');
    setPreviewStatus(null);
  };

  useEffect(() => {
    const savedState = loadReplayPreviewState(targetSurface, previewOrigin);

    setPreviewPayload(savedState?.payload ?? null);
    setPreviewReplayEvent(savedState?.replayEvent ?? null);
    setCandidatePreviewPayload(savedState?.candidatePayload ?? null);
    setCandidatePreviewReplayEvent(savedState?.candidateReplayEvent ?? null);
    setPreviewProfile(savedState?.previewProfile ?? 'full');
    setActiveSemanticFilter(savedState?.semanticFilter ?? 'all');
  }, [targetSurface]);

  useEffect(() => {
    saveReplayPreviewState(targetSurface, previewOrigin, previewPayload && previewReplayEvent
      ? {
        payload: previewPayload,
        replayEvent: previewReplayEvent,
        candidatePayload: candidatePreviewPayload,
        candidateReplayEvent: candidatePreviewReplayEvent,
        previewProfile,
        semanticFilter: activeSemanticFilter,
      }
      : null);
  }, [activeSemanticFilter, candidatePreviewPayload, candidatePreviewReplayEvent, previewPayload, previewProfile, previewReplayEvent, targetSurface]);

  return (
    <GlassCard className="editorial-context-panel" depth={1}>
      <p className="eyebrow">Editorial Context</p>
      <h3>Context Stack</h3>
      <ul className="module-list">
        <li>Tone map: Sovereign premium</li>
        <li>Emergence state: stable</li>
        <li>Recommended action: disclose advanced controls</li>
        <li>Focused zone: {telemetry.focusedZone ?? 'none'}</li>
        <li>Calibration: {telemetry.calibration.layoutMode} / {telemetry.calibration.sidebarPosition} / {telemetry.calibration.zoneCount}</li>
        <li>History entries: {history.length}</li>
      </ul>
      {latestReplayPlan?.diagnostics ? (
        <div className="calibration-readout">
          <span>Restore target: {latestReplayPlan.diagnostics.targetSurface}</span>
          <span>Replay route: {latestReplayPlan.diagnostics.matchedRuleId ?? latestReplayPlan.diagnostics.resolution}</span>
          <span title={replayCompatibility?.reason}>Compatibility: {replayCompatibility?.label.replace('compat: ', '') ?? 'unknown'}</span>
        </div>
      ) : null}
      <div className="ion-action-bar">
        <IonButton label="Promote Note" variant="ghost" />
        <IonButton disabled={!history[0]} label="Preview Latest Restore" onClick={() => previewCalibration(0)} variant="ghost" />
        <IonButton disabled={!previewReplayEvent} label="Apply Previewed Restore" onClick={applyPreviewedReplay} variant="ghost" />
        <IonButton disabled={!previewReplayEvent} label="Clear Previewed Restore" onClick={clearPreviewedReplay} variant="ghost" />
        <IonButton disabled={!history[0]} label="Restore Latest Calibration" onClick={() => restoreCalibration(0)} variant="ghost" />
        <IonButton label="Commit Change" />
      </div>
      <div className="module-chip-row">
        {(['compact', 'full'] as const).map((profile) => (
          <button
            key={profile}
            className={`module-chip layout-inspector-filter ${previewProfile === profile ? 'is-active' : ''}`}
            onClick={() => {
              setPreviewProfile(profile);
              setPreviewStatus(null);
            }}
            type="button"
          >
            preview {profile}
          </button>
        ))}
      </div>
      {previewPayload ? (
        <div className="replay-preview-panel">
          <p className="eyebrow">Normalized Restore Preview</p>
          <div className="ion-action-bar">
            <IonButton label="Copy Preview JSON" onClick={() => void copyPayload(previewPayload, `${previewProfile} restore preview`)} variant="ghost" />
          </div>
          {previewStatus ? <p className="layout-inspector-export-status">{previewStatus}</p> : null}
          <textarea aria-label="Normalized replay preview" className="layout-inspector-export-preview" readOnly value={previewPayload} />
        </div>
      ) : null}
      {candidatePreviewPayload ? (
        <div className="replay-preview-panel">
          <p className="eyebrow">Preview Comparison</p>
          {semanticSummaryCards.length > 0 ? (
            <div className="telemetry-grid layout-inspector-summary-grid">
              {semanticSummaryCards.map((card) => (
                <button
                  key={card.title}
                  className={`metric-card layout-inspector-filter ${activeSemanticFilter === card.key ? 'is-active' : ''}`}
                  onClick={() => setActiveSemanticFilter(card.key)}
                  type="button"
                >
                  <span className="eyebrow">{card.title}</span>
                  <strong className="metric-value">{card.value}</strong>
                  <span>{card.detail}</span>
                </button>
              ))}
            </div>
          ) : null}
          {semanticBadgeLabels.length > 0 ? (
            <div className="module-chip-row">
              {semanticBadgeLabels.map((badge) => (
                <button
                  key={badge.label}
                  className={`module-chip layout-inspector-filter layout-inspector-compatibility layout-inspector-compatibility--normalize ${activeSemanticFilter === badge.key ? 'is-active' : ''}`}
                  onClick={() => setActiveSemanticFilter((current) => current === badge.key ? 'all' : badge.key)}
                  type="button"
                >
                  {badge.label}
                </button>
              ))}
            </div>
          ) : null}
          {storedPreviewSummary && candidatePreviewSummary && candidatePreviewDiff ? (
            <div className="layout-inspector-drilldown-grid">
              <div className="layout-inspector-normalized-card">
                <p className="eyebrow">Stored Semantics</p>
                <ul className="module-list">
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'target' ? <li>target: {storedPreviewSummary.targetSurface}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'compatibility' ? <li>compat: {storedPreviewSummary.compatibilityLabel}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'route' ? <li>route: {storedPreviewSummary.route}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'normalization' ? <li>normalize: {storedPreviewSummary.normalizationStrategy}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'remaps' ? <li>remaps: {storedPreviewSummary.remappedProperties.join(', ') || 'none'}</li> : null}
                </ul>
              </div>
              <div className="layout-inspector-normalized-card">
                <p className="eyebrow">Candidate Semantics</p>
                <ul className="module-list">
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'target' ? <li>target: {candidatePreviewSummary.targetSurface}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'compatibility' ? <li>compat: {candidatePreviewSummary.compatibilityLabel}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'route' ? <li>route: {candidatePreviewSummary.route}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'normalization' ? <li>normalize: {candidatePreviewSummary.normalizationStrategy}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'remaps' ? <li>remaps: {candidatePreviewSummary.remappedProperties.join(', ') || 'none'}</li> : null}
                </ul>
              </div>
              <div className="layout-inspector-normalized-card">
                <p className="eyebrow">Semantic Delta</p>
                <ul className="module-list">
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'target' ? <li>target changed: {candidatePreviewDiff.targetChanged ? 'yes' : 'no'}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'compatibility' ? <li>compat changed: {candidatePreviewDiff.compatibilityChanged ? 'yes' : 'no'}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'route' ? <li>route changed: {candidatePreviewDiff.routeChanged ? 'yes' : 'no'}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'normalization' ? <li>normalize changed: {candidatePreviewDiff.normalizationChanged ? 'yes' : 'no'}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'remaps' ? <li>added remaps: {candidatePreviewDiff.addedRemaps.join(', ') || 'none'}</li> : null}
                  {activeSemanticFilter === 'all' || activeSemanticFilter === 'remaps' ? <li>removed remaps: {candidatePreviewDiff.removedRemaps.join(', ') || 'none'}</li> : null}
                </ul>
              </div>
            </div>
          ) : null}
          <div className="layout-inspector-normalized-columns">
            <div>
              <p className="eyebrow">Stored Preview</p>
              <div className="ion-action-bar">
                <IonButton label="Copy Stored Preview" onClick={() => void copyPayload(previewPayload, 'stored restore preview')} variant="ghost" />
              </div>
              <textarea aria-label="Stored replay preview" className="layout-inspector-export-preview" readOnly value={previewPayload ?? ''} />
            </div>
            <div>
              <p className="eyebrow">Candidate Preview</p>
              <div className="ion-action-bar">
                <IonButton label="Copy Candidate Preview" onClick={() => void copyPayload(candidatePreviewPayload, 'candidate restore preview')} variant="ghost" />
              </div>
              <textarea aria-label="Candidate replay preview" className="layout-inspector-export-preview" readOnly value={candidatePreviewPayload} />
            </div>
          </div>
          <div className="ion-action-bar">
            <IonButton label="Reset Comparison" onClick={resetComparisonState} variant="ghost" />
            <IonButton label="Keep Stored Preview" onClick={keepStoredPreview} variant="ghost" />
            <IonButton label="Replace Stored Preview" onClick={replaceStoredPreview} variant="ghost" />
          </div>
        </div>
      ) : null}
      {history.length > 0 ? (
        <div className="calibration-history calibration-history--compact">
          <p className="eyebrow">Restore History</p>
          <div className="stack-gap">
            {history.slice(0, 3).map((entry, index) => {
              const replayPlan = resolveCalibrationReplayPlan(entry, targetSurface, availableTargetSurfaces);
              const compatibility = replayPlan.diagnostics
                ? resolveMigrationCompatibility(
                  reflowEngine.getSchemaForSurfaceId(replayPlan.targetSurface ?? targetSurface)?.migration ?? null,
                  replayPlan.diagnostics.migration ?? null,
                )
                : null;
              const actionLabel = compatibility && compatibility.status !== 'compatible'
                ? `Restore ${index + 1} · ${compatibility.status}`
                : `Restore ${index + 1}`;

              return (
                <div key={`${entry.surfaceId}-${entry.timestamp}`} className="history-action-row">
                  <span>{entry.prefs.layoutMode} / {entry.prefs.sidebarPosition} / {entry.prefs.zoneCount}{entry.machineState ? ` · ${entry.machineState}` : ''}</span>
                  <div className="module-chip-row history-action-row__actions">
                    <IonButton label={`Preview ${index + 1}`} onClick={() => previewCalibration(index)} variant="ghost" />
                    <IonButton disabled={!previewReplayEvent} label="Apply Preview" onClick={applyPreviewedReplay} variant="ghost" />
                    <IonButton label={actionLabel} onClick={() => restoreCalibration(index)} title={compatibility?.reason} variant="ghost" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}