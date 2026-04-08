/**
 * @module MemoryEngine
 * @spec: memory-engine-v1
 * 
 * Core memory CRUD, query, cleanup, and TTL enforcement logic.
 * All operations go through D1 (IONIRIX_DB).
 * Emits events via EventBus for cross-system notification.
 */

import type { Memory, CreateMemoryInput, UpdateMemoryInput, MemoryQuery, MemoryCategory } from '../types/memory.types';
import { EventBus } from './event-bus';

export class MemoryEngine {
  private db: D1Database;
  private eventBus: EventBus;

  constructor(db: D1Database, eventBus: EventBus) {
    this.db = db;
    this.eventBus = eventBus;
  }

  /**Generate a UUID v4 identifier */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Create a new memory record
   */
  async create(input: CreateMemoryInput): Promise<Memory> {
    const id = this.generateId();
    const now = new Date().toISOString();

    // Calculate expires_at based on TTL or pinning
    let expiresAt: string | null = null;
    if (!input.isPinned) {
      const ttlSeconds = input.ttlSeconds ?? this.getDefaultTTL(input.type);
      if (ttlSeconds) {
        expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      }
    }

    try {
      // Check for session/simulation cap (evict oldest if needed)
      await this.enforceCapLimits(input.sessionId, input.simulationId);

      const stmt = this.db.prepare(`
        INSERT INTO memories (
          id, session_id, type, category, key, value, source,
          mode, simulation_id, priority, ttl_seconds, created_at, updated_at,
          expires_at, is_pinned, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      await stmt.bind(
        id,
        input.sessionId,
        input.type,
        input.category ?? null,
        input.key,
        input.value,
        input.source ?? 'user',
        input.mode ?? null,
        input.simulationId ?? null,
        input.priority ?? 0,
        input.ttlSeconds ?? null,
        now,
        now,
        expiresAt,
        input.isPinned ? 1 : 0,
        JSON.stringify(input.tags ?? [])
      ).run();

      // Emit event
      await this.eventBus.emit('memory.created', 'memory-engine', {
        memoryId: id,
        sessionId: input.sessionId,
        type: input.type,
        source: input.source,
      });

      return this.getById(id) as Promise<Memory>;
    } catch (error: unknown) {
      console.error('[MemoryEngine.create]', error);
      throw error;
    }
  }

  /**
   * Retrieve a memory by ID
   */
  async getById(id: string): Promise<Memory | null> {
    try {
      const result = await this.db.prepare('SELECT * FROM memories WHERE id = ?').bind(id).first<any>();

      return result ? this.mapRow(result) : null;
    } catch (error: unknown) {
      console.error('[MemoryEngine.getById]', error);
      return null;
    }
  }

  /**
   * List memories with filters and pagination
   */
  async list(
    sessionId: string,
    options?: {
      type?: string[];
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ memories: Memory[]; total: number }> {
    try {
      let query = 'SELECT * FROM memories WHERE session_id = ?';
      const bindings: any[] = [sessionId];

      if (options?.type && options.type.length > 0) {
        const placeholders = options.type.map(() => '?').join(',');
        query += ` AND type IN (${placeholders})`;
        bindings.push(...options.type);
      }

      if (options?.category) {
        query += ' AND category = ?';
        bindings.push(options.category);
      }

      // Count total
      const countResult = await this.db
        .prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count'))
        .bind(...bindings)
        .first<any>();
      const total = countResult?.count ?? 0;

      // Fetch with pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;
      bindings.push(limit, offset);

      const result = await this.db.prepare(query).bind(...bindings).all<any>();

      return {
        memories: (result.results ?? []).map((row: any) => this.mapRow(row)),
        total,
      };
    } catch (error: unknown) {
      console.error('[MemoryEngine.list]', error);
      return { memories: [], total: 0 };
    }
  }

  /**
   * Update a memory by ID
   */
  async update(id: string, input: UpdateMemoryInput): Promise<Memory | null> {
    try {
      const existing = await this.getById(id);
      if (!existing) return null;

      const updates: string[] = [];
      const bindings: any[] = [];

      if (input.key !== undefined) {
        updates.push('key = ?');
        bindings.push(input.key);
      }

      if (input.value !== undefined) {
        updates.push('value = ?');
        bindings.push(input.value);
      }

      if (input.category !== undefined) {
        updates.push('category = ?');
        bindings.push(input.category);
      }

      if (input.priority !== undefined) {
        updates.push('priority = ?');
        bindings.push(input.priority);
      }

      if (input.isPinned !== undefined) {
        updates.push('is_pinned = ?');
        bindings.push(input.isPinned ? 1 : 0);

        // Recalculate expires_at if pinning changed
        if (input.isPinned) {
          updates.push('expires_at = ?');
          bindings.push(null);
        }
      }

      if (input.tags !== undefined) {
        updates.push('tags = ?');
        bindings.push(JSON.stringify(input.tags));
      }

      if (input.ttlSeconds !== undefined) {
        updates.push('ttl_seconds = ?');
        bindings.push(input.ttlSeconds);
        // Recalculate expires_at
        const expiresAt = input.ttlSeconds
          ? new Date(Date.now() + input.ttlSeconds * 1000).toISOString()
          : null;
        updates.push('expires_at = ?');
        bindings.push(expiresAt);
      }

      if (updates.length === 0) {
        return existing;
      }

      updates.push('updated_at = ?');
      bindings.push(new Date().toISOString());

      bindings.push(id);

      await this.db
        .prepare(`UPDATE memories SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...bindings)
        .run();

      await this.eventBus.emit('memory.updated', 'memory-engine', { memoryId: id });

      return this.getById(id);
    } catch (error: unknown) {
      console.error('[MemoryEngine.update]', error);
      return null;
    }
  }

