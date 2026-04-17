const { execSync } = require('node:child_process');
const { createHmac } = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const baseUrl = String(process.env.ION_SMOKE_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const seedTarget = String(process.env.ION_SMOKE_SEED_TARGET || '--local').trim().toLowerCase() === '--remote' ? '--remote' : '--local';

function readLocalEnvValue(key) {
  const envPath = path.join(process.cwd(), '.dev.vars');
  if (!existsSync(envPath)) {
    return '';
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    if (trimmed.slice(0, separator).trim() !== key) {
      continue;
    }

    return trimmed.slice(separator + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }

  return '';
}

function buildStripeSignatureHeader(payload, secret) {
  if (!secret) {
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function expectStatus(response, expected, label) {
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${label} returned ${response.status} instead of ${expected}: ${body}`);
  }
}

function seedPremiumUser() {
  const output = execSync(`npx tsx src/scripts/seed-premium-smoke-user.ts ${seedTarget}`, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  const lines = String(output || '').trim().split(/\r?\n/).filter(Boolean);
  return JSON.parse(lines[lines.length - 1] || '{}');
}

async function run() {
  const gatewayResponse = await fetch(`${baseUrl}/api/gateway/status`);
  await expectStatus(gatewayResponse, 200, 'gateway status');

  const premiumResponse = await fetch(`${baseUrl}/api/premium/status`);
  await expectStatus(premiumResponse, 401, 'premium status without auth');

  const premiumPayload = await premiumResponse.json();
  if (premiumPayload.code !== 'ION_GATEWAY_AUTH_REQUIRED') {
    throw new Error(`premium status returned unexpected code: ${JSON.stringify(premiumPayload)}`);
  }

  const webhookBody = JSON.stringify({ id: 'evt_smoke', type: 'checkout.session.completed', data: { object: { metadata: {} } } });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || readLocalEnvValue('STRIPE_WEBHOOK_SECRET');
  const webhookHeaders = { 'Content-Type': 'application/json' };
  const webhookSignature = buildStripeSignatureHeader(webhookBody, webhookSecret);
  if (webhookSignature) {
    webhookHeaders['stripe-signature'] = webhookSignature;
  }

  const webhookResponse = await fetch(`${baseUrl}/api/billing/webhooks/stripe`, {
    method: 'POST',
    headers: webhookHeaders,
    body: webhookBody,
  });
  await expectStatus(webhookResponse, 200, 'stripe webhook smoke');

  const webhookPayload = await webhookResponse.json();
  if (webhookPayload.ok !== true) {
    throw new Error(`stripe webhook smoke returned unexpected payload: ${JSON.stringify(webhookPayload)}`);
  }

  const seededUser = seedPremiumUser();

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: seededUser.email,
      password: seededUser.password,
    }),
  });
  await expectStatus(loginResponse, 200, 'premium smoke login');

  const loginPayload = await loginResponse.json();
  if (!loginPayload.token) {
    throw new Error(`premium smoke login returned no token: ${JSON.stringify(loginPayload)}`);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loginPayload.token}`,
  };

  const entitlementsResponse = await fetch(`${baseUrl}/api/account/entitlements/me`, { headers: authHeaders });
  await expectStatus(entitlementsResponse, 200, 'my entitlements');
  const entitlementsPayload = await entitlementsResponse.json();

  const sovereigntyResponse = await fetch(`${baseUrl}/api/premium/sovereignty/assess`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ domains: ['chat_memories', 'system_events', 'entitlements'] }),
  });
  await expectStatus(sovereigntyResponse, 200, 'sovereignty assessment');
  const sovereigntyPayload = await sovereigntyResponse.json();

  const recoveryResponse = await fetch(`${baseUrl}/api/premium/retrieval/recover`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'resilient retrieval recovery for missing evidence', fallbackDomains: ['specs_registry', 'tools_registry'] }),
  });
  await expectStatus(recoveryResponse, 200, 'retrieval recovery');
  const recoveryPayload = await recoveryResponse.json();

  const superSearchResponse = await fetch(`${baseUrl}/api/premium/search/super`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ query: 'premium retrieval contracts', domains: ['tools_registry', 'system_events', 'entitlements'], limit: 8 }),
  });
  await expectStatus(superSearchResponse, 200, 'super search');
  const superSearchPayload = await superSearchResponse.json();

  const checkoutResponse = await fetch(`${baseUrl}/api/billing/checkout`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ planTier: 'premium', interval: 'month' }),
  });
  const checkoutPayload = await checkoutResponse.json();
  if (![201, 503].includes(checkoutResponse.status)) {
    throw new Error(`checkout returned unexpected status ${checkoutResponse.status}: ${JSON.stringify(checkoutPayload)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    seedTarget,
    gatewayStatus: 200,
    premiumUnauthorized: premiumPayload.code,
    webhookProcessed: webhookPayload.processed,
    webhookSignatureVerified: webhookPayload.signatureVerified,
    authenticatedUser: seededUser.email,
    loginAccessTier: loginPayload.accessTier,
    activeEntitlementTier: entitlementsPayload.activeEntitlement?.tier || null,
    sovereigntyContract: sovereigntyPayload.contract,
    recoveryContract: recoveryPayload.contract,
    recoveryStrategy: recoveryPayload.plan?.strategy || null,
    superSearchContract: superSearchPayload.contract,
    superSearchResultCount: superSearchPayload.resultCount,
    checkoutStatus: checkoutResponse.status,
  }, null, 2));
}

run().catch((error) => {
  console.error('[premium-phase-smoke]', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});