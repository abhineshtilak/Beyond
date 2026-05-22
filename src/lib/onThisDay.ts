import { getDB } from './db';
import { format } from 'date-fns';

export type OnThisDayEntry = {
  id: string;
  kind: 'realization' | 'diary' | 'journal' | 'dream';
  yearsAgo: number;
  snippet: string;
  date: string; // YYYY-MM-DD
};

type OnThisDayResult = {
  entries: OnThisDayEntry[];
};

/**
 * Fetches memory-lane entries that happened on today's month+day in past years.
 * Checks 1y, 2y, 3y, 5y back. Only returns years that have at least one entry.
 */
export async function getOnThisDay(): Promise<OnThisDayResult> {
  const db = await getDB();
  const today = new Date();
  const mmdd = format(today, 'MM-dd'); // e.g. "05-22"
  const todayYear = today.getFullYear();

  const yearsBack = [1, 2, 3, 5];
  const entries: OnThisDayEntry[] = [];

  for (const y of yearsBack) {
    const targetYear = todayYear - y;
    const targetDate = `${targetYear}-${mmdd}`; // e.g. "2025-05-22"

    // ── Diary ──────────────────────────────────────────────────────────────
    const diary = await db.getFirstAsync<{ id: string; summary: string | null; good: string | null; mood: string | null }>(
      `SELECT id, summary, good, mood FROM diary WHERE entry_date = ?`,
      [targetDate],
    );
    if (diary) {
      const snippet = diary.summary || diary.good || (diary.mood ? `Feeling: ${diary.mood}` : '');
      entries.push({
        id: `diary-${diary.id}`,
        kind: 'diary',
        yearsAgo: y,
        snippet: truncate(snippet, 120),
        date: targetDate,
      });
    }

    // ── Realizations ────────────────────────────────────────────────────────
    // created_at is epoch ms; convert to date string for comparison
    const realizationRows = await db.getAllAsync<{ id: string; content: string; title: string | null; body_html: string | null }>(
      `SELECT id, content, title, body_html FROM realizations
       WHERE date(created_at / 1000, 'unixepoch') = ?
       LIMIT 2`,
      [targetDate],
    );
    for (const r of realizationRows) {
      const snippet = r.title || r.content || stripHtml(r.body_html);
      entries.push({
        id: `realization-${r.id}`,
        kind: 'realization',
        yearsAgo: y,
        snippet: truncate(snippet, 120),
        date: targetDate,
      });
    }

    // ── Journal ─────────────────────────────────────────────────────────────
    const journalRows = await db.getAllAsync<{ id: string; content: string | null; body_html: string | null }>(
      `SELECT id, content, body_html FROM journal_entries
       WHERE entry_date = ?
       LIMIT 2`,
      [targetDate],
    );
    for (const j of journalRows) {
      const snippet = j.content || stripHtml(j.body_html);
      if (!snippet) continue;
      entries.push({
        id: `journal-${j.id}`,
        kind: 'journal',
        yearsAgo: y,
        snippet: truncate(snippet, 120),
        date: targetDate,
      });
    }

    // ── Dreams ──────────────────────────────────────────────────────────────
    const dreamRows = await db.getAllAsync<{ id: string; title: string; description: string | null }>(
      `SELECT id, title, description FROM dreams
       WHERE date(created_at / 1000, 'unixepoch') = ?
       LIMIT 1`,
      [targetDate],
    );
    for (const d of dreamRows) {
      entries.push({
        id: `dream-${d.id}`,
        kind: 'dream',
        yearsAgo: y,
        snippet: truncate(d.title + (d.description ? ` — ${d.description}` : ''), 120),
        date: targetDate,
      });
    }
  }

  return { entries };
}

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return '';
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
