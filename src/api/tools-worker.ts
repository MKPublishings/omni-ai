/**
 * @module ToolsWorker
 * @spec: tool-execution-contract
 * 
 * Handles all /api/tools/* routes.
 * Implements tool listing, execution, validation, and audit logging.
 */

import type { RouteParams } from '../router';
import { ToolExecutor } from '../engines/tool-executor';
import { ToolRegistry } from '../engines/tool-registry';
import { EventBus } from '../engines/event-bus';
import type { ToolExecuteRequest } from '../types/tool.types';

export class ToolsWorker {
  private executor: ToolExecutor;
  private registry: ToolRegistry;
  private eventBus: EventBus;

  constructor(db: D1Database, registry: ToolRegistry, eventBus: EventBus) {
    this.executor = new ToolExecutor(db, eventBus);
    this.registry = registry;
    this.eventBus = eventBus;
  }

  /**
   * GET /api/tools — list all registered tools
   */
  async list(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const tools = this.registry.getAllMetadata();

      return Response.json({ tools });
    } catch (err: unknown) {
      console.error('[ToolsWorker.list]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/tools/:name/schema — get tool's input/output schema
   */
  async getSchema(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const tool = this.registry.get(params.name);
      if (!tool) {
        return new Response(JSON.stringify({ error: 'Tool not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({
        name: tool.name,
        version: tool.version,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
      });
    } catch (err: unknown) {
      console.error('[ToolsWorker.getSchema]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/tools/execute — execute a tool
   * Request body: { tool, input, options? }
   */
  async execute(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      const mode = (request as any).authContext?.mode || 'auto';

      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as ToolExecuteRequest;

      if (!body.tool || !body.input) {
        return new Response(JSON.stringify({ error: 'Missing required fields: tool, input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const tool = this.registry.get(body.tool);
      if (!tool) {
        return new Response(JSON.stringify({ error: `Tool not found: ${body.tool}` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // Create tool context
      const context = {
        sessionId,
        mode,
        simulationId: body.options?.simulationId,
        // TODO: Inject engines from request context
        memoryEngine: null as any,
        codexBridge: null as any,
        db: env.IONIRIX_DB,
        env,
        namespace: {
          MIND: env.MIND,
          MEMORY: env.MEMORY,
          SESSION: env.SESSION,
          CACHE: env.CACHE,
          CONFIG: env.CONFIG,
        },
      };

      // Validate first if dryRun
      if (body.options?.dryRun) {
        const validation = tool.validate(body.input);
        return Response.json({
          valid: validation.valid,
          errors: validation.errors,
        });
      }

      // Execute
      const result = await this.executor.execute(tool, body.input, context);

      return Response.json(
        {
          executionId: result.executionId,
          tool: body.tool,
          status: result.success ? 'success' : 'error',
          output: result.output,
          logs: result.logs,
          durationMs: result.duration_ms,
          metadata: result.metadata,
        },
        { status: result.success ? 200 : 400 }
      );
    } catch (err: unknown) {
      console.error('[ToolsWorker.execute]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/tools/validate — validate tool input without executing
   */
  async validate(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as { tool: string; input: Record<string, any> };

      if (!body.tool) {
        return new Response(JSON.stringify({ error: 'Missing tool name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const tool = this.registry.get(body.tool);
      if (!tool) {
        return new Response(JSON.stringify({ error: `Tool not found: ${body.tool}` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const validation = tool.validate ? tool.validate(body.input) : { valid: true, errors: [] };
      
      // Handle both sync and async validation
      const validationResult = validation instanceof Promise 
        ? await validation 
        : (validation as any);

      return Response.json({
        valid: validationResult.valid,
        errors: validationResult.errors,
      });
    } catch (err: unknown) {
      console.error('[ToolsWorker.validate]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/tools/logs — paginated execution history
   * Query params: tool, status, page, limit
   */
  async logs(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(request.url);
      const toolName = url.searchParams.get('tool') || undefined;
      const status = url.searchParams.get('status') || undefined;
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
      const offset = (page - 1) * limit;

      const result = await this.executor.listExecutions(sessionId, {
        toolName: toolName,
        status: status,
        limit,
        offset,
      });

      return Response.json({
        executions: result.executions,
        total: result.total,
        page,
        limit,
        hasMore: offset + limit < result.total,
      });
    } catch (err: unknown) {
      console.error('[ToolsWorker.logs]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/tools/logs/:id — single execution detail
   */
  async getLog(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const execution = await this.executor.getExecution(params.id);

      if (!execution) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // Verify ownership
      if (execution.sessionId !== sessionId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({ execution });
    } catch (err: unknown) {
      console.error('[ToolsWorker.getLog]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
}
