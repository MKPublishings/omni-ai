import { describe, expect, it } from 'vitest';
import { ReflowEngine } from '@/core/engine';
import onboardingSchema from '@/core/schema/defaults/onboarding.schema.json';
import type { LayoutSchema } from '@/types';

describe('ReflowEngine', () => {
  it('initializes and resolves a reflow request', () => {
    const engine = new ReflowEngine();
    engine.initialize(onboardingSchema as LayoutSchema);
    const result = engine.requestReflow({ source: 'test', type: 'viewport', timestamp: Date.now() });

    expect(result.layout.id).toBe('onboarding-root');
    expect(result.iterationCount).toBe(1);
  });
});