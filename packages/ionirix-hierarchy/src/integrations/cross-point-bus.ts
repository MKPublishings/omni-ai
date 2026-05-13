import { BusTopology, EventSubscription, HierarchyEvent, PointId } from "../core/types.js";

export class CrossPointBus {
  private readonly subscriptions = new Map<string, EventSubscription[]>();

  constructor(private readonly topology: BusTopology) {}

  subscribe(subscription: EventSubscription): void {
    const allowed = this.topology.subscribers[subscription.pointId] ?? [];
    if (!allowed.includes(subscription.eventType)) {
      throw new Error(
        `Unauthorized subscription: ${subscription.pointId} cannot subscribe to ${subscription.eventType}`
      );
    }

    const current = this.subscriptions.get(subscription.eventType) ?? [];
    current.push(subscription);
    this.subscriptions.set(subscription.eventType, current);
  }

  emit(event: HierarchyEvent): HierarchyEvent {
    const allowed = this.topology.emitters[event.sourcePoint] ?? [];
    if (!allowed.includes(event.type)) {
      throw new Error(`Unauthorized event: ${event.sourcePoint} cannot emit ${event.type}`);
    }

    return event;
  }

  getSubscribers(eventType: string): EventSubscription[] {
    return [...(this.subscriptions.get(eventType) ?? [])];
  }

  getMatrixRow(pointId: PointId): { emits: string[]; subscribes: string[] } {
    return {
      emits: [...(this.topology.emitters[pointId] ?? [])],
      subscribes: [...(this.topology.subscribers[pointId] ?? [])]
    };
  }
}