import { readImageGenEnvironment } from '../config/env';
import type { SafetyDecision } from '../shared/types';

interface EntitySafetySlice {
  blockedTerms: string[];
}

const ENTITY_SAFETY_SLICES: Record<string, EntitySafetySlice> = {
  image_generation: {
    blockedTerms: [
      'child sexual',
      'minor sexual',
      'rape',
      'gore torture',
    ],
  },
};

export function evaluateImagePromptSafety(
  positive: string,
  negative: string,
  entityId = 'image_generation',
): SafetyDecision {
  const env = readImageGenEnvironment();
  if (!env.safetyEnabled) {
    return { allowed: true };
  }

  const slice = ENTITY_SAFETY_SLICES[entityId] || ENTITY_SAFETY_SLICES.image_generation;
  const combined = `${positive} ${negative}`.toLowerCase();
  for (const term of slice.blockedTerms) {
    if (combined.includes(term)) {
      return {
        allowed: false,
        reason: 'blocked-term',
        blockedTerm: term,
      };
    }
  }

  return { allowed: true };
}