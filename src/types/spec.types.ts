/**
 * @module Spec Types
 * @spec: specs-registry
 * 
 * TypeScript types for the specifications subsystem.
 * Covers spec documents, versioning, linking, and discovery.
 */

export type SpecStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type SpecCategory =
  | 'Public Runtime'
  | 'Operations'
  | 'Simulation'
  | 'Media'
  | 'Research'
  | 'Tools'
  | 'Memory'
  | 'Integration';

/**
 * A specification document
 */
export interface Spec {
  id: string;
  slug: string;
  title: string;
  category: SpecCategory;
  version: string; // semver
  status: SpecStatus;
  badgeLabel?: string;
  badgeColor?: string;
  summary: string;
  contentHash: string; // SHA-256 of full content
  moduleLinks: ModuleLink[];
  codexLinks: CodexLink[];
  dependencies: string[]; // array of spec slugs this spec depends on
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  publishedAt: string | null; // ISO 8601
}

/**
 * Module link: spec to source file mapping
 */
export interface ModuleLink {
  path: string; // e.g., "src/engines/memory-engine.ts"
  description?: string;
  weight?: number; // 0-100, importance/relevance weight
}

/**
 * Codex link: spec to codex artifact mapping
 */
export interface CodexLink {
  chamber: string; // codex chamber name
  artifactId?: string;
  description?: string;
}

/**
 * Spec version history entry
 */
export interface SpecVersion {
  version: string;
  status: SpecStatus;
  publishedAt: string | null;
  contentHash: string;
  changelog?: string; // summary of changes
}

/**
 * Spec search result
 */
export interface SpecSearchResult {
  id: string;
  slug: string;
  title: string;
  category: SpecCategory;
  version: string;
  summary: string;
  relevanceScore?: number; // 0-100 relevance
}

/**
 * Module to specs mapping
 */
export interface ModuleSpecMap {
  [modulePath: string]: string[]; // module path -> array of spec slugs
}

/**
 * Spec dependency graph
 */
export interface SpecDependencyGraph {
  nodes: Array<{ id: string; label: string; category: SpecCategory }>;
  edges: Array<{ source: string; target: string; type: 'implements' | 'references' | 'extends' }>;
}

/**
 * Create spec request (admin only)
 */
export interface CreateSpecRequest {
  slug: string;
  title: string;
  category: SpecCategory;
  summary: string;
  moduleLinks: ModuleLink[];
  codexLinks: CodexLink[];
  dependencies?: string[];
  status?: SpecStatus;
}

/**
 * Spec registry statistics
 */
export interface SpecRegistryStats {
  totalSpecs: number;
  byCategory: Record<SpecCategory, number>;
  byStatus: Record<SpecStatus, number>;
  lastIndexed: string; // ISO 8601
}
