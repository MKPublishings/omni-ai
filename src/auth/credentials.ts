const PASSWORD_HASH_VERSION = 'pbkdf2_sha256';
const PASSWORD_ITERATIONS = 100000;
const MAX_SUPPORTED_PASSWORD_ITERATIONS = 100000;
const PASSWORD_KEY_LENGTH = 32;
const SESSION_TOKEN_BYTES = 32;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

export interface AuthUserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  email_verified: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface AuthSessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  last_seen_at: string;
  user_agent: string | null;
  ip_address: string | null;
}

export interface AuthEmailVerificationRecord {
  id: string;
  user_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  consumed_at: string | null;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
}

export interface AuthSessionResult {
  session: AuthSessionRecord;
  user: AuthenticatedUser;
}

export class AuthConflictError extends Error {
  code = 'AUTH_CONFLICT';
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function stringToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return String(username || '').trim().toLowerCase();
}

function slugifyUsername(value: string): string {
  const normalized = normalizeUsername(value)
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
  return normalized || `user${Math.random().toString(36).slice(2, 8)}`;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validateUsername(username: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]{2,31})$/.test(normalizeUsername(username));
}

export function normalizeLoginIdentifier(identifier: string): string {
  return String(identifier || '').trim().toLowerCase();
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  const value = String(password || '');
  if (value.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' };
  }
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return { valid: false, error: 'Password must include at least one letter and one number.' };
  }
  return { valid: true };
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(stringToBytes(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: toArrayBuffer(salt),
    },
    keyMaterial,
    PASSWORD_KEY_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return [
    PASSWORD_HASH_VERSION,
    String(PASSWORD_ITERATIONS),
    bytesToBase64Url(salt),
    bytesToBase64Url(hash),
  ].join('$');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [version, rawIterations, saltValue, expectedHash] = String(storedHash || '').split('$');
  if (version !== PASSWORD_HASH_VERSION || !rawIterations || !saltValue || !expectedHash) {
    return false;
  }

  const iterations = Number.parseInt(rawIterations, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }
  if (iterations > MAX_SUPPORTED_PASSWORD_ITERATIONS) {
    return false;
  }

  const salt = Uint8Array.from(atob(saltValue.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
  let hash: Uint8Array;
  try {
    hash = await derivePasswordHash(password, salt, iterations);
  } catch {
    return false;
  }
  return bytesToBase64Url(hash) === expectedHash;
}

export function createSessionToken(): string {
  const token = crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES));
  return bytesToBase64Url(token);
}

export function getEmailVerificationExpiryDate(now = new Date()): Date {
  return new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(stringToBytes(token)));
  return bytesToHex(new Uint8Array(digest));
}

export function getSessionExpiryDate(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export function mapUser(row: AuthUserRecord): AuthenticatedUser {
  return {
    id: row.id,
    username: normalizeUsername(row.username),
    email: normalizeEmail(row.email),
    displayName: row.display_name,
    role: row.role,
    emailVerified: row.email_verified === 1,
  };
}

export async function createUser(
  db: D1Database,
  input: { email: string; password: string; displayName: string; username?: string }
): Promise<AuthenticatedUser> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const username = await generateUniqueUsername(db, input.username || email.split('@')[0] || input.displayName);

  await db
    .prepare(
      `INSERT INTO auth_users (
        id, username, email, password_hash, display_name, role, email_verified, created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, 'member', 0, ?, ?, NULL)`
    )
    .bind(id, username, email, passwordHash, input.displayName, now, now)
    .run();

  return {
    id,
    username,
    email,
    displayName: input.displayName,
    role: 'member',
    emailVerified: false,
  };
}

export async function findUserByEmail(db: D1Database, email: string): Promise<AuthUserRecord | null> {
  const result = await db
    .prepare('SELECT * FROM auth_users WHERE email = ? LIMIT 1')
    .bind(normalizeEmail(email))
    .first<AuthUserRecord>();

  return result ?? null;
}

export async function findUserByIdentifier(db: D1Database, identifier: string): Promise<AuthUserRecord | null> {
  const normalized = normalizeLoginIdentifier(identifier);
  const result = await db
    .prepare('SELECT * FROM auth_users WHERE email = ? OR username = ? LIMIT 1')
    .bind(normalized, normalized)
    .first<AuthUserRecord>();

  return result ?? null;
}