  /**
   * Delete a memory by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.prepare('DELETE FROM memories WHERE id = ?').bind(id).run<any>();

      if (result.meta.changes > 0) {
        await this.eventBus.emit('memory.deleted', 'memory-engine', { memoryId: id });
        return true;
      }

      return false;
    } catch (error: unknown) {
      console.error('[MemoryEngine.delete]', error);
      return false;
    }
  }

  /**
   * Get all categories for a session with counts
   */
  async getCategories(sessionId: string): Promise<MemoryCategory[]> {
    try {
      const result = await this.db
        .prepare(
          `SELECT category, type, COUNT(*) as count
         FROM memories
         WHERE session_id = ? AND category IS NOT NULL
         GROUP BY category, type
         ORDER BY category`
        )
        .bind(sessionId)
        .all<any>();

      return (result.results ?? []).map((row: any) => ({
        name: row.category,
        count: row.count,
        type: row.type,
      }));
    } catch (error: unknown) {
      console.error('[MemoryEngine.getCategories]', error);
      return [];
    }
  }

  /**
   * Run TTL cleanup — called by scheduled worker
   * Deletes expired memories and archives old ones
   */
  async cleanup(): Promise<{ deleted: number; archived: number }> {
    try {
      let deleted = 0;

      // Phase 1: Delete expired memories
      const deleteResult = await this.db
        .prepare('DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at < datetime("now")')
        .run<any>();

      deleted = deleteResult.meta.changes;

      // Emit cleanup event
      await this.eventBus.emit('memory.cleanup', 'memory-engine', {
        deleted,
        timestamp: new Date().toISOString(),
      });

      return { deleted, archived: 0 };
    } catch (error: unknown) {
      console.error('[MemoryEngine.cleanup]', error);
      return { deleted: 0, archived: 0 };
    }
  }

  /**
   * Get default TTL for memory type in seconds
   */
  private getDefaultTTL(type: string): number | null {
    switch (type) {
      case 'chat':
        return 86400; // 24 hours
      case 'simulation':
        return 3600; // 1 hour (persists for 1h after sim ends)
      case 'system':
        return null; // permanent
      case 'codex':
        return 1800; // 30 minutes (reindex cache)
      default:
        return 86400;
    }
  }

  /**
   * Enforce capacity limits: cap on memories per session/simulation
   * Evicts oldest non-pinned memories if over limit
   */
  private async enforceCapLimits(sessionId: string, simulationId?: string): Promise<void> {
    const SESSION_CAP = 1000;
    const SIMULATION_CAP = 500;

    try {
      // Session-level cap
      const sessionCount = await this.db
        .prepare('SELECT COUNT(*) as count FROM memories WHERE session_id = ?')
        .bind(sessionId)
        .first<any>();

      if ((sessionCount?.count ?? 0) >= SESSION_CAP) {
        // Evict oldest non-pinned memory
        await this.db
          .prepare(`
          DELETE FROM memories WHERE id IN (
            SELECT id FROM memories
            WHERE session_id = ? AND is_pinned = 0
            ORDER BY created_at ASC LIMIT 1
          )
        `)
          .bind(sessionId)
          .run();
      }

      // Simulation-level cap
      if (simulationId) {
        const simCount = await this.db
          .prepare('SELECT COUNT(*) as count FROM memories WHERE simulation_id = ?')
          .bind(simulationId)
          .first<any>();

        if ((simCount?.count ?? 0) >= SIMULATION_CAP) {
          // Evict lowest-priority non-pinned memory
          await this.db
            .prepare(`
            DELETE FROM memories WHERE id IN (
              SELECT id FROM memories
              WHERE simulation_id = ? AND is_pinned = 0
              ORDER BY priority ASC, created_at ASC LIMIT 1
            )
          `)
            .bind(simulationId)
            .run();
        }
      }
    } catch (error: unknown) {
      console.error('[MemoryEngine.enforceCapLimits]', error);
      // Don't fail create if eviction fails
    }
  }

  /**
   * Map a D1 row to a Memory object
   */
  private mapRow(row: any): Memory {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      type: row.type as Memory['type'],
      category: row.category as string | null,
      key: row.key as string,
      value: row.value as string,
      source: row.source as Memory['source'],
      mode: row.mode as string | null,
      simulationId: row.simulation_id as string | null,
      priority: row.priority as number,
      ttlSeconds: row.ttl_seconds as number | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      expiresAt: row.expires_at as string | null,
      isPinned: Boolean(row.is_pinned),
      tags: JSON.parse((row.tags as string) || '[]'),
    };
  }
}
