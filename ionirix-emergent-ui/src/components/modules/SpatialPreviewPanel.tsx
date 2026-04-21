import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SpatialPreferences } from '@/types';
import { useCalibrationHistory } from '@/hooks';
import { IonButton } from '@/components/primitives';
import { GlassCard } from '@/components/surfaces';
import { appendCalibrationHistory, loadCalibrationDraft, saveCalibrationDraft, type CalibrationDraft } from '@/utils/persistence';

interface SpatialPreviewPanelProps {
  calibration: SpatialPreferences;
  recommendation: SpatialPreferences;
  onCalibrate: (prefs: SpatialPreferences) => void;
  surfaceId?: string;
  targetSurface?: string;
  availableTargetSurfaces?: string[];
  machineState?: string;
  currentStep?: number;
  selectedCapabilities?: string[];
}

interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const defaultDraftRect: DraftRect = { x: 96, y: 44, width: 132, height: 88 };

export function SpatialPreviewPanel({
  calibration,
  recommendation,
  onCalibrate,
  surfaceId = 'onboarding',
  targetSurface,
  availableTargetSurfaces,
  machineState,
  currentStep,
  selectedCapabilities,
}: SpatialPreviewPanelProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<{ mode: 'drag' | 'resize'; startX: number; startY: number; origin: DraftRect } | null>(null);
  const [draftRect, setDraftRect] = useState<DraftRect>(() => loadCalibrationDraft(surfaceId) ?? defaultDraftRect);
  const history = useCalibrationHistory(surfaceId);

  useEffect(() => {
    const persistedDraft = loadCalibrationDraft(surfaceId);
    if (persistedDraft) {
      setDraftRect(persistedDraft);
    }
  }, [surfaceId]);

  useEffect(() => {
    if (calibration.zoneCount <= 0) {
      return;
    }

    setDraftRect((current) => ({
      ...current,
      x: calibration.sidebarPosition === 'left' ? 34 : calibration.sidebarPosition === 'right' ? 170 : 98,
      width: calibration.layoutMode === 'float' ? 176 : calibration.layoutMode === 'stack' ? 104 : 138,
      height: clamp(54 + calibration.zoneCount * 10, 76, 144),
    }));
  }, [calibration]);

  useEffect(() => {
    saveCalibrationDraft(surfaceId, draftRect as CalibrationDraft);
  }, [draftRect, surfaceId]);

  const derivedPrefs = useMemo<SpatialPreferences>(() => {
    const layoutMode = draftRect.width > 164 ? 'float' : draftRect.width < 118 ? 'stack' : 'grid';
    const sidebarPosition = draftRect.x < 72 ? 'left' : draftRect.x > 148 ? 'right' : 'hidden';
    const zoneCount = clamp(Math.round(draftRect.width / 38 + draftRect.height / 48), 1, 8);

    return {
      layoutMode,
      sidebarPosition,
      zoneCount,
    };
  }, [draftRect]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      const stage = stageRef.current;

      if (!interaction || !stage) {
        return;
      }

      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;

      if (interaction.mode === 'drag') {
        setDraftRect((current) => ({
          ...current,
          x: clamp(interaction.origin.x + deltaX, 0, stage.clientWidth - current.width),
          y: clamp(interaction.origin.y + deltaY, 0, stage.clientHeight - current.height),
        }));
        return;
      }

      setDraftRect({
        ...interaction.origin,
        width: clamp(interaction.origin.width + deltaX, 82, stage.clientWidth - interaction.origin.x),
        height: clamp(interaction.origin.height + deltaY, 68, stage.clientHeight - interaction.origin.y),
      });
    };

    const up = () => {
      interactionRef.current = null;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const beginInteraction = (mode: 'drag' | 'resize') => (event: ReactPointerEvent<HTMLDivElement>) => {
    interactionRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      origin: draftRect,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const applyRecommendation = () => {
    setDraftRect({
      x: recommendation.sidebarPosition === 'left' ? 34 : recommendation.sidebarPosition === 'right' ? 170 : 98,
      y: 40,
      width: recommendation.layoutMode === 'float' ? 176 : recommendation.layoutMode === 'stack' ? 104 : 138,
      height: clamp(54 + recommendation.zoneCount * 10, 76, 144),
    });
  };

  const applyCalibration = (source: 'interactive' | 'recommended') => {
    const historyEntry = {
      draft: draftRect,
      prefs: derivedPrefs,
      source,
      ...(targetSurface ? { targetSurface } : {}),
      ...(availableTargetSurfaces ? { availableTargetSurfaces } : {}),
      ...(machineState ? { machineState } : {}),
      ...(currentStep !== undefined ? { currentStep } : {}),
      ...(selectedCapabilities ? { selectedCapabilities } : {}),
    };

    appendCalibrationHistory(surfaceId, historyEntry);
    onCalibrate(derivedPrefs);
  };

  return (
    <GlassCard depth={1} className="spatial-preview">
      <p className="eyebrow">Spatial Preview</p>
      <h2>{derivedPrefs.layoutMode} mode</h2>
      <p>
        Zone count: {derivedPrefs.zoneCount}. Sidebar: {derivedPrefs.sidebarPosition}.
      </p>
      <div className="calibration-stage" ref={stageRef}>
        <div className="calibration-stage__grid" />
        <div
          aria-label="Calibration zone"
          className="calibration-zone"
          onPointerDown={beginInteraction('drag')}
          role="presentation"
          style={{ left: draftRect.x, top: draftRect.y, width: draftRect.width, height: draftRect.height }}
        >
          <span className="calibration-zone__label">Drag me</span>
          <div className="calibration-zone__handle" onPointerDown={beginInteraction('resize')} role="presentation" />
        </div>
      </div>
      <div className="calibration-readout">
        <span>Recommended: {recommendation.layoutMode} / {recommendation.sidebarPosition} / {recommendation.zoneCount} zones</span>
        <span>Draft saved for surface: {surfaceId}</span>
      </div>
      <div className="ion-action-bar">
        <IonButton label="Use Recommendation" onClick={applyRecommendation} variant="ghost" />
        <IonButton label="Apply Calibration" onClick={() => applyCalibration('interactive')} />
      </div>
      <div className="calibration-history">
        <p className="eyebrow">Recent Calibration History</p>
        {history.length > 0 ? (
          <ul className="module-list calibration-history__list">
            {history.slice(0, 3).map((entry) => (
              <li key={`${entry.surfaceId}-${entry.timestamp}`}>
                {entry.prefs.layoutMode} / {entry.prefs.sidebarPosition} / {entry.prefs.zoneCount} zones
                {entry.machineState ? ` · ${entry.machineState}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p>No calibration history yet.</p>
        )}
      </div>
    </GlassCard>
  );
}