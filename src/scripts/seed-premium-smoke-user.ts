import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hashPassword } from '../auth/credentials';

interface SmokeUserSeed {
  userId: string;
  username: string;
  email: string;
  password: string;
}

type SeedTarget = '--local' | '--remote';

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

async function withTempSqlFile(sql: string, callback: (filePath: string) => Promise<void>): Promise<void> {
  const filePath = path.join(os.tmpdir(), `ion-premium-smoke-${crypto.randomUUID()}.sql`);
  await fs.writeFile(filePath, sql, 'utf8');
  try {
    await callback(filePath);
  } finally {
    await fs.unlink(filePath).catch(() => undefined);
  }
}

function runWranglerExecuteFile(filePath: string, target: SeedTarget): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `npx wrangler d1 execute ionirix ${target} --file "${filePath}"`;
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

      reject(new Error(`Wrangler D1 execute exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function resolveSeedTarget(argv: string[]): SeedTarget {
  return argv.includes('--remote') ? '--remote' : '--local';
}

export async function seedPremiumSmokeUser(target: SeedTarget = '--local'): Promise<SmokeUserSeed> {
  const now = new Date().toISOString();
  const nonce = Math.random().toString(36).slice(2, 10);
  const password = 'SmokePass123';
  const userId = crypto.randomUUID();
  const username = `premiumsmoke_${nonce}`;
  const email = `${username}@ionirix.local`;
  const passwordHash = await hashPassword(password);

  const insertUserSql = `
    INSERT INTO auth_users (
      id, username, email, password_hash, display_name, role, email_verified, created_at, updated_at, last_login_at
    ) VALUES (
      '${escapeSql(userId)}',
      '${escapeSql(username)}',
      '${escapeSql(email)}',
      '${escapeSql(passwordHash)}',
      'Premium Smoke User',
      'member',
      1,
      '${escapeSql(now)}',
      '${escapeSql(now)}',
      NULL
    );`;

  const insertEntitlementSql = `
    INSERT INTO auth_user_entitlements (
      id, user_id, tier, status, source, starts_at, ends_at, metadata_json, created_at, updated_at
    ) VALUES (
      '${crypto.randomUUID()}',
      '${escapeSql(userId)}',
      'premium',
      'active',
      'smoke-seed',
      '${escapeSql(now)}',
      NULL,
      '{"seed":"premium-phase-smoke"}',
      '${escapeSql(now)}',
      '${escapeSql(now)}'
    );`;

  await withTempSqlFile(insertUserSql, (filePath) => runWranglerExecuteFile(filePath, target));
  await withTempSqlFile(insertEntitlementSql, (filePath) => runWranglerExecuteFile(filePath, target));

  return { userId, username, email, password };
}

if (String(process.argv[1] || '').includes('seed-premium-smoke-user')) {
  seedPremiumSmokeUser(resolveSeedTarget(process.argv))
    .then((seed) => {
      console.log(JSON.stringify(seed));
    })
    .catch((error) => {
      console.error('[seed-premium-smoke-user]', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}