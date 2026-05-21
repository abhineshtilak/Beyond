import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { recalcProgress as recalcGoalProgress } from '@/features/goals/repo';
import * as notifications from '@/lib/notifications';
import type { Task, TaskInput, TaskStatus } from './types';

type Row = {
  id: string;
  title: string;
  notes: string | null;
  category: string | null;
  priority: number;
  due_date: string | null;
  status: string;
  goal_id: string | null;
  reminder_time: string | null;
  notification_id: string | null;
  created_at: number;
  completed_at: number | null;
};

const toTask = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  category: r.category as Task['category'],
  priority: (r.priority as Task['priority']) ?? 2,
  dueDate: r.due_date,
  status: (r.status as TaskStatus) ?? 'pending',
  goalId: r.goal_id,
  reminderTime: r.reminder_time,
  notificationId: r.notification_id,
  createdAt: r.created_at,
  completedAt: r.completed_at,
});

async function scheduleTaskReminder(
  taskId: string,
  title: string,
  dueDate: string | null,
  time: string | null,
  prevNotificationId: string | null,
): Promise<string | null> {
  await notifications.cancel(prevNotificationId);
  if (!dueDate || !time) return null;
  return notifications.scheduleOnce(title, 'Task due today.', dueDate, time);
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDB();
  await markMissed();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM tasks ORDER BY
       CASE status WHEN 'completed' THEN 1 ELSE 0 END,
       COALESCE(due_date, '9999-99-99') ASC,
       priority DESC,
       created_at DESC`,
  );
  return rows.map(toTask);
}

export async function createTask(input: TaskInput): Promise<Task> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO tasks (id, title, notes, category, priority, due_date, status, goal_id, reminder_time, notification_id, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL, ?, NULL)`,
    [
      id,
      input.title.trim(),
      input.notes ?? null,
      input.category ?? null,
      input.priority ?? 2,
      input.dueDate ?? null,
      input.goalId ?? null,
      input.reminderTime ?? null,
      now,
    ],
  );
  const notificationId = await scheduleTaskReminder(id, input.title.trim(), input.dueDate ?? null, input.reminderTime ?? null, null);
  if (notificationId) {
    await db.runAsync(`UPDATE tasks SET notification_id = ? WHERE id = ?`, [notificationId, id]);
  }
  if (input.goalId) await recalcGoalProgress(input.goalId);
  return {
    id,
    title: input.title.trim(),
    notes: input.notes ?? null,
    category: input.category ?? null,
    priority: input.priority ?? 2,
    dueDate: input.dueDate ?? null,
    status: 'pending',
    goalId: input.goalId ?? null,
    reminderTime: input.reminderTime ?? null,
    notificationId,
    createdAt: now,
    completedAt: null,
  };
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const db = await getDB();
  const prev = await db.getFirstAsync<{ goal_id: string | null; notification_id: string | null }>(
    `SELECT goal_id, notification_id FROM tasks WHERE id = ?`,
    [id],
  );
  await db.runAsync(
    `UPDATE tasks SET title = ?, notes = ?, category = ?, priority = ?, due_date = ?, goal_id = ?, reminder_time = ?
     WHERE id = ?`,
    [
      input.title.trim(),
      input.notes ?? null,
      input.category ?? null,
      input.priority ?? 2,
      input.dueDate ?? null,
      input.goalId ?? null,
      input.reminderTime ?? null,
      id,
    ],
  );
  const notificationId = await scheduleTaskReminder(
    id,
    input.title.trim(),
    input.dueDate ?? null,
    input.reminderTime ?? null,
    prev?.notification_id ?? null,
  );
  await db.runAsync(`UPDATE tasks SET notification_id = ? WHERE id = ?`, [notificationId, id]);
  if (prev?.goal_id && prev.goal_id !== input.goalId) await recalcGoalProgress(prev.goal_id);
  if (input.goalId) await recalcGoalProgress(input.goalId);
}

export async function setStatus(id: string, status: TaskStatus): Promise<void> {
  const db = await getDB();
  const completed = status === 'completed' ? Date.now() : null;
  await db.runAsync(
    `UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`,
    [status, completed, id],
  );
  const row = await db.getFirstAsync<{ goal_id: string | null; notification_id: string | null }>(
    `SELECT goal_id, notification_id FROM tasks WHERE id = ?`,
    [id],
  );
  if (status === 'completed' && row?.notification_id) {
    await notifications.cancel(row.notification_id);
    await db.runAsync(`UPDATE tasks SET notification_id = NULL WHERE id = ?`, [id]);
  }
  if (row?.goal_id) await recalcGoalProgress(row.goal_id);
}

export async function postponeTask(id: string, toDate: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE tasks SET status = 'postponed', due_date = ? WHERE id = ?`,
    [toDate, id],
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ goal_id: string | null; notification_id: string | null }>(
    `SELECT goal_id, notification_id FROM tasks WHERE id = ?`,
    [id],
  );
  if (row?.notification_id) await notifications.cancel(row.notification_id);
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  if (row?.goal_id) await recalcGoalProgress(row.goal_id);
}

export async function markMissed(): Promise<void> {
  const db = await getDB();
  const today = ymd();
  await db.runAsync(
    `UPDATE tasks SET status = 'missed'
     WHERE status = 'pending' AND due_date IS NOT NULL AND due_date < ?`,
    [today],
  );
}

export async function todayStats() {
  const db = await getDB();
  const today = ymd();
  const completed = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM tasks WHERE date(completed_at/1000, 'unixepoch', 'localtime') = ?`,
    [today],
  );
  const remaining = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM tasks WHERE status = 'pending' AND (due_date = ? OR due_date IS NULL)`,
    [today],
  );
  return { completed: completed?.c ?? 0, remaining: remaining?.c ?? 0 };
}
