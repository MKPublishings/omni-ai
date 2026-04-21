import { describe, expect, it, vi } from 'vitest';
import { BehaviorRegistry, registerDefaultBehaviors } from '@/core/registry';

describe('BehaviorRegistry subscriptions', () => {
  it('notifies subscribers when active behavior state changes', () => {
    const registry = BehaviorRegistry.getInstance();
    registry.reset();
    registerDefaultBehaviors(registry);
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);

    registry.evaluate({
      viewport: { width: 480, height: 900 },
      activeZones: ['step-content', 'context-panel'],
      focusedZone: 'step-content',
      interactionHistory: [
        { event: 'step-content:focus', timestamp: 1 },
        { event: 'step-content:hover', timestamp: 2 },
        { event: 'step-content:click', timestamp: 3 },
      ],
      userPreferences: {},
      currentState: 'environmentSetup',
    });

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});