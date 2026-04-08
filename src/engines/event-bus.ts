/**
 * @module EventBus
 * @spec: ion-router-v2
 * 
 * In-worker pub/sub for cross-module event propagation.
 * Lifecycle: per-request (created in middleware, passed via context).
 * Events are fire-and-forget within the request lifecycle.
 * 
 * Events are used for metrics, audit trails, and real-time notifications.
 */

export interface BusEvent {
  type: string; // e.g., 'tool.executed', 'memory.created', 'simulation.stepped'
  source: string; // originating module
  timestamp: string; // ISO 8601
  data: Record<string, unknown>; // event payload
}

export type EventHandler = (event: BusEvent) => void | Promise<void>;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventLog: BusEvent[] = [];
  private requestId: string;

  constructor() {
    this.requestId = crypto.randomUUID();
  }

  /**
   * Subscribe to an event type
   * Multiple handlers can subscribe to the same event type
   */
  on(eventType: string, handler: EventHandler): () => void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index >= 0) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to an event type, called only once
   */
  once(eventType: string, handler: EventHandler): void {
    const unsubscribe = this.on(eventType, async (event) => {
      await handler(event);
      unsubscribe();
    });
  }

  /**
   * Emit an event to all subscribers
   * Runs all handlers for that event type in parallel (though mostly synchronous)
   */
  async emit(eventType: string, source: string, data: Record<string, unknown>): Promise<void> {
    const event: BusEvent = {
      type: eventType,
      source,
      timestamp: new Date().toISOString(),
      data,
    };
    this.eventLog.push(event);

    const handlers = this.handlers.get(eventType) || [];
    try {
      await Promise.allSettled(
        handlers.map((h) => {
          try {
            return Promise.resolve(h(event));
          } catch (err) {
            console.error(`[EventBus] Handler error for ${eventType}:`, err);
            return Promise.reject(err);
          }
        })
      );
    } catch (err) {
      console.error(`[EventBus] Error emitting event ${eventType}:`, err);
      // Don't fail the request if event handlers fail
    }
  }

  /**
   * Get all events emitted during this request
   */
  getLog(): BusEvent[] {
    return [...this.eventLog];
  }

  /**
   * Get event count by type
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.eventLog.forEach((event) => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });
    return stats;
  }

  /**
   * Get the request ID for this bus instance
   */
  getRequestId(): string {
    return this.requestId;
  }

  /**
   * Clear all handlers and log
   * Call at end of request or for cleanup
   */
  reset(): void {
    this.handlers.clear();
    this.eventLog = [];
  }

  /**
   * Destroy the bus (same as reset)
   */
  destroy(): void {
    this.reset();
  }
}
