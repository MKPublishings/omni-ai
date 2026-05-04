import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hashPassword } from '../auth/credentials';

const DEFAULT_AUTH0_DOMAIN = 'ion-ai.us.auth0.com';
const DATABASE_NAME = 'ionirix';
const AUTH0_AUDIENCE_PATH = '/api/v2/';
const DEFAULT_PAGE_SIZE = 100;

type SeedTarget = '--local' | '--remote';

type Auth0ManagementTokenResponse = {
  access_token?: string;
  token_type?: string;
};

type Auth0ManagementUser = {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  username?: string;
  identities?: Array<{
    provider?: string;
  }>;
};

type BackfillCandidate = {
  email: string;
  displayName: string;
  usernameSeed: string;
  emailVerified: boolean;
};

type ExistingAuthUserRecord = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  email_verified: number;
};

function resolveSeedTarget(argv: string[]): SeedTarget {
  return argv.includes('--remote') ? '--remote' : '--local';
}

function shouldIncludeUnverified(argv: string[]): boolean {
  return argv.includes('--include-unverified');
}

function resolveAuth0Domain(): string {
  return String(process.env.AUTH0_DOMAIN || DEFAULT_AUTH0_DOMAIN)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

function requireEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function normalizeEmail(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function slugifyUsername(value: string): string {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '');

  if (normalized.length >= 3) {
    return normalized.slice(0, 32);
  }

  return 'ion-operator';
}

function buildDisplayName(user: Auth0ManagementUser, email: string): string {
  return String(user.name || user.nickname || user.username || email.split('@')[0] || 'ION Operator').trim();
}

function buildUsernameSeed(user: Auth0ManagementUser, email: string): string {
  return slugifyUsername(String(user.nickname || user.username || user.name || email.split('@')[0] || user.user_id || 'ion-operator'));
}

async function withTempSqlFile<T>(sql: string, callback: (filePath: string) => Promise<T>): Promise<T> {
  const filePath = path.join(os.tmpdir(), `ion-auth0-backfill-${crypto.randomUUID()}.sql`);
  await fs.writeFile(filePath, sql, 'utf8');

  try {
    return await callback(filePath);
  } finally {
    await fs.unlink(filePath).catch(() => undefined);
  }
}

function runWranglerD1Command(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['wrangler', 'd1', ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr.trim() || `Wrangler D1 command failed with code ${code ?? 'unknown'}.`));
    });
  });
}

async function executeSql(sql: string, target: SeedTarget): Promise<string> {
  return withTempSqlFile(sql, (filePath) => runWranglerD1Command(['execute', DATABASE_NAME, target, '--file', filePath, '--json']));
}

function parseD1JsonResults(output: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(output) as { result?: Array<{ results?: Array<Record<string, unknown>> }> };
  return parsed.result?.flatMap((entry) => entry.results || []) || [];
}

async function fetchManagementToken(domain: string): Promise<string> {
  const clientId = requireEnv('AUTH0_MANAGEMENT_CLIENT_ID');
  const clientSecret = requireEnv('AUTH0_MANAGEMENT_CLIENT_SECRET');

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}${AUTH0_AUDIENCE_PATH}`,
      grant_type: 'client_credentials',
    }),
  });

  const payload = await response.json().catch(() => ({})) as Auth0ManagementTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error('Could not obtain an Auth0 Management API token.');
  }

  return payload.access_token;
}

async function fetchManagementUsers(domain: string, accessToken: string): Promise<Auth0ManagementUser[]> {
  const users: Auth0ManagementUser[] = [];
  let page = 0;

  while (true) {
    const url = new URL(`https://${domain}/api/v2/users`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(DEFAULT_PAGE_SIZE));
    url.searchParams.set('include_totals', 'false');

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => [] as Auth0ManagementUser[]);
    if (!response.ok || !Array.isArray(payload)) {
      throw new Error(`Could not fetch Auth0 users for page ${page}.`);
    }

    users.push(...payload);
    if (payload.length < DEFAULT_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return users;
}

function buildBackfillCandidates(users: Auth0ManagementUser[], includeUnverified: boolean): {
  candidates: BackfillCandidate[];
  skippedMissingEmail: number;
  skippedUnverified: number;
} {
  const byEmail = new Map<string, BackfillCandidate>();
  let skippedMissingEmail = 0;
  let skippedUnverified = 0;

  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) {
      skippedMissingEmail += 1;
      continue;
    }

    if (user.email_verified !== true && !includeUnverified) {
      skippedUnverified += 1;
      continue;
    }

    byEmail.set(email, {
      email,
      displayName: buildDisplayName(user, email),
      usernameSeed: buildUsernameSeed(user, email),
      emailVerified: user.email_verified === true,
    });
  }

  return {
    candidates: [...byEmail.values()],
    skippedMissingEmail,
    skippedUnverified,
  };
}

async function loadExistingUsers(target: SeedTarget): Promise<Map<string, ExistingAuthUserRecord>> {
  const output = await executeSql(`SELECT id, email, username, display_name, email_verified FROM auth_users;`, target);
  const rows = parseD1JsonResults(output);

  return new Map(
    rows
      .map((row) => ({
        id: String(row.id || ''),
        email: normalizeEmail(String(row.email || '')),
        username: String(row.username || ''),
        display_name: String(row.display_name || ''),
        email_verified: Number(row.email_verified || 0),
      }))
      .filter((row) => row.email)
      .map((row) => [row.email, row])
  );
}

function buildUniqueUsername(seed: string, usedUsernames: Set<string>): string {
  const base = slugifyUsername(seed);
  let candidate = base;
  let suffix = 1;

  while (usedUsernames.has(candidate)) {
    const suffixValue = String(suffix);
    candidate = `${base.slice(0, Math.max(3, 32 - suffixValue.length))}${suffixValue}`;
    suffix += 1;
  }

  usedUsernames.add(candidate);
  return candidate;
}

async function buildSqlStatements(candidates: BackfillCandidate[], existingUsers: Map<string, ExistingAuthUserRecord>): Promise<{
  statements: string[];
  created: number;
  updated: number;
}> {
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(crypto.randomUUID());
  const usedUsernames = new Set(
    [...existingUsers.values()].map((user) => user.username.toLowerCase()).filter(Boolean)
  );

  const statements: string[] = [];
  let created = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const existing = existingUsers.get(candidate.email);
    if (existing) {
      const shouldUpdateDisplayName = candidate.displayName && candidate.displayName !== existing.display_name;
      const shouldVerify = candidate.emailVerified && existing.email_verified !== 1;

      if (!shouldUpdateDisplayName && !shouldVerify) {
        continue;
      }

      statements.push(
        `UPDATE auth_users SET display_name = '${escapeSql(shouldUpdateDisplayName ? candidate.displayName : existing.display_name)}', email_verified = ${shouldVerify ? 1 : existing.email_verified}, updated_at = '${escapeSql(now)}' WHERE id = '${escapeSql(existing.id)}';`
      );
      updated += 1;
      continue;
    }

    const username = buildUniqueUsername(candidate.usernameSeed, usedUsernames);
    statements.push(`
      INSERT INTO auth_users (
        id, username, email, password_hash, display_name, role, email_verified, created_at, updated_at, last_login_at
      ) VALUES (
        '${crypto.randomUUID()}',
        '${escapeSql(username)}',
        '${escapeSql(candidate.email)}',
        '${escapeSql(passwordHash)}',
        '${escapeSql(candidate.displayName)}',
        'member',
        ${candidate.emailVerified ? 1 : 0},
        '${escapeSql(now)}',
        '${escapeSql(now)}',
        NULL
      );`);
    created += 1;
  }

  return { statements, created, updated };
}

export async function backfillAuth0Users(target: SeedTarget = '--local', includeUnverified = false): Promise<void> {
  const domain = resolveAuth0Domain();
  console.log(`[Auth0 Backfill] Fetching users from ${domain}...`);

  const token = await fetchManagementToken(domain);
  const users = await fetchManagementUsers(domain, token);
  const { candidates, skippedMissingEmail, skippedUnverified } = buildBackfillCandidates(users, includeUnverified);
  console.log(`[Auth0 Backfill] Loaded ${users.length} Auth0 users, ${candidates.length} are eligible for import.`);

  const existingUsers = await loadExistingUsers(target);
  const { statements, created, updated } = await buildSqlStatements(candidates, existingUsers);

  if (statements.length === 0) {
    console.log(JSON.stringify({
      target,
      scanned: users.length,
      eligible: candidates.length,
      created: 0,
      updated: 0,
      skippedMissingEmail,
      skippedUnverified,
      changed: false,
    }, null, 2));
    return;
  }

  const sql = ['BEGIN TRANSACTION;', ...statements, 'COMMIT;'].join('\n');
  await executeSql(sql, target);

  console.log(JSON.stringify({
    target,
    scanned: users.length,
    eligible: candidates.length,
    created,
    updated,
    skippedMissingEmail,
    skippedUnverified,
    changed: true,
  }, null, 2));
}

if (String(process.argv[1] || '').includes('backfill-auth0-users')) {
  backfillAuth0Users(resolveSeedTarget(process.argv), shouldIncludeUnverified(process.argv)).catch((error) => {
    console.error('[backfill-auth0-users]', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}