/**
 * @module SpecsWorker
 * @spec: specs-registry
 * 
 * Handles all /api/specs/* routes.
 * Implements spec discovery, search, versioning, and registration.
 */

import type { RouteParams } from '../router';
import type { Spec } from '../types/spec.types';

export class SpecsWorker {
  private db: D1Database;
  private cache: KVNamespace;

  constructor(db: D1Database, cache: KVNamespace) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * GET /api/specs — list all specs
   * Query params: category, status
   */
  async list(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      const status = url.searchParams.get('status') || 'active';

      let query = 'SELECT * FROM specs WHERE status = ?';
      const bindings: any[] = [status];

      if (category) {
        query += ' AND category = ?';
        bindings.push(category);
      }

      query += ' ORDER BY category, title';

      const result = await this.db.prepare(query).bind(...bindings).all<any>();

      const specs = (result.results || []).map((row: any) => this.mapRow(row));

      return Response.json({ specs });
    } catch (err: unknown) {
      console.error('[SpecsWorker.list]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/specs/:slug — single spec document with links
   */
  async getBySlug(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      // Check cache first
      const cacheKey = `cache:spec:${params.slug}`;
      const cached = await this.cache.get(cacheKey, 'json');
      if (cached) {
        return Response.json(cached);
      }

      const spec = await this.db
        .prepare('SELECT * FROM specs WHERE slug = ? AND status = ? ORDER BY version DESC LIMIT 1')
        .bind(params.slug, 'active')
        .first<any>();

      if (!spec) {
        return new Response(JSON.stringify({ error: 'Spec not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const response = {
        spec: this.mapRow(spec),
        moduleLinks: JSON.parse((spec.module_links as string) || '[]'),
        codexLinks: JSON.parse((spec.codex_links as string) || '[]'),
      };

      // Cache for 1 hour
      await this.cache.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 });

      return Response.json(response);
    } catch (err: unknown) {
      console.error('[SpecsWorker.getBySlug]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/specs/search?q=... — full-text search
   */
  async search(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') || '').trim();

      if (q.length < 2) {
        return Response.json({ results: [], total: 0 });
      }

      const pattern = `%${q}%`;
      const result = await this.db
        .prepare(
          'SELECT * FROM specs WHERE (title LIKE ? OR summary LIKE ?) AND status = ? ORDER BY category, title'
        )
        .bind(pattern, pattern, 'active')
        .all<any>();

      const results = (result.results || []).map((row: any) => this.mapRow(row));

      return Response.json({
        results,
        total: results.length,
        query: q,
      });
    } catch (err: unknown) {
      console.error('[SpecsWorker.search]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/specs/:slug/versions — version history
   */
  async versions(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const result = await this.db
        .prepare('SELECT version, status, published_at, content_hash FROM specs WHERE slug = ? ORDER BY version DESC')
        .bind(params.slug)
        .all<any>();

      const versions = (result.results || []).map((row: any) => ({
        version: row.version,
        status: row.status,
        publishedAt: row.published_at,
        contentHash: row.content_hash,
      }));

      return Response.json({ versions });
    } catch (err: unknown) {
      console.error('[SpecsWorker.versions]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * GET /api/specs/modules-map — spec-to-module mapping
   */
  async modulesMap(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const result = await this.db
        .prepare('SELECT slug, module_links FROM specs WHERE status = ?')
        .bind('active')
        .all<any>();

      const map: Record<string, string[]> = {};

      for (const row of result.results || []) {
        const links = JSON.parse(row.module_links || '[]');
        const modulePaths = links.map((link: any) => link.path);
        map[row.slug] = modulePaths;
      }

      return Response.json({ map });
    } catch (err: unknown) {
      console.error('[SpecsWorker.modulesMap]', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * POST /api/specs/register — register a new spec (admin only)
   */
  async register(request: Request, env: any, ctx: ExecutionContext, params: RouteParams): Promise<Response> {
    try {
      const isAdmin = (request as any).authContext?.isAdmin;
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      const body = await request.json() as any;

      if (!body.slug || !body.title || !body.category) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const version = '1.0.0';

      await this.db
        .prepare(`
          INSERT INTO specs (
            id, slug, title, category, version, status, summary,
            module_links, codex_links, dependencies, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          body.slug,
          body.title,
          body.category,
          version,
          body.status || 'draft',
          body.summary || '',
          JSON.stringify(body.moduleLinks || []),
          JSON.stringify(body.codexLinks || []),
          JSON.stringify(body.dependencies || []),
          now,
          now
        )
        .run();

      // Invalidate cache
      await this.cache.delete(`cache:spec:${body.slug}`);

      const spec = {
        id,
        slug: body.slug,
        title: body.title,
        category: body.category,
        version,
        status: body.status || 'draft',
        summary: body.summary,
        moduleLinks: body.moduleLinks || [],
        codexLinks: body.codexLinks || [],
        dependencies: body.dependencies || [],
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      };

      return Response.json({ spec }, { status: 201 });
    } catch (err: unknown) {
      console.error('[SpecsWorker.register]', err);

      // Check for duplicate slug error
      if (err instanceof Error && err.message.includes('UNIQUE')) {
        return new Response(JSON.stringify({ error: 'Spec slug already exists' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * Map D1 row to Spec object
   */
  private mapRow(row: any): Spec {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      version: row.version,
      status: row.status,
      badgeLabel: row.badge_label,
      badgeColor: row.badge_color,
      summary: row.summary,
      contentHash: row.content_hash,
      moduleLinks: JSON.parse(row.module_links || '[]'),
      codexLinks: JSON.parse(row.codex_links || '[]'),
      dependencies: JSON.parse(row.dependencies || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    };
  }
}
