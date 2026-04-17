import type { AccessTier } from '../auth/credentials';

export type FederatedDomain =
  | 'knowledge_index'
  | 'chat_memories'
  | 'simulation_memories'
  | 'specs_registry'
  | 'tools_registry'
  | 'simulation_runs'
  | 'system_events'
  | 'entitlements';

export interface FederatedSearchResult {
  domain: FederatedDomain;
  title: string;
  snippet: string;
  sourceId: string;
  relevance: number;
  authority: number;
  freshnessHours?: number | null;
  totalScore?: number;
}

export interface RetrievalRecoveryPlan {
  strategy: 'grounded-only' | 'federated-recovery' | 'manual-escalation';
  reason: string;
  recommendedDomains: FederatedDomain[];
  confidence: number;
}

export interface SovereigntyAssessment {
  domain: FederatedDomain;
  classification: 'knowledge' | 'workspace' | 'simulation' | 'specification' | 'operations' | 'access';
  residency: 'global' | 'regional' | 'customer-scoped';
  retention: 'ephemeral' | 'session' | 'account' | 'audit';
  exportPolicy: 'standard' | 'restricted';
}

function normalizeText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function buildRetrievalVariants(query: string, maxPasses = 3): string[] {
  const base = normalizeText(query);
  if (!base) return [];

  const compact = base
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 12)
    .join(' ');

  const withoutStopWords = base
    .split(/\s+/)
    .filter((token) => !/^(the|and|with|from|into|that|this|what|when|where|which|how)$/i.test(token))
    .join(' ')
    .trim();

  const candidates = [base, withoutStopWords, compact].filter(Boolean);
  return Array.from(new Set(candidates)).slice(0, Math.max(1, Math.min(5, maxPasses)));
}

function freshnessScore(hours: number | null | undefined): number {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) {
    return 0.4;
  }
  if (hours <= 1) return 1;
  if (hours <= 24) return 0.8;
  if (hours <= 168) return 0.6;
  if (hours <= 720) return 0.4;
  return 0.2;
}

export function rankFederatedResults(results: FederatedSearchResult[]): FederatedSearchResult[] {
  const deduped = new Map<string, FederatedSearchResult>();

  for (const result of results) {
    const key = `${normalizeText(result.title).toLowerCase()}::${normalizeText(result.snippet).toLowerCase()}`;
    const score = result.relevance * 0.65 + result.authority * 0.25 + freshnessScore(result.freshnessHours) * 0.1;
    const candidate = { ...result, totalScore: Number(score.toFixed(4)) };
    const existing = deduped.get(key);
    if (!existing || (existing.totalScore || 0) < (candidate.totalScore || 0)) {
      deduped.set(key, candidate);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => (right.totalScore || 0) - (left.totalScore || 0));
}

export function extractPlanTierFromBillingPayload(payload: Record<string, any>): AccessTier | null {
  const object = payload?.data?.object || payload?.object || payload;
  const metadata = object?.metadata || {};
  const directValues = [
    metadata.planTier,
    metadata.tier,
    object?.planTier,
    object?.tier,
    object?.price?.lookup_key,
    object?.items?.data?.[0]?.price?.lookup_key,
    object?.lines?.data?.[0]?.price?.lookup_key,
  ]
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean);

  if (directValues.some((value) => value.includes('enterprise'))) {
    return 'enterprise';
  }
  if (directValues.some((value) => value.includes('premium'))) {
    return 'premium';
  }
  if (directValues.some((value) => value.includes('free'))) {
    return 'free';
  }
  return null;
}

export function buildSweepSummary(query: string, targetDomains: FederatedDomain[], resultCount: number): string {
  const domains = targetDomains.length ? targetDomains.join(', ') : 'all premium domains';
  return `Targeted sweep completed for "${normalizeText(query)}" across ${domains} with ${resultCount} ranked results.`;
}

export function buildRecoveryPlan(
  query: string,
  primaryResultCount: number,
  federatedResultCount: number,
  requestedDomains?: FederatedDomain[],
): RetrievalRecoveryPlan {
  const normalizedQuery = normalizeText(query);
  const recommendedDomains: FederatedDomain[] = requestedDomains?.length
    ? requestedDomains
    : ['knowledge_index', 'specs_registry', 'tools_registry', 'system_events'];

  if (primaryResultCount >= 3) {
    return {
      strategy: 'grounded-only',
      reason: `Primary retrieval for "${normalizedQuery}" returned sufficient grounded coverage.`,
      recommendedDomains,
      confidence: 0.86,
    };
  }

  if (federatedResultCount > 0) {
    return {
      strategy: 'federated-recovery',
      reason: `Primary retrieval for "${normalizedQuery}" was thin, so federation recovered supplemental evidence.`,
      recommendedDomains,
      confidence: 0.68,
    };
  }

  return {
    strategy: 'manual-escalation',
    reason: `Primary retrieval for "${normalizedQuery}" did not recover enough evidence and federation was also sparse.`,
    recommendedDomains,
    confidence: 0.34,
  };
}

export function assessDataSovereignty(domains: FederatedDomain[], accessTier: AccessTier = 'premium'): SovereigntyAssessment[] {
  const policies: Record<FederatedDomain, SovereigntyAssessment> = {
    knowledge_index: {
      domain: 'knowledge_index',
      classification: 'knowledge',
      residency: 'global',
      retention: 'account',
      exportPolicy: 'standard',
    },
    chat_memories: {
      domain: 'chat_memories',
      classification: 'workspace',
      residency: 'customer-scoped',
      retention: 'session',
      exportPolicy: 'standard',
    },
    simulation_memories: {
      domain: 'simulation_memories',
      classification: 'simulation',
      residency: 'customer-scoped',
      retention: 'session',
      exportPolicy: 'standard',
    },
    specs_registry: {
      domain: 'specs_registry',
      classification: 'specification',
      residency: 'regional',
      retention: 'account',
      exportPolicy: 'standard',
    },
    tools_registry: {
      domain: 'tools_registry',
      classification: 'specification',
      residency: 'regional',
      retention: 'account',
      exportPolicy: 'standard',
    },
    simulation_runs: {
      domain: 'simulation_runs',
      classification: 'simulation',
      residency: 'customer-scoped',
      retention: 'account',
      exportPolicy: 'restricted',
    },
    system_events: {
      domain: 'system_events',
      classification: 'operations',
      residency: 'regional',
      retention: 'audit',
      exportPolicy: 'restricted',
    },
    entitlements: {
      domain: 'entitlements',
      classification: 'access',
      residency: accessTier === 'enterprise' ? 'customer-scoped' : 'regional',
      retention: 'account',
      exportPolicy: 'restricted',
    },
  };

  return domains.map((domain) => policies[domain]);
}