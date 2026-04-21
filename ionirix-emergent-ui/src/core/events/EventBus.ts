import type { EventPayload, IonirixEvent, IonirixEventType } from './EventTypes';

type Handler<T extends IonirixEventType> = (payload: EventPayload<T>) => void;
type UntypedHandler = (payload: unknown) => void;

interface Subscription {
  unsubscribe: () => void;
}

export class EventBus {
  private handlers = new Map<IonirixEventType, Set<UntypedHandler>>();
  private history: IonirixEvent[] = [];
  private maxHistory = 1000;
  private subscribers = new Set<() => void>();

  on<T extends IonirixEventType>(type: T, handler: Handler<T>): Subscription {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)?.add(handler as unknown as UntypedHandler);

    return {
      unsubscribe: () => this.off(type, handler),
    };
  }

  off<T extends IonirixEventType>(type: T, handler: Handler<T>): void {
    this.handlers.get(type)?.delete(handler as unknown as UntypedHandler);
  }

  emit<T extends IonirixEventType>(type: T, payload: EventPayload<T>): void {
    const event = { type, payload } as IonirixEvent;
    this.history.push(event);
    this.history = this.history.slice(-this.maxHistory);

    this.handlers.get(type)?.forEach((handler) => {
      (handler as unknown as Handler<T>)(payload);
    });
    this.subscribers.forEach((listener) => listener());
  }

  getHistory(): IonirixEvent[] {
    return this.history;
  }

  subscribe(listener: () => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  clearHistory(): void {
    this.history = [];
    this.subscribers.forEach((listener) => listener());
  }

  dispose(): void {
    this.handlers.clear();
    this.history = [];
    this.subscribers.clear();
  }
}

export const eventBus = new EventBus();