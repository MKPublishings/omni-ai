/**
 * @script migrate-d1
 *
 * Apply D1 migrations through Wrangler.
 * Usage: npm run db:migrate
 * Usage: npm run db:migrate:remote
 */

import { spawn } from 'node:child_process';

const DATABASE_NAME = 'ionirix';

function runWranglerMigration(mode: '--local' | '--remote'): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `npx wrangler d1 migrations apply ${DATABASE_NAME} ${mode}`;
    const child = spawn(command, [], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Wrangler D1 migrations exited with code ${code ?? 'unknown'}.`));
    });
  });
}

export async function runMigrations(mode: '--local' | '--remote' = '--local'): Promise<void> {
  console.log(`[Migrate] Applying D1 migrations to ${mode === '--remote' ? 'remote' : 'local'} database...`);
  await runWranglerMigration(mode);
  console.log('[Migrate] ✅ Migration apply complete');
}

if (String(process.argv[1] || '').includes('migrate-d1')) {
  const mode = process.argv.includes('--remote') ? '--remote' : '--local';
  runMigrations(mode).catch((error) => {
    console.error('[Migrate] ❌', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export default runMigrations;
