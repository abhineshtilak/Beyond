import { getDB, uid } from '@/lib/db';
import type { AffirmationCollection, Affirmation, AffirmationSession } from './types';
import { SEED_COLLECTIONS } from './seeds';

// ─── Row mappers ─────────────────────────────────────────────────────────────

type ColRow = {
  id: string; title: string; emoji: string; cover_color: string;
  category: string; is_custom: number; sort_idx: number; created_at: number;
};
type AffRow = {
  id: string; collection_id: string; body: string; sort_idx: number; created_at: number;
};

const toCollection = (r: ColRow, count = 0, sessions = 0): AffirmationCollection => ({
  id: r.id, title: r.title, emoji: r.emoji, coverColor: r.cover_color,
  category: r.category, isCustom: !!r.is_custom, sortIdx: r.sort_idx,
  createdAt: r.created_at, count, sessionCount: sessions,
});

const toAffirmation = (r: AffRow): Affirmation => ({
  id: r.id, collectionId: r.collection_id, body: r.body,
  sortIdx: r.sort_idx, createdAt: r.created_at,
});

// ─── Seed on first run ───────────────────────────────────────────────────────

export async function ensureSeeded(): Promise<void> {
  const db = await getDB();
  const existing = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM affirmation_collections WHERE is_custom = 0`,
  );
  if ((existing?.n ?? 0) > 0) return; // already seeded

  const now = Date.now();
  for (const col of SEED_COLLECTIONS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO affirmation_collections
         (id, title, emoji, cover_color, category, is_custom, sort_idx, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [col.id, col.title, col.emoji, col.coverColor, col.category, col.sortIdx, now],
    );
    for (let i = 0; i < col.affirmations.length; i++) {
      await db.runAsync(
        `INSERT OR IGNORE INTO affirmations (id, collection_id, body, sort_idx, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [uid(), col.id, col.affirmations[i], i, now],
      );
    }
  }

  // Create the user's custom "My Affirmations" collection
  await db.runAsync(
    `INSERT OR IGNORE INTO affirmation_collections
       (id, title, emoji, cover_color, category, is_custom, sort_idx, created_at)
       VALUES ('my-affirmations', 'My Affirmations', '💖', '#C08090', 'custom', 1, -1, ?)`,
    [now],
  );
}

// ─── Collections ─────────────────────────────────────────────────────────────

export async function listCollections(): Promise<AffirmationCollection[]> {
  await ensureSeeded();
  const db = await getDB();
  const cols = await db.getAllAsync<ColRow>(
    `SELECT * FROM affirmation_collections ORDER BY sort_idx ASC`,
  );
  const out: AffirmationCollection[] = [];
  for (const c of cols) {
    const cnt = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM affirmations WHERE collection_id = ?`, [c.id],
    );
    const sessions = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM affirmation_sessions WHERE collection_id = ?`, [c.id],
    );
    out.push(toCollection(c, cnt?.n ?? 0, sessions?.n ?? 0));
  }
  return out;
}

export async function getCollection(id: string): Promise<AffirmationCollection | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<ColRow>(
    `SELECT * FROM affirmation_collections WHERE id = ?`, [id],
  );
  if (!row) return null;
  const cnt = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM affirmations WHERE collection_id = ?`, [id],
  );
  const sessions = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM affirmation_sessions WHERE collection_id = ?`, [id],
  );
  return toCollection(row, cnt?.n ?? 0, sessions?.n ?? 0);
}

// ─── Affirmations ────────────────────────────────────────────────────────────

export async function listAffirmations(collectionId: string): Promise<Affirmation[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<AffRow>(
    `SELECT * FROM affirmations WHERE collection_id = ? ORDER BY sort_idx ASC`,
    [collectionId],
  );
  const savedIds = await listSavedIds();
  return rows.map((r) => ({ ...toAffirmation(r), saved: savedIds.has(r.id) }));
}

export async function addAffirmation(collectionId: string, body: string): Promise<Affirmation> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const maxRow = await db.getFirstAsync<{ m: number }>(
    `SELECT MAX(sort_idx) as m FROM affirmations WHERE collection_id = ?`, [collectionId],
  );
  const sortIdx = (maxRow?.m ?? -1) + 1;
  await db.runAsync(
    `INSERT INTO affirmations (id, collection_id, body, sort_idx, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, collectionId, body.trim(), sortIdx, now],
  );
  return { id, collectionId, body: body.trim(), sortIdx, createdAt: now };
}

export async function deleteAffirmation(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM affirmations WHERE id = ?`, [id]);
  await db.runAsync(`DELETE FROM affirmation_saves WHERE affirmation_id = ?`, [id]);
}

// ─── Saves ───────────────────────────────────────────────────────────────────

export async function listSavedIds(): Promise<Set<string>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ affirmation_id: string }>(
    `SELECT affirmation_id FROM affirmation_saves`,
  );
  return new Set(rows.map((r) => r.affirmation_id));
}

export async function listSavedAffirmations(): Promise<Affirmation[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<AffRow>(
    `SELECT a.* FROM affirmations a
     INNER JOIN affirmation_saves s ON s.affirmation_id = a.id
     ORDER BY s.saved_at DESC`,
  );
  return rows.map((r) => ({ ...toAffirmation(r), saved: true }));
}

export async function toggleSave(affirmationId: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.getFirstAsync<{ affirmation_id: string }>(
    `SELECT affirmation_id FROM affirmation_saves WHERE affirmation_id = ?`, [affirmationId],
  );
  if (existing) {
    await db.runAsync(`DELETE FROM affirmation_saves WHERE affirmation_id = ?`, [affirmationId]);
    return false;
  } else {
    await db.runAsync(
      `INSERT INTO affirmation_saves (affirmation_id, saved_at) VALUES (?, ?)`,
      [affirmationId, Date.now()],
    );
    return true;
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function recordSession(collectionId: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO affirmation_sessions (id, collection_id, played_at) VALUES (?, ?, ?)`,
    [uid(), collectionId, Date.now()],
  );
}

// ─── Custom collection ───────────────────────────────────────────────────────

export async function createCustomCollection(
  title: string, emoji: string, coverColor: string,
): Promise<AffirmationCollection> {
  await ensureSeeded();
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const maxRow = await db.getFirstAsync<{ m: number }>(
    `SELECT MAX(sort_idx) as m FROM affirmation_collections`,
  );
  const sortIdx = (maxRow?.m ?? 0) + 1;
  await db.runAsync(
    `INSERT INTO affirmation_collections
       (id, title, emoji, cover_color, category, is_custom, sort_idx, created_at)
       VALUES (?, ?, ?, ?, 'custom', 1, ?, ?)`,
    [id, title, emoji, coverColor, sortIdx, now],
  );
  return { id, title, emoji, coverColor, category: 'custom', isCustom: true, sortIdx, createdAt: now, count: 0, sessionCount: 0 };
}
