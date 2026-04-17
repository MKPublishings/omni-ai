import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createStripeCheckoutSession,
  normalizeBillingInterval,
  parseStripeSignatureHeader,
  resolveStripePriceId,
  verifyStripeWebhookSignature,
} from '../../premium/stripe';

test('normalizeBillingInterval constrains values to month or year', () => {
  assert.equal(normalizeBillingInterval('year'), 'year');
  assert.equal(normalizeBillingInterval('month'), 'month');
  assert.equal(normalizeBillingInterval('unexpected'), 'month');
});

test('resolveStripePriceId selects plan-specific price ids', () => {
  const env = {
    STRIPE_PREMIUM_MONTHLY_PRICE_ID: 'price_premium_month',
    STRIPE_PREMIUM_YEARLY_PRICE_ID: 'price_premium_year',
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: 'price_enterprise_month',
    STRIPE_ENTERPRISE_YEARLY_PRICE_ID: 'price_enterprise_year',
  };

  assert.equal(resolveStripePriceId('premium', 'month', env), 'price_premium_month');
  assert.equal(resolveStripePriceId('enterprise', 'year', env), 'price_enterprise_year');
  assert.equal(resolveStripePriceId('free', 'month', env), null);
});

test('parseStripeSignatureHeader extracts timestamp and v1 signatures', () => {
  const parsed = parseStripeSignatureHeader('t=1700000000,v1=abc123,v1=def456');
  assert.deepEqual(parsed, { timestamp: 1700000000, signatures: ['abc123', 'def456'] });
  assert.equal(parseStripeSignatureHeader('invalid'), null);
});

test('verifyStripeWebhookSignature validates signed payloads', async () => {
  const payload = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed' });
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = 'whsec_test_secret';

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const signature = Array.from(new Uint8Array(signatureBuffer)).map((value) => value.toString(16).padStart(2, '0')).join('');

  assert.equal(await verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(await verifyStripeWebhookSignature(payload, `t=${timestamp},v1=deadbeef`, secret), false);
});

test('createStripeCheckoutSession posts to Stripe checkout sessions endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest: Request | null = null;

  globalThis.fetch = async (input, init) => {
    capturedRequest = new Request(input, init);
    return new Response(JSON.stringify({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session/123',
      status: 'open',
      customer: 'cus_123',
      subscription: 'sub_123',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const session = await createStripeCheckoutSession({
      env: {
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_PREMIUM_MONTHLY_PRICE_ID: 'price_premium_month',
        APP_BASE_URL: 'https://ion.example',
      },
      planTier: 'premium',
      interval: 'month',
      userId: 'user_123',
      userEmail: 'person@example.com',
    });

    assert.equal(session.id, 'cs_test_123');
    assert.equal(session.subscriptionId, 'sub_123');
    assert.ok(capturedRequest);
    const request = capturedRequest as Request;
    assert.equal(request.url, 'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(request.headers.get('Authorization'), 'Bearer sk_test_123');

    const bodyText = await request.text();
    assert.match(String(bodyText), /line_items%5B0%5D%5Bprice%5D=price_premium_month/);
    assert.match(String(bodyText), /metadata%5BuserId%5D=user_123/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});