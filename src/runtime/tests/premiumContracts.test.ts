import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessDataSovereignty,
  buildRecoveryPlan,
  buildRetrievalVariants,
  buildSweepSummary,
  extractPlanTierFromBillingPayload,
  rankFederatedResults,
} from '../../premium/contracts';

test('buildRetrievalVariants creates compact multi-pass variants', () => {
  const variants = buildRetrievalVariants('How does the premium backend retrieval pipeline recover from incomplete results?', 4);
  assert.ok(variants.length >= 2);
  assert.equal(variants[0], 'How does the premium backend retrieval pipeline recover from incomplete results?');
  assert.ok(variants.some((variant) => variant.toLowerCase().includes('premium')));
});

test('extractPlanTierFromBillingPayload resolves plan tiers from metadata and lookup keys', () => {
  assert.equal(extractPlanTierFromBillingPayload({ data: { object: { metadata: { planTier: 'premium' } } } }), 'premium');
  assert.equal(extractPlanTierFromBillingPayload({ data: { object: { items: { data: [{ price: { lookup_key: 'ion-enterprise-monthly' } }] } } } }), 'enterprise');
  assert.equal(extractPlanTierFromBillingPayload({ data: { object: {} } }), null);
});

test('rankFederatedResults deduplicates and keeps the strongest result', () => {
  const ranked = rankFederatedResults([
    {
      domain: 'knowledge_index',
      title: 'Retrieval Core',
      snippet: 'Grounded retrieval with reranking.',
      sourceId: 'a',
      relevance: 0.9,
      authority: 0.9,
      freshnessHours: 2,
    },
    {
      domain: 'specs_registry',
      title: 'Retrieval Core',
      snippet: 'Grounded retrieval with reranking.',
      sourceId: 'b',
      relevance: 0.5,
      authority: 0.5,
      freshnessHours: 200,
    },
  ]);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].sourceId, 'a');
  assert.ok((ranked[0].totalScore || 0) > 0.7);
});

test('buildSweepSummary reports domains and counts', () => {
  const summary = buildSweepSummary('vector retrieval', ['knowledge_index', 'specs_registry'], 7);
  assert.match(summary, /vector retrieval/);
  assert.match(summary, /knowledge_index, specs_registry/);
  assert.match(summary, /7 ranked results/);
});

test('buildRecoveryPlan escalates to federation when primary retrieval is sparse', () => {
  const plan = buildRecoveryPlan('resilient retrieval', 1, 5, ['knowledge_index', 'specs_registry']);
  assert.equal(plan.strategy, 'federated-recovery');
  assert.match(plan.reason, /thin/);
  assert.deepEqual(plan.recommendedDomains, ['knowledge_index', 'specs_registry']);
});

test('assessDataSovereignty classifies domains and export restrictions', () => {
  const assessment = assessDataSovereignty(['chat_memories', 'system_events', 'entitlements'], 'enterprise');
  assert.equal(assessment[0].residency, 'customer-scoped');
  assert.equal(assessment[1].exportPolicy, 'restricted');
  assert.equal(assessment[2].residency, 'customer-scoped');
});