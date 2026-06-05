/**
 * chatAI.ts
 *
 * Powers the AI Reflection Chatbot. Aggregates all user data into a context
 * snapshot, then passes it with every conversation turn so the AI answers
 * from real personal data, not generic knowledge.
 *
 * Context sources:
 *   Goals   → active goals, progress, health status
 *   Habits  → 30-day completion rates, current streaks
 *   Mood    → last 14 days of diary mood
 *   Journal → last 3 entry excerpts
 *   Diary   → last 5 reflection entries (good/bad/learned)
 *   Realizations → last 5 insights
 */

import { getDB } from '@/lib/db';
import { askAIChat } from './service';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ─── Context builder ──────────────────────────────────────────────────────────

export async function buildUserContext(): Promise<string> {
  const db = await getDB();
  const lines: string[] = ['DATA:\n'];

  // ── Goals ────────────────────────────────────────────────────────────────────
  const goals = await db.getAllAsync<{
    title: string; progress: number; status: string;
    target_date: string | null; category: string | null;
  }>(
    `SELECT title, progress, status, target_date, category
     FROM goals WHERE status = 'active'
     ORDER BY priority DESC, COALESCE(target_date,'9999') ASC LIMIT 6`,
  );

  if (goals.length > 0) {
    lines.push('ACTIVE GOALS:');
    for (const g of goals) {
      const days = g.target_date
        ? Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000)
        : null;
      const deadline = days === null ? 'no deadline' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`;
      lines.push(`  • "${g.title}" — ${g.progress}% complete, ${deadline}`);
    }
    lines.push('');
  }

  // ── Habit consistency (last 30 days) ─────────────────────────────────────────
  const habits = await db.getAllAsync<{ id: string; title: string }>(
    `SELECT id, title FROM habits WHERE archived = 0 ORDER BY created_at ASC LIMIT 8`,
  );

  if (habits.length > 0) {
    lines.push('HABIT CONSISTENCY (last 30 days):');
    for (const h of habits) {
      const row = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) as n FROM habit_logs
         WHERE habit_id = ? AND done = 1 AND log_date >= date('now','-30 days')`,
        [h.id],
      );
      const rate = Math.round(((row?.n ?? 0) / 30) * 100);
      const bar = rate >= 70 ? '✓ strong' : rate >= 40 ? '~ building' : '✗ weak';
      lines.push(`  • ${h.title}: ${rate}% ${bar}`);
    }
    lines.push('');
  }

  // ── Mood (last 14 days) ───────────────────────────────────────────────────────
  const moods = await db.getAllAsync<{ entry_date: string; mood: string | null }>(
    `SELECT entry_date, mood FROM diary
     WHERE entry_date >= date('now','-14 days') AND mood IS NOT NULL
     ORDER BY entry_date DESC`,
  );

  if (moods.length > 0) {
    const moodMap: Record<string, string> = {
      great: 'great', good: 'good', ok: 'okay', low: 'low', bad: 'tough',
    };
    lines.push('MOOD (last 14 days):');
    const moodCounts: Record<string, number> = {};
    for (const m of moods) {
      const label = moodMap[m.mood ?? ''] ?? m.mood ?? '?';
      moodCounts[label] = (moodCounts[label] ?? 0) + 1;
    }
    const summary = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}(${v})`)
      .join(', ');
    lines.push(`  Distribution: ${summary}`);
    // Last 5 days
    const recent = moods.slice(0, 5).map((m) => `${m.entry_date.slice(5)}: ${moodMap[m.mood ?? ''] ?? m.mood}`).join(', ');
    lines.push(`  Recent: ${recent}`);
    lines.push('');
  }

  // ── Journal excerpts (last 3 entries) ────────────────────────────────────────
  const journals = await db.getAllAsync<{
    entry_date: string; content: string | null; title: string | null;
  }>(
    `SELECT entry_date, content, title FROM journal_entries
     ORDER BY created_at DESC LIMIT 3`,
  );

  if (journals.length > 0) {
    lines.push('RECENT JOURNAL ENTRIES:');
    for (const j of journals) {
      const snippet = (j.content ?? '').replace(/<[^>]+>/g, '').slice(0, 120).trim();
      const label = j.title ?? j.entry_date.slice(5);
      if (snippet) lines.push(`  • [${label}] "${snippet}${snippet.length >= 120 ? '…' : ''}"`);
    }
    lines.push('');
  }

  // ── Diary reflections (last 5 entries) ────────────────────────────────────────
  const diary = await db.getAllAsync<{
    entry_date: string; good: string | null; bad: string | null;
    learned: string | null; mood: string | null;
  }>(
    `SELECT entry_date, good, bad, learned, mood FROM diary
     WHERE (good IS NOT NULL OR bad IS NOT NULL OR learned IS NOT NULL)
     ORDER BY entry_date DESC LIMIT 5`,
  );

  if (diary.length > 0) {
    lines.push('RECENT DAILY REFLECTIONS:');
    for (const d of diary) {
      const parts: string[] = [];
      if (d.good)    parts.push(`good: "${d.good.slice(0, 80)}"`);
      if (d.bad)     parts.push(`avoid: "${d.bad.slice(0, 80)}"`);
      if (d.learned) parts.push(`learned: "${d.learned.slice(0, 80)}"`);
      if (parts.length > 0) lines.push(`  • [${d.entry_date.slice(5)}] ${parts.join(' | ')}`);
    }
    lines.push('');
  }

  // ── Realizations (last 5) ─────────────────────────────────────────────────────
  const realizations = await db.getAllAsync<{ content: string; kind: string }>(
    `SELECT content, kind FROM realizations ORDER BY created_at DESC LIMIT 5`,
  );

  if (realizations.length > 0) {
    lines.push('RECENT REALIZATIONS / INSIGHTS:');
    for (const r of realizations) {
      const snippet = r.content.slice(0, 120);
      lines.push(`  • [${r.kind}] "${snippet}${r.content.length > 120 ? '…' : ''}"`);
    }
    lines.push('');
  }

  // ── Goal logs (last 7) ────────────────────────────────────────────────────────
  const goalLogs = await db.getAllAsync<{
    content: string; energy: number; log_date: string; goal_title: string;
  }>(
    `SELECT gl.content, gl.energy, gl.log_date, g.title as goal_title
     FROM goal_logs gl
     JOIN goals g ON gl.goal_id = g.id
     ORDER BY gl.created_at DESC LIMIT 5`,
  );

  if (goalLogs.length > 0) {
    lines.push('GOAL LOGS:');
    const energyLabel = ['', 'struggling', 'okay', 'good', 'on fire'];
    for (const l of goalLogs) {
      lines.push(`  • [${l.log_date.slice(5)}, ${energyLabel[l.energy] ?? '?'}] "${l.goal_title}": ${l.content.slice(0, 80)}`);
    }
    lines.push('');
  }

  // ── Hour tracker (last 7 days) ────────────────────────────────────────────────
  const hourLogs = await db.getAllAsync<{ log_date: string; category: string | null; activity: string }>(
    `SELECT log_date, category, activity FROM hour_logs
     WHERE log_date >= date('now','-7 days')
     ORDER BY log_date DESC, hour ASC`,
  );

  if (hourLogs.length > 0) {
    // Category totals
    const catTotals: Record<string, number> = {};
    for (const h of hourLogs) {
      const cat = h.category ?? 'other';
      catTotals[cat] = (catTotals[cat] ?? 0) + 1;
    }
    const catSummary = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}h`)
      .join(', ');
    lines.push(`HOURS TRACKED (last 7d): ${catSummary}`);
    // Days tracked
    const daysTracked = new Set(hourLogs.map((h) => h.log_date)).size;
    lines.push(`  Tracked on ${daysTracked}/7 days`);
    lines.push('');
  }

  return lines.join('\n');
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(context: string): string {
  return `You are Beyond, the user's personal growth AI. You have their real data below.

Rules:
- Max 2-3 short sentences. No paragraphs. No fluff.
- Use their actual numbers/data. Never give generic advice.
- Direct, honest, specific. Like a coach who read their data.

${context}
---`;
}

// ─── Chat function ────────────────────────────────────────────────────────────

export async function chat(
  message: string,
  history: ChatMessage[],
  context: string,
): Promise<string | null> {
  const systemPrompt = buildSystemPrompt(context);

  const reply = await askAIChat({
    systemPrompt,
    messages: [
      ...history,
      { role: 'user', content: message },
    ],
    temperature: 0.6,
    maxTokens: 220,
  });

  return reply;
}

// ─── Suggested starter questions ─────────────────────────────────────────────

export const SUGGESTED_QUESTIONS = [
  'How have I been doing the last 2 weeks?',
  'What patterns are hurting my growth?',
  'Which habit is having the biggest impact?',
  'What should I focus on this week?',
  'Why am I struggling with my goals?',
  'What does my mood tell me about my habits?',
  'Where am I losing the most time or energy?',
  'What am I consistently avoiding?',
];
