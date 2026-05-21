import { getDB, uid } from '@/lib/db';
import type { Attachment } from '@/components/MediaAttachments';
import type { Realization, RealizationInput, RealizationKind } from './types';

type Row = {
  id: string;
  title: string | null;
  content: string;
  body_html: string | null;
  attachments: string | null;
  kind: string;
  created_at: number;
};

const parseAttachments = (raw: string | null): Attachment[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toItem = (r: Row): Realization => ({
  id: r.id,
  title: r.title,
  content: r.content,
  bodyHtml: r.body_html,
  attachments: parseAttachments(r.attachments),
  kind: (r.kind as RealizationKind) ?? 'realization',
  createdAt: r.created_at,
});

export async function list(): Promise<Realization[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(`SELECT * FROM realizations ORDER BY created_at DESC`);
  return rows.map(toItem);
}

export async function get(id: string): Promise<Realization | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM realizations WHERE id = ?`, [id]);
  return row ? toItem(row) : null;
}

export async function search(query: string, kind: RealizationKind | null): Promise<Realization[]> {
  const db = await getDB();
  let sql = `SELECT * FROM realizations WHERE 1=1`;
  const params: any[] = [];
  if (query.trim()) {
    sql += ` AND (content LIKE ? OR title LIKE ?)`;
    const q = `%${query.trim()}%`;
    params.push(q, q);
  }
  if (kind) {
    sql += ` AND kind = ?`;
    params.push(kind);
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = await db.getAllAsync<Row>(sql, params);
  return rows.map(toItem);
}

export async function create(input: RealizationInput): Promise<Realization> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const attachments = JSON.stringify(input.attachments ?? []);
  await db.runAsync(
    `INSERT INTO realizations (id, title, content, body_html, attachments, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.title ?? null, input.content, input.bodyHtml ?? null, attachments, input.kind, now],
  );
  return { id, title: input.title ?? null, content: input.content, bodyHtml: input.bodyHtml ?? null, attachments: input.attachments ?? [], kind: input.kind, createdAt: now };
}

export async function update(id: string, input: RealizationInput): Promise<void> {
  const db = await getDB();
  const attachments = JSON.stringify(input.attachments ?? []);
  await db.runAsync(
    `UPDATE realizations SET title = ?, content = ?, body_html = ?, attachments = ?, kind = ? WHERE id = ?`,
    [input.title ?? null, input.content, input.bodyHtml ?? null, attachments, input.kind, id],
  );
}

export async function remove(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM realizations WHERE id = ?`, [id]);
}

export async function removeMany(ids: string[]): Promise<void> {
  const db = await getDB();
  for (const id of ids) {
    await db.runAsync(`DELETE FROM realizations WHERE id = ?`, [id]);
  }
}
