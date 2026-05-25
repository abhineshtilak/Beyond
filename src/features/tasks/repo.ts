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
  duration_mins: number | null;
};

const toTask = (r: Row, goalIds: string[] = []): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  category: r.category as Task['category'],
  priority: (r.priority as Task['priority']) ?? 2,
  dueDate: r.due_date,
  status: (r.status as TaskStatus) ?? 'pending',
  goalId: goalIds[0] ?? r.goal_id,
  goalIds,
  reminderTime: r.reminder_time,
  notificationId: r.notification_id,
  createdAt: r.created_at,
  completedAt: r.completed_at,
  durationMins: r.duration_mins ?? 0,
});

async function fetchTaskGoalIds(taskId: string): Promise<string[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ goal_id: string }>(
    `SELECT goal_id FROM task_goals WHERE task_id = ?`, [taskId],
  );
  return rows.map((r) => r.goal_id);
}

async function syncTaskGoals(taskId: string, goalIds: string[]): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM task_goals WHERE task_id = ?`, [taskId]);
  for (const gid of goalIds) {
    await db.runAsync(`INSERT OR IGNORE INTO task_goals (task_id, goal_id) VALUES (?, ?)`, [taskId, gid]);
  }
  await db.runAsync(`UPDATE tasks SET goal_id = ? WHERE id = ?`, [goalIds[0] ?? null, taskId]);
}

async function recalcAllTaskGoals(taskId: string): Promise<void> {
  const goalIds = await fetchTaskGoalIds(taskId);
  await Promise.all(goalIds.map((gid) => recalcGoalProgress(gid)));
}

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
  const tasks: Task[] = [];
  for (const r of rows) {
    const goalIds = await fetchTaskGoalIds(r.id);
    tasks.push(toTask(r, goalIds));
  }
  return tasks;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const goalIds = input.goalIds ?? (input.goalId ? [input.goalId] : []);
  const primaryGoalId = goalIds[0] ?? null;
  await db.runAsync(
    `INSERT INTO tasks (id, title, notes, category, priority, due_date, status, goal_id, reminder_time, notification_id, duration_mins, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL, ?, ?, NULL)`,
    [
      id,
      input.title.trim(),
      input.notes ?? null,
      input.category ?? null,
      input.priority ?? 2,
      input.dueDate ?? null,
      primaryGoalId,
      input.reminderTime ?? null,
      input.durationMins ?? 0,
      now,
    ],
  );
  await syncTaskGoals(id, goalIds);
  const notificationId = await scheduleTaskReminder(id, input.title.trim(), input.dueDate ?? null, input.reminderTime ?? null, null);
  if (notificationId) {
    await db.runAsync(`UPDATE tasks SET notification_id = ? WHERE id = ?`, [notificationId, id]);
  }
  await Promise.all(goalIds.map((gid) => recalcGoalProgress(gid)));
  return {
    id,
    title: input.title.trim(),
    notes: input.notes ?? null,
    category: input.category ?? null,
    priority: input.priority ?? 2,
    dueDate: input.dueDate ?? null,
    status: 'pending',
    goalId: primaryGoalId,
    goalIds,
    reminderTime: input.reminderTime ?? null,
    notificationId,
    createdAt: now,
    completedAt: null,
    durationMins: input.durationMins ?? 0,
  };
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const db = await getDB();
  const prev = await db.getFirstAsync<{ notification_id: string | null }>(
    `SELECT notification_id FROM tasks WHERE id = ?`, [id],
  );
  const prevGoalIds = await fetchTaskGoalIds(id);
  const goalIds = input.goalIds ?? (input.goalId !== undefined ? (input.goalId ? [input.goalId] : []) : prevGoalIds);
  const primaryGoalId = goalIds[0] ?? null;
  await db.runAsync(
    `UPDATE tasks SET title = ?, notes = ?, category = ?, priority = ?, due_date = ?, goal_id = ?, reminder_time = ?, duration_mins = ?
     WHERE id = ?`,
    [
      input.title.trim(),
      input.notes ?? null,
      input.category ?? null,
      input.priority ?? 2,
      input.dueDate ?? null,
      primaryGoalId,
      input.reminderTime ?? null,
      input.durationMins ?? 0,
      id,
    ],
  );
  await syncTaskGoals(id, goalIds);
  const notificationId = await scheduleTaskReminder(
    id, input.title.trim(), input.dueDate ?? null, input.reminderTime ?? null, prev?.notification_id ?? null,
  );
  await db.runAsync(`UPDATE tasks SET notification_id = ? WHERE id = ?`, [notificationId, id]);
  // Recalc all old + new goals
  const allGoals = Array.from(new Set([...prevGoalIds, ...goalIds]));
  await Promise.all(allGoals.map((gid) => recalcGoalProgress(gid)));
}

export async function setStatus(id: string, status: TaskStatus): Promise<void> {
  const db = await getDB();
  const completed = status === 'completed' ? Date.now() : null;
  await db.runAsync(
    `UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`,
    [status, completed, id],
  );
  const row = await db.getFirstAsync<{
    notification_id: string | null;
    title: string;
    category: string | null;
    duration_mins: number | null;
  }>(`SELECT notification_id, title, category, duration_mins FROM tasks WHERE id = ?`, [id]);
  if (status === 'completed') {
    if (row?.notification_id) {
      await notifications.cancel(row.notification_id);
      await db.runAsync(`UPDATE tasks SET notification_id = NULL WHERE id = ?`, [id]);
    }
    // Auto-log to hour tracker if duration is set
    if (row && (row.duration_mins ?? 0) > 0) {
      const taskCatMap: Record<string, string> = {
        work: 'work', health: 'health', learning: 'learning',
        personal: 'personal', finance: 'finance', other: 'other',
      };
      const hourCategory = taskCatMap[row.category ?? ''] ?? null;
      import('@/features/hours/repo').then(({ autoLogActivity }) =>
        autoLogActivity(row.title, hourCategory, row.duration_mins!, ymd()),
      ).catch(() => {});
    }
  }
  await recalcAllTaskGoals(id);
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
  const row = await db.getFirstAsync<{ notification_id: string | null }>(
    `SELECT notification_id FROM tasks WHERE id = ?`, [id],
  );
  const goalIds = await fetchTaskGoalIds(id);
  if (row?.notification_id) await notifications.cancel(row.notification_id);
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  // task_goals cascade-deletes automatically; recalc affected goals
  await Promise.all(goalIds.map((gid) => recalcGoalProgress(gid)));
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
