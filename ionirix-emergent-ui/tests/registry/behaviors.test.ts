import { describe, expect, it } from 'vitest';
import { AdaptiveReveal, ContextualElevation, ProgressiveDisclosure, SpatialCollapse } from '@/core/registry';

describe('built-in behaviors', () => {
  it('exposes the architected default behavior ids', () => {
    expect(AdaptiveReveal.id).toBe('adaptive-reveal');
    expect(SpatialCollapse.id).toBe('spatial-collapse');
    expect(ContextualElevation.id).toBe('contextual-elevation');
    expect(ProgressiveDisclosure.id).toBe('progressive-disclosure');
  });
});