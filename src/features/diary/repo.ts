import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { subDays } from 'date-fns';
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

// ─── Reflection quality & streak ─────────────────────────────────────────────

/**
 * A day counts as a "quality reflection" if the user did at least one of:
 *   1. Filled 2+ diary prompts  (good/bad/learned/progress/happy)
 *   2. Wrote a meaningful journal entry  (content > 80 chars)
 *   3. Added a realization on that date
 *
 * This is deliberately higher bar than "did something" — rewards depth, not
 * frequency. Used to drive the reflection streak on the home screen.
 */
export async function hasQualityReflection(date: string): Promise<boolean> {
  const db = await getDB();

  // 1. Diary — 2+ prompts filled
  const diaryRow = await db.getFirstAsync<Row>(`SELECT * FROM diary WHERE entry_date = ?`, [date]);
  if (diaryRow) {
    const filled = [diaryRow.good, diaryRow.bad, diaryRow.learned, diaryRow.progress, diaryRow.happy]
      .filter((v) => v && v.trim().length > 0).length;
    if (filled >= 2) return true;
    // Or a meaningful summary
    if (diaryRow.summary && diaryRow.summary.trim().length > 80) return true;
  }

  // 2. Journal entry with substantial content
  const journalRow = await db.getFirstAsync<{ content: string | null; body_html: string | null }>(
    `SELECT content, body_html FROM journal_entries WHERE entry_date = ? LIMIT 1`,
    [date],
  );
  if (journalRow) {
    const text = journalRow.content ?? (journalRow.body_html ?? '').replace(/<[^>]+>/g, '');
    if (text.trim().length > 80) return true;
  }

  // 3. Any realization written on this date
  const dateStart = new Date(date).getTime();
  const dateEnd   = dateStart + 86400000;
  const realizationRow = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM realizations WHERE created_at >= ? AND created_at < ? LIMIT 1`,
    [dateStart, dateEnd],
  );
  if (realizationRow) return true;

  return false;
}

/**
 * Count consecutive days (ending yesterday) where the user had a quality
 * reflection. Today's entry isn't required to keep the streak alive.
 */
export async function reflectionStreak(): Promise<number> {
  const today = new Date();
  let count = 0;

  for (let i = 1; i <= 365; i++) {
    const date = ymd(subDays(today, i));
    const quality = await hasQualityReflection(date);
    if (quality) {
      count++;
    } else {
      break;
    }
  }

  // Also check if today already has a quality reflection (so streak shows live)
  const todayQuality = await hasQualityReflection(ymd(today));
  if (todayQuality && count === 0) return 1;
  if (todayQuality) return count + 1;

  return count;
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
