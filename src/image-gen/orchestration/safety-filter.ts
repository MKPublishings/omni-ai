import { readImageGenEnvironment } from '../config/env';
import type { SafetyDecision } from '../shared/types';

const BLOCKED_TERMS = [
  'child sexual',
  'minor sexual',
  'rape',
  'gore torture',
];

export function evaluateImagePromptSafety(positive: string, negative: string): SafetyDecision {
  const env = readImageGenEnvironment();
  if (!env.safetyEnabled) {
    return { allowed: true };
  }

  const combined = `${positive} ${negative}`.toLowerCase();
  for (const term of BLOCKED_TERMS) {
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