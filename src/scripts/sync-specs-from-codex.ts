/**
 * @script sync-specs-from-codex
 * 
 * Read codex/index.json and populate D1 specs table.
 * Usage: npm run db:seed:specs
 */

import fs from 'fs/promises';
import path from 'path';

interface SyncEnv {
  DB: D1Database;
}

interface CodexSpec {
  slug: string;
  title: string;
  description?: string;
  version?: string;
  category?: string;
  modules?: string[];
}

/**
 * Load codex index
 */
async function loadCodexIndex(): Promise<CodexSpec[]> {
  const indexPath = path.join(process.cwd(), 'codex', 'index.json');
  const content = await fs.readFile(indexPath, 'utf-8');
  const data = JSON.parse(content);

  // Extract specs from codex structure
  const specs: CodexSpec[] = [];

  if (data.specs && Array.isArray(data.specs)) {
    specs.push(...data.specs);
  }

  return specs;
}

/**
 * Sync specifications to D1
 */
export async function syncSpecsFromCodex(env: SyncEnv): Promise<void> {
  console.log('[Sync] Starting spec sync from codex...');

  const specs = await loadCodexIndex();
  console.log(`[Sync] Found ${specs.length} specs in codex`);

  for (const spec of specs) {
    try {
      const now = new Date().toISOString();
      await env.DB
        .prepare(
          `
        INSERT INTO specs (slug, title, description, version, category, modules_map, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          version = excluded.version,
          updated_at = excluded.updated_at
      `
        )
        .bind(
          spec.slug,
          spec.title,
          spec.description || '',
          spec.version || '1.0.0',
          spec.category || 'general',
          JSON.stringify(spec.modules || []),
          now,
          now
        )
        .run();

      console.log(`[Sync] ✅ ${spec.slug}`);
    } catch (err: unknown) {
      console.error(`[Sync] ❌ ${spec.slug}:`, err);
    }
  }

  console.log('[Sync] ✅ Specs sync complete');
}

export default syncSpecsFromCodex;
