/**
 * affirmationAI.ts
 *
 * Generates personalized affirmations from the user's real current state:
 *   • Recent mood (7 days)
 *   • Today's diary entry (struggles, what was hard)
 *   • Active goal inner obstacles
 *   • Recent journal themes
 *
 * Affirmations are specific to the person's actual situation — not generic.
 * "I am building consistency even when my app goal feels overwhelming"
 * not "I am worthy of success."
 *
 * Result is saved as a renewable "AI Generated" collection in the DB.
 */

import { getDB, uid } from '@/lib/db';
import { askAI } from './service';

// ─── Types ────────────────────────────────────────────────────────────────────

export const AI_COLLECTION_ID = 'ai-generated-affirmations';

export type GeneratedAffirmations = {
  affirmations: string[];
};

// ─── Context builder ──────────────────────────────────────────────────────────

async function buildAffirmationContext(): Promise<string> {
  const db = await getDB();
  const lines: string[] = [];

  // ── Mood (last 7 days) ────────────────────────────────────────────────────────
  const moods = await db.getAllAsync<{ entry_date: string; mood: string | null }>(
    `SELECT entry_date, mood FROM diary
     WHERE entry_date >= date('now','-7 days') AND mood IS NOT NULL
     ORDER BY entry_date DESC`,
  );
  if (moods.length > 0) {
    const moodCounts: Record<string, number> = {};
    for (const m of moods) {
      const k = m.mood ?? 'unknown';
      moodCounts[k] = (moodCounts[k] ?? 0) + 1;
    }
    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'ok';
    lines.push(`RECENT MOOD: Mostly "${dominant}" this week (${moods.length} days logged)`);
    const recentTwo = moods.slice(0, 2).map((m) => m.mood).join(', ');
    lines.push(`Last 2 days: ${recentTwo}`);
  }

  // ── Today's diary entry ────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const todayDiary = await db.getFirstAsync<{
    good: string | null; bad: string | null; learned: string | null;
    progress: string | null; happy: string | null; summary: string | null;
  }>(`SELECT good, bad, learned, progress, happy, summary FROM diary WHERE entry_date = ?`, [today]);

  if (todayDiary) {
    if (todayDiary.bad)     lines.push(`TODAY — Struggling with: "${todayDiary.bad}"`);
    if (todayDiary.summary) lines.push(`TODAY — Summary: "${todayDiary.summary.slice(0, 150)}"`);
    if (todayDiary.good)    lines.push(`TODAY — Did well: "${todayDiary.good}"`);
  }

  // ── Goal inner obstacles ──────────────────────────────────────────────────────
  const goals = await db.getAllAsync<{
    title: string; inner_obstacles: string | null; progress: number;
  }>(
    `SELECT title, inner_obstacles, progress
     FROM goals WHERE status = 'active' AND inner_obstacles IS NOT NULL LIMIT 4`,
  );
  if (goals.length > 0) {
    lines.push('\nGOAL INNER STRUGGLES:');
    for (const g of goals) {
      if (g.inner_obstacles) {
        lines.push(`  • "${g.title}" (${g.progress}%): ${g.inner_obstacles.slice(0, 100)}`);
      }
    }
  }

  // ── Recent journal themes ─────────────────────────────────────────────────────
  const journals = await db.getAllAsync<{ content: string | null }>(
    `SELECT content FROM journal_entries ORDER BY created_at DESC LIMIT 2`,
  );
  if (journals.length > 0) {
    lines.push('\nRECENT JOURNAL THEMES:');
    for (const j of journals) {
      const snippet = (j.content ?? '').replace(/<[^>]+>/g, '').slice(0, 120).trim();
      if (snippet) lines.push(`  • "${snippet}…"`);
    }
  }

  // ── Recent goal logs ──────────────────────────────────────────────────────────
  const logs = await db.getAllAsync<{ content: string; energy: number }>(
    `SELECT content, energy FROM goal_logs ORDER BY created_at DESC LIMIT 3`,
  );
  if (logs.length > 0) {
    const lowEnergy = logs.filter((l) => l.energy <= 2);
    if (lowEnergy.length > 0) {
      lines.push('\nLOW-ENERGY MOMENTS (for context):');
      for (const l of lowEnergy) {
        lines.push(`  • "${l.content.slice(0, 80)}"`);
      }
    }
  }

  return lines.join('\n');
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generatePersonalizedAffirmations(): Promise<string[] | null> {
  const context = await buildAffirmationContext();

  const prompt = `You are writing deeply personalized affirmations for someone based on their real emotional state and life data.

${context}

Write 7 affirmations that:
1. Are in first person ("I am", "I choose", "I trust", "I have", "I know", "I can")
2. Directly address their ACTUAL current emotional state and specific challenges shown above
3. Reference real details from their situation (goals, struggles, what's hard right now)
4. Are honest and grounding — not toxic positivity
5. Are short: 1-2 sentences each, spoken as if to yourself in the mirror
6. Balance acknowledgment of struggle WITH forward-moving belief

Examples of GOOD (specific, grounded):
- "I am making progress on my app even when it feels invisible — 40% is real."
- "I choose to stop avoiding the hard conversation I've been postponing."
- "The tiredness I feel is from building something, not from failing."

Examples of BAD (too generic):
- "I am worthy of love and success."
- "Every day I get better and better."

Return valid JSON only:
{
  "affirmations": [
    "affirmation 1",
    "affirmation 2",
    "affirmation 3",
    "affirmation 4",
    "affirmation 5",
    "affirmation 6",
    "affirmation 7"
  ]
}`;

  const result = await askAI<GeneratedAffirmations>(prompt, {
    temperature: 0.72,
    maxTokens: 700,
  });

  if ('error' in result) return null;
  return result.data?.affirmations ?? null;
}

// ─── Save to DB as renewable AI collection ────────────────────────────────────

export async function saveAIAffirmationsToCollection(affirmations: string[]): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  // Ensure AI collection exists
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM affirmation_collections WHERE id = ?`, [AI_COLLECTION_ID],
  );
  if (!existing) {
    await db.runAsync(
      `INSERT INTO affirmation_collections
         (id, title, emoji, cover_color, category, is_custom, sort_idx, created_at)
         VALUES (?, ?, '✨', '#9B87C0', 'ai', 1, -2, ?)`,
      [AI_COLLECTION_ID, 'For You Today', now],
    );
  } else {
    // Update title with today's date so it's clear it's fresh
    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    await db.runAsync(
      `UPDATE affirmation_collections SET title = ? WHERE id = ?`,
      [`For You · ${dateLabel}`, AI_COLLECTION_ID],
    );
  }

  // Clear old affirmations in this collection
  await db.runAsync(`DELETE FROM affirmations WHERE collection_id = ?`, [AI_COLLECTION_ID]);

  // Insert new ones
  for (let i = 0; i < affirmations.length; i++) {
    await db.runAsync(
      `INSERT INTO affirmations (id, collection_id, body, sort_idx, created_at) VALUES (?, ?, ?, ?, ?)`,
      [uid(), AI_COLLECTION_ID, affirmations[i].trim(), i, now],
    );
  }
}
