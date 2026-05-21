import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { subDays, differenceInCalendarDays } from 'date-fns';
import * as notifications from '@/lib/notifications';
import type { Habit, HabitInput, HabitWithStats, HabitIconKey } from './types';

type Row = {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
  category: string | null;
  goal_id: string | null;
  target_days: number | null;
  reminder_time: string | null;
  reminder_days: string | null;
  notification_ids: string | null;
  created_at: number;
  archived: number;
};

const toHabit = (r: Row): Habit => ({
  id: r.id,
  title: r.title,
  icon: (r.icon as HabitIconKey) ?? 'sparkles',
  color: r.color ?? '#A8B89F',
  category: r.category as Habit['category'],
  goalId: r.goal_id,
  targetDays: r.target_days ?? 30,
  reminderTime: r.reminder_time,
  reminderDays: r.reminder_days,
  notificationIds: r.notification_ids,
  createdAt: r.created_at,
  archived: !!r.archived,
});

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

async function reschedule(habit: Habit): Promise<string[]> {
  await notifications.cancelMany(parseIds(habit.notificationIds));
  if (!habit.reminderTime || !habit.reminderDays) return [];
  const days = habit.reminderDays.split(',').map(Number).filter((n) => !isNaN(n));
  if (days.length === 0) return [];
  const ids = await notifications.scheduleWeekly(
    `${habit.title}`,
    'Time for your habit. Small step today.',
    habit.reminderTime,
    days,
  );
  return ids;
}

export async function listHabits(): Promise<Habit[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM habits WHERE archived = 0 ORDER BY created_at ASC`,
  );
  return rows.map(toHabit);
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const reminderDays = input.reminderDays?.length ? input.reminderDays.join(',') : null;
  await db.runAsync(
    `INSERT INTO habits (id, title, icon, color, category, goal_id, target_days, reminder_time, reminder_days, notification_ids, created_at, archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0)`,
    [
      id, input.title.trim(), input.icon, input.color, input.category ?? null,
      input.goalId ?? null, input.targetDays,
      input.reminderTime ?? null, reminderDays, now,
    ],
  );
  const habit: Habit = {
    id, title: input.title.trim(), icon: input.icon, color: input.color,
    category: input.category ?? null, goalId: input.goalId ?? null,
    targetDays: input.targetDays,
    reminderTime: input.reminderTime ?? null,
    reminderDays,
    notificationIds: null,
    createdAt: now, archived: false,
  };
  const ids = await reschedule(habit);
  if (ids.length) {
    await db.runAsync(`UPDATE habits SET notification_ids = ? WHERE id = ?`, [JSON.stringify(ids), id]);
    habit.notificationIds = JSON.stringify(ids);
  }
  return habit;
}

export async function updateHabit(id: string, input: HabitInput): Promise<void> {
  const db = await getDB();
  const reminderDays = input.reminderDays?.length ? input.reminderDays.join(',') : null;
  await db.runAsync(
    `UPDATE habits SET title = ?, icon = ?, color = ?, category = ?, goal_id = ?, target_days = ?, reminder_time = ?, reminder_days = ? WHERE id = ?`,
    [
      input.title.trim(), input.icon, input.color, input.category ?? null,
      input.goalId ?? null, input.targetDays,
      input.reminderTime ?? null, reminderDays, id,
    ],
  );
  const updated = await db.getFirstAsync<Row>(`SELECT * FROM habits WHERE id = ?`, [id]);
  if (updated) {
    const habit = toHabit(updated);
    const ids = await reschedule(habit);
    await db.runAsync(`UPDATE habits SET notification_ids = ? WHERE id = ?`, [ids.length ? JSON.stringify(ids) : null, id]);
  }
}

export async function archiveHabit(id: string): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM habits WHERE id = ?`, [id]);
  if (row) await notifications.cancelMany(parseIds(row.notification_ids));
  await db.runAsync(`UPDATE habits SET archived = 1, notification_ids = NULL WHERE id = ?`, [id]);
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<Row>(`SELECT * FROM habits WHERE id = ?`, [id]);
  if (row) await notifications.cancelMany(parseIds(row.notification_ids));
  await db.runAsync(`DELETE FROM habits WHERE id = ?`, [id]);
}

export async function toggleCheckIn(habitId: string, date: string = ymd()): Promise<boolean> {
  const db = await getDB();
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ?`,
    [habitId, date],
  );
  if (existing) {
    await db.runAsync(`DELETE FROM habit_logs WHERE id = ?`, [existing.id]);
    return false;
  }
  await db.runAsync(
    `INSERT INTO habit_logs (id, habit_id, log_date, done) VALUES (?, ?, ?, 1)`,
    [uid(), habitId, date, 1],
  );
  return true;
}

export async function loadHabitLogs(habitId: string, sinceDays: number): Promise<Set<string>> {
  const db = await getDB();
  const since = ymd(subDays(new Date(), Math.max(sinceDays, 30)));
  const rows = await db.getAllAsync<{ log_date: string }>(
    `SELECT log_date FROM habit_logs WHERE habit_id = ? AND log_date >= ? AND done = 1`,
    [habitId, since],
  );
  return new Set(rows.map((r) => r.log_date));
}

export function computeStreak(doneDates: Set<string>): number {
  let streak = 0;
  let cursor = new Date();
  while (doneDates.has(ymd(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function computeSuccessRate(doneDates: Set<string>, windowDays: number): number {
  if (windowDays <= 0) return 0;
  let hits = 0;
  for (let i = 0; i < windowDays; i++) {
    if (doneDates.has(ymd(subDays(new Date(), i)))) hits++;
  }
  return Math.round((hits / windowDays) * 100);
}

export async function listWithStats(): Promise<HabitWithStats[]> {
  const habits = await listHabits();
  const today = ymd();
  const out: HabitWithStats[] = [];
  for (const h of habits) {
    const doneDates = await loadHabitLogs(h.id, Math.max(h.targetDays, 180));
    const daysSinceStart = differenceInCalendarDays(new Date(), new Date(h.createdAt)) + 1;
    out.push({
      ...h,
      doneToday: doneDates.has(today),
      streak: computeStreak(doneDates),
      doneDates,
      successRate: computeSuccessRate(doneDates, h.targetDays),
      daysSinceStart,
    });
  }
  return out;
}

export async function todayHabitStats() {
  const db = await getDB();
  const today = ymd();
  const total = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM habits WHERE archived = 0`,
  );
  const done = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(DISTINCT habit_id) as c FROM habit_logs WHERE log_date = ? AND done = 1`,
    [today],
  );
  return { total: total?.c ?? 0, done: done?.c ?? 0 };
}
