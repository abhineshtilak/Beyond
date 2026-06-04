/**
 * Goal-specific AI functions powered by Gemini.
 *
 * Design principle: AI appears only at friction points — never constantly.
 *   • Setting up a goal (cognitive overload → AI generates a roadmap)
 *   • Stalling (no updates → AI suggests next step)
 *   • Weekly review (pattern detection → honest feedback)
 *   • Confidence drop (reflection prompt)
 */
import { askGemini } from './service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIGoalPlan = {
  milestones: Array<{ title: string; week: number }>;
  habits: string[];
  risks: string[];
  firstStep: string;
};

export type AINextStep = {
  action: string;
  reasoning: string;
  urgency: 'today' | 'this_week' | 'when_ready';
};

export type AIWeeklyInsight = {
  pattern: string;
  adjustment: string;
  momentum: 'building' | 'steady' | 'declining';
};

export type AIReflectionPrompt = {
  question: string;
  context: string;
};

export type AIGoalDebrief = {
  whatWorked: string;
  whatFailed: string;
  keyLesson: string;
  forNextTime: string;
};

// ─── 1. Goal Setup Assistant ──────────────────────────────────────────────────
// Called when user creates a new goal. Returns a ready-to-use roadmap.

export async function generateGoalPlan(params: {
  title: string;
  description?: string;
  targetDate?: string;
  currentPosition?: string;
  problems?: string;
}): Promise<AIGoalPlan | null> {
  const { title, description, targetDate, currentPosition, problems } = params;

  const prompt = `You are a concise, practical goal strategist. No motivational fluff.

Goal: "${title}"
${description ? `Context: "${description}"` : ''}
${targetDate ? `Target date: ${targetDate}` : ''}
${currentPosition ? `Current situation: "${currentPosition}"` : ''}
${problems ? `Known obstacles: "${problems}"` : ''}

Return valid JSON only (no markdown, no explanation):
{
  "milestones": [
    {"title": "clear 2-6 word milestone", "week": 2}
  ],
  "habits": ["daily habit supporting this goal"],
  "risks": ["specific risk that could derail this"],
  "firstStep": "single most important action to take in the next 24 hours"
}

Rules:
- 4-6 milestones in chronological order, spread across the timeline
- 2-3 daily habits that directly build toward the goal
- 2-3 concrete risks (not generic fears)
- firstStep: one specific, doable action — no vague verbs
- Milestones are checkpoints, not tasks`;

  const result = await askGemini<AIGoalPlan>(prompt, { temperature: 0.3, maxTokens: 600 });
  if ('error' in result) return null;
  return result.data;
}

// ─── 2. Smart Next Step ───────────────────────────────────────────────────────
// The single highest-leverage action right now, given current state.

export async function getSmartNextStep(params: {
  goalTitle: string;
  progress: number;
  pendingMilestones: string[];
  recentLogSummary: string;
  daysRemaining: number | null;
  habitData: string; // e.g. "Running: 60%, Reading: 80%"
}): Promise<AINextStep | null> {
  const { goalTitle, progress, pendingMilestones, recentLogSummary, daysRemaining, habitData } = params;

  const prompt = `You are a direct accountability partner. No coaching fluff.

Goal: "${goalTitle}"
Progress: ${progress}%
${pendingMilestones.length > 0 ? `Next milestones: ${pendingMilestones.slice(0, 3).join(' / ')}` : 'No milestones set.'}
${recentLogSummary ? `Recent activity: "${recentLogSummary}"` : 'No recent logs.'}
${habitData ? `Habit consistency: ${habitData}` : ''}
${daysRemaining !== null ? `Days remaining: ${daysRemaining}` : ''}

Return valid JSON only:
{
  "action": "the single highest-leverage action right now (1-2 short sentences)",
  "reasoning": "why this action matters most at this specific moment (1 sentence)",
  "urgency": "today | this_week | when_ready"
}

Be specific. Reference actual milestones or habits if relevant. No platitudes.`;

  const result = await askGemini<AINextStep>(prompt, { temperature: 0.3, maxTokens: 250 });
  if ('error' in result) return null;
  return result.data;
}

// ─── 3. Weekly Review Analyzer ────────────────────────────────────────────────
// Detects patterns in logs + habit data. Gives honest feedback.

