import { describe, expect, it } from 'vitest';
import { LayoutResolver, SpatialAnalyzer } from '@/core/engine';
import onboardingSchema from '@/core/schema/defaults/onboarding.schema.json';
import type { LayoutSchema } from '@/types';

describe('SpatialAnalyzer', () => {
  it('captures a spatial snapshot from a resolved layout', () => {
    const resolver = new LayoutResolver();
    const layout = resolver.resolve(
      onboardingSchema as LayoutSchema,
      { width: 1440, height: 900, density: 1 },
      { theme: 'dark', density: 'comfortable', motionPreference: 'full' },
      [],
    );
    const snapshot = new SpatialAnalyzer().capture(layout);

    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.weights.length).toBeGreaterThan(0);
  });
});