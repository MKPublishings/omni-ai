import { useSyncExternalStore } from 'react';
import { reflowEngine } from '@/core/engine';

export interface SpatialTelemetry {
  activeZoneCount: number;
  visibleZoneCount: number;
  hiddenZoneCount: number;
  calibration: ReturnType<typeof reflowEngine.createSpatialCalibration>;
  balance: { horizontal: number; vertical: number } | null;
  focusedZone: string | null;
  layoutId: string | null;
}

let lastLayout = reflowEngine.getCurrentLayout();
let lastSpatial = reflowEngine.getSpatialSnapshot();
let lastFocusedZone = reflowEngine.getBehaviorContext(lastLayout).focusedZone;
let lastTelemetry: SpatialTelemetry = {
  activeZoneCount: Object.values(lastLayout?.zones ?? {}).length,
  visibleZoneCount: Object.values(lastLayout?.zones ?? {}).filter((zone) => zone.visibility !== 'hidden').length,
  hiddenZoneCount: Object.values(lastLayout?.zones ?? {}).filter((zone) => zone.visibility === 'hidden').length,
  calibration: reflowEngine.createSpatialCalibration(),
  balance: lastSpatial?.balance ?? null,
  focusedZone: lastFocusedZone,
  layoutId: lastLayout?.id ?? null,
};

const getTelemetrySnapshot = (): SpatialTelemetry => {
  const layout = reflowEngine.getCurrentLayout();
  const spatial = reflowEngine.getSpatialSnapshot();
  const focusedZone = reflowEngine.getBehaviorContext(layout).focusedZone;

  if (layout === lastLayout && spatial === lastSpatial && focusedZone === lastFocusedZone) {
    return lastTelemetry;
  }

  const zones = Object.values(layout?.zones ?? {});

  lastLayout = layout;
  lastSpatial = spatial;
  lastFocusedZone = focusedZone;
  lastTelemetry = {
    activeZoneCount: zones.length,
    visibleZoneCount: zones.filter((zone) => zone.visibility !== 'hidden').length,
    hiddenZoneCount: zones.filter((zone) => zone.visibility === 'hidden').length,
    calibration: reflowEngine.createSpatialCalibration(),
    balance: spatial?.balance ?? null,
    focusedZone,
    layoutId: layout?.id ?? null,
  };

  return lastTelemetry;
};

export function useSpatialTelemetry() {
  return useSyncExternalStore(
    (callback) => reflowEngine.subscribe(callback),
    getTelemetrySnapshot,
    getTelemetrySnapshot,
  );
}