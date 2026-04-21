import { describe, expect, it } from 'vitest';
import { BehaviorRegistry, registerDefaultBehaviors } from '@/core/registry';

describe('BehaviorRegistry', () => {
  it('registers the default behaviors', () => {
    const registry = BehaviorRegistry.getInstance();
    registry.reset();
    registerDefaultBehaviors(registry);

    expect(registry.getRegisteredIds()).toEqual(
      expect.arrayContaining(['adaptive-reveal', 'spatial-collapse', 'contextual-elevation', 'progressive-disclosure']),
    );
  });
});