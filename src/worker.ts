/**
 * @module worker
 * @spec: cloudflare-worker-entrypoint, platform-v2
 * 
 * Main Cloudflare Worker entry point for Phase 3 API layer.
 * Orchestrates all engines, workers, and middleware.
 */

import { Router } from './router';
import { EventBus } from './engines/event-bus';
import { MemoryEngine } from './engines/memory-engine';
import { ToolRegistry } from './engines/tool-registry';
import { ToolExecutor } from './engines/tool-executor';
import { CodexBridge } from './engines/codex-bridge';
import { SimulationRuntime } from './engines/simulation-runtime';

// API Workers
import { MemoryWorker } from './api/memory-worker';
import { ToolsWorker } from './api/tools-worker';
import { SpecsWorker } from './api/specs-worker';
import { SimulationWorker } from './api/simulation-worker';
import { SystemWorker } from './api/system-worker';
import { WorldWorker } from './api/world-worker';
import { AuthWorker } from './api/auth-worker';
import { PremiumWorker } from './api/premium-worker';
import { OnboardingWorker } from './api/onboarding-worker';
import IONWorker from './index.ts';
export { WorldStateBusDurableObject } from './world/durable-object';

// Middleware
import { authMiddleware } from './middleware/auth';
import { applyIonGateway, serializeGatewayContext } from './gateway/ionGateway';

interface WorkerEnv {
  DB?: D1Database;
  ION_DB?: D1Database;
  ASSETS: Fetcher;
  SESSION?: KVNamespace;
  CACHE?: KVNamespace;
  CONFIG?: KVNamespace;
  MIND?: KVNamespace;
  MEMORY?: KVNamespace;
  WORLD_STATE_BUS?: DurableObjectNamespace;
  WORLD_KERNEL_BRIDGE_URL?: string;
  WORLD_KERNEL_BRIDGE_TOKEN?: string;
  SIMULATION_STREAM_POLL_MS?: string;
  TEXT_GENERATION?: any; // Cloudflare Workers AI binding
  ENVIRONMENT?: string;
  VERSION?: string;
  ION_ENV?: string;
  APP_BASE_URL?: string;
  EMAIL_TRANSPORT?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  MAILCHANNELS_API_URL?: string;
  RESEND_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_PREMIUM_MONTHLY_PRICE_ID?: string;
  STRIPE_PREMIUM_YEARLY_PRICE_ID?: string;
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID?: string;
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID?: string;
  STRIPE_CHECKOUT_SUCCESS_URL?: string;
  STRIPE_CHECKOUT_CANCEL_URL?: string;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ionirix.com',
  'https://www.ionirix.com',
];

function buildAllowedOrigins(env: WorkerEnv): Set<string> {
  const allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS);
  const appBaseUrl = String(env.APP_BASE_URL || '').trim();

  if (appBaseUrl) {
    try {
      allowedOrigins.add(new URL(appBaseUrl).origin);
    } catch {
      // Ignore invalid APP_BASE_URL values and fall back to defaults.
    }
  }

  return allowedOrigins;
}

function resolveCorsOrigin(request: Request, env: WorkerEnv): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) {
    return null;
  }

  return buildAllowedOrigins(env).has(origin) ? origin : null;
}

function buildCorsHeaders(request: Request, env: WorkerEnv): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-Requested-With, X-ION-Session-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });

  const allowedOrigin = resolveCorsOrigin(request, env);
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  return headers;
}

