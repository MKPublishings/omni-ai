import { useSyncExternalStore } from 'react';
import { eventBus } from '@/core/events';
import type { IonirixEvent } from '@/types';

export function useEventHistory<T extends IonirixEvent['type']>(type: T): Array<Extract<IonirixEvent, { type: T }>>;
export function useEventHistory(type?: IonirixEvent['type']): IonirixEvent[];
export function useEventHistory(type?: IonirixEvent['type']) {
  const history = useSyncExternalStore(
    (callback) => eventBus.subscribe(callback),
    () => eventBus.getHistory(),
    () => eventBus.getHistory(),
  );

  return type ? history.filter((event): event is Extract<IonirixEvent, { type: typeof type }> => event.type === type) : history;
}