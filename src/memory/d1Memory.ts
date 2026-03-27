import type { D1Database } from "@cloudflare/workers-types";

type D1Env = {
  ION_DB?: D1Database;
};

export interface MemoryTurnRecord {
  sessionId: string;
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

export async function ensureIONMemorySchema(env: D1Env): Promise<void> {
  if (!env.ION_DB) return;

  await env.ION_DB.exec(`
    CREATE TABLE IF NOT EXISTS ION_long_term_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      user_text TEXT NOT NULL,
      assistant_text TEXT NOT NULL,
      emotional_tone TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ION_ltm_session_created
      ON ION_long_term_memory(session_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ION_ltm_created
      ON ION_long_term_memory(created_at DESC);
  `);
}

export async function saveMemoryTurn(env: D1Env, turn: MemoryTurnRecord): Promise<void> {
  if (!env.ION_DB) return;

  const sessionId = normalizeText(turn.sessionId, "anon").slice(0, 120);
  const mode = normalizeText(turn.mode, "auto").slice(0, 64);
  const userText = normalizeText(turn.userText).slice(0, 4000);
  const assistantText = normalizeText(turn.assistantText).slice(0, 8000);
  const emotionalTone = normalizeText(turn.emotionalTone).slice(0, 80);
  if (!userText || !assistantText) return;

  await env.ION_DB.prepare(
    `
      INSERT INTO ION_long_term_memory (
        session_id, mode, user_text, assistant_text, emotional_tone
      ) VALUES (?1, ?2, ?3, ?4, ?5)
    `
  )
    .bind(sessionId, mode, userText, assistantText, emotionalTone)
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