function applyCorsHeaders(response: Response, request: Request, env: WorkerEnv): Response {
  const headers = new Headers(response.headers);
  buildCorsHeaders(request, env).forEach((value, key) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isHtmlNavigationRequest(request: Request, url: URL): boolean {
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    return false;
  }

  if (url.pathname.startsWith('/api')) {
    return false;
  }

  const accept = request.headers.get('accept') || '';
  const hasFileExtension = /\.[a-z0-9]+$/i.test(url.pathname);
  return !hasFileExtension && accept.includes('text/html');
}

async function serveAssetOrFallback(request: Request, env: WorkerEnv, url: URL): Promise<Response | null> {
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    return null;
  }

  if (url.pathname.startsWith('/api')) {
    return null;
  }

  const candidatePaths = new Set<string>();
  const hasFileExtension = /\.[a-z0-9]+$/i.test(url.pathname);

  if (!hasFileExtension) {
    if (url.pathname === '/' || url.pathname === '') {
      candidatePaths.add('/index.html');
      candidatePaths.add('/');
    } else {
      const normalizedPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
      candidatePaths.add(`${normalizedPath}.html`);
      candidatePaths.add(`${normalizedPath}/index.html`);
      candidatePaths.add(url.pathname);
    }
  } else {
    candidatePaths.add(url.pathname);
  }

  for (const candidatePath of candidatePaths) {
    const candidateUrl = new URL(candidatePath, url);
    const assetResponse = await env.ASSETS.fetch(new Request(candidateUrl.toString(), request));
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  }

  if (!isHtmlNavigationRequest(request, url)) {
    return new Response('Not Found', { status: 404 });
  }

  const fallbackUrl = new URL('/index.html', url);
  return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
}

/**
 * Main request handler
 */
