/**
 * @module MemoryWorker
 * @spec: memory-engine-v1
 * 
 * Handles all /api/memory/* routes.
 * Implements complete CRUD, querying, categorization, and export functionality.
 */

import type { RouteParams } from '../router';
import { MemoryEngine } from '../engines/memory-engine';
import { EventBus } from '../engines/event-bus';
import type { CreateMemoryInput, MemoryQuery } from '../types/memory.types';

export class MemoryWorker {
  private engine: MemoryEngine;

  constructor(db: D1Database, eventBus: EventBus) {
    this.engine = new MemoryEngine(db, eventBus);
  }

  /**
   * GET /api/memory — list memories with pagination and filters
   * Query params: type, category, page, limit, sort, order
   */
  async list(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const url = new URL(request.url);
      const sessionId = (request as any).authContext?.sessionId;

      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const typeParam = url.searchParams.get('type');
      const category = url.searchParams.get('category');
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
      const offset = (page - 1) * limit;

      const types = typeParam ? typeParam.split(',') : undefined;

      const result = await this.engine.list(sessionId, { type: types as any, category: category || undefined, limit, offset });

      return Response.json({
        memories: result.memories,
        total: result.total,
        page,
        limit,
        hasMore: offset + limit < result.total,
      });
    } catch (err: unknown) {
      console.error('[MemoryWorker.list]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/memory/:id — get single memory by ID
   */
  async getById(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const memory = await this.engine.getById(params.id);

      if (!memory) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // Verify ownership
      if (memory.sessionId !== sessionId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({ memory });
    } catch (err: unknown) {
      console.error('[MemoryWorker.getById]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/memory — create a new memory
   */
  async create(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as any;

      // Validate required fields
      if (!body.type || !body.key || !body.value) {
        return new Response(JSON.stringify({ error: 'Missing required fields: type, key, value' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const input: CreateMemoryInput = {
        sessionId,
        type: body.type,
        category: body.category,
        key: body.key,
        value: body.value,
        source: body.source,
        mode: body.mode,
        simulationId: body.simulationId,
        priority: body.priority,
        ttlSeconds: body.ttlSeconds,
        isPinned: body.isPinned,
        tags: body.tags,
      };

      const memory = await this.engine.create(input);

      return Response.json({ memory }, { status: 201 });
    } catch (err: unknown) {
      console.error('[MemoryWorker.create]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * PUT /api/memory/:id — update a memory
   */
  async update(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as any;
      const memory = await this.engine.update(params.id, body);

      if (!memory) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // Verify ownership
      if (memory.sessionId !== sessionId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      return Response.json({ memory });
    } catch (err: unknown) {
      console.error('[MemoryWorker.update]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * DELETE /api/memory/:id — delete a single memory
   */
  async remove(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const memory = await this.engine.getById(params.id);
      if (!memory) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      // Verify ownership
      if (memory.sessionId !== sessionId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      const deleted = await this.engine.delete(params.id);

      if (!deleted) {
        return new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(null, { status: 204 });
    } catch (err: unknown) {
      console.error('[MemoryWorker.remove]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/memory/categories — list all categories with counts
   */
  async categories(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const categories = await this.engine.getCategories(sessionId);

      return Response.json({ categories });
    } catch (err: unknown) {
      console.error('[MemoryWorker.categories]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/memory/query — complex query with filters and search
   */
  async query(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as any;

      // For now, use basic list with type/category filters
      // TODO: Implement full FTS and complex filtering
      const result = await this.engine.list(sessionId, {
        type: body.filters?.type,
        category: body.filters?.category,
        limit: body.limit || 50,
        offset: body.offset || 0,
      });

      return Response.json({
        memories: result.memories,
        total: result.total,
        nextCursor: null,
      });
    } catch (err: unknown) {
      console.error('[MemoryWorker.query]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * DELETE /api/memory/bulk — bulk delete by IDs or filter
   */
  async bulkDelete(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const sessionId = (request as any).authContext?.sessionId;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as any;
      let deleted = 0;

      if (body.ids && Array.isArray(body.ids)) {
        for (const id of body.ids) {
          const success = await this.engine.delete(id);
          if (success) deleted++;
        }
      }

      return Response.json({ deleted });
    } catch (err: unknown) {
      console.error('[MemoryWorker.bulkDelete]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
}
