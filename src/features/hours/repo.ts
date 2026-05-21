import { getDB, uid } from '@/lib/db';
import { ymd } from '@/lib/date';
import { subDays } from 'date-fns';
import type { HourCategory, HourLog } from './types';

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

export async function upsert(date: string, hour: number, activity: string, category: HourCategory | null): Promise<void> {
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
