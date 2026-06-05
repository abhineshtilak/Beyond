/**
 * progressAI.ts
 *
 * Cross-data intelligence: finds correlations between mood, habits, sleep,
 * and goal activity that the user can't see themselves.
 *
 * Key function: analyzeLifePatterns()
 *   → Looks at the last 30 days
 *   → Correlates mood scores with habit completion on the same days
 *   → Detects consistency trends across goals and habits
 *   → Returns 3-4 specific, actionable insights
 *
 * Result is cached in the settings table (key: 'progress_intelligence')
 * and only refreshed when explicitly requested or after 24h.
 */

import { getDB } from '@/lib/db';
import { askAI } from './service';

export type ProgressIntelligence = {
  insights: string[];          // 3-4 specific patterns from real data
  topPattern: string;          // The single most important finding
  actionSuggestion: string;    // One concrete thing to change
  analysedAt: number;          // timestamp
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_KEY = 'progress_intelligence';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedIntelligence(): Promise<ProgressIntelligence | null> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`, [CACHE_KEY],
    );
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as ProgressIntelligence;
    // Expired?
    if (Date.now() - parsed.analysedAt > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

async function saveToCache(data: ProgressIntelligence): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [CACHE_KEY, JSON.stringify(data)],
    );
  } catch { /* silent */ }
}

// ─── Data aggregator ──────────────────────────────────────────────────────────

async function gatherPatternData(): Promise<string> {
  const db = await getDB();
  const lines: string[] = [];

  // ── Mood × Day pattern ────────────────────────────────────────────────────────
  const moodDays = await db.getAllAsync<{ entry_date: string; mood: string | null }>(
    `SELECT entry_date, mood FROM diary
     WHERE entry_date >= date('now','-30 days') AND mood IS NOT NULL
     ORDER BY entry_date ASC`,
  );

  // ── Habit logs × Day ──────────────────────────────────────────────────────────
  const habitData = await db.getAllAsync<{ habit_id: string; title: string }>(
    `SELECT id as habit_id, title FROM habits WHERE archived = 0 LIMIT 6`,
  );

  const habitLogsByDate: Record<string, number> = {}; // date → count done
  for (const h of habitData) {
    const logs = await db.getAllAsync<{ log_date: string }>(
      `SELECT log_date FROM habit_logs
       WHERE habit_id = ? AND done = 1 AND log_date >= date('now','-30 days')`,
      [h.habit_id],
    );
    for (const l of logs) {
      habitLogsByDate[l.log_date] = (habitLogsByDate[l.log_date] ?? 0) + 1;
    }
  }

  const totalHabits = habitData.length || 1;

  // Build day-by-day table
  const moodScore: Record<string, number> = {
    great: 5, good: 4, ok: 3, low: 2, bad: 1,
  };

  const dayRows: string[] = [];
  for (const d of moodDays) {
    const habitsCompleted = habitLogsByDate[d.entry_date] ?? 0;
    const habitPct = Math.round((habitsCompleted / totalHabits) * 100);
    const score = moodScore[d.mood ?? ''] ?? 3;
    const dayOfWeek = new Date(d.entry_date).getDay(); // 0=Sun
    dayRows.push(`${d.entry_date} mood=${score} habits=${habitPct}% dow=${dayOfWeek}`);
  }

  if (dayRows.length > 0) {
    lines.push('DAY-BY-DAY DATA (mood 1-5, habits % done, day 0=Sun):');
    lines.push(dayRows.join('\n'));
    lines.push('');
  }

  // ── Goal health snapshot ──────────────────────────────────────────────────────
  const goals = await db.getAllAsync<{
    title: string; progress: number; category: string | null;
  }>(
    `SELECT title, progress, category FROM goals WHERE status = 'active' LIMIT 5`,
  );

  if (goals.length > 0) {
    lines.push('ACTIVE GOALS:');
    for (const g of goals) {
      // Days since last log
      const lastLog = await db.getFirstAsync<{ created_at: number }>(
        `SELECT created_at FROM goal_logs WHERE goal_id = (
           SELECT id FROM goals WHERE title = ? LIMIT 1
         ) ORDER BY created_at DESC LIMIT 1`,
        [g.title],
      );
      const daysSince = lastLog
        ? Math.floor((Date.now() - lastLog.created_at) / 86400000)
        : null;
      lines.push(`  ${g.title}: ${g.progress}% progress, last log ${daysSince === null ? 'never' : `${daysSince}d ago`}`);
    }
    lines.push('');
  }

  // ── Habit streaks ─────────────────────────────────────────────────────────────
  lines.push(`TRACKED HABITS: ${habitData.map((h) => h.title).join(', ')}`);
  lines.push('');

  // ── Journal frequency ─────────────────────────────────────────────────────────
  const journalCount = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM journal_entries
     WHERE entry_date >= date('now','-30 days')`,
  );
  lines.push(`JOURNAL: ${journalCount?.n ?? 0} entries in last 30 days`);

  const diaryCount = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM diary
     WHERE entry_date >= date('now','-30 days')
       AND (good IS NOT NULL OR bad IS NOT NULL OR learned IS NOT NULL)`,
  );
  lines.push(`REFLECTIONS: ${diaryCount?.n ?? 0} daily reflections in last 30 days`);

  return lines.join('\n');
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function analyzeLifePatterns(
  forceRefresh = false,
): Promise<ProgressIntelligence | null> {
  // Return cache if fresh
  if (!forceRefresh) {
    const cached = await getCachedIntelligence();
    if (cached) return cached;
  }

  const rawData = await gatherPatternData();
  if (!rawData.trim()) return null;

  const prompt = `Analyse this life data. Find real correlations. Numbers only, no generic advice.

${rawData}

Return JSON only:
{
  "insights": [
    "max 10 words, uses actual numbers",
    "max 10 words, uses actual numbers",
    "max 10 words, uses actual numbers"
  ],
  "topPattern": "1 sentence, specific numbers",
  "actionSuggestion": "max 12 words — what to do, not what to think about"
}`;

  const result = await askAI<{
    insights: string[];
    topPattern: string;
    actionSuggestion: string;
  }>(prompt, { temperature: 0.3, maxTokens: 240 });

  if ('error' in result) return null;

  const intelligence: ProgressIntelligence = {
    ...result.data,
    analysedAt: Date.now(),
  };

  await saveToCache(intelligence);
  return intelligence;
}
