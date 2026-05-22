import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { subDays } from 'date-fns';
import type { Attachment } from '@/components/MediaAttachments';
import type { JournalEntry, JournalInput, Mood } from './types';

type Row = {
  id: string;
  entry_date: string;
  created_at: number;
  updated_at: number;
  body_html: string | null;
  content: string | null;
  attachments: string | null;
  prompt_key: string | null;
  mood: string | null;
  starred: number;
};

const parseAtts = (raw: string | null): Attachment[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

const toEntry = (r: Row): JournalEntry => ({
  id: r.id,
  entryDate: r.entry_date,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  bodyHtml: r.body_html,
  content: r.content ?? '',
  attachments: parseAtts(r.attachments),
  promptKey: r.prompt_key,
  mood: (r.mood as Mood) ?? null,
  starred: !!r.starred,
});

export async function list(limit = 200): Promise<JournalEntry[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(toEntry);
}

export async function listForDate(date: string): Promise<JournalEntry[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM journal_entries WHERE entry_date = ? ORDER BY created_at DESC`,
    [date],
  );
  return rows.map(toEntry);
}

export async function get(id: string): Promise<JournalEntry | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM journal_entries WHERE id = ?`, [id]);
  return row ? toEntry(row) : null;
}

export async function create(input: JournalInput, date?: string): Promise<JournalEntry> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const entryDate = date ?? ymd();
  await db.runAsync(
    `INSERT INTO journal_entries (id, entry_date, created_at, updated_at, body_html, content, attachments, prompt_key, mood, starred)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      entryDate,
      now,
      now,
      input.bodyHtml ?? null,
      input.content ?? '',
      JSON.stringify(input.attachments ?? []),
      input.promptKey ?? null,
      input.mood ?? null,
    ],
  );
  return (await get(id))!;
}

export async function update(id: string, patch: JournalInput): Promise<void> {
  const db = await getDB();
  const existing = await get(id);
  if (!existing) return;
  const merged = {
    bodyHtml: patch.bodyHtml !== undefined ? patch.bodyHtml : existing.bodyHtml,
    content: patch.content !== undefined ? patch.content : existing.content,
    attachments: patch.attachments !== undefined ? patch.attachments : existing.attachments,
    promptKey: patch.promptKey !== undefined ? patch.promptKey : existing.promptKey,
    mood: patch.mood !== undefined ? patch.mood : existing.mood,
  };
  await db.runAsync(
    `UPDATE journal_entries SET body_html = ?, content = ?, attachments = ?, prompt_key = ?, mood = ?, updated_at = ? WHERE id = ?`,
    [
      merged.bodyHtml,
      merged.content,
      JSON.stringify(merged.attachments),
      merged.promptKey,
      merged.mood,
      Date.now(),
      id,
    ],
  );
}

export async function toggleStar(id: string): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ starred: number }>(`SELECT starred FROM journal_entries WHERE id = ?`, [id]);
  if (!row) return;
  await db.runAsync(`UPDATE journal_entries SET starred = ? WHERE id = ?`, [row.starred ? 0 : 1, id]);
}

export async function remove(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM journal_entries WHERE id = ?`, [id]);
}

export async function removeMany(ids: string[]): Promise<void> {
  const db = await getDB();
  for (const id of ids) await db.runAsync(`DELETE FROM journal_entries WHERE id = ?`, [id]);
}

export async function streak(): Promise<number> {
  const db = await getDB();
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 1000; i++) {
    const d = ymd(subDays(today, i));
    const row = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM journal_entries WHERE entry_date = ?`,
      [d],
    );
    if ((row?.c ?? 0) > 0) {
      count++;
    } else {
      // Allow today to be empty without breaking streak
      if (i === 0) continue;
      break;
    }
  }
  return count;
}

export async function todayCount(): Promise<number> {
  const db = await getDB();
  const today = ymd();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM journal_entries WHERE entry_date = ?`,
    [today],
  );
  return row?.c ?? 0;
}
