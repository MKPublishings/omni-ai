import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIonGateway, buildTierCapabilities, resolveGatewayPolicy } from '../../gateway/ionGateway';

test('resolveGatewayPolicy upgrades premium and enterprise prefixes', () => {
  assert.equal(resolveGatewayPolicy('/api/gateway/status').minimumTier, 'free');
  assert.equal(resolveGatewayPolicy('/api/premium/status').minimumTier, 'premium');
  assert.equal(resolveGatewayPolicy('/api/enterprise/status').minimumTier, 'enterprise');
});

test('buildTierCapabilities exposes premium-only capabilities above free tier', () => {
  const freeCapabilities = buildTierCapabilities('free');
  const premiumCapabilities = buildTierCapabilities('premium');
  const enterpriseCapabilities = buildTierCapabilities('enterprise');

  assert.deepEqual(freeCapabilities, ['baseline_chat', 'baseline_retrieval']);
  assert.ok(premiumCapabilities.includes('enhanced_ai_internet_backend'));
  assert.ok(enterpriseCapabilities.includes('enterprise_controls'));
});

test('applyIonGateway blocks premium routes for free-tier anonymous requests', async () => {
  const request = new Request('https://example.test/api/premium/status');

  const response = await applyIonGateway(request, {}, async () => {
    return new Response('unexpected', { status: 200 });
  });

  const body = await response.json() as Record<string, unknown>;
  assert.equal(response.status, 401);
  assert.equal(body.code, 'ION_GATEWAY_AUTH_REQUIRED');
  assert.equal(response.headers.get('X-ION-Access-Tier'), 'free');
  assert.equal(response.headers.get('X-ION-Gateway-Policy'), 'premium-access');
});

test('applyIonGateway annotates successful public responses', async () => {
  const request = new Request('https://example.test/api/gateway/status');

  const response = await applyIonGateway(request, {}, async (_request, context) => {
    return new Response(JSON.stringify({ tier: context.accessTier, authenticated: context.authenticated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  const body = await response.json() as Record<string, unknown>;
  assert.equal(response.status, 200);
  assert.equal(body.tier, 'free');
  assert.equal(body.authenticated, false);
  assert.equal(response.headers.get('X-ION-Gateway'), 'active');
  assert.equal(response.headers.get('X-ION-Gateway-Policy'), 'public-free');
});