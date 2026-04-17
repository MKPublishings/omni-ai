import type { RouteParams } from '../router';
import { EventBus } from '../engines/event-bus';
import { ToolRegistry } from '../engines/tool-registry';
import { searchKnowledge } from '../retrieval/ragWorker.js';
import {
  getActiveUserEntitlement,
  listUserEntitlements,
  upsertUserEntitlement,
  type AccessTier,
} from '../auth/credentials';
import {
  assessDataSovereignty,
  buildRecoveryPlan,
  buildRetrievalVariants,
  buildSweepSummary,
  extractPlanTierFromBillingPayload,
  rankFederatedResults,
  type FederatedDomain,
  type FederatedSearchResult,
} from '../premium/contracts';
import {
  createStripeCheckoutSession,
  normalizeBillingInterval,
  resolveStripePriceId,
  verifyStripeWebhookSignature,
  type StripeBillingEnv,
} from '../premium/stripe';

type PremiumWorkerEnv = StripeBillingEnv & {
  STRIPE_PUBLISHABLE_KEY?: string;
  APP_BASE_URL?: string;
};

const FEDERATED_DOMAINS: FederatedDomain[] = [
  'knowledge_index',
  'chat_memories',
  'simulation_memories',
  'specs_registry',
  'tools_registry',
  'simulation_runs',
  'system_events',
  'entitlements',
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ensureUser(request: Request): { userId: string; sessionId: string } | Response {
  const userId = (request as any).authContext?.userId;
  const sessionId = (request as any).authContext?.sessionId;
  if (!userId || !sessionId) {
    return json({ error: 'Unauthorized' }, 401);
  }
  return { userId, sessionId };
}

function ensureAdmin(request: Request): true | Response {
  if ((request as any).authContext?.isAdmin) {
    return true;
  }
  return json({ error: 'Admin access required' }, 403);
}

function normalizeQuery(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildLikePattern(query: string): string {
  return `%${query.toLowerCase()}%`;
}

function parseFreshnessHours(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return (Date.now() - time) / 36e5;
}

function isFederatedDomain(value: string): value is FederatedDomain {
  return FEDERATED_DOMAINS.includes(value as FederatedDomain);
}

function resolveRequestedDomains(value: unknown, fallback: FederatedDomain[]): FederatedDomain[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((domain) => normalizeQuery(domain))
    .filter((domain): domain is FederatedDomain => isFederatedDomain(domain));

  return normalized.length ? normalized : fallback;
}

export class PremiumWorker {
  constructor(
    private db: D1Database,
    private eventBus: EventBus,
    private toolRegistry: ToolRegistry,
    private env: PremiumWorkerEnv,
  ) {}

  private async writeSystemEvent(eventType: string, severity: 'info' | 'warn' | 'error', message: string, metadata: Record<string, unknown>) {
    try {
      await this.db
        .prepare(`INSERT INTO system_events (id, event_type, source, severity, message, metadata, created_at) VALUES (?, ?, 'premium-worker', ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), eventType, severity, message, JSON.stringify(metadata), new Date().toISOString())
        .run();
    } catch {
      // Non-fatal if system_events table is unavailable.
    }
  }

  async getMyEntitlements(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const entitlements = await listUserEntitlements(this.db, auth.userId);
    const active = await getActiveUserEntitlement(this.db, auth.userId);

    return json({
      accessTier: (request as any).authContext?.accessTier || 'free',
      activeEntitlement: active,
      entitlements,
    });
  }

  async listEntitlements(request: Request): Promise<Response> {
    const admin = ensureAdmin(request);
    if (admin instanceof Response) return admin;

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const query = userId
      ? this.db.prepare(`SELECT * FROM auth_user_entitlements WHERE user_id = ? ORDER BY updated_at DESC`).bind(userId)
      : this.db.prepare(`SELECT * FROM auth_user_entitlements ORDER BY updated_at DESC LIMIT 200`);

    const result = await query.all<Record<string, unknown>>();
    return json({ entitlements: result.results || [] });
  }

  async upsertEntitlementRoute(request: Request): Promise<Response> {
    const admin = ensureAdmin(request);
    if (admin instanceof Response) return admin;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const userId = normalizeQuery(body?.userId);
    const tier = normalizeQuery(body?.tier) as AccessTier;
    const status = normalizeQuery(body?.status) || 'active';

    if (!userId || !['free', 'premium', 'enterprise'].includes(tier)) {
      return json({ error: 'userId and valid tier are required.' }, 400);
    }

    const entitlement = await upsertUserEntitlement(this.db, {
      userId,
      tier,
      status,
      source: normalizeQuery(body?.source) || 'manual-admin',
      startsAt: normalizeQuery(body?.startsAt) || null,
      endsAt: normalizeQuery(body?.endsAt) || null,
      metadata: typeof body?.metadata === 'object' && body?.metadata ? body.metadata as Record<string, unknown> : undefined,
    });

    await this.eventBus.emit('entitlement.updated', 'premium-worker', { userId, tier, status });
    await this.writeSystemEvent('entitlement.updated', 'info', `Updated entitlement for ${userId}`, { userId, tier, status });

    return json({ entitlement }, 201);
  }

  async createCheckout(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const requestedTier = normalizeQuery(body?.planTier);
    if (!['premium', 'enterprise'].includes(requestedTier)) {
      return json({ error: 'planTier must be premium or enterprise.' }, 400);
    }

    const planTier: Extract<AccessTier, 'premium' | 'enterprise'> = requestedTier === 'enterprise' ? 'enterprise' : 'premium';

    const now = new Date().toISOString();
    const interval = normalizeBillingInterval(body?.interval);
    const userEmail = String((request as any).authContext?.email || '').trim() || null;
    const priceId = resolveStripePriceId(planTier, interval, this.env);
    const requestedPriceId = normalizeQuery(body?.priceId);

    if (!String(this.env.STRIPE_SECRET_KEY || '').trim()) {
      return json({ error: 'Stripe secret key is not configured.' }, 503);
    }

    if (!priceId) {
      return json({ error: `Stripe price id is not configured for ${planTier}/${interval}.` }, 503);
    }

    if (requestedPriceId && requestedPriceId !== priceId) {
      return json({ error: `Selected price id does not match configured billing plan for ${planTier}/${interval}.` }, 400);
    }

    try {
      const session = await createStripeCheckoutSession({
        env: this.env,
        planTier,
        interval,
        userId: auth.userId,
        userEmail,
      });

      const customerRecordId = `bc_${auth.userId}`;
      await this.db
        .prepare(`INSERT INTO billing_customers (id, user_id, provider, provider_customer_id, email, status, metadata_json, created_at, updated_at)
          VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            provider_customer_id = excluded.provider_customer_id,
            email = excluded.email,
            status = excluded.status,
            metadata_json = excluded.metadata_json,
            updated_at = excluded.updated_at`)
        .bind(
          customerRecordId,
          auth.userId,
          session.customerId,
          userEmail,
          session.status || 'checkout-created',
          JSON.stringify({ checkoutSessionId: session.id, planTier, interval, priceId }),
          now,
          now,
        )
        .run();

      await this.db
        .prepare(`INSERT INTO billing_subscriptions (id, user_id, billing_customer_id, plan_tier, provider, provider_subscription_id, status, metadata_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?)
          ON CONFLICT(provider_subscription_id) DO UPDATE SET
            status = excluded.status,
            metadata_json = excluded.metadata_json,
            updated_at = excluded.updated_at`)
        .bind(
          crypto.randomUUID(),
          auth.userId,
          customerRecordId,
          planTier,
          session.subscriptionId,
          session.status || 'checkout-created',
          JSON.stringify({ checkoutSessionId: session.id, checkoutUrl: session.url, interval, priceId }),
          now,
          now,
        )
        .run();

      await this.eventBus.emit('billing.checkout.created', 'premium-worker', {
        userId: auth.userId,
        planTier,
        interval,
        checkoutSessionId: session.id,
      });
      await this.writeSystemEvent('billing.checkout.created', 'info', `Stripe checkout session created for ${auth.userId}`, {
        userId: auth.userId,
        planTier,
        interval,
        checkoutSessionId: session.id,
      });

      return json({
        provider: 'stripe',
        publishableKey: String(this.env.STRIPE_PUBLISHABLE_KEY || '').trim() || null,
        planTier,
        interval,
        priceId,
        checkoutSessionId: session.id,
        checkoutUrl: session.url,
        subscriptionId: session.subscriptionId,
        customerId: session.customerId,
        status: session.status || 'checkout-created',
        webhookEndpoint: '/api/billing/webhooks/stripe',
      }, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Stripe checkout creation failed.';
      await this.writeSystemEvent('billing.checkout.failed', 'error', message, {
        userId: auth.userId,
        planTier,
        interval,
        priceId,
      });
      return json({ error: message }, 502);
    }
  }

  async getBillingStatus(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const [customer, subscriptions, entitlement] = await Promise.all([
      this.db.prepare(`SELECT * FROM billing_customers WHERE user_id = ? LIMIT 1`).bind(auth.userId).first<Record<string, unknown>>(),
      this.db.prepare(`SELECT * FROM billing_subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`).bind(auth.userId).all<Record<string, unknown>>(),
      getActiveUserEntitlement(this.db, auth.userId),
    ]);

    return json({
      customer: customer || null,
      subscriptions: subscriptions.results || [],
      activeEntitlement: entitlement,
      providerConfigured: Boolean(String(this.env.STRIPE_SECRET_KEY || '').trim()),
      priceConfiguration: {
        premiumMonthly: Boolean(this.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID),
        premiumYearly: Boolean(this.env.STRIPE_PREMIUM_YEARLY_PRICE_ID),
        enterpriseMonthly: Boolean(this.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID),
        enterpriseYearly: Boolean(this.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID),
      },
      priceIds: {
        premiumMonthly: String(this.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '').trim() || null,
        premiumYearly: String(this.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || '').trim() || null,
        enterpriseMonthly: String(this.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '').trim() || null,
        enterpriseYearly: String(this.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || '').trim() || null,
      },
    });
  }

  async handleStripeWebhook(request: Request): Promise<Response> {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return json({ error: 'Invalid webhook payload.' }, 400);
    }

    const webhookSecret = String(this.env.STRIPE_WEBHOOK_SECRET || '').trim();
    const signatureHeader = request.headers.get('stripe-signature');
    let signatureVerified = false;

    if (webhookSecret) {
      signatureVerified = await verifyStripeWebhookSignature(rawBody, signatureHeader, webhookSecret);
      if (!signatureVerified) {
        await this.writeSystemEvent('billing.webhook.rejected', 'warn', 'Rejected Stripe webhook with invalid signature.', {
          hasSignatureHeader: Boolean(signatureHeader),
        });
        return json({ error: 'Invalid Stripe webhook signature.' }, 400);
      }
    }

    const payload = JSON.parse(rawBody) as Record<string, any>;

    const eventType = normalizeQuery(payload.type) || 'unknown';
    const externalEventId = normalizeQuery(payload.id) || crypto.randomUUID();
    const tier = extractPlanTierFromBillingPayload(payload);
    const object = payload?.data?.object || {};
    const metadata = object?.metadata || {};
    const userId = normalizeQuery(metadata.userId || object?.client_reference_id || payload?.userId);
    const now = new Date().toISOString();

    await this.db
      .prepare(`INSERT OR IGNORE INTO billing_webhook_events (id, provider, event_type, external_event_id, status, payload_json, created_at)
        VALUES (?, 'stripe', ?, ?, 'received', ?, ?)`)
      .bind(crypto.randomUUID(), eventType, externalEventId, rawBody, now)
      .run();

    let processed = false;
    if (userId && tier) {
      const subscriptionStatus = normalizeQuery(object?.status || object?.payment_status) || (eventType.includes('deleted') ? 'canceled' : 'active');
      const entitlementStatus = /active|trialing|paid|complete/.test(subscriptionStatus) ? 'active' : 'inactive';

      const customerId = `bc_hook_${userId}`;
      await this.db
        .prepare(`INSERT INTO billing_customers (id, user_id, provider, provider_customer_id, email, status, metadata_json, created_at, updated_at)
          VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            provider_customer_id = excluded.provider_customer_id,
            email = excluded.email,
            status = excluded.status,
            metadata_json = excluded.metadata_json,
            updated_at = excluded.updated_at`)
        .bind(
          customerId,
          userId,
          normalizeQuery(object?.customer) || null,
          normalizeQuery(object?.customer_email || object?.customer_details?.email) || null,
          subscriptionStatus,
          JSON.stringify({ webhookEventId: externalEventId, signatureVerified }),
          now,
          now,
        )
        .run();

      await this.db
        .prepare(`INSERT INTO billing_subscriptions (id, user_id, billing_customer_id, plan_tier, provider, provider_subscription_id, status, current_period_start, current_period_end, metadata_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'stripe', ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(provider_subscription_id) DO UPDATE SET
            status = excluded.status,
            current_period_start = excluded.current_period_start,
            current_period_end = excluded.current_period_end,
            metadata_json = excluded.metadata_json,
            updated_at = excluded.updated_at`)
        .bind(
          crypto.randomUUID(),
          userId,
          customerId,
          tier,
          normalizeQuery(object?.subscription || object?.id) || `sub_${externalEventId}`,
          subscriptionStatus,
          object?.current_period_start ? new Date(Number(object.current_period_start) * 1000).toISOString() : null,
          object?.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : null,
          JSON.stringify({ webhookEventId: externalEventId, eventType, signatureVerified }),
          now,
          now,
        )
        .run();

      await upsertUserEntitlement(this.db, {
        userId,
        tier,
        status: entitlementStatus,
        source: 'stripe-webhook',
        startsAt: now,
        endsAt: object?.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : null,
        metadata: { externalEventId, eventType, subscriptionStatus },
      });

      processed = true;
    }

    await this.db
      .prepare(`UPDATE billing_webhook_events SET status = ?, processed_at = ?, error_message = ? WHERE external_event_id = ?`)
      .bind(processed ? 'processed' : 'ignored', now, processed ? null : 'Missing userId or plan tier for entitlement update.', externalEventId)
      .run();

    await this.eventBus.emit('billing.webhook.received', 'premium-worker', { eventType, externalEventId, processed, signatureVerified, userId: userId || null, tier: tier || null });
    await this.writeSystemEvent('billing.webhook.received', 'info', `Billing webhook received: ${eventType}`, { externalEventId, processed, signatureVerified, userId, tier });

    return json({ ok: true, processed, signatureVerified, eventType, externalEventId });
  }

  async retrievalQuery(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const query = normalizeQuery(body?.query);
    if (!query) {
      return json({ error: 'query is required.' }, 400);
    }

    const variants = buildRetrievalVariants(query, Number(body?.maxPasses || 3));
    const deepRecovery = Boolean(body?.deepRecovery);
    const passes = variants.map((variant, index) => {
      const hits = searchKnowledge(variant, { topK: deepRecovery ? 8 : 4 }).map((hit: any) => ({
        source: String(hit.source || 'knowledge-index'),
        text: String(hit.text || ''),
        score: Number(hit.score || 0),
      }));
      return {
        pass: index + 1,
        variant,
        hits,
      };
    });

    const groundedSources = rankFederatedResults(
      passes.flatMap((pass) =>
        pass.hits.map((hit, index) => ({
          domain: 'knowledge_index' as const,
          title: `${hit.source}#${index + 1}`,
          snippet: hit.text.slice(0, 280),
          sourceId: `${hit.source}:${index + 1}`,
          relevance: Math.max(0.1, Math.min(1, hit.score / 8)),
          authority: 0.8,
          freshnessHours: null,
        }))
      )
    ).slice(0, deepRecovery ? 8 : 5);

    await this.eventBus.emit('premium.retrieval.executed', 'premium-worker', { userId: auth.userId, query, variants: variants.length });

    return json({
      query,
      deepRecovery,
      passes,
      groundedSources,
      contract: 'retrieval-core-v1',
    });
  }

  async retrievalRecovery(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const query = normalizeQuery(body?.query);
    if (!query) {
      return json({ error: 'query is required.' }, 400);
    }

    const minPrimaryResults = Math.max(1, Number(body?.minPrimaryResults || 3));
    const primaryHits = searchKnowledge(query, { topK: Math.max(4, minPrimaryResults) }) as Array<{ text: string; source?: string; score?: number }>;
    const fallbackDomains = resolveRequestedDomains(body?.fallbackDomains, ['specs_registry', 'tools_registry', 'system_events', 'chat_memories']);
    const recoveredResults = primaryHits.length >= minPrimaryResults
      ? []
      : rankFederatedResults(await this.collectFederatedResults(query, auth.sessionId, auth.userId, fallbackDomains)).slice(0, Number(body?.limit || 12));

    const plan = buildRecoveryPlan(query, primaryHits.length, recoveredResults.length, fallbackDomains);
    await this.eventBus.emit('premium.retrieval.recovery', 'premium-worker', {
      userId: auth.userId,
      query,
      strategy: plan.strategy,
      primaryResultCount: primaryHits.length,
      recoveredResultCount: recoveredResults.length,
    });

    return json({
      query,
      minPrimaryResults,
      primaryResultCount: primaryHits.length,
      fallbackDomains,
      plan,
      primaryHits: primaryHits.map((hit, index) => ({
        sourceId: `${String(hit.source || 'knowledge-index')}:${index + 1}`,
        source: String(hit.source || 'knowledge-index'),
        snippet: String(hit.text || '').slice(0, 280),
        score: Number(hit.score || 0),
      })),
      recoveredResults,
      contract: 'ai-search-recovery-v1',
    });
  }

  async connectivityStatus(_request: Request): Promise<Response> {
    const probes = {
      d1: await this.db.prepare('SELECT 1 as ok').first().then(() => 'ok').catch(() => 'error'),
      knowledgeIndex: 'ok',
      toolsRegistry: this.toolRegistry.size > 0 ? 'ok' : 'empty',
      billingProvider: String(this.env.STRIPE_SECRET_KEY || '').trim() ? 'configured' : 'not-configured',
      webhookSecret: String(this.env.STRIPE_WEBHOOK_SECRET || '').trim() ? 'configured' : 'not-configured',
      sovereigntyLayer: 'preview',
    };

    return json({
      contract: 'connectivity-mesh-v1',
      probes,
      sources: [
        { id: 'knowledge-index', category: 'retrieval', failover: 'cached-grounding', state: probes.knowledgeIndex },
        { id: 'd1-memories', category: 'data', failover: 'session-fallback', state: probes.d1 },
        { id: 'd1-specs', category: 'data', failover: 'empty-result', state: probes.d1 },
        { id: 'd1-simulations', category: 'data', failover: 'empty-result', state: probes.d1 },
        { id: 'd1-system-events', category: 'observability', failover: 'degraded-observability', state: probes.d1 },
        { id: 'tools-registry', category: 'execution', failover: 'metadata-only', state: probes.toolsRegistry },
        { id: 'stripe-billing', category: 'billing', failover: 'manual-entitlement', state: probes.billingProvider },
        { id: 'sovereignty-layer', category: 'governance', failover: 'regional-defaults', state: probes.sovereigntyLayer },
      ],
    });
  }

  async connectivityProbe(request: Request): Promise<Response> {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const targets = Array.isArray(body?.targets) ? body.targets.map((target) => normalizeQuery(target)).filter(Boolean) : [];
    const status = await this.connectivityStatus(request);
    const payload = await status.json() as Record<string, any>;
    const filteredSources = targets.length
      ? (payload.sources || []).filter((source: any) => targets.includes(String(source.id)))
      : payload.sources;

    return json({
      contract: payload.contract,
      probes: payload.probes,
      sources: filteredSources,
    });
  }

  async sovereigntyAssessment(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const domains = resolveRequestedDomains(body?.domains, ['chat_memories', 'specs_registry', 'system_events', 'entitlements']);
    const accessTier = ((request as any).authContext?.accessTier || 'free') as AccessTier;
    const assessment = assessDataSovereignty(domains, accessTier);

    return json({
      contract: 'data-sovereignty-v1',
      accessTier,
      requestedRegion: normalizeQuery(body?.region) || 'global',
      exportRestrictedDomains: assessment.filter((item) => item.exportPolicy === 'restricted').map((item) => item.domain),
      assessment,
    });
  }

  private async collectFederatedResults(query: string, sessionId: string, userId: string, requestedDomains?: FederatedDomain[]): Promise<FederatedSearchResult[]> {
    const pattern = buildLikePattern(query);
    const allowed = new Set<FederatedDomain>(requestedDomains?.length ? requestedDomains : [
      'knowledge_index',
      'chat_memories',
      'simulation_memories',
      'specs_registry',
      'tools_registry',
      'simulation_runs',
      'system_events',
      'entitlements',
    ]);

    const results: FederatedSearchResult[] = [];

    if (allowed.has('knowledge_index')) {
      for (const hit of searchKnowledge(query, { topK: 8 }) as Array<{ text: string; source?: string; score?: number }>) {
        results.push({
          domain: 'knowledge_index',
          title: String(hit.source || 'knowledge-index'),
          snippet: String(hit.text || '').slice(0, 280),
          sourceId: String(hit.source || 'knowledge-index'),
          relevance: Math.max(0.1, Math.min(1, Number(hit.score || 0) / 8)),
          authority: 0.92,
          freshnessHours: null,
        });
      }
    }

    if (allowed.has('chat_memories')) {
      const chatMemories = await this.db.prepare(`SELECT id, key, value, updated_at FROM memories WHERE session_id = ? AND type = 'chat' AND (lower(key) LIKE ? OR lower(value) LIKE ?) ORDER BY updated_at DESC LIMIT 6`).bind(sessionId, pattern, pattern).all<any>();
      for (const row of chatMemories.results || []) {
        results.push({
          domain: 'chat_memories',
          title: String(row.key || row.id),
          snippet: String(row.value || '').slice(0, 280),
          sourceId: String(row.id),
          relevance: 0.82,
          authority: 0.72,
          freshnessHours: parseFreshnessHours(row.updated_at),
        });
      }
    }

    if (allowed.has('simulation_memories')) {
      const simulationMemories = await this.db.prepare(`SELECT id, key, value, updated_at FROM memories WHERE session_id = ? AND type = 'simulation' AND (lower(key) LIKE ? OR lower(value) LIKE ?) ORDER BY updated_at DESC LIMIT 6`).bind(sessionId, pattern, pattern).all<any>();
      for (const row of simulationMemories.results || []) {
        results.push({
          domain: 'simulation_memories',
          title: String(row.key || row.id),
          snippet: String(row.value || '').slice(0, 280),
          sourceId: String(row.id),
          relevance: 0.8,
          authority: 0.76,
          freshnessHours: parseFreshnessHours(row.updated_at),
        });
      }
    }

    if (allowed.has('specs_registry')) {
      const specs = await this.db.prepare(`SELECT id, slug, title, summary, updated_at FROM specs WHERE lower(slug) LIKE ? OR lower(title) LIKE ? OR lower(coalesce(summary, '')) LIKE ? ORDER BY updated_at DESC LIMIT 8`).bind(pattern, pattern, pattern).all<any>();
      for (const row of specs.results || []) {
        results.push({
          domain: 'specs_registry',
          title: String(row.title || row.slug),
          snippet: String(row.summary || row.slug || '').slice(0, 280),
          sourceId: String(row.id),
          relevance: 0.78,
          authority: 0.86,
          freshnessHours: parseFreshnessHours(row.updated_at),
        });
      }
    }

    if (allowed.has('tools_registry')) {
      const tools = this.toolRegistry.getAllMetadata().filter(Boolean) as Array<{ name: string; category: string; description: string }>;
      for (const tool of tools.filter((tool) => [tool.name, tool.category, tool.description].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()))).slice(0, 8)) {
        results.push({
          domain: 'tools_registry',
          title: tool.name,
          snippet: `${tool.category}: ${tool.description}`.slice(0, 280),
          sourceId: tool.name,
          relevance: 0.74,
          authority: 0.8,
          freshnessHours: null,
        });
      }
    }

    if (allowed.has('simulation_runs')) {
      const runs = await this.db.prepare(`SELECT id, mode, config, updated_at FROM simulation_runs WHERE session_id = ? AND (lower(mode) LIKE ? OR lower(coalesce(config, '')) LIKE ?) ORDER BY updated_at DESC LIMIT 6`).bind(sessionId, pattern, pattern).all<any>();
      for (const row of runs.results || []) {
        results.push({
          domain: 'simulation_runs',
          title: String(row.mode || row.id),
          snippet: String(row.config || '').slice(0, 280),
          sourceId: String(row.id),
          relevance: 0.72,
          authority: 0.75,
          freshnessHours: parseFreshnessHours(row.updated_at),
        });
      }
    }

    if (allowed.has('system_events')) {
      const events = await this.db.prepare(`SELECT id, event_type, message, created_at FROM system_events WHERE lower(event_type) LIKE ? OR lower(message) LIKE ? ORDER BY created_at DESC LIMIT 8`).bind(pattern, pattern).all<any>();
      for (const row of events.results || []) {
        results.push({
          domain: 'system_events',
          title: String(row.event_type || row.id),
          snippet: String(row.message || '').slice(0, 280),
          sourceId: String(row.id),
          relevance: 0.68,
          authority: 0.7,
          freshnessHours: parseFreshnessHours(row.created_at),
        });
      }
    }

    if (allowed.has('entitlements')) {
      const entitlements = await this.db.prepare(`SELECT id, tier, status, source, updated_at FROM auth_user_entitlements WHERE user_id = ? AND (lower(tier) LIKE ? OR lower(status) LIKE ? OR lower(source) LIKE ?) ORDER BY updated_at DESC LIMIT 4`).bind(userId, pattern, pattern, pattern).all<any>();
      for (const row of entitlements.results || []) {
        results.push({
          domain: 'entitlements',
          title: `tier:${row.tier}`,
          snippet: `status=${row.status}; source=${row.source}`,
          sourceId: String(row.id),
          relevance: 0.64,
          authority: 0.82,
          freshnessHours: parseFreshnessHours(row.updated_at),
        });
      }
    }

    return results;
  }

  async superSearch(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const query = normalizeQuery(body?.query);
    if (!query) {
      return json({ error: 'query is required.' }, 400);
    }

    const domains = Array.isArray(body?.domains)
      ? body.domains.map((domain) => normalizeQuery(domain)).filter((domain): domain is FederatedDomain => isFederatedDomain(domain))
      : undefined;

    const ranked = rankFederatedResults(await this.collectFederatedResults(query, auth.sessionId, auth.userId, domains));
    const domainCounts = ranked.reduce<Record<string, number>>((accumulator, result) => {
      accumulator[result.domain] = (accumulator[result.domain] || 0) + 1;
      return accumulator;
    }, {});

    await this.eventBus.emit('premium.super_search.executed', 'premium-worker', { userId: auth.userId, query, resultCount: ranked.length });

    return json({
      query,
      domains: domains || ['knowledge_index', 'chat_memories', 'simulation_memories', 'specs_registry', 'tools_registry', 'simulation_runs', 'system_events', 'entitlements'],
      resultCount: ranked.length,
      domainCounts,
      results: ranked.slice(0, Number(body?.limit || 16)),
      contract: 'super-search-v1',
    });
  }

  async targetedSweep(request: Request): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const query = normalizeQuery(body?.query);
    if (!query) {
      return json({ error: 'query is required.' }, 400);
    }

    const targetDomains: FederatedDomain[] = Array.isArray(body?.domains)
      ? body.domains
          .map((domain) => normalizeQuery(domain))
          .filter((domain): domain is FederatedDomain => isFederatedDomain(domain))
      : ['knowledge_index', 'specs_registry', 'tools_registry', 'system_events'];

    const sweepId = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(`INSERT INTO premium_sweep_runs (id, user_id, session_id, query, target_domains, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'running', ?, ?)`)
      .bind(sweepId, auth.userId, auth.sessionId, query, JSON.stringify(targetDomains), now, now)
      .run();

    const ranked = rankFederatedResults(await this.collectFederatedResults(query, auth.sessionId, auth.userId, targetDomains));
    const summary = buildSweepSummary(query, targetDomains, ranked.length);

    await this.db
      .prepare(`UPDATE premium_sweep_runs SET status = 'completed', result_json = ?, updated_at = ?, completed_at = ? WHERE id = ?`)
      .bind(JSON.stringify({ summary, results: ranked.slice(0, Number(body?.limit || 20)) }), now, now, sweepId)
      .run();

    await this.eventBus.emit('premium.sweep.completed', 'premium-worker', { userId: auth.userId, query, sweepId, resultCount: ranked.length });
    await this.writeSystemEvent('premium.sweep.completed', 'info', summary, { sweepId, userId: auth.userId, targetDomains, resultCount: ranked.length });

    return json({
      sweepId,
      status: 'completed',
      summary,
      targetDomains,
      results: ranked.slice(0, Number(body?.limit || 20)),
      contract: 'targeted-ion-sweep-v1',
    }, 202);
  }

  async getSweep(request: Request, _env: any, _ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    const auth = ensureUser(request);
    if (auth instanceof Response) return auth;

    const sweep = await this.db
      .prepare(`SELECT * FROM premium_sweep_runs WHERE id = ? AND user_id = ? LIMIT 1`)
      .bind(params.id, auth.userId)
      .first<Record<string, unknown>>();

    if (!sweep) {
      return json({ error: 'Sweep not found.' }, 404);
    }

    return json({ sweep });
  }
}