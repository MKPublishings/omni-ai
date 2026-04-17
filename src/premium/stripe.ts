import type { AccessTier } from '../auth/credentials';

export type BillingInterval = 'month' | 'year';

export interface StripeBillingEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PREMIUM_MONTHLY_PRICE_ID?: string;
  STRIPE_PREMIUM_YEARLY_PRICE_ID?: string;
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID?: string;
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID?: string;
  STRIPE_CHECKOUT_SUCCESS_URL?: string;
  STRIPE_CHECKOUT_CANCEL_URL?: string;
  APP_BASE_URL?: string;
}

export interface StripeCheckoutSessionResult {
  id: string;
  url: string | null;
  status: string | null;
  customerId: string | null;
  subscriptionId: string | null;
}

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export function normalizeBillingInterval(value: unknown): BillingInterval {
  return normalizeText(value).toLowerCase() === 'year' ? 'year' : 'month';
}

export function resolveStripePriceId(planTier: AccessTier, interval: BillingInterval, env: StripeBillingEnv): string | null {
  const lookup: Record<Exclude<AccessTier, 'free'>, Record<BillingInterval, string | undefined>> = {
    premium: {
      month: env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      year: env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    },
    enterprise: {
      month: env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      year: env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    },
  };

  if (planTier === 'free') {
    return null;
  }

  return normalizeText(lookup[planTier][interval]) || null;
}

function buildCheckoutUrl(path: string | undefined, baseUrl: string): string {
  const candidate = normalizeText(path);
  if (!candidate) {
    return new URL('/billing', baseUrl).toString();
  }

  return new URL(candidate, baseUrl).toString();
}

function buildStripeErrorMessage(payload: any): string {
  const message = payload?.error?.message;
  return normalizeText(message) || 'Stripe request failed.';
}

export async function createStripeCheckoutSession(input: {
  env: StripeBillingEnv;
  planTier: Extract<AccessTier, 'premium' | 'enterprise'>;
  interval: BillingInterval;
  userId: string;
  userEmail?: string | null;
}): Promise<StripeCheckoutSessionResult> {
  const secretKey = normalizeText(input.env.STRIPE_SECRET_KEY);
  const priceId = resolveStripePriceId(input.planTier, input.interval, input.env);
  const baseUrl = normalizeText(input.env.APP_BASE_URL) || 'https://example.invalid';

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  if (!priceId) {
    throw new Error(`Missing Stripe price id for ${input.planTier}/${input.interval}.`);
  }

  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('client_reference_id', input.userId);
  form.set('line_items[0][price]', priceId);
  form.set('line_items[0][quantity]', '1');
  form.set('allow_promotion_codes', 'true');
  form.set('success_url', buildCheckoutUrl(input.env.STRIPE_CHECKOUT_SUCCESS_URL, baseUrl));
  form.set('cancel_url', buildCheckoutUrl(input.env.STRIPE_CHECKOUT_CANCEL_URL, baseUrl));
  form.set('metadata[userId]', input.userId);
  form.set('metadata[planTier]', input.planTier);
  form.set('metadata[billingInterval]', input.interval);
  form.set('subscription_data[metadata][userId]', input.userId);
  form.set('subscription_data[metadata][planTier]', input.planTier);
  form.set('subscription_data[metadata][billingInterval]', input.interval);

  const normalizedEmail = normalizeText(input.userEmail);
  if (normalizedEmail) {
    form.set('customer_email', normalizedEmail);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) {
    throw new Error(buildStripeErrorMessage(payload));
  }

  return {
    id: normalizeText(payload.id),
    url: normalizeText(payload.url) || null,
    status: normalizeText(payload.status) || null,
    customerId: normalizeText(payload.customer) || null,
    subscriptionId: normalizeText(payload.subscription) || null,
  };
}

export function parseStripeSignatureHeader(header: string | null): { timestamp: number; signatures: string[] } | null {
  const value = normalizeText(header);
  if (!value) {
    return null;
  }

  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!timestampPart || signatures.length === 0) {
    return null;
  }

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return { timestamp, signatures };
}

async function signStripePayload(secret: string, signedPayload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  return toHex(signature);
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
  if (ageSeconds > toleranceSeconds) {
    return false;
  }

  const expected = await signStripePayload(secret, `${parsed.timestamp}.${payload}`);
  return parsed.signatures.some((candidate) => timingSafeEqual(candidate, expected));
}