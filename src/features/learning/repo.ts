import { getDB, uid } from '@/lib/db';
import * as notifications from '@/lib/notifications';
import type { LearningTopic, LearningInput, LearningStatus, Resource } from './types';

type Row = {
  id: string;
  title: string;
  category: string | null;
  progress: number;
  notes: string | null;
  resources: string | null;
  target_date: string | null;
  status: string | null;
  goal_id: string | null;
  reminder_time: string | null;
  reminder_days: string | null;
  notification_ids: string | null;
  created_at: number;
};

const parseResources = (raw: string | null): Resource[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

const parseIds = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

const toTopic = (r: Row): LearningTopic => ({
  id: r.id,
  title: r.title,
  category: r.category,
  progress: r.progress ?? 0,
  notes: r.notes,
  resources: parseResources(r.resources),
  targetDate: r.target_date,
  status: (r.status as LearningStatus) ?? 'active',
  goalId: r.goal_id,
  reminderTime: r.reminder_time,
  reminderDays: r.reminder_days,
  notificationIds: r.notification_ids,
  createdAt: r.created_at,
});

async function reschedule(topic: LearningTopic): Promise<string[]> {
  await notifications.cancelMany(parseIds(topic.notificationIds));
  if (!topic.reminderTime || !topic.reminderDays) return [];
  const days = topic.reminderDays.split(',').map(Number).filter((n) => !isNaN(n));
  if (days.length === 0) return [];
  return notifications.scheduleWeekly(
    `Time to learn: ${topic.title}`,
    'Small daily reps make the difference. Open and continue.',
    topic.reminderTime,
    days,
  );
}

export async function list(): Promise<LearningTopic[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM learning ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
       created_at DESC`,
  );
  return rows.map(toTopic);
}

export async function get(id: string): Promise<LearningTopic | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM learning WHERE id = ?`, [id]);
  return row ? toTopic(row) : null;
}

export async function create(input: LearningInput): Promise<LearningTopic> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const reminderDays = input.reminderDays?.length ? input.reminderDays.join(',') : null;
  await db.runAsync(
    `INSERT INTO learning (id, title, category, progress, notes, resources, target_date, status, goal_id, reminder_time, reminder_days, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.title.trim(), input.category ?? null,
      input.progress ?? 0, input.notes ?? null,
      JSON.stringify(input.resources ?? []),
      input.targetDate ?? null, input.status ?? 'active',
      input.goalId ?? null,
      input.reminderTime ?? null, reminderDays,
      now,
    ],
  );
  const topic = (await get(id))!;
  const ids = await reschedule(topic);
  if (ids.length) {
    await db.runAsync(`UPDATE learning SET notification_ids = ? WHERE id = ?`, [JSON.stringify(ids), id]);
  }
  return (await get(id))!;
}

export async function update(id: string, patch: Partial<LearningInput>): Promise<void> {
  const db = await getDB();
  const existing = await get(id);
  if (!existing) return;
  const reminderDays =
    patch.reminderDays !== undefined
      ? (patch.reminderDays?.length ? patch.reminderDays.join(',') : null)
      : existing.reminderDays;
  const merged = {
    title: patch.title?.trim() ?? existing.title,
    category: patch.category !== undefined ? patch.category : existing.category,
    progress: patch.progress !== undefined ? patch.progress : existing.progress,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    resources: patch.resources !== undefined ? patch.resources : existing.resources,
    targetDate: patch.targetDate !== undefined ? patch.targetDate : existing.targetDate,
    status: patch.status ?? existing.status,
    goalId: patch.goalId !== undefined ? patch.goalId : existing.goalId,
    reminderTime: patch.reminderTime !== undefined ? patch.reminderTime : existing.reminderTime,
    reminderDays,
  };
  await db.runAsync(
    `UPDATE learning SET title=?, category=?, progress=?, notes=?, resources=?, target_date=?, status=?, goal_id=?, reminder_time=?, reminder_days=? WHERE id=?`,
    [
      merged.title, merged.category, merged.progress, merged.notes,
      JSON.stringify(merged.resources),
      merged.targetDate, merged.status, merged.goalId,
      merged.reminderTime, merged.reminderDays,
      id,
    ],
  );
  const updated = (await get(id))!;
  const ids = await reschedule(updated);
  await db.runAsync(`UPDATE learning SET notification_ids = ? WHERE id = ?`, [ids.length ? JSON.stringify(ids) : null, id]);
}

export async function remove(id: string): Promise<void> {
  const db = await getDB();
  const existing = await get(id);
  if (existing?.notificationIds) await notifications.cancelMany(parseIds(existing.notificationIds));
  await db.runAsync(`DELETE FROM learning WHERE id = ?`, [id]);
}
