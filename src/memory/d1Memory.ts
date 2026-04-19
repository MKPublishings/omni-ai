type D1Env = {
  ION_DB?: D1Database;
};

export interface MemoryTurnRecord {
  sessionId: string;
  userId?: string;
  mode: string;
  userText: string;
  assistantText: string;
  emotionalTone?: string;
}

export interface MemoryArcEntry {
  mode: string;
  userText: string;
  assistantText: string;
  emotionalTone: string;
  createdAt: string;
}

export interface ChatHistoryEntry {
  id: number;
  sessionId: string;
  userId: string;
  mode: string;
  userText: string;
  assistantText: string;
  emotionalTone: string;
  createdAt: string;
}

export interface ChatPreferences {
  persistHistory: boolean;
  contextCarryover: boolean;
  updatedAt: string;
}

export interface LongTermMemoryStats {
  totalRows: number;
  rowsLast24h: number;
  distinctSessions: number;
  latestEntryAt: string | null;
}

function normalizeText(value: unknown, fallback = ""): string {
  const text = String(value || "").trim();
  return text || fallback;
}

const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  persistHistory: true,
  contextCarryover: true,
  updatedAt: new Date(0).toISOString()
};

export async function ensureIONMemorySchema(env: D1Env): Promise<void> {
  if (!env.ION_DB) return;

  await env.ION_DB.prepare(
    `
      CREATE TABLE IF NOT EXISTS ION_long_term_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT '',
        mode TEXT NOT NULL,
        user_text TEXT NOT NULL,
        assistant_text TEXT NOT NULL,
        emotional_tone TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      )
    `
  ).run();

  await env.ION_DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ION_ltm_session_created ON ION_long_term_memory(session_id, created_at DESC)`
  ).run();

  await env.ION_DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ION_ltm_user_created ON ION_long_term_memory(user_id, created_at DESC)`
  ).run();

  await env.ION_DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ION_ltm_created ON ION_long_term_memory(created_at DESC)`
  ).run();

  await env.ION_DB.prepare(
    `
      CREATE TABLE IF NOT EXISTS ION_chat_preferences (
        user_id TEXT PRIMARY KEY,
        persist_history INTEGER NOT NULL DEFAULT 1,
        context_carryover INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      )
    `
  ).run();

  try {
    await env.ION_DB.prepare(`ALTER TABLE ION_long_term_memory ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`).run();
  } catch (error) {
    const message = String((error as Error)?.message || error || '');
    if (!/duplicate column name|already exists/i.test(message)) {
      throw error;
    }
  }

  await env.ION_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ION_ltm_user_created ON ION_long_term_memory(user_id, created_at DESC)`).run();
}

export async function saveMemoryTurn(env: D1Env, turn: MemoryTurnRecord): Promise<void> {
  if (!env.ION_DB) return;

  const sessionId = normalizeText(turn.sessionId, "anon").slice(0, 120);
  const userId = normalizeText(turn.userId).slice(0, 120);
  const mode = normalizeText(turn.mode, "auto").slice(0, 64);
  const userText = normalizeText(turn.userText).slice(0, 4000);
  const assistantText = normalizeText(turn.assistantText).slice(0, 8000);
  const emotionalTone = normalizeText(turn.emotionalTone).slice(0, 80);
  if (!userText || !assistantText) return;

  await env.ION_DB.prepare(
    `
      INSERT INTO ION_long_term_memory (
        session_id, user_id, mode, user_text, assistant_text, emotional_tone
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `
  )
    .bind(sessionId, userId, mode, userText, assistantText, emotionalTone)
    .run();
}

export async function getRecentMemoryArc(env: D1Env, sessionId: string, limit = 4): Promise<MemoryArcEntry[]> {
  if (!env.ION_DB) return [];

  const normalizedSession = normalizeText(sessionId, "anon").slice(0, 120);
  const safeLimit = Math.max(1, Math.min(12, Math.floor(limit)));

  const result = await env.ION_DB.prepare(
    `
      SELECT mode, user_text AS userText, assistant_text AS assistantText, emotional_tone AS emotionalTone, created_at AS createdAt
      FROM ION_long_term_memory
      WHERE session_id = ?1
      ORDER BY created_at DESC
      LIMIT ?2
    `
  )
    .bind(normalizedSession, safeLimit)
    .all<MemoryArcEntry>();

  const rows = Array.isArray(result.results) ? result.results : [];
  return rows.reverse();
}

export async function getRecentMemoryArcForUser(env: D1Env, userId: string, limit = 4): Promise<MemoryArcEntry[]> {
  if (!env.ION_DB) return [];

  const normalizedUserId = normalizeText(userId).slice(0, 120);
  if (!normalizedUserId) return [];

  const safeLimit = Math.max(1, Math.min(12, Math.floor(limit)));
  const result = await env.ION_DB.prepare(
    `
      SELECT mode, user_text AS userText, assistant_text AS assistantText, emotional_tone AS emotionalTone, created_at AS createdAt
      FROM ION_long_term_memory
      WHERE user_id = ?1
      ORDER BY created_at DESC
      LIMIT ?2
    `
  )
    .bind(normalizedUserId, safeLimit)
    .all<MemoryArcEntry>();

  const rows = Array.isArray(result.results) ? result.results : [];
  return rows.reverse();
}

export async function getChatHistoryForUser(env: D1Env, userId: string, limit = 120): Promise<ChatHistoryEntry[]> {
  if (!env.ION_DB) return [];

  const normalizedUserId = normalizeText(userId).slice(0, 120);
  if (!normalizedUserId) return [];

  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const result = await env.ION_DB.prepare(
    `
      SELECT
        id,
        session_id AS sessionId,
        user_id AS userId,
        mode,
        user_text AS userText,
        assistant_text AS assistantText,
        emotional_tone AS emotionalTone,
        created_at AS createdAt
      FROM ION_long_term_memory
      WHERE user_id = ?1
      ORDER BY created_at DESC
      LIMIT ?2
    `
  )
    .bind(normalizedUserId, safeLimit)
    .all<ChatHistoryEntry>();

  const rows = Array.isArray(result.results) ? result.results : [];
  return rows.reverse();
}

export async function clearChatHistoryForUser(env: D1Env, userId: string): Promise<number> {
  if (!env.ION_DB) return 0;

  const normalizedUserId = normalizeText(userId).slice(0, 120);
  if (!normalizedUserId) return 0;

  const result = await env.ION_DB.prepare(
    `DELETE FROM ION_long_term_memory WHERE user_id = ?1`
  )
    .bind(normalizedUserId)
    .run();

  return Number((result as any)?.meta?.changes || 0);
}

export async function getChatPreferences(env: D1Env, userId: string): Promise<ChatPreferences> {
  if (!env.ION_DB) return { ...DEFAULT_CHAT_PREFERENCES };

  const normalizedUserId = normalizeText(userId).slice(0, 120);
  if (!normalizedUserId) return { ...DEFAULT_CHAT_PREFERENCES };

  const result = await env.ION_DB.prepare(
    `
      SELECT
        persist_history AS persistHistory,
        context_carryover AS contextCarryover,
        updated_at AS updatedAt
      FROM ION_chat_preferences
      WHERE user_id = ?1
      LIMIT 1
    `
  )
    .bind(normalizedUserId)
    .first<{ persistHistory: number; contextCarryover: number; updatedAt: string }>();

  if (!result) {
    return { ...DEFAULT_CHAT_PREFERENCES };
  }

  return {
    persistHistory: Number(result.persistHistory) !== 0,
    contextCarryover: Number(result.contextCarryover) !== 0,
    updatedAt: normalizeText(result.updatedAt, DEFAULT_CHAT_PREFERENCES.updatedAt)
  };
}

export async function updateChatPreferences(
  env: D1Env,
  userId: string,
  input: Partial<Pick<ChatPreferences, 'persistHistory' | 'contextCarryover'>>
): Promise<ChatPreferences> {
  if (!env.ION_DB) return { ...DEFAULT_CHAT_PREFERENCES };

  const normalizedUserId = normalizeText(userId).slice(0, 120);
  if (!normalizedUserId) return { ...DEFAULT_CHAT_PREFERENCES };

  const current = await getChatPreferences(env, normalizedUserId);
  const next: ChatPreferences = {
    persistHistory: typeof input.persistHistory === 'boolean' ? input.persistHistory : current.persistHistory,
    contextCarryover: typeof input.contextCarryover === 'boolean' ? input.contextCarryover : current.contextCarryover,
    updatedAt: new Date().toISOString()
  };

  await env.ION_DB.prepare(
    `
      INSERT INTO ION_chat_preferences (user_id, persist_history, context_carryover, updated_at)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(user_id) DO UPDATE SET
        persist_history = excluded.persist_history,
        context_carryover = excluded.context_carryover,
        updated_at = excluded.updated_at
    `
  )
    .bind(normalizedUserId, next.persistHistory ? 1 : 0, next.contextCarryover ? 1 : 0, next.updatedAt)
    .run();

  return next;
}

export async function pruneMemoryOlderThanDays(env: D1Env, retentionDays: number): Promise<number> {
  if (!env.ION_DB) return 0;

  const safeDays = Math.max(7, Math.min(365, Math.floor(retentionDays)));
  const result = await env.ION_DB.prepare(
    `
      DELETE FROM ION_long_term_memory
      WHERE datetime(created_at) < datetime('now', ?1)
    `
  )
    .bind(`-${safeDays} days`)
    .run();

  const meta = (result as any)?.meta;
  return Number(meta?.changes || 0);
}

export async function getLongTermMemoryStats(env: D1Env): Promise<LongTermMemoryStats> {
  if (!env.ION_DB) {
    return {
      totalRows: 0,
      rowsLast24h: 0,
      distinctSessions: 0,
      latestEntryAt: null
    };
  }

  const [totals, recent, latest] = await Promise.all([
    env.ION_DB.prepare(
      `
        SELECT
          COUNT(*) AS totalRows,
          COUNT(DISTINCT session_id) AS distinctSessions
        FROM ION_long_term_memory
      `
    ).first<{ totalRows: number; distinctSessions: number }>(),
    env.ION_DB.prepare(
      `
        SELECT COUNT(*) AS rowsLast24h
        FROM ION_long_term_memory
        WHERE datetime(created_at) >= datetime('now', '-1 day')
      `
    ).first<{ rowsLast24h: number }>(),
    env.ION_DB.prepare(
      `
        SELECT created_at AS latestEntryAt
        FROM ION_long_term_memory
        ORDER BY created_at DESC
        LIMIT 1
      `
    ).first<{ latestEntryAt: string }>()
  ]);

  return {
    totalRows: Number(totals?.totalRows || 0),
    rowsLast24h: Number(recent?.rowsLast24h || 0),
    distinctSessions: Number(totals?.distinctSessions || 0),
    latestEntryAt: latest?.latestEntryAt || null
  };
}
