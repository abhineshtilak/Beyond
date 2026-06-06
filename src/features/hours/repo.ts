import { subDays } from 'date-fns';
import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { calculateSleepDuration, validateSleepEntry } from './sleepMath';
import type {
  HourCategory,
  HourCategoryRow,
  HourLog,
  SleepEntry,
  SleepEntryInput,
  TimeBlock,
  TimeBlockInput,
} from './types';

type Row = {
  id: string;
  log_date: string;
  hour: number;
  activity: string;
  category: string | null;
};

const toLog = (row: Row): HourLog => ({
  id: row.id,
  logDate: row.log_date,
  hour: row.hour,
  activity: row.activity,
  category: (row.category as HourCategory) ?? null,
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
    `SELECT * FROM hour_logs
     WHERE log_date BETWEEN ? AND ?
     ORDER BY log_date ASC, hour ASC`,
    [startDate, endDate],
  );
  return rows.map(toLog);
}

export async function upsert(
  date: string,
  hour: number,
  activity: string,
  category: string | null,
): Promise<void> {
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
      `INSERT INTO hour_logs (id, log_date, hour, activity, category)
       VALUES (?, ?, ?, ?, ?)`,
      [uid(), date, hour, activity.trim(), category],
    );
  }
}

export async function clear(date: string, hour: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM hour_logs WHERE log_date = ? AND hour = ?`,
    [date, hour],
  );
}

export async function categoryBreakdown(
  date: string,
): Promise<Record<HourCategory, number>> {
  const logs = await listForDate(date);
  const result = {} as Record<HourCategory, number>;
  for (const log of logs) {
    if (log.category) {
      result[log.category] = (result[log.category] ?? 0) + 1;
    }
  }
  return result;
}

export async function weeklySummary(): Promise<{ date: string; logs: HourLog[] }[]> {
  const today = new Date();
  const result: { date: string; logs: HourLog[] }[] = [];
  for (let index = 6; index >= 0; index -= 1) {
    const logDate = ymd(subDays(today, index));
    result.push({ date: logDate, logs: await listForDate(logDate) });
  }
  return result;
}

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

const toBlock = (row: BlockRow): TimeBlock => ({
  id: row.id,
  logDate: row.log_date,
  startHour: row.start_hour,
  startMinute: row.start_minute,
  durationMins: row.duration_mins,
  activity: row.activity,
  category: row.category,
});

export async function listBlocksForDate(date: string): Promise<TimeBlock[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<BlockRow>(
    `SELECT * FROM time_blocks
     WHERE log_date = ?
     ORDER BY start_hour ASC, start_minute ASC`,
    [date],
  );
  return rows.map(toBlock);
}

export async function listBlocksForHour(date: string, hour: number): Promise<TimeBlock[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<BlockRow>(
    `SELECT * FROM time_blocks
     WHERE log_date = ? AND start_hour = ?
     ORDER BY start_minute ASC`,
    [date, hour],
  );
  return rows.map(toBlock);
}

export async function addBlock(input: TimeBlockInput): Promise<TimeBlock | null> {
  const db = await getDB();
  const existing = await db.getAllAsync<{
    duration_mins: number;
    start_minute: number;
  }>(
    `SELECT duration_mins, start_minute FROM time_blocks
     WHERE log_date = ? AND start_hour = ?`,
    [input.logDate, input.startHour],
  );
  const usedMins = existing.reduce((sum, block) => sum + block.duration_mins, 0);
  const remaining = Math.max(0, 60 - usedMins);
  if (remaining <= 0) return null;

  const safeDuration = Math.min(input.durationMins, remaining);
  const nextStartMin = existing.length > 0
    ? existing.reduce(
      (max, block) => Math.max(max, block.start_minute + block.duration_mins),
      0,
    )
    : input.startMinute;
  const startMin = Math.min(nextStartMin, 59);
  const id = uid();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO time_blocks (
      id, log_date, start_hour, start_minute, duration_mins,
      activity, category, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.logDate,
      input.startHour,
      startMin,
      safeDuration,
      input.activity,
      input.category,
      now,
    ],
  );
  await upsert(
    input.logDate,
    input.startHour,
    input.activity,
    (input.category as HourCategory) ?? null,
  );
  const row = await db.getFirstAsync<BlockRow>(
    `SELECT * FROM time_blocks WHERE id = ?`,
    [id],
  );
  return row ? toBlock(row) : null;
}

export async function deleteBlock(id: string): Promise<void> {
  const db = await getDB();
  const block = await db.getFirstAsync<{ log_date: string; start_hour: number }>(
    `SELECT log_date, start_hour FROM time_blocks WHERE id = ?`,
    [id],
  );
  await db.runAsync(`DELETE FROM time_blocks WHERE id = ?`, [id]);
  if (!block) return;

  const remaining = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM time_blocks
     WHERE log_date = ? AND start_hour = ?`,
    [block.log_date, block.start_hour],
  );
  if ((remaining?.n ?? 0) === 0) {
    await db.runAsync(
      `DELETE FROM hour_logs WHERE log_date = ? AND hour = ?`,
      [block.log_date, block.start_hour],
    );
    return;
  }

  const first = await db.getFirstAsync<{
    activity: string;
    category: string | null;
  }>(
    `SELECT activity, category FROM time_blocks
     WHERE log_date = ? AND start_hour = ?
     ORDER BY start_minute ASC
     LIMIT 1`,
    [block.log_date, block.start_hour],
  );
  if (first) {
    await upsert(
      block.log_date,
      block.start_hour,
      first.activity,
      first.category as HourCategory | null,
    );
  }
}

export async function updateBlock(
  id: string,
  patch: {
    activity: string;
    category: string | null;
    startMinute: number;
    durationMins: number;
  },
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE time_blocks
     SET activity = ?, category = ?, start_minute = ?, duration_mins = ?
     WHERE id = ?`,
    [
      patch.activity,
      patch.category,
      patch.startMinute,
      patch.durationMins,
      id,
    ],
  );
  const block = await db.getFirstAsync<{ log_date: string; start_hour: number }>(
    `SELECT log_date, start_hour FROM time_blocks WHERE id = ?`,
    [id],
  );
  if (block) {
    await upsert(
      block.log_date,
      block.start_hour,
      patch.activity,
      patch.category as HourCategory | null,
    );
  }
}

type SleepRow = {
  id: string;
  wake_date: string;
  sleep_hour: number;
  sleep_minute: number;
  wake_hour: number;
  wake_minute: number;
  duration_mins: number;
  created_at: number;
  updated_at: number;
};

const toSleepEntry = (row: SleepRow): SleepEntry => ({
  id: row.id,
  wakeDate: row.wake_date,
  sleepHour: row.sleep_hour,
  sleepMinute: row.sleep_minute,
  wakeHour: row.wake_hour,
  wakeMinute: row.wake_minute,
  durationMins: row.duration_mins,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listSleepEntriesForDate(wakeDate: string): Promise<SleepEntry[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<SleepRow>(
    `SELECT * FROM sleep_entries
     WHERE wake_date = ?
     ORDER BY created_at ASC`,
    [wakeDate],
  );
  return rows.map(toSleepEntry);
}

export async function createSleepEntry(
  wakeDate: string,
  input: SleepEntryInput,
): Promise<SleepEntry> {
  const validationError = validateSleepEntry(input);
  if (validationError) throw new Error(validationError);

  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const durationMins = calculateSleepDuration(input);
  await db.runAsync(
    `INSERT INTO sleep_entries (
      id, wake_date, sleep_hour, sleep_minute, wake_hour, wake_minute,
      duration_mins, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      wakeDate,
      input.sleepHour,
      input.sleepMinute,
      input.wakeHour,
      input.wakeMinute,
      durationMins,
      now,
      now,
    ],
  );

  return {
    id,
    wakeDate,
    ...input,
    durationMins,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateSleepEntry(
  id: string,
  input: SleepEntryInput,
): Promise<void> {
  const validationError = validateSleepEntry(input);
  if (validationError) throw new Error(validationError);

  const db = await getDB();
  await db.runAsync(
    `UPDATE sleep_entries
     SET sleep_hour = ?, sleep_minute = ?, wake_hour = ?, wake_minute = ?,
         duration_mins = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.sleepHour,
      input.sleepMinute,
      input.wakeHour,
      input.wakeMinute,
      calculateSleepDuration(input),
      Date.now(),
      id,
    ],
  );
}

export async function deleteSleepEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM sleep_entries WHERE id = ?`, [id]);
}

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
  if (startTotalMins < 0) return;

  let current = startTotalMins;
  while (current < endTotalMins) {
    const hour = Math.floor(current / 60);
    const minute = current % 60;
    const nextHourMins = (hour + 1) * 60;
    const blockEnd = Math.min(nextHourMins, endTotalMins);
    const blockDuration = blockEnd - current;
    if (blockDuration > 0) {
      await addBlock({
        logDate: date,
        startHour: hour,
        startMinute: minute,
        durationMins: blockDuration,
        activity,
        category,
      });
    }
    current = nextHourMins;
  }
}

type CatRow = {
  id: string;
  label: string;
  color: string;
  sort_idx: number;
};

const toCatRow = (row: CatRow): HourCategoryRow => ({
  id: row.id,
  label: row.label,
  color: row.color,
  sortIdx: row.sort_idx,
});

export async function listCategories(): Promise<HourCategoryRow[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CatRow>(
    `SELECT * FROM hour_categories ORDER BY sort_idx ASC`,
  );
  return rows.map(toCatRow);
}

export async function addCategory(
  label: string,
  color: string,
): Promise<HourCategoryRow> {
  const db = await getDB();
  const id = uid();
  const maxRow = await db.getFirstAsync<{ m: number }>(
    `SELECT MAX(sort_idx) as m FROM hour_categories`,
  );
  const sortIdx = (maxRow?.m ?? 0) + 1;
  await db.runAsync(
    `INSERT INTO hour_categories (id, label, color, sort_idx)
     VALUES (?, ?, ?, ?)`,
    [id, label, color, sortIdx],
  );
  return { id, label, color, sortIdx };
}

export async function updateCategory(
  id: string,
  label: string,
  color: string,
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE hour_categories SET label = ?, color = ? WHERE id = ?`,
    [label, color, id],
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM hour_categories WHERE id = ?`, [id]);
}