export async function findUserById(db: D1Database, userId: string): Promise<AuthUserRecord | null> {
  const result = await db
    .prepare('SELECT * FROM auth_users WHERE id = ? LIMIT 1')
    .bind(userId)
    .first<AuthUserRecord>();

  return result ?? null;
}

async function usernameExists(db: D1Database, username: string): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 as found FROM auth_users WHERE username = ? LIMIT 1')
    .bind(normalizeUsername(username))
    .first<{ found: number }>();

  return Boolean(result?.found);
}

async function usernameInUseByAnotherUser(db: D1Database, username: string, userId: string): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM auth_users WHERE username = ? AND id != ? LIMIT 1')
    .bind(normalizeUsername(username), userId)
    .first<{ id: string }>();

  return Boolean(result?.id);
}

export async function generateUniqueUsername(db: D1Database, seed: string): Promise<string> {
  const base = slugifyUsername(seed);
  let candidate = base;
  let suffix = 1;

  while (await usernameExists(db, candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

export async function createSession(
  db: D1Database,
  userId: string,
  request: Request
): Promise<{ token: string; session: AuthSessionRecord }> {
  const now = new Date();
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const session: AuthSessionRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: getSessionExpiryDate(now).toISOString(),
    created_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    user_agent: request.headers.get('user-agent'),
    ip_address: request.headers.get('cf-connecting-ip'),
  };

  await db
    .prepare(
      `INSERT INTO auth_sessions (
        id, user_id, token_hash, expires_at, created_at, last_seen_at, user_agent, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      session.id,
      session.user_id,
      session.token_hash,
      session.expires_at,
      session.created_at,
      session.last_seen_at,
      session.user_agent,
      session.ip_address
    )
    .run();

  await db
    .prepare('UPDATE auth_users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .bind(now.toISOString(), now.toISOString(), userId)
    .run();

  return { token, session };
}

export async function createEmailVerification(
  db: D1Database,
  user: AuthenticatedUser
): Promise<{ token: string; record: AuthEmailVerificationRecord }> {
  const now = new Date();
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const record: AuthEmailVerificationRecord = {
    id: crypto.randomUUID(),
    user_id: user.id,
    email: normalizeEmail(user.email),
    token_hash: tokenHash,
    expires_at: getEmailVerificationExpiryDate(now).toISOString(),
    created_at: now.toISOString(),
    consumed_at: null,
  };

  await db.prepare('DELETE FROM auth_email_verifications WHERE user_id = ? AND consumed_at IS NULL').bind(user.id).run();

  await db
    .prepare(
      `INSERT INTO auth_email_verifications (
        id, user_id, email, token_hash, expires_at, created_at, consumed_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)`
    )
    .bind(record.id, record.user_id, record.email, record.token_hash, record.expires_at, record.created_at)
    .run();

  return { token, record };
}

export async function consumeEmailVerificationToken(
  db: D1Database,
  token: string
): Promise<AuthenticatedUser | null> {
  const tokenHash = await hashSessionToken(token);
  const result = await db
    .prepare(
      `SELECT
        v.id as verification_id,
        v.user_id as verification_user_id,
        v.email as verification_email,
        v.expires_at as verification_expires_at,
        v.created_at as verification_created_at,
        v.consumed_at as verification_consumed_at,
        u.id as user_id,
        u.username as user_username,
        u.email as user_email,
        u.password_hash as user_password_hash,
        u.display_name as user_display_name,
        u.role as user_role,
        u.email_verified as user_email_verified,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at,
        u.last_login_at as user_last_login_at
      FROM auth_email_verifications v
      INNER JOIN auth_users u ON u.id = v.user_id
      WHERE v.token_hash = ?
      LIMIT 1`
    )
    .bind(tokenHash)
    .first<Record<string, unknown>>();

  if (!result) {
    return null;
  }

  if (result.verification_consumed_at) {
    return null;
  }

  const expiresAt = new Date(String(result.verification_expires_at));
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const now = new Date().toISOString();
  await db.batch([
    db.prepare('UPDATE auth_email_verifications SET consumed_at = ? WHERE id = ?').bind(now, String(result.verification_id)),
    db.prepare('UPDATE auth_users SET email_verified = 1, updated_at = ? WHERE id = ?').bind(now, String(result.user_id)),
  ]);

  return mapUser({
    id: String(result.user_id),
    username: String(result.user_username),
    email: String(result.user_email),
    password_hash: String(result.user_password_hash),
    display_name: String(result.user_display_name),
    role: String(result.user_role),
    email_verified: 1,
    created_at: String(result.user_created_at),
    updated_at: now,
    last_login_at: result.user_last_login_at ? String(result.user_last_login_at) : null,
  });
}

export async function updateUserProfile(
  db: D1Database,
  userId: string,
  input: { displayName?: string; username?: string }
): Promise<AuthenticatedUser> {
  const existing = await findUserById(db, userId);
  if (!existing) {
    throw new Error('User not found.');
  }

  const nextDisplayName = String(input.displayName || existing.display_name).trim();
  if (nextDisplayName.length < 2) {
    throw new Error('Display name must be at least 2 characters.');
  }

  const nextUsername = String(input.username || existing.username).trim();
  if (!validateUsername(nextUsername)) {
    throw new Error('Username must be 3-32 characters and use letters, numbers, dots, dashes, or underscores.');
  }

  if (await usernameInUseByAnotherUser(db, nextUsername, userId)) {
    throw new AuthConflictError('That username is already in use.');
  }

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE auth_users SET display_name = ?, username = ?, updated_at = ? WHERE id = ?')
    .bind(nextDisplayName, normalizeUsername(nextUsername), now, userId)
    .run();

  return {
    id: existing.id,
    username: normalizeUsername(nextUsername),
    email: normalizeEmail(existing.email),
    displayName: nextDisplayName,
    role: existing.role,
    emailVerified: existing.email_verified === 1,
  };
}

export async function getSessionByToken(db: D1Database, token: string): Promise<AuthSessionResult | null> {
  const tokenHash = await hashSessionToken(token);
  const result = await db
    .prepare(
      `SELECT
        s.id as session_id,
        s.user_id as session_user_id,
        s.token_hash as session_token_hash,
        s.expires_at as session_expires_at,
        s.created_at as session_created_at,
        s.last_seen_at as session_last_seen_at,
        s.user_agent as session_user_agent,
        s.ip_address as session_ip_address,
        u.id as user_id,
        u.username as user_username,
        u.email as user_email,
        u.password_hash as user_password_hash,
        u.display_name as user_display_name,
        u.role as user_role,
        u.email_verified as user_email_verified,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at,
        u.last_login_at as user_last_login_at
      FROM auth_sessions s
      INNER JOIN auth_users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1`
    )
    .bind(tokenHash)
    .first<Record<string, unknown>>();

  if (!result) {
    return null;
  }

  const expiresAt = new Date(String(result.session_expires_at));
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  const session: AuthSessionRecord = {
    id: String(result.session_id),
    user_id: String(result.session_user_id),
    token_hash: String(result.session_token_hash),
    expires_at: String(result.session_expires_at),
    created_at: String(result.session_created_at),
    last_seen_at: String(result.session_last_seen_at),
    user_agent: result.session_user_agent ? String(result.session_user_agent) : null,
    ip_address: result.session_ip_address ? String(result.session_ip_address) : null,
  };

  const user = mapUser({
    id: String(result.user_id),
    username: String(result.user_username),
    email: String(result.user_email),
    password_hash: String(result.user_password_hash),
    display_name: String(result.user_display_name),
    role: String(result.user_role),
    email_verified: Number(result.user_email_verified),
    created_at: String(result.user_created_at),
    updated_at: String(result.user_updated_at),
    last_login_at: result.user_last_login_at ? String(result.user_last_login_at) : null,
  });

  return { session, user };
}

export async function touchSession(db: D1Database, sessionId: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?')
    .bind(now, sessionId)
    .run();
}

export async function revokeSessionByToken(db: D1Database, token: string): Promise<void> {
  const tokenHash = await hashSessionToken(token);
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function pruneExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run();
}
