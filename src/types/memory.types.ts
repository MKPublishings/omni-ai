/**
 * @module Memory Types
 * @spec: memory-engine-v1
 * 
 * Complete TypeScript type definitions for the memory subsystem.
 * Covers memory records, queries, operations, and domain-specific extensions.
 */

export type MemoryType = 'chat' | 'simulation' | 'system' | 'codex';
export type MemorySource = 'user' | 'tool' | 'simulation' | 'system' | 'codex';

/**
 * A memory record stored in D1.
 * Represents any memorable fact or state in the system.
 */
export interface Memory {
  id: string; // UUID v4
  sessionId: string; // owning session
  type: MemoryType; // memory domain
  category: string | null; // user-defined category
  key: string; // memory key/label
  value: string; // memory content (text or JSON string)
  embeddingVector?: Float32Array; // future: vector search capability
  source: MemorySource; // origin of the memory
  mode: string | null; // cognitive mode active at creation
  simulationId: string | null; // null for non-simulation memories
  priority: number; // 0 = normal, higher = more important
  ttlSeconds: number | null; // null = use default for type
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  expiresAt: string | null; // computed from ttlSeconds
  isPinned: boolean; // pinned = no auto-expiration
  tags: string[]; // user-defined tags
}

/**
 * Input for creating a new memory
 */
export interface CreateMemoryInput {
  sessionId: string;
  type: MemoryType;
  category?: string;
  key: string;
  value: string;
  source?: MemorySource;
  mode?: string;
  simulationId?: string;
  priority?: number;
  ttlSeconds?: number;
  isPinned?: boolean;
  tags?: string[];
}

/**
 * Input for updating an existing memory
 */
export interface UpdateMemoryInput {
  key?: string;
  value?: string;
  category?: string;
  priority?: number;
  ttlSeconds?: number | null;
  isPinned?: boolean;
  tags?: string[];
}

/**
 * Memory query for complex searches
 */
export interface MemoryQuery {
  search?: string; // full-text search on key + value
  type?: MemoryType[];
  category?: string[];
  tags?: string[]; // tag intersection (ALL must match)
  simulationId?: string;
  isPinned?: boolean;
  dateRange?: { from: string; to: string }; // ISO 8601
  sort?: 'created_at' | 'updated_at' | 'priority';
  order?: 'asc' | 'desc';
  limit?: number; // default 50, max 200
  offset?: number; // pagination offset
  cursor?: string; // cursor for keyset pagination
}

/**
 * Result of a memory query
 */
export interface MemoryQueryResult {
  memories: Memory[];
  nextCursor: string | null;
  total: number;
  hasMore: boolean;
}

/**
 * Category summary
 */
export interface MemoryCategory {
  name: string;
  count: number;
  type: MemoryType;
}

/**
 * Memory cleanup operations
 */
export interface MemoryCleanupResult {
  deleted: number;
  archived: number;
  timestamp: string;
}

/**
 * Export format for memories
 */
export interface MemoryExport {
  format: 'json' | 'csv';
  memories: Memory[];
  exportedAt: string;
  filter?: MemoryQuery;
}
