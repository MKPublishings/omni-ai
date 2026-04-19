import type { WorldEventEnvelope, WorldStateBus, WorldStateSnapshot, WorldStateSubscriber } from './types';

export class InMemoryWorldStateBus implements WorldStateBus {
  private latestSnapshot: WorldStateSnapshot | null = null;
  private readonly subscribers = new Map<string, WorldStateSubscriber>();

  async publishSnapshot(snapshot: WorldStateSnapshot): Promise<void> {
    this.latestSnapshot = snapshot;
    await Promise.allSettled(
      [...this.subscribers.values()].map((subscriber) => Promise.resolve(subscriber.onSnapshot(snapshot)))
    );
  }

  async publishEvent(event: WorldEventEnvelope): Promise<void> {
    await Promise.allSettled(
      [...this.subscribers.values()].map((subscriber) => Promise.resolve(subscriber.onEvent?.(event)))
    );
  }

  subscribe(subscriber: WorldStateSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    if (this.latestSnapshot) {
      void Promise.resolve(subscriber.onSnapshot(this.latestSnapshot));
    }

    return () => {
      this.subscribers.delete(subscriber.id);
    };
  }

  getLatestSnapshot(): WorldStateSnapshot | null {
    return this.latestSnapshot;
  }
}