import { getDB, uid } from '@/lib/db';
import type { Attachment } from '@/components/MediaAttachments';
import type { Dream, DreamInput } from './types';

type Row = {
  id: string;
  title: string;
  description: string | null;
  why: string | null;
  image_uri: string | null;
  attachments: string | null;
  created_at: number;
};

const parseAtts = (raw: string | null): Attachment[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

const toDream = (r: Row): Dream => ({
  id: r.id,
  title: r.title,
  description: r.description,
  why: r.why,
  imageUri: r.image_uri,
  attachments: parseAtts(r.attachments),
  createdAt: r.created_at,
});

export async function list(): Promise<Dream[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(`SELECT * FROM dreams ORDER BY created_at DESC`);
  return rows.map(toDream);
}

export async function get(id: string): Promise<Dream | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM dreams WHERE id = ?`, [id]);
  return row ? toDream(row) : null;
}

export async function create(input: DreamInput): Promise<Dream> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const atts = JSON.stringify(input.attachments ?? []);
  await db.runAsync(
    `INSERT INTO dreams (id, title, description, why, image_uri, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.title.trim(), input.description ?? null, input.why ?? null, input.imageUri ?? null, atts, now],
  );
  return {
    id,
    title: input.title.trim(),
    description: input.description ?? null,
    why: input.why ?? null,
    imageUri: input.imageUri ?? null,
    attachments: input.attachments ?? [],
    createdAt: now,
  };
}

export async function update(id: string, patch: Partial<DreamInput>): Promise<void> {
  const db = await getDB();
  const existing = await get(id);
  if (!existing) return;
  const merged = {
    title: patch.title?.trim() ?? existing.title,
    description: patch.description !== undefined ? patch.description : existing.description,
    why: patch.why !== undefined ? patch.why : existing.why,
    imageUri: patch.imageUri !== undefined ? patch.imageUri : existing.imageUri,
    attachments: patch.attachments !== undefined ? patch.attachments : existing.attachments,
  };
  await db.runAsync(
    `UPDATE dreams SET title = ?, description = ?, why = ?, image_uri = ?, attachments = ? WHERE id = ?`,
    [merged.title, merged.description, merged.why, merged.imageUri, JSON.stringify(merged.attachments), id],
  );
}

export async function remove(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM dreams WHERE id = ?`, [id]);
}
