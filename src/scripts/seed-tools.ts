/**
 * @script seed-tools
 * 
 * Register all tool modules in the ToolRegistry.
 * Usage: npm run db:seed:tools
 */

import { ALL_TOOLS } from '../tools/index';
import type { ToolModule } from '../types/tool.types';

interface SeedEnv {
  DB: D1Database;
}

/**
 * Register a tool in D1
 */
async function registerTool(db: D1Database, tool: ToolModule): Promise<void> {
  const now = new Date().toISOString();

  try {
    // Insert or update tool record
    await db
      .prepare(
        `
      INSERT INTO tool_executions (
        id, name, version, category, enabled, schema_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        version = excluded.version,
        enabled = excluded.enabled,
        schema_json = excluded.schema_json,
        updated_at = excluded.updated_at
    `
      )
      .bind(
        `tool-${tool.name}-${Date.now()}`,
        tool.name,
        tool.version || '1.0.0',
        tool.category || 'utility',
        tool.enabled ? 1 : 0,
        JSON.stringify(tool.schema),
        now,
        now
      )
      .run();

    console.log(`[Seed] ✅ Registered tool: ${tool.name}`);
  } catch (err: unknown) {
    console.error(`[Seed] ❌ Failed to register ${tool.name}:`, err);
    throw err;
  }
}

/**
 * Seed all tools
 */
export async function seedTools(env: SeedEnv): Promise<void> {
  console.log('[Seed] Starting tool seeding...');
  console.log(`[Seed] Found ${ALL_TOOLS.length} tools to register`);

  for (const tool of ALL_TOOLS) {
    await registerTool(env.DB, tool);
  }

  console.log('[Seed] ✅ Tool seeding complete');
}

export default seedTools;
