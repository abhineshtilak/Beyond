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

export type AITemporalPlan = {
  quarterly: Array<{ label: string; focus: string; milestone: string }>;
  monthly: Array<{ label: string; objective: string }>;
  weekly: Array<{ label: string; theme: string; actions: string[] }>;
  daily: { habits: string[]; focus: string };
  requiredSkills: string[];
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

  const prompt = `Goal: "${goalTitle}" — ${progress}% done${daysRemaining !== null ? `, ${daysRemaining}d left` : ''}.
${pendingMilestones.length > 0 ? `Next: ${pendingMilestones.slice(0, 2).join(' / ')}` : ''}
${recentLogSummary ? `Recent: ${recentLogSummary}` : 'No recent logs.'}
${habitData ? `Habits: ${habitData}` : ''}

Return JSON only:
{
  "action": "one specific action — max 12 words",
  "urgency": "today | this_week | when_ready"
}
No reasoning. No padding. Just the action.`;

  const result = await askGemini<AINextStep>(prompt, { temperature: 0.3, maxTokens: 120 });
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

  const prompt = `Goal: "${goalTitle}" at ${progress}%.
${logsText ? `Logs: ${logsText}` : ''}
${habitsText ? `Habits: ${habitsText}` : ''}

Return JSON only:
{
  "pattern": "one honest observation — max 15 words",
  "momentum": "building | steady | declining"
}
No adjustment field. Just the pattern.`;

  const result = await askGemini<AIWeeklyInsight>(prompt, { temperature: 0.35, maxTokens: 140 });
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

  const prompt = `Goal: "${goalTitle}" — ${healthStatus}${daysSinceLastLog ? `, ${daysSinceLastLog}d silent` : ''}.
${recentObservation ? `Context: ${recentObservation}` : ''}

Return JSON only:
{
  "question": "one direct question — max 12 words, no fluff"
}
Examples: "What are you avoiding?" / "What's the real blocker?" / "What would doubling speed look like?"`;


  const result = await askGemini<AIReflectionPrompt>(prompt, { temperature: 0.6, maxTokens: 80 });
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

// ─── 6. Temporal Execution Plan ───────────────────────────────────────────────
// Breaks a goal into quarterly → monthly → weekly → daily framework.
// Stored in goal.planBreakdown as JSON. Generated once, refreshable.

export async function generateTemporalPlan(params: {
  title: string;
  targetDate?: string;
  why?: string;
  currentPosition?: string;
  innerObstacles?: string;
  outerObstacles?: string;
  skillsNeeded?: string;
  daysAvailable: number;
}): Promise<AITemporalPlan | null> {
  const { title, targetDate, why, currentPosition, innerObstacles, outerObstacles, skillsNeeded, daysAvailable } = params;

  const months = Math.max(1, Math.round(daysAvailable / 30));
  const weeks  = Math.min(4, Math.max(1, Math.round(daysAvailable / 7)));

  const prompt = `You are a precise execution planner. Break this goal into a realistic time-based framework.

Goal: "${title}"
${targetDate ? `Deadline: ${targetDate} (${daysAvailable} days away)` : `Duration: ~${daysAvailable} days`}
${why ? `Why it matters: "${why}"` : ''}
${currentPosition ? `Starting point: "${currentPosition}"` : ''}
${innerObstacles ? `Inner obstacles: "${innerObstacles}"` : ''}
${outerObstacles ? `Outer obstacles: "${outerObstacles}"` : ''}
${skillsNeeded ? `Skills to build: "${skillsNeeded}"` : ''}

Return valid JSON only (no markdown):
{
  "quarterly": [
    {"label": "Q1 (Month 1-3)", "focus": "one-line focus for this quarter", "milestone": "concrete checkpoint"}
  ],
  "monthly": [
    {"label": "Month 1", "objective": "the one most important objective this month"}
  ],
  "weekly": [
    {"label": "Week 1", "theme": "theme for the week", "actions": ["specific action 1", "specific action 2"]}
  ],
  "daily": {
    "habits": ["2-3 daily non-negotiable habits"],
    "focus": "the single daily priority question — what must I do today to move this forward?"
  },
  "requiredSkills": ["skill 1 if not yet listed", "skill 2"]
}

Rules:
- quarterly: max ${Math.ceil(months / 3)} items (cover the full timeline in quarters)
- monthly: exactly 3 items (next 3 months only — near-term detail)
- weekly: exactly ${weeks} items (first ${weeks} weeks — actionable)
- daily.habits: 2-3 items, each under 8 words
- daily.focus: one short question, e.g. "Did I write 500 words today?"
- requiredSkills: only if not already in the input skills, else empty array
- Be specific. Reference the goal domain. No generic advice.`;

  const result = await askGemini<AITemporalPlan>(prompt, { temperature: 0.3, maxTokens: 900 });
  if ('error' in result) return null;
  return result.data;
}

// ─── 7. Dynamic Plan Adjustment ───────────────────────────────────────────────
// Called when momentum is declining or the user explicitly requests a replan.
// Takes the current plan + fresh progress context and returns an adjusted plan.

export async function adjustTemporalPlan(params: {
  title: string;
  currentPlan: AITemporalPlan;
  currentProgress: number;
  daysRemaining: number | null;
  recentLogs: string;       // last 3 log summaries joined
  habitConsistency: string; // e.g. "Running: 40%, Reading: 20%"
  healthStatus: 'on_track' | 'needs_attention' | 'stalling';
}): Promise<AITemporalPlan | null> {
  const { title, currentPlan, currentProgress, daysRemaining, recentLogs, habitConsistency, healthStatus } = params;

  const prompt = `You are replanning a stalling goal. Be honest and realistic — cut what isn't working, double down on what is.

Goal: "${title}"
Status: ${healthStatus} at ${currentProgress}% complete
${daysRemaining !== null ? `Days remaining: ${daysRemaining}` : ''}
${recentLogs ? `Recent activity: "${recentLogs}"` : 'No recent logs.'}
${habitConsistency ? `Habit consistency: ${habitConsistency}` : ''}

Current plan (adjust this based on what's actually happening):
- Quarterly: ${currentPlan.quarterly.map((q) => q.focus).join(' | ')}
- Monthly: ${currentPlan.monthly.map((m) => m.objective).join(' | ')}
- Weekly: ${currentPlan.weekly.map((w) => w.theme).join(' | ')}
- Daily habits: ${currentPlan.daily.habits.join(', ')}

Return valid JSON only — an ADJUSTED version of the plan that accounts for current reality:
{
  "quarterly": [{"label": "Q1", "focus": "...", "milestone": "..."}],
  "monthly": [{"label": "Month 1", "objective": "..."}],
  "weekly": [{"label": "Week 1", "theme": "...", "actions": ["...", "..."]}],
  "daily": {"habits": ["...", "..."], "focus": "..."},
  "requiredSkills": []
}

Key adjustment rules:
- If behind pace: reduce scope or extend timelines, don't just repeat the old plan
- If habits are weak: replace with simpler, more achievable versions
- If stalling: identify the ONE thing blocking progress and make week 1 entirely about that
- Keep what's working, cut what isn't`;

  const result = await askGemini<AITemporalPlan>(prompt, { temperature: 0.35, maxTokens: 900 });
  if ('error' in result) return null;
  return result.data;
}

// ─── 9. Unrealistic Goal Detector (feasibility check) ────────────────────────
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