export async function analyzeWeeklyPattern(params: {
  goalTitle: string;
  logs: Array<{ content: string; energy: number; date: string }>;
  habitData: Array<{ title: string; rate: number }>;
  progress: number;
}): Promise<AIWeeklyInsight | null> {
  const { goalTitle, logs, habitData, progress } = params;
  if (logs.length === 0 && habitData.length === 0) return null;

  const logsText = logs.slice(0, 5).map(
    (l) => `[E${l.energy}/4, ${l.date}] ${l.content}`,
  ).join('\n');
  const habitsText = habitData.map((h) => `${h.title}: ${h.rate}%`).join(', ');

  const prompt = `Analyze this goal data. Identify one honest pattern. No coaching language.

Goal: "${goalTitle}" (${progress}% complete)
${logsText ? `Recent logs:\n${logsText}` : ''}
${habitsText ? `Habit consistency: ${habitsText}` : ''}

Return valid JSON only:
{
  "pattern": "specific observation from the data — what is actually happening (1-2 sentences)",
  "adjustment": "one concrete change or continuation based on the pattern (1-2 sentences)",
  "momentum": "building | steady | declining"
}

Be honest. If data shows decline, say so. If things are going well, confirm it.`;

  const result = await askGemini<AIWeeklyInsight>(prompt, { temperature: 0.35, maxTokens: 300 });
  if ('error' in result) return null;
  return result.data;
}

// ─── 4. Adaptive Reflection Prompt ───────────────────────────────────────────
// Surfaces a specific question based on what's happening with the goal.

export async function getReflectionPrompt(params: {
  goalTitle: string;
  healthStatus: 'on_track' | 'needs_attention' | 'stalling';
  daysSinceLastLog: number | null;
  recentObservation: string;
}): Promise<AIReflectionPrompt | null> {
  const { goalTitle, healthStatus, daysSinceLastLog, recentObservation } = params;

  const prompt = `Generate one focused reflection question for this goal situation.

Goal: "${goalTitle}"
Health: ${healthStatus}
${daysSinceLastLog !== null ? `Days since last update: ${daysSinceLastLog}` : ''}
${recentObservation ? `Current observation: "${recentObservation}"` : ''}

Return valid JSON only:
{
  "question": "a specific, non-generic reflection question (avoid 'how are you feeling about')",
  "context": "one sentence explaining why this question matters right now"
}

Questions should be honest and direct. Not therapeutic. Not motivational.
Examples of good questions:
- "What specific action are you avoiding and why?"
- "If progress were twice as fast, what would you be doing differently?"
- "What belief is making this harder than it needs to be?"`;

  const result = await askGemini<AIReflectionPrompt>(prompt, { temperature: 0.6, maxTokens: 150 });
  if ('error' in result) return null;
  return result.data;
}

// ─── 5. Goal Debrief (when completed or abandoned) ───────────────────────────

export async function generateGoalDebrief(params: {
  goalTitle: string;
  finalProgress: number;
  totalLogs: number;
  achievedMilestones: number;
  totalMilestones: number;
  durationDays: number;
  status: 'completed' | 'abandoned';
}): Promise<AIGoalDebrief | null> {
  const { goalTitle, finalProgress, achievedMilestones, totalMilestones, durationDays, status } = params;

  const prompt = `Write a concise, honest debrief for a completed/ended goal.

Goal: "${goalTitle}"
Status: ${status} at ${finalProgress}%
Milestones: ${achievedMilestones}/${totalMilestones} completed
Duration: ${durationDays} days

Return valid JSON only:
{
  "whatWorked": "what specifically contributed to progress (1-2 sentences)",
  "whatFailed": "${status === 'completed' ? 'what slowed progress or made it harder' : 'what led to abandonment or falling short'} (1-2 sentences)",
  "keyLesson": "the single most transferable lesson from this goal (1 sentence)",
  "forNextTime": "one concrete thing to do differently on the next goal (1 sentence)"
}

Be direct and specific. This is a personal retrospective, not a performance review.`;

  const result = await askGemini<AIGoalDebrief>(prompt, { temperature: 0.4, maxTokens: 350 });
  if ('error' in result) return null;
  return result.data;
}

// ─── 6. Unrealistic Goal Detector ─────────────────────────────────────────────
// Gently surfaces if a goal timeline or scope seems unrealistic.

export type AIFeasibilityCheck = {
  isConcerning: boolean;
  concern: string | null;
  suggestion: string | null;
};

export async function checkGoalFeasibility(params: {
  title: string;
  targetDate: string;
  currentPosition: string;
  daysAvailable: number;
}): Promise<AIFeasibilityCheck | null> {
  const { title, targetDate, currentPosition, daysAvailable } = params;

  const prompt = `You are a pragmatic advisor. Check if this goal timeline is realistic.

Goal: "${title}"
Target date: ${targetDate} (${daysAvailable} days from now)
${currentPosition ? `Starting from: "${currentPosition}"` : ''}

Return valid JSON only:
{
  "isConcerning": true | false,
  "concern": "specific concern about timeline or scope, or null if realistic",
  "suggestion": "one concrete reframe or adjustment if concerning, or null"
}

Only flag genuine concerns. Don't be overly cautious. Common sense judgments only.`;

  const result = await askGemini<AIFeasibilityCheck>(prompt, { temperature: 0.2, maxTokens: 200 });
  if ('error' in result) return null;
  return result.data;
}
