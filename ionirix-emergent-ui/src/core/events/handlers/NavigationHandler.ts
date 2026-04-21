import { EventBus } from '../EventBus';

export class NavigationHandler {
  constructor(private readonly bus: EventBus) {}

  emitTransition(machine: 'onboarding' | 'ui', from: string, to: string, event: string): void {
    this.bus.emit('STATE_TRANSITION', {
      machine,
      from,
      to,
      event,
    });
  }

  requestReflow(source: string, priority: 'immediate' | 'deferred' | 'lazy' = 'deferred'): void {
    this.bus.emit('REFLOW_REQUEST', {
      trigger: 'state-change',
      source,
      priority,
    });
  }
}