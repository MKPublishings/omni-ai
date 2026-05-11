import { readImageGenEnvironment } from '../config/env';
import type { SafetyDecision } from '../shared/types';

interface EntitySafetySlice {
  blockedTerms: string[];
}

const ANIME_CONTEXT_PATTERN = /\b(anime|manga|cel\s*shade(?:d|ing)?|illustration|stylized\s*character)\b/i;
const EXPLICIT_CONTENT_PATTERN = /\b(nude|nudity|explicit\s*nudity|erotic|porn|sex\s*scene|adult\s*content|fetish)\b/i;

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

  const animeContext = ANIME_CONTEXT_PATTERN.test(combined);
  const explicitContext = EXPLICIT_CONTENT_PATTERN.test(combined);
  if (animeContext && !explicitContext) {
    return {
      allowed: true,
      reason: 'contextual-anime-safe',
    };
  }

  return { allowed: true };
}