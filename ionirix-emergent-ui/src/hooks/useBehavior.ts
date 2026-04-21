import { useMemo, useSyncExternalStore } from 'react';
import { BehaviorRegistry } from '@/core/registry';
import type { Behavior } from '@/types';

interface UseBehaviorOptions {
  includeIds?: string[];
}

export function useBehavior(options: UseBehaviorOptions = {}): Behavior[] {
  const registry = BehaviorRegistry.getInstance();
  const activeBehaviors = useSyncExternalStore(
    (callback) => registry.subscribe(callback),
    () => registry.getActive(),
    () => registry.getActive(),
  );

  return useMemo(() => {
    if (!options.includeIds || options.includeIds.length === 0) {
      return activeBehaviors;
    }

    return activeBehaviors.filter((behavior) => options.includeIds?.includes(behavior.id));
  }, [activeBehaviors, options.includeIds]);
}