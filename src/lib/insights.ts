import { getDB } from './db';
import { subDays, startOfWeek } from 'date-fns';
import { ymd } from './date';

export type MoodCount = { mood: string; count: number };
export type WeekCount = { weekStart: string; count: number };
export type DayCount = { dayName: string; count: number };

export type HabitStat = {
  id: string;
  title: string;
  color: string;
  streak: number;
  rate30: number; // % done in last 30 days
};

export type InsightsData = {
  // Journal writing
  journalTotal: number;
  journalWeeks: WeekCount[];   // last 12 weeks
  journalBestDay: DayCount[];  // Mon-Sun

  // Mood
  moodLast30: MoodCount[];

  // Habits
  habitStats: HabitStat[];

  // Goals
  goalsActive: number;
  goalsCompleted: number;
  goalsTotal: number;

  // Realizations
  realizationsTotal: number;

  // Writing streak (from journal)
  currentStreak: number;
  longestStreak: number;
};

export async function computeInsights(): Promise<InsightsData> {
  const db = await getDB();
  const today = new Date();
  const todayStr = ymd(today);

  // ─── Journal total ────────────────────────────────────────────────────────
  const jtRow = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM journal_entries`,
  );
  const journalTotal = jtRow?.c ?? 0;

  // ─── Journal per-week for last 12 weeks (group in JS to avoid SQLite/ISO week mismatch)
  const w12Start = ymd(subDays(today, 12 * 7));
  const journalDateRows = await db.getAllAsync<{ entry_date: string }>(
    `SELECT DISTINCT entry_date FROM journal_entries WHERE entry_date >= ?`,
    [w12Start],
  );
  const journalDateSet = new Set(journalDateRows.map((r) => r.entry_date));

  const journalWeeks: WeekCount[] = [];
  for (let i = 11; i >= 0; i--) {
    const ws = ymd(startOfWeek(subDays(today, i * 7), { weekStartsOn: 1 }));
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = ymd(subDays(today, i * 7 - d));
      if (journalDateSet.has(day)) count++;
    }
    journalWeeks.push({ weekStart: ws, count });
  }

  // ─── Best writing day of week ──────────────────────────────────────────────
  const dayRows = await db.getAllAsync<{ dow: string; c: number }>(
    `SELECT strftime('%w', entry_date) as dow, COUNT(*) as c
     FROM journal_entries GROUP BY dow`,
  );
  const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const journalBestDay: DayCount[] = DOW_NAMES.map((dayName, i) => {
    const found = dayRows.find((r) => r.dow === String(i));
    return { dayName, count: found?.c ?? 0 };
  });

  // ─── Mood last 30 days ────────────────────────────────────────────────────
  const m30Start = ymd(subDays(today, 30));
  const moodRows = await db.getAllAsync<{ mood: string; c: number }>(
    `SELECT mood, COUNT(*) as c FROM diary
     WHERE entry_date >= ? AND mood IS NOT NULL
     GROUP BY mood ORDER BY c DESC`,
    [m30Start],
  );
  const moodLast30: MoodCount[] = moodRows.map((r) => ({ mood: r.mood, count: r.c }));

  // ─── Habit stats ──────────────────────────────────────────────────────────
  const habits = await db.getAllAsync<{ id: string; title: string; color: string | null }>(
    `SELECT id, title, color FROM habits WHERE archived = 0 ORDER BY created_at ASC`,
  );
  const habitStats: HabitStat[] = [];
  for (const h of habits) {
    // streak
    const logRows = await db.getAllAsync<{ log_date: string }>(
      `SELECT log_date FROM habit_logs WHERE habit_id = ? AND done = 1 ORDER BY log_date DESC`,
      [h.id],
    );
    const doneSet = new Set(logRows.map((r) => r.log_date));
    let streak = 0;
    let cursor = new Date();
    while (doneSet.has(ymd(cursor))) {
      streak++;
      cursor = subDays(cursor, 1);
    }
    // 30-day rate
    let hits = 0;
    for (let i = 0; i < 30; i++) {
      if (doneSet.has(ymd(subDays(today, i)))) hits++;
    }
    habitStats.push({
      id: h.id,
      title: h.title,
      color: h.color ?? '#A8B89F',
      streak,
      rate30: Math.round((hits / 30) * 100),
    });
  }
  habitStats.sort((a, b) => b.streak - a.streak || b.rate30 - a.rate30);

  // ─── Goals ────────────────────────────────────────────────────────────────
  const goalRow = await db.getAllAsync<{ status: string; c: number }>(
    `SELECT status, COUNT(*) as c FROM goals GROUP BY status`,
  );
  const goalsActive = goalRow.find((r) => r.status === 'active')?.c ?? 0;
  const goalsCompleted = goalRow.find((r) => r.status === 'completed')?.c ?? 0;
  const goalsTotal = goalRow.reduce((s, r) => s + r.c, 0);

  // ─── Realizations ─────────────────────────────────────────────────────────
  const rzRow = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM realizations`);
  const realizationsTotal = rzRow?.c ?? 0;

  // ─── Journal streak ───────────────────────────────────────────────────────
  // Current streak = consecutive days with at least one entry ending today or yesterday
  const allJournalDates = await db.getAllAsync<{ entry_date: string }>(
    `SELECT DISTINCT entry_date FROM journal_entries ORDER BY entry_date DESC`,
  );
  const dateSet = new Set(allJournalDates.map((r) => r.entry_date));

  let currentStreak = 0;
  let c = new Date();
  // allow today or yesterday to start streak
  if (!dateSet.has(ymd(c))) c = subDays(c, 1);
  while (dateSet.has(ymd(c))) {
    currentStreak++;
    c = subDays(c, 1);
  }

  // Longest streak (brute-force through sorted dates)
  const sortedDates = [...allJournalDates.map((r) => r.entry_date)].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sortedDates) {
    if (prev) {
      const diff = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }
  const longestStreak = longest;

  return {
    journalTotal,
    journalWeeks,
    journalBestDay,
    moodLast30,
    habitStats,
    goalsActive,
    goalsCompleted,
    goalsTotal,
    realizationsTotal,
    currentStreak,
    longestStreak,
  };
}
