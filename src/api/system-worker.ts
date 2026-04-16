/**
 * @module SystemWorker
 * @spec: system-health-monitoring, platform-observability
 * 
 * Handles /api/system/* routes and real-time observability.
 * Reports health, status, metrics, and event streams.
 */

import type { RouteParams } from '../router';
import { EventBus } from '../engines/event-bus';

export class SystemWorker {
  private db: D1Database;
  private kv: KVNamespace;
  private eventBus: EventBus;
  private env: any;

  constructor(db: D1Database, kv: KVNamespace, eventBus: EventBus, env: any) {
    this.db = db;
    this.kv = kv;
    this.eventBus = eventBus;
    this.env = env;
  }

  /**
   * GET /api/system/health — quick health check
   */
  async getHealth(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      // Quick test: D1 connectivity
      let dbOk = false;
      let kvOk = false;

      try {
        await this.db.prepare('SELECT 1').first();
        dbOk = true;
      } catch (err) {
        console.error('[SystemWorker] D1 health check failed:', err);
      }

      try {
        await this.kv.get('health:ping');
        kvOk = true;
      } catch (err) {
        console.error('[SystemWorker] KV health check failed:', err);
      }

      const status = dbOk && kvOk ? 'ok' : 'degraded';

      return Response.json(
        {
          status,
          timestamp: new Date().toISOString(),
          checks: {
            d1: dbOk ? 'ok' : 'error',
            kv: kvOk ? 'ok' : 'error',
          },
        },
        {
          status: status === 'ok' ? 200 : 503,
        }
      );
    } catch (err: unknown) {
      console.error('[SystemWorker.getHealth]', err);
      return new Response(JSON.stringify({ error: 'Health check failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/system/status — full system status
   */
  async getStatus(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      // Get version from env
      const version = this.env.VERSION || '2.0.0';

      // Count active sessions
      const sessionsResult = await this.db
        .prepare('SELECT COUNT(*) as count FROM memories WHERE type = ? AND category = ?')
        .bind('session', 'metadata')
        .first<any>();

      const sessionCount = sessionsResult?.count || 0;

      const authUsersResult = await this.db
        .prepare('SELECT COUNT(*) as count FROM auth_users')
        .first<any>();

      const authUserCount = authUsersResult?.count || 0;

      // Count tool executions
      const toolsResult = await this.db
        .prepare('SELECT COUNT(*) as count FROM tool_executions')
        .first<any>();

      const toolExecutionCount = toolsResult?.count || 0;

      // Count simulation runs
      const simulationsResult = await this.db
        .prepare('SELECT COUNT(*) as count FROM simulation_runs')
        .first<any>();

      const simulationCount = simulationsResult?.count || 0;

      // Get uptime estimate
      const createdResult = await this.db
        .prepare('SELECT MIN(created_at) as first FROM system_events')
        .first<any>();

      const uptime = createdResult?.first
        ? Math.floor((Date.now() - new Date(createdResult.first).getTime()) / 1000)
        : 0;

      return Response.json({
        version,
        status: 'running',
        uptime,
        timestamp: new Date().toISOString(),
        counts: {
          authUsers: authUserCount,
          sessions: sessionCount,
          toolExecutions: toolExecutionCount,
          simulationRuns: simulationCount,
        },
        environment: {
          region: this.env.REGION || 'unknown',
          platform: 'cloudflare-workers',
        },
      });
    } catch (err: unknown) {
      console.error('[SystemWorker.getStatus]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/system/bindings — reveal bound resources
   */
  async getBindings(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const isAdmin = (request as any).authContext?.isAdmin;
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      // Report available bindings (non-sensitive)
      const bindings = {
        d1: 'IONIRIX_DB',
        kvNamespaces: ['SESSION', 'CACHE', 'CONFIG', 'MIND', 'MEMORY'],
        aiModel: 'TEXT_GENERATION',
        durable: false,
      };

      return Response.json(bindings);
    } catch (err: unknown) {
      console.error('[SystemWorker.getBindings]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/system/metrics — aggregated metrics
   */
  async getMetrics(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(request.url);
      const window = url.searchParams.get('window') || '5min'; // bucket: 5min, 1h, 1d

      // Fetch aggregated metrics from KV
      const metricsKey = `metrics:${sessionId}:${window}`;
      const metricsJson = await this.kv.get(metricsKey);

      let metrics = metricsJson ? JSON.parse(metricsJson) : {};

      // Fill defaults if empty
      metrics = {
        window,
        timestamp: new Date().toISOString(),
        requests: {
          total: metrics.requests?.total || 0,
          successful: metrics.requests?.successful || 0,
          errors: metrics.requests?.errors || 0,
          rateLimit: metrics.requests?.rateLimit || 0,
          avgResponseMs: metrics.requests?.avgResponseMs || 0,
        },
        tools: {
          executionCount: metrics.tools?.executionCount || 0,
          avgDurationMs: metrics.tools?.avgDurationMs || 0,
          successRate: metrics.tools?.successRate || 1,
        },
        memory: {
          entriesCreated: metrics.memory?.entriesCreated || 0,
          entriesDeleted: metrics.memory?.entriesDeleted || 0,
          avgSizeBytes: metrics.memory?.avgSizeBytes || 0,
        },
        simulation: {
          runCount: metrics.simulation?.runCount || 0,
          stepsExecuted: metrics.simulation?.stepsExecuted || 0,
          avgStepMs: metrics.simulation?.avgStepMs || 0,
        },
      };

      return Response.json(metrics);
    } catch (err: unknown) {
      console.error('[SystemWorker.getMetrics]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/system/events — recent system events
   */
  async getEvents(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(request.url);
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
      const eventType = url.searchParams.get('type'); // optional filter

      let query = 'SELECT * FROM system_events WHERE session_id = ?';
      const bindings: any[] = [sessionId];

      if (eventType) {
        query += ' AND event_type = ?';
        bindings.push(eventType);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      bindings.push(limit);

      const result = await this.db.prepare(query).bind(...bindings).all<any>();

      // Parse JSON fields
      const events = (result.results || []).map((row: any) => ({
        id: row.id,
        type: row.event_type,
        source: row.source,
        data: row.data_json ? JSON.parse(row.data_json) : null,
        createdAt: row.created_at,
      }));

      return Response.json({
        events,
        count: events.length,
      });
    } catch (err: unknown) {
      console.error('[SystemWorker.getEvents]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * WebSocket handler for /api/system/stream
   * Streams real-time metrics and events
   * TODO: Implement WebSocket upgrade in main worker.ts
   */
  async handleWebSocket(webSocket: WebSocket, sessionId: string): Promise<void> {
    try {
      // Send initial connection message
      webSocket.send(
        JSON.stringify({
          type: 'connection',
          message: 'Connected to system stream',
          timestamp: new Date().toISOString(),
        })
      );

      // TODO: Set up streaming loop with EventBus listener
      // This would emit events as they occur:
      // - Request metrics every 5 seconds
      // - Event bus events as they fire
      // - System health updates every 30 seconds
    } catch (err) {
      console.error('[SystemWorker.handleWebSocket]', err);
      webSocket.close(1011);
    }
  }
}
