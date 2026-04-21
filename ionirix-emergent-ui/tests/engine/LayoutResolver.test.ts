import { describe, expect, it } from 'vitest';
import { LayoutResolver } from '@/core/engine';
import onboardingSchema from '@/core/schema/defaults/onboarding.schema.json';
import type { LayoutSchema } from '@/types';

describe('LayoutResolver', () => {
  it('resolves the onboarding schema into a grid layout', () => {
    const resolver = new LayoutResolver();
    const layout = resolver.resolve(
      onboardingSchema as LayoutSchema,
      { width: 1440, height: 900, density: 1 },
      { theme: 'dark', density: 'comfortable', motionPreference: 'full' },
      [],
    );

    expect(layout.id).toBe('onboarding-root');
    expect(layout.grid.columns).toBe('auto 1fr 280px');
    expect(layout.zones['step-content']).toBeDefined();
  });
});