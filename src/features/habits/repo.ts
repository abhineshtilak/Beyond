import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { subDays, differenceInCalendarDays } from 'date-fns';
import * as notifications from '@/lib/notifications';
import { refreshWidgets } from '@/widgets/refresh';
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
  streak_credits: number | null;
  streak_restored_date: string | null;
  duration_mins: number | null;
};

// Populated after junction-table query; default empty
const toHabit = (r: Row, goalIds: string[] = []): Habit => ({
  id: r.id,
  title: r.title,
  icon: (r.icon as HabitIconKey) ?? 'sparkles',
  color: r.color ?? '#A8B89F',
  category: r.category as Habit['category'],
  goalId: goalIds[0] ?? r.goal_id,
  goalIds,
  targetDays: r.target_days ?? 30,
  reminderTime: r.reminder_time,
  reminderDays: r.reminder_days,
  notificationIds: r.notification_ids,
  createdAt: r.created_at,
  archived: !!r.archived,
  streakCredits: r.streak_credits ?? 0,
  streakRestoredDate: r.streak_restored_date,
  durationMins: r.duration_mins ?? 0,
});

async function fetchGoalIds(habitId: string): Promise<string[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ goal_id: string }>(
    `SELECT goal_id FROM habit_goals WHERE habit_id = ?`, [habitId],
  );
  return rows.map((r) => r.goal_id);
}

