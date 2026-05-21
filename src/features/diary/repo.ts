import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import type { DiaryEntry, Mood } from './types';

type Row = {
  id: string;
  entry_date: string;
  summary: string | null;
  good: string | null;
  bad: string | null;
  learned: string | null;
  progress: string | null;
  happy: string | null;
  mood: string | null;
  created_at: number;
};

const toEntry = (r: Row): DiaryEntry => ({
  id: r.id,
  entryDate: r.entry_date,
  summary: r.summary,
  good: r.good,
  bad: r.bad,
  learned: r.learned,
  progress: r.progress,
  happy: r.happy,
  mood: (r.mood as Mood) ?? null,
  createdAt: r.created_at,
});

export async function getEntry(date: string = ymd()): Promise<DiaryEntry | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM diary WHERE entry_date = ?`, [date]);
  return row ? toEntry(row) : null;
}

export async function listEntries(): Promise<DiaryEntry[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM diary
     WHERE summary IS NOT NULL OR good IS NOT NULL OR bad IS NOT NULL
       OR learned IS NOT NULL OR progress IS NOT NULL OR happy IS NOT NULL OR mood IS NOT NULL
     ORDER BY entry_date DESC`,
  );
  return rows.map(toEntry);
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM diary WHERE id = ?`, [id]);
}

export async function upsertEntry(date: string, patch: Partial<Omit<DiaryEntry, 'id' | 'entryDate' | 'createdAt'>>): Promise<DiaryEntry> {
  const db = await getDB();
  const existing = await getEntry(date);
  if (existing) {
    const merged = { ...existing, ...patch };
    await db.runAsync(
      `UPDATE diary SET summary=?, good=?, bad=?, learned=?, progress=?, happy=?, mood=? WHERE id=?`,
      [merged.summary, merged.good, merged.bad, merged.learned, merged.progress, merged.happy, merged.mood, existing.id],
    );
    return merged;
  }
  const id = uid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO diary (id, entry_date, summary, good, bad, learned, progress, happy, mood, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, date, patch.summary ?? null, patch.good ?? null, patch.bad ?? null, patch.learned ?? null, patch.progress ?? null, patch.happy ?? null, patch.mood ?? null, now],
  );
  return {
    id,
    entryDate: date,
    summary: patch.summary ?? null,
    good: patch.good ?? null,
    bad: patch.bad ?? null,
    learned: patch.learned ?? null,
    progress: patch.progress ?? null,
    happy: patch.happy ?? null,
    mood: patch.mood ?? null,
    createdAt: now,
  };
}
