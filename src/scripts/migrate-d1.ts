/**
 * @script migrate-d1
 * 
 * Run all database migrations in order.
 * Usage: npm run db:migrate
 */

import fs from 'fs/promises';
import path from 'path';

interface MigrationEnv {
  DB: D1Database;
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

/**
 * Load migration files in order
 */
async function getMigrations(): Promise<Array<{ name: string; sql: string }>> {
  const files = await fs.readdir(MIGRATIONS_DIR);
  const migrations = files
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => f.replace('.sql', ''));

  const migrationList = [];
  for (const name of migrations) {
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, `${name}.sql`), 'utf-8');
    migrationList.push({ name, sql });
  }

  return migrationList;
}

/**
 * Run migrations
 */
export async function runMigrations(env: MigrationEnv): Promise<void> {
  console.log('[Migrate] Starting D1 migrations...');

  const migrations = await getMigrations();

  for (const { name, sql } of migrations) {
    try {
      console.log(`[Migrate] Running ${name}...`);
      await env.DB.prepare(sql).run();
      console.log(`[Migrate] ✅ ${name}`);
    } catch (err: unknown) {
      console.error(`[Migrate] ❌ ${name}:`, err);
      throw err;
    }
  }

  console.log('[Migrate] ✅ All migrations complete');
}

export default runMigrations;
