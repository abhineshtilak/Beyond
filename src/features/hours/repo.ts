import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { subDays } from 'date-fns';
import type { HourCategory, HourLog, HourCategoryRow, TimeBlock, TimeBlockInput } from './types';

type Row = {
  id: string;
  log_date: string;
  hour: number;
  activity: string;
  category: string | null;
};

const toLog = (r: Row): HourLog => ({
  id: r.id,
  logDate: r.log_date,
  hour: r.hour,
  activity: r.activity,
  category: (r.category as HourCategory) ?? null,
});

export async function listForDate(date: string): Promise<HourLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM hour_logs WHERE log_date = ? ORDER BY hour ASC`,
    [date],
  );
  return rows.map(toLog);
}

export async function listForRange(startDate: string, endDate: string): Promise<HourLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM hour_logs WHERE log_date BETWEEN ? AND ? ORDER BY log_date ASC, hour ASC`,
    [startDate, endDate],
  );
  return rows.map(toLog);
}

export async function upsert(date: string, hour: number, activity: string, category: string | null): Promise<void> {
  const db = await getDB();
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM hour_logs WHERE log_date = ? AND hour = ?`,
    [date, hour],
  );
  if (!activity.trim() && !category) {
    if (existing) await db.runAsync(`DELETE FROM hour_logs WHERE id = ?`, [existing.id]);
    return;
  }
  if (existing) {
    await db.runAsync(
      `UPDATE hour_logs SET activity = ?, category = ? WHERE id = ?`,
      [activity.trim(), category, existing.id],
    );
  } else {
    await db.runAsync(
      `INSERT INTO hour_logs (id, log_date, hour, activity, category) VALUES (?, ?, ?, ?, ?)`,
      [uid(), date, hour, activity.trim(), category],
    );
  }
}

export async function clear(date: string, hour: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM hour_logs WHERE log_date = ? AND hour = ?`, [date, hour]);
}

export async function categoryBreakdown(date: string): Promise<Record<HourCategory, number>> {
  const logs = await listForDate(date);
  const out: any = {};
  for (const l of logs) {
    if (l.category) out[l.category] = (out[l.category] ?? 0) + 1;
  }
  return out;
}

export async function weeklySummary(): Promise<{ date: string; logs: HourLog[] }[]> {
  const today = new Date();
  const out: { date: string; logs: HourLog[] }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = ymd(subDays(today, i));
    const logs = await listForDate(date);
    out.push({ date, logs });
  }
  return out;
}

// ─── Time Blocks ─────────────────────────────────────────────────────────────

type BlockRow = {
  id: string;
  log_date: string;
  start_hour: number;
  start_minute: number;
  duration_mins: number;
  activity: string;
  category: string | null;
  created_at: number;
};

const toBlock = (r: BlockRow): TimeBlock => ({
  id: r.id,
  logDate: r.log_date,
  startHour: r.start_hour,
  startMinute: r.start_minute,
  durationMins: r.duration_mins,
  activity: r.activity,
  category: r.category,
});

export async function listBlocksForDate(date: string): Promise<TimeBlock[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<BlockRow>(
    `SELECT * FROM time_blocks WHERE log_date = ? ORDER BY start_hour ASC, start_minute ASC`,
    [date],
  );
  return rows.map(toBlock);
}

export async function listBlocksForHour(date: string, hour: number): Promise<TimeBlock[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<BlockRow>(
    `SELECT * FROM time_blocks WHERE log_date = ? AND start_hour = ? ORDER BY start_minute ASC`,
    [date, hour],
  );
  return rows.map(toBlock);
}

export async function addBlock(input: TimeBlockInput): Promise<TimeBlock> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO time_blocks (id, log_date, start_hour, start_minute, duration_mins, activity, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.logDate, input.startHour, input.startMinute, input.durationMins, input.activity, input.category, now],
  );
  // Sync to hour_logs so widgets + insights stay current
  await upsert(input.logDate, input.startHour, input.activity, (input.category as HourCategory) ?? null);
  const row = await db.getFirstAsync<BlockRow>(`SELECT * FROM time_blocks WHERE id = ?`, [id]);
  return toBlock(row!);
}

export async function deleteBlock(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM time_blocks WHERE id = ?`, [id]);
}

/** Fill contiguous hours with a sleep block — cross-midnight aware. */
export async function logSleepBlocks(
  date: string,
  fellAsleepHour: number,
  fellAsleepMin: number,
  wokeUpHour: number,
  wokeUpMin: number,
): Promise<void> {
  // Build a list of hour slots covered
  const startTotal = fellAsleepHour * 60 + fellAsleepMin;
  let endTotal = wokeUpHour * 60 + wokeUpMin;
  if (endTotal <= startTotal) endTotal += 24 * 60; // cross-midnight

  const slots: Array<{ date: string; hour: number; startMin: number; durMins: number }> = [];

  let cur = startTotal;
  while (cur < endTotal) {
    const slotDate = cur >= 24 * 60
      ? ymd(new Date(new Date(date).getTime() + 86400000))
      : date;
    const absHour = Math.floor((cur % (24 * 60)) / 60);
    const absMin = cur % 60;
    const nextHourTotal = (Math.floor(cur / 60) + 1) * 60;
    const slotEnd = Math.min(nextHourTotal, endTotal);
    const durMins = slotEnd - cur;
    slots.push({ date: slotDate, hour: absHour, startMin: absMin, durMins });
    cur = nextHourTotal;
  }

  const db = await getDB();

  // Full replace: wipe ALL Sleep blocks for today AND tomorrow before inserting
  // new ones. This ensures changing from "9pm–6am" to "12am–9am" doesn't leave
  // stale sleep blocks from the old window (e.g. 9pm, 10pm, 11pm).
  const nextDate = ymd(new Date(new Date(date).getTime() + 86400000));
  await db.runAsync(
    `DELETE FROM time_blocks WHERE (log_date = ? OR log_date = ?) AND activity = 'Sleep'`,
    [date, nextDate],
  );
  await db.runAsync(
    `DELETE FROM hour_logs WHERE (log_date = ? OR log_date = ?) AND activity = 'Sleep'`,
    [date, nextDate],
  );

  for (const s of slots) {
    await addBlock({
      logDate: s.date,
      startHour: s.hour,
      startMinute: s.startMin,
      durationMins: s.durMins,
      activity: 'Sleep',
      category: 'rest',
    });
  }
}

/** Sleep blocks only, for cross-midnight duration calculation. */
export async function listSleepBlocksForDate(date: string): Promise<TimeBlock[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<BlockRow>(
    `SELECT * FROM time_blocks WHERE log_date = ? AND activity = 'Sleep'
     ORDER BY start_hour ASC, start_minute ASC`,
    [date],
  );
  return rows.map(toBlock);
}

/**
 * Auto-log an activity into the hour tracker, backfilling from
 * (current time - durationMins) to current time.  Called when a habit is
 * checked in or a task is completed.
 */
export async function autoLogActivity(
  activity: string,
  category: string | null,
  durationMins: number,
  date: string,
): Promise<void> {
  if (durationMins <= 0) return;
  const now = new Date();
  const endTotalMins = now.getHours() * 60 + now.getMinutes();
  const startTotalMins = endTotalMins - durationMins;
  if (startTotalMins < 0) return; // started before midnight — skip for simplicity

  let cur = startTotalMins;
  while (cur < endTotalMins) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    const nextHourMins = (h + 1) * 60;
    const blockEnd = Math.min(nextHourMins, endTotalMins);
    const blockDur = blockEnd - cur;
    if (blockDur > 0) {
      await addBlock({
        logDate: date,
        startHour: h,
        startMinute: m,
        durationMins: blockDur,
        activity,
        category,
      });
    }
    cur = nextHourMins;
  }
}

// ─── Custom Categories ────────────────────────────────────────────────────────

type CatRow = { id: string; label: string; color: string; sort_idx: number };

const toCatRow = (r: CatRow): HourCategoryRow => ({
  id: r.id, label: r.label, color: r.color, sortIdx: r.sort_idx,
});

export async function listCategories(): Promise<HourCategoryRow[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CatRow>(`SELECT * FROM hour_categories ORDER BY sort_idx ASC`);
  return rows.map(toCatRow);
}

export async function addCategory(label: string, color: string): Promise<HourCategoryRow> {
  const db = await getDB();
  const id = uid();
  const maxRow = await db.getFirstAsync<{ m: number }>(`SELECT MAX(sort_idx) as m FROM hour_categories`);
  const sort_idx = (maxRow?.m ?? 0) + 1;
  await db.runAsync(
    `INSERT INTO hour_categories (id, label, color, sort_idx) VALUES (?, ?, ?, ?)`,
    [id, label, color, sort_idx],
  );
  return { id, label, color, sortIdx: sort_idx };
}

export async function updateCategory(id: string, label: string, color: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE hour_categories SET label = ?, color = ? WHERE id = ?`, [label, color, id]);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM hour_categories WHERE id = ?`, [id]);
}
