import { useSyncExternalStore } from 'react';
import { reflowEngine } from '@/core/engine';

export function useReflow(zoneId: string) {
  const layout = useSyncExternalStore(
    (callback) => reflowEngine.subscribe(callback),
    () => reflowEngine.getCurrentLayout(),
    () => reflowEngine.getCurrentLayout(),
  );

  return layout?.zones[zoneId] ?? null;
}