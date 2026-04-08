/**
 * @module worker
 * @spec: cloudflare-worker-entrypoint, platform-v2
 * 
 * Main Cloudflare Worker entry point for Phase 3 API layer.
 * Orchestrates all engines, workers, and middleware.
 */

import type { ExecutionContext } from '@cloudflare/workers-types';
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

// Middleware
import { authMiddleware } from './middleware/auth';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { metricsMiddleware } from './middleware/metrics';

interface WorkerEnv {
  DB: D1Database;
  SESSION: KVNamespace;
  CACHE: KVNamespace;
  CONFIG: KVNamespace;
  MIND: KVNamespace;
  MEMORY: KVNamespace;
  TEXT_GENERATION?: any; // Cloudflare Workers AI binding
  ENVIRONMENT?: string;
  VERSION?: string;
}

/**
 * Main request handler
 */
async function handleRequest(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return corsMiddleware(request, env, ctx);
  }

  // WebSocket upgrade routes
  if (request.headers.get('upgrade') === 'websocket') {
    // TODO: Parse URL and delegate to appropriate WebSocket handler
    // if (url.pathname === '/api/simulation/stream') { ... }
    // if (url.pathname === '/api/system/stream') { ... }
    return new Response('WebSocket upgrade not yet implemented', { status: 501 });
  }

  // Initialize shared engines (per request)
  const eventBus = new EventBus();
  const memoryEngine = new MemoryEngine(env.DB, eventBus);
  const toolRegistry = new ToolRegistry();
  const toolExecutor = new ToolExecutor(env.DB, toolRegistry, eventBus);
  const codexBridge = new CodexBridge(env.CACHE);
  const simulationRuntime = new SimulationRuntime(env.DB, eventBus);

  // Create router and register all Phase 3 routes
  const router = new Router();

  // Initialize workers
  const memoryWorker = new MemoryWorker(env.DB, memoryEngine);
  const toolsWorker = new ToolsWorker(env.DB, toolRegistry, toolExecutor, codexBridge);
  const specsWorker = new SpecsWorker(env.DB, env.CACHE);
  const simulationWorker = new SimulationWorker(env.DB, eventBus);
  const systemWorker = new SystemWorker(env.DB, env.MEMORY, eventBus, env);

  // Middleware functions
  const withAuth = (handler: any) =>
    async (request: Request, env: any, ctx: ExecutionContext, params: any) => {
      const authResult = await authMiddleware(request, env, ctx);
      if (!authResult.ok) {
        return authResult.response;
      }
      (request as any).authContext = authResult.context;
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
      const rateLimitResult = await rateLimitMiddleware(request, env, ctx);
      if (!rateLimitResult.ok) {
        return rateLimitResult.response;
      }
      return handler(request, env, ctx, params);
    };

  // Helper to compose middleware
  const compose = (handler: any) => withRateLimit(withMetrics(withAuth(handler)));

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
  router.add('GET', '/api/tools/logs', compose((r: any, e: any, c: any, p: any) => toolsWorker.getLogs(r, e, c, p)));
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

  // ========== SYSTEM API ROUTES ==========
  router.add('GET', '/api/system/health', (r: any, e: any, c: any, p: any) => systemWorker.getHealth(r, e, c, p));
  router.add('GET', '/api/system/status', compose((r: any, e: any, c: any, p: any) => systemWorker.getStatus(r, e, c, p)));
  router.add('GET', '/api/system/bindings', compose((r: any, e: any, c: any, p: any) => systemWorker.getBindings(r, e, c, p)));
  router.add('GET', '/api/system/metrics', compose((r: any, e: any, c: any, p: any) => systemWorker.getMetrics(r, e, c, p)));
  router.add('GET', '/api/system/events', compose((r: any, e: any, c: any, p: any) => systemWorker.getEvents(r, e, c, p)));

  // Dispatch request through router
  return router.handle(request, env, ctx);
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