async function syncHabitGoals(habitId: string, goalIds: string[]): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM habit_goals WHERE habit_id = ?`, [habitId]);
  for (const gid of goalIds) {
    await db.runAsync(`INSERT OR IGNORE INTO habit_goals (habit_id, goal_id) VALUES (?, ?)`, [habitId, gid]);
  }
  // Keep goal_id column in sync with primary goal (first entry)
  await db.runAsync(`UPDATE habits SET goal_id = ? WHERE id = ?`, [goalIds[0] ?? null, habitId]);
}

async function recalcLinkedGoals(habitId: string): Promise<void> {
  const goalIds = await fetchGoalIds(habitId);
  if (goalIds.length === 0) return;
  const { recalcProgress } = await import('@/features/goals/repo');
  await Promise.all(goalIds.map((gid) => recalcProgress(gid)));
}

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
  const habits: Habit[] = [];
  for (const r of rows) {
    const goalIds = await fetchGoalIds(r.id);
    habits.push(toHabit(r, goalIds));
  }
  return habits;
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const reminderDays = input.reminderDays?.length ? input.reminderDays.join(',') : null;
  // Resolve goal IDs — goalIds takes priority over legacy goalId
  const goalIds = input.goalIds ?? (input.goalId ? [input.goalId] : []);
  const primaryGoalId = goalIds[0] ?? null;
  await db.runAsync(
    `INSERT INTO habits (id, title, icon, color, category, goal_id, target_days, reminder_time, reminder_days, notification_ids, duration_mins, created_at, archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0)`,
    [
      id, input.title.trim(), input.icon, input.color, input.category ?? null,
      primaryGoalId, input.targetDays,
      input.reminderTime ?? null, reminderDays,
      input.durationMins ?? 0, now,
    ],
  );
  // Write junction table
  await syncHabitGoals(id, goalIds);
  const habit: Habit = {
    id, title: input.title.trim(), icon: input.icon, color: input.color,
    category: input.category ?? null, goalId: primaryGoalId,
    goalIds,
    targetDays: input.targetDays,
    reminderTime: input.reminderTime ?? null,
    reminderDays,
    notificationIds: null,
    createdAt: now, archived: false,
    streakCredits: 0,
    streakRestoredDate: null,
    durationMins: input.durationMins ?? 0,
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
  const goalIds = input.goalIds ?? (input.goalId !== undefined ? (input.goalId ? [input.goalId] : []) : await fetchGoalIds(id));
  const primaryGoalId = goalIds[0] ?? null;
  await db.runAsync(
    `UPDATE habits SET title = ?, icon = ?, color = ?, category = ?, goal_id = ?, target_days = ?, reminder_time = ?, reminder_days = ?, duration_mins = ? WHERE id = ?`,
    [
      input.title.trim(), input.icon, input.color, input.category ?? null,
      primaryGoalId, input.targetDays,
      input.reminderTime ?? null, reminderDays,
      input.durationMins ?? 0, id,
    ],
  );
  await syncHabitGoals(id, goalIds);
  const updated = await db.getFirstAsync<Row>(`SELECT * FROM habits WHERE id = ?`, [id]);
  if (updated) {
    const habit = toHabit(updated, goalIds);
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
    await recalcLinkedGoals(habitId);
    refreshWidgets('habits');
    return false;
  }
  await db.runAsync(
    `INSERT INTO habit_logs (id, habit_id, log_date, done) VALUES (?, ?, ?, 1)`,
    [uid(), habitId, date, 1],
  );
  await recalcLinkedGoals(habitId);
  // Auto-log into the hour tracker (today only, only if durationMins > 0)
  if (date === ymd()) {
    const habitInfo = await db.getFirstAsync<{
      title: string; category: string | null; duration_mins: number | null;
    }>(`SELECT title, category, duration_mins FROM habits WHERE id = ?`, [habitId]);
    if (habitInfo && (habitInfo.duration_mins ?? 0) > 0) {
      const hourCatMap: Record<string, string> = {
        health: 'health', mind: 'personal', work: 'work', learning: 'learning', personal: 'personal',
      };
      const hourCategory = hourCatMap[habitInfo.category ?? ''] ?? null;
      import('@/features/hours/repo').then(({ autoLogActivity }) =>
        autoLogActivity(habitInfo.title, hourCategory, habitInfo.duration_mins!, date),
      ).catch(() => {});
    }
  }
  // Streak credit hooks (fire-and-forget, non-blocking)
  const doneDates = await loadHabitLogs(habitId, 400);
  const streak = computeStreak(doneDates);
  maybeAwardMilestoneCredit(habitId, streak).catch(() => {});
  maybeAwardRandomCredit(habitId).catch(() => {});
  // Push fresh data to the home-screen widget (fire-and-forget)
  refreshWidgets('habits');
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
  // listHabits already populates goalIds
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

// ─── Streak Saver ────────────────────────────────────────────────────────────

const MAX_CREDITS = 3;
const MILESTONE_DAYS = [7, 30, 100];

/** Check if yesterday was missed (for streak-at-risk detection). */
export function isStreakAtRisk(doneDates: Set<string>): boolean {
  const yesterday = ymd(subDays(new Date(), 1));
  const today = ymd();
  // At risk only if yesterday is not logged AND today is not yet logged
  return !doneDates.has(yesterday) && !doneDates.has(today);
}

/** Award a milestone credit if this check-in hits a milestone day. */
async function maybeAwardMilestoneCredit(habitId: string, streak: number): Promise<void> {
  if (!MILESTONE_DAYS.includes(streak)) return;
  const db = await getDB();
  const row = await db.getFirstAsync<{ streak_credits: number }>(
    `SELECT streak_credits FROM habits WHERE id = ?`, [habitId],
  );
  const current = row?.streak_credits ?? 0;
  if (current < MAX_CREDITS) {
    await db.runAsync(
      `UPDATE habits SET streak_credits = ? WHERE id = ?`,
      [Math.min(current + 1, MAX_CREDITS), habitId],
    );
  }
}

/** Called from toggleCheckIn (true path) to potentially award random credit. */
async function maybeAwardRandomCredit(habitId: string): Promise<void> {
  if (Math.random() > 0.01) return; // 1% chance
  const db = await getDB();
  const row = await db.getFirstAsync<{ streak_credits: number }>(
    `SELECT streak_credits FROM habits WHERE id = ?`, [habitId],
  );
  const current = row?.streak_credits ?? 0;
  if (current < MAX_CREDITS) {
    await db.runAsync(`UPDATE habits SET streak_credits = ? WHERE id = ?`, [current + 1, habitId]);
  }
}

/**
 * Use a streak saver credit to restore yesterday's log.
 * Returns true if successful, false if no credits.
 */
export async function useStreakCredit(habitId: string): Promise<boolean> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ streak_credits: number }>(
    `SELECT streak_credits FROM habits WHERE id = ?`, [habitId],
  );
  const credits = row?.streak_credits ?? 0;
  if (credits <= 0) return false;
  const yesterday = ymd(subDays(new Date(), 1));
  // Insert yesterday's log
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ?`, [habitId, yesterday],
  );
  if (!existing) {
    await db.runAsync(
      `INSERT INTO habit_logs (id, habit_id, log_date, done) VALUES (?, ?, ?, 1)`,
      [uid(), habitId, yesterday, 1],
    );
  }
  await db.runAsync(
    `UPDATE habits SET streak_credits = ?, streak_restored_date = ? WHERE id = ?`,
    [credits - 1, yesterday, habitId],
  );
  return true;
}

/**
 * Award a credit from writing a realization (cross-feature hook).
 */
export async function awardRealizationCredit(habitId: string): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ streak_credits: number }>(
    `SELECT streak_credits FROM habits WHERE id = ?`, [habitId],
  );
  const current = row?.streak_credits ?? 0;
  if (current < MAX_CREDITS) {
    await db.runAsync(`UPDATE habits SET streak_credits = ? WHERE id = ?`, [current + 1, habitId]);
  }
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
