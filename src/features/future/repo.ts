import { getDB, uid } from '@/lib/db';
import type { FuturePlan, FuturePlanInput } from './types';

type Row = {
  id: string;
  title: string;
  description: string | null;
  planned_date: string | null;
  image_uri: string | null;
  created_at: number;
};

const toPlan = (r: Row): FuturePlan => ({
  id: r.id,
  title: r.title,
  description: r.description,
  plannedDate: r.planned_date,
  imageUri: r.image_uri,
  createdAt: r.created_at,
});

export async function list(): Promise<FuturePlan[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM future_plans
     ORDER BY COALESCE(planned_date, '9999-99-99') ASC, created_at DESC`,
  );
  return rows.map(toPlan);
}

export async function get(id: string): Promise<FuturePlan | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM future_plans WHERE id = ?`, [id]);
  return row ? toPlan(row) : null;
}

export async function create(input: FuturePlanInput): Promise<FuturePlan> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO future_plans (id, title, description, planned_date, image_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.title.trim(), input.description ?? null, input.plannedDate ?? null, input.imageUri ?? null, now],
  );
  return {
    id,
    title: input.title.trim(),
    description: input.description ?? null,
    plannedDate: input.plannedDate ?? null,
    imageUri: input.imageUri ?? null,
    createdAt: now,
  };
}

export async function update(id: string, patch: Partial<FuturePlanInput>): Promise<void> {
  const db = await getDB();
  const existing = await get(id);
  if (!existing) return;
  const merged = {
    title: patch.title?.trim() ?? existing.title,
    description: patch.description !== undefined ? patch.description : existing.description,
    plannedDate: patch.plannedDate !== undefined ? patch.plannedDate : existing.plannedDate,
    imageUri: patch.imageUri !== undefined ? patch.imageUri : existing.imageUri,
  };
  await db.runAsync(
    `UPDATE future_plans SET title = ?, description = ?, planned_date = ?, image_uri = ? WHERE id = ?`,
    [merged.title, merged.description, merged.plannedDate, merged.imageUri, id],
  );
}

export async function remove(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM future_plans WHERE id = ?`, [id]);
}