async function handleRequest(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const db = env.DB as D1Database;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(request, env),
    });
  }

  // WebSocket upgrade routes
  if (request.headers.get('upgrade') === 'websocket') {
    if (url.pathname === '/api/simulation/stream') {
      const authResult = await authMiddleware(request, env);
      if (!authResult.valid || !authResult.context) {
        return new Response(JSON.stringify({ error: authResult.error || 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const simulationId = url.searchParams.get('id') || url.searchParams.get('simulationId');
      if (!simulationId) {
        return new Response(JSON.stringify({ error: 'Missing simulation id' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const WebSocketPairCtor = (globalThis as typeof globalThis & { WebSocketPair?: new () => { 0: WebSocket; 1: WebSocket } }).WebSocketPair;
      if (!WebSocketPairCtor) {
        return new Response('WebSocket upgrade is not available in this runtime', { status: 501 });
      }

      const pair = new WebSocketPairCtor();
      const client = pair[0];
      const server = pair[1];
      server.accept();

      const eventBus = new EventBus();
      const simulationWorker = new SimulationWorker(db, eventBus);
      await simulationWorker.handleWebSocket(server, simulationId, {
        sessionId: authResult.context.sessionId,
        pollIntervalMs: Number(env.SIMULATION_STREAM_POLL_MS || 1500),
      });

      return new Response(null, { status: 101, webSocket: client } as ResponseInit);
    }

    return new Response('WebSocket upgrade not yet implemented', { status: 501 });
  }

  const assetResponse = await serveAssetOrFallback(request, env, url);
  if (assetResponse) {
    return assetResponse;
  }

  // Initialize shared engines (per request)
  const eventBus = new EventBus();
  const memoryEngine = new MemoryEngine(db, eventBus);
  const toolRegistry = new ToolRegistry();
  const toolExecutor = new ToolExecutor(db, eventBus);
  const simulationRuntime = new SimulationRuntime(db, eventBus);

  // Create router and register all Phase 3 routes
  const router = new Router();

  // Initialize workers (with corrected constructors)
  const memoryWorker = new MemoryWorker(db, eventBus);
  const toolsWorker = new ToolsWorker(db, toolRegistry, eventBus);
  const specsWorker = new SpecsWorker(db, env.CACHE as KVNamespace);
  const simulationWorker = new SimulationWorker(db, eventBus);
  const worldWorker = new WorldWorker();
  const systemWorker = new SystemWorker(db, env.MEMORY, eventBus, env);
  const authWorker = new AuthWorker(env.DB, env);
  const premiumWorker = new PremiumWorker(db, eventBus, toolRegistry, env);
  const onboardingWorker = new OnboardingWorker(env.DB);

  // Middleware functions
  const withAuth = (handler: any) =>
    async (request: Request, env: any, ctx: ExecutionContext, params: any) => {
      let authError = 'Unauthorized';

      if (!(request as any).authContext) {
        const authResult = await authMiddleware(request, env);
        if (!authResult.valid) {
          return new Response(JSON.stringify({ error: authResult.error || 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        authError = authResult.error || authError;
        (request as any).authContext = authResult.context;
      }

      if (!(request as any).authContext?.userId) {
        return new Response(JSON.stringify({ error: authError }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      return handler(request, env, ctx, params);
    };

  const withMetrics = (handler: any) =>
    async (request: Request, env: any, ctx: ExecutionContext, params: any) => {
      const start = Date.now();
      const response = await handler(request, env, ctx, params);
      const duration = Date.now() - start;
      // TODO: Emit metrics via EventBus
      return response;
    };

  const withRateLimit = (handler: any) =>
    async (request: Request, env: any, ctx: ExecutionContext, params: any) => {
      // Basic rate limiting: 100 requests per minute per IP
      const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
      // TODO: Implement proper rate limiting with KV store
      return handler(request, env, ctx, params);
    };

  // Helper to compose middleware
  const compose = (handler: any) => withRateLimit(withMetrics(withAuth(handler)));
  const ionWorkerEnv = {
    ...env,
    ION_DB: env.ION_DB || env.DB,
  };

  // ========== AUTH API ROUTES ==========
  router.add('POST', '/api/auth/signup', async (r: Request) => authWorker.signup(r));
  router.add('POST', '/api/auth/login', async (r: Request) => authWorker.login(r));
  router.add('GET', '/api/auth/me', async (r: Request) => authWorker.me(r));
  router.add('POST', '/api/auth/verify-email', async (r: Request) => authWorker.verifyEmail(r));
  router.add('POST', '/api/auth/resend-verification', async (r: Request) => authWorker.resendVerification(r));
  router.add('PUT', '/api/auth/profile', async (r: Request) => authWorker.updateProfile(r));
  router.add('POST', '/api/auth/logout', async (r: Request) => authWorker.logout(r));

  router.add('GET', '/api/onboarding/workspace', compose((r: Request) => onboardingWorker.getCurrentWorkspace(r)));
  router.add('POST', '/api/onboarding/workspace', compose((r: Request) => onboardingWorker.provisionWorkspace(r)));

  router.add('GET', '/api/account/entitlements/me', compose((r: Request) => premiumWorker.getMyEntitlements(r)));

  router.add('GET', '/api/billing/subscription', compose((r: Request) => premiumWorker.getBillingStatus(r)));
  router.add('POST', '/api/billing/checkout', compose((r: Request) => premiumWorker.createCheckout(r)));
  router.add('POST', '/api/billing/webhooks/stripe', async (r: Request) => premiumWorker.handleStripeWebhook(r));

  router.add('GET', '/api/gateway/status', async (r: Request) => {
    return new Response(JSON.stringify({
      ok: true,
      gateway: serializeGatewayContext((r as any).ionGatewayContext),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  router.add('GET', '/api/premium/status', async (r: Request) => {
    return new Response(JSON.stringify({
      ok: true,
      gateway: serializeGatewayContext((r as any).ionGatewayContext),
      phase: 'phase-1-ion-gateway',
      rollout: 'premium-ready',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  router.add('GET', '/api/enterprise/status', async (r: Request) => {
    return new Response(JSON.stringify({
      ok: true,
      gateway: serializeGatewayContext((r as any).ionGatewayContext),
      phase: 'phase-1-ion-gateway',
      rollout: 'enterprise-scaffold',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  router.add('GET', '/api/enterprise/entitlements', (r: Request) => premiumWorker.listEntitlements(r));
  router.add('POST', '/api/enterprise/entitlements', (r: Request) => premiumWorker.upsertEntitlementRoute(r));

  router.add('POST', '/api/premium/retrieval/query', (r: Request) => premiumWorker.retrievalQuery(r));
  router.add('POST', '/api/premium/retrieval/recover', (r: Request) => premiumWorker.retrievalRecovery(r));
  router.add('GET', '/api/premium/connectivity/status', (r: Request) => premiumWorker.connectivityStatus(r));
  router.add('POST', '/api/premium/connectivity/probe', (r: Request) => premiumWorker.connectivityProbe(r));
  router.add('POST', '/api/premium/sovereignty/assess', (r: Request) => premiumWorker.sovereigntyAssessment(r));
  router.add('POST', '/api/premium/search/super', (r: Request) => premiumWorker.superSearch(r));
  router.add('POST', '/api/premium/sweep/targeted', (r: Request) => premiumWorker.targetedSweep(r));
  router.add('GET', '/api/premium/sweep/:id', (r: Request, e: any, c: any, p: any) => premiumWorker.getSweep(r, e, c, p));

  // ========== MEMORY API ROUTES ==========
  router.add('GET', '/api/memory', compose((r: any, e: any, c: any, p: any) => memoryWorker.list(r, e, c, p)));
  router.add('GET', '/api/memory/categories', compose((r: any, e: any, c: any, p: any) => memoryWorker.categories(r, e, c, p)));
  router.add('POST', '/api/memory/query', compose((r: any, e: any, c: any, p: any) => memoryWorker.query(r, e, c, p)));
  router.add('DELETE', '/api/memory/bulk', compose((r: any, e: any, c: any, p: any) => memoryWorker.bulkDelete(r, e, c, p)));
  router.add('GET', '/api/memory/:id', compose((r: any, e: any, c: any, p: any) => memoryWorker.getById(r, e, c, p)));
  router.add('POST', '/api/memory', compose((r: any, e: any, c: any, p: any) => memoryWorker.create(r, e, c, p)));
  router.add('PUT', '/api/memory/:id', compose((r: any, e: any, c: any, p: any) => memoryWorker.update(r, e, c, p)));
  router.add('DELETE', '/api/memory/:id', compose((r: any, e: any, c: any, p: any) => memoryWorker.remove(r, e, c, p)));

  // ========== TOOLS API ROUTES ==========
  router.add('GET', '/api/tools', compose((r: any, e: any, c: any, p: any) => toolsWorker.list(r, e, c, p)));
  router.add('GET', '/api/tools/:name/schema', compose((r: any, e: any, c: any, p: any) => toolsWorker.getSchema(r, e, c, p)));
  router.add('POST', '/api/tools/validate', compose((r: any, e: any, c: any, p: any) => toolsWorker.validate(r, e, c, p)));
  router.add('POST', '/api/tools/execute', compose((r: any, e: any, c: any, p: any) => toolsWorker.execute(r, e, c, p)));
  router.add('GET', '/api/tools/logs', compose((r: any, e: any, c: any, p: any) => toolsWorker.getLog(r, e, c, p)));
  router.add('GET', '/api/tools/logs/:id', compose((r: any, e: any, c: any, p: any) => toolsWorker.getLog(r, e, c, p)));

  // ========== SPECS API ROUTES ==========
  router.add('GET', '/api/specs', compose((r: any, e: any, c: any, p: any) => specsWorker.list(r, e, c, p)));
  router.add('GET', '/api/specs/search', compose((r: any, e: any, c: any, p: any) => specsWorker.search(r, e, c, p)));
  router.add('GET', '/api/specs/modules-map', compose((r: any, e: any, c: any, p: any) => specsWorker.modulesMap(r, e, c, p)));
  router.add('GET', '/api/specs/:slug', compose((r: any, e: any, c: any, p: any) => specsWorker.getBySlug(r, e, c, p)));
  router.add('GET', '/api/specs/:slug/versions', compose((r: any, e: any, c: any, p: any) => specsWorker.versions(r, e, c, p)));
  router.add('POST', '/api/specs/register', compose((r: any, e: any, c: any, p: any) => specsWorker.register(r, e, c, p)));

  // ========== SIMULATION API ROUTES ==========
  router.add('POST', '/api/simulation/init', compose((r: any, e: any, c: any, p: any) => simulationWorker.init(r, e, c, p)));
  router.add('POST', '/api/simulation/step', compose((r: any, e: any, c: any, p: any) => simulationWorker.step(r, e, c, p)));
  router.add('POST', '/api/simulation/terminate', compose((r: any, e: any, c: any, p: any) => simulationWorker.terminate(r, e, c, p)));
  router.add('GET', '/api/simulation/state', compose((r: any, e: any, c: any, p: any) => simulationWorker.getState(r, e, c, p)));
  router.add('GET', '/api/simulation/snapshot', compose((r: any, e: any, c: any, p: any) => simulationWorker.getSnapshot(r, e, c, p)));
  router.add('POST', '/api/simulation/rollback', compose((r: any, e: any, c: any, p: any) => simulationWorker.rollback(r, e, c, p)));
  router.add('GET', '/api/simulation/history', compose((r: any, e: any, c: any, p: any) => simulationWorker.history(r, e, c, p)));

  // ========== WORLD API ROUTES ==========
  router.add('GET', '/api/world/state', compose((r: any, e: any, c: any, p: any) => worldWorker.getState(r, e, c, p)));
  router.add('GET', '/api/world/events', compose((r: any, e: any, c: any, p: any) => worldWorker.getEvents(r, e, c, p)));
  router.add('GET', '/api/world/capabilities', compose((r: any, e: any, c: any, p: any) => worldWorker.getCapabilities(r, e, c, p)));
  router.add('GET', '/api/world/health', compose((r: any, e: any, c: any, p: any) => worldWorker.getHealth(r, e, c, p)));
  router.add('POST', '/api/world/command', compose((r: any, e: any, c: any, p: any) => worldWorker.command(r, e, c, p)));
  router.add('POST', '/api/world/pause', compose((r: any, e: any, c: any, p: any) => worldWorker.pause(r, e, c, p)));
  router.add('POST', '/api/world/resume', compose((r: any, e: any, c: any, p: any) => worldWorker.resume(r, e, c, p)));
  router.add('POST', '/api/world/persist', compose((r: any, e: any, c: any, p: any) => worldWorker.persist(r, e, c, p)));

  // ========== SYSTEM API ROUTES ==========
  router.add('GET', '/api/system/health', (r: any, e: any, c: any, p: any) => systemWorker.getHealth(r, e, c, p));
  router.add('GET', '/api/system/status', compose((r: any, e: any, c: any, p: any) => systemWorker.getStatus(r, e, c, p)));
  router.add('GET', '/api/system/bindings', compose((r: any, e: any, c: any, p: any) => systemWorker.getBindings(r, e, c, p)));
  router.add('GET', '/api/system/metrics', compose((r: any, e: any, c: any, p: any) => systemWorker.getMetrics(r, e, c, p)));
  router.add('GET', '/api/system/events', compose((r: any, e: any, c: any, p: any) => systemWorker.getEvents(r, e, c, p)));

  // ========== LEGACY ION CHAT ROUTE (compatibility)
  router.add('POST', '/api/ION', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('ALL', '/api/ION', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('GET', '/api/chat/history', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('DELETE', '/api/chat/history', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('ALL', '/api/chat/history', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('GET', '/api/chat/settings', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('PUT', '/api/chat/settings', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('ALL', '/api/chat/settings', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });

  // ========== LEGACY ION IMAGE ROUTE (compatibility)
  router.add('POST', '/api/image', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });
  router.add('ALL', '/api/image', async (req: Request, e: any, c: ExecutionContext) => {
    return IONWorker.fetch(req, ionWorkerEnv as any, c as any);
  });

  // Dispatch request through router
  const response = await applyIonGateway(request, ionWorkerEnv as any, (gatewayRequest) => router.handle(gatewayRequest, env, ctx));
  return url.pathname.startsWith('/api/') ? applyCorsHeaders(response, request, env) : response;
}

/**
 * Export handler for Cloudflare Workers
 */
export default {
  fetch: handleRequest,
  // Optional: Scheduled handler (runs on cron)
  scheduled: async (event: any, env: WorkerEnv, ctx: ExecutionContext) => {
    console.log('[Worker] Scheduled task triggered');
    // TODO: Run maintenance tasks (cleanup, sync, etc.)
  },
};
