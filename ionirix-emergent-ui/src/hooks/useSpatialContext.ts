import { useSyncExternalStore } from 'react';
import { reflowEngine } from '@/core/engine';

export function useSpatialContext() {
  return useSyncExternalStore(
    (callback) => reflowEngine.subscribe(callback),
    () => reflowEngine.getSpatialSnapshot(),
    () => reflowEngine.getSpatialSnapshot(),
  );
}