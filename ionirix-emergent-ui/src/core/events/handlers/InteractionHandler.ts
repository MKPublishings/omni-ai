import type { InteractionAction } from '@/types';
import { EventBus } from '../EventBus';

export class InteractionHandler {
  constructor(private readonly bus: EventBus) {}

  emitInteraction(zoneId: string, action: InteractionAction, position = { x: 0, y: 0 }): void {
    this.bus.emit('INTERACTION', {
      zoneId,
      action,
      position,
      timestamp: Date.now(),
    });
  }
}