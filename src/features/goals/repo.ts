import { getDB, uid } from '@/lib/db';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type {
  Goal,
  GoalInput,
  GoalWithStats,
  GoalCategory,
  GoalPriority,
  GoalStatus,
  Milestone,
  Inspiration,
  InspirationKind,
  GoalLog,
} from './types';

type GoalRow = {
  id: string;
  title: string;
  category: string | null;
  target_date: string | null;
  priority: number;
  description: string | null;
  specification: string | null;
  why: string | null;
  feeling: string | null;
  current_position: string | null;
  problems: string | null;
  inner_obstacles: string | null;
  outer_obstacles: string | null;
  skills_needed: string | null;
  plan_breakdown: string | null;
  procedure: string | null;
  hero_image_uri: string | null;
  progress: number;
  manual_progress: number | null;
  status: string;
  created_at: number;
};

const toGoal = (r: GoalRow): Goal => ({
  id: r.id,
  title: r.title,
  category: (r.category as GoalCategory) ?? null,
  targetDate: r.target_date,
  priority: ((r.priority as GoalPriority) ?? 2) as GoalPriority,
  description: r.description,
  specification: r.specification,
  why: r.why,
  feeling: r.feeling,
  currentPosition: r.current_position,
  problems: r.problems,
  innerObstacles: r.inner_obstacles,
  outerObstacles: r.outer_obstacles,
  skillsNeeded: r.skills_needed,
  planBreakdown: r.plan_breakdown,
  procedure: r.procedure,
  heroImageUri: r.hero_image_uri,
  progress: r.progress ?? 0,
  manualProgress: r.manual_progress,
  status: (r.status as GoalStatus) ?? 'active',
  createdAt: r.created_at,
});

export async function listGoals(includeCompleted = true): Promise<Goal[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT * FROM goals
     ${includeCompleted ? '' : "WHERE status = 'active'"}
     ORDER BY
       CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
       priority DESC,
       COALESCE(target_date, '9999') ASC,
       created_at DESC`,
  );
  return rows.map(toGoal);
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<GoalRow>(`SELECT * FROM goals WHERE id = ?`, [id]);
  return row ? toGoal(row) : null;
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO goals (id, title, category, target_date, priority, description, specification, why, feeling, current_position, problems, inner_obstacles, outer_obstacles, skills_needed, plan_breakdown, procedure, hero_image_uri, progress, manual_progress, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      input.title.trim(),
      input.category ?? null,
      input.targetDate ?? null,
      input.priority ?? 2,
      input.description ?? null,
      input.specification ?? null,
      input.why ?? null,
      input.feeling ?? null,
      input.currentPosition ?? null,
      input.problems ?? null,
      input.innerObstacles ?? null,
      input.outerObstacles ?? null,
      input.skillsNeeded ?? null,
      input.planBreakdown ?? null,
      input.procedure ?? null,
      input.heroImageUri ?? null,
      input.manualProgress ?? null,
      input.status ?? 'active',
      now,
    ],
  );
  const g = await getGoal(id);
  return g!;
}

export async function updateGoal(id: string, patch: Partial<GoalInput>): Promise<Goal> {
  const db = await getDB();
  const existing = await getGoal(id);
  if (!existing) throw new Error('Goal not found');
  const merged = {
    title: patch.title?.trim() ?? existing.title,
    category: patch.category !== undefined ? patch.category : existing.category,
    targetDate: patch.targetDate !== undefined ? patch.targetDate : existing.targetDate,
    priority: patch.priority ?? existing.priority,
    description: patch.description !== undefined ? patch.description : existing.description,
    specification: patch.specification !== undefined ? patch.specification : existing.specification,
    why: patch.why !== undefined ? patch.why : existing.why,
    feeling: patch.feeling !== undefined ? patch.feeling : existing.feeling,
    currentPosition: patch.currentPosition !== undefined ? patch.currentPosition : existing.currentPosition,
    problems: patch.problems !== undefined ? patch.problems : existing.problems,
    innerObstacles: patch.innerObstacles !== undefined ? patch.innerObstacles : existing.innerObstacles,
    outerObstacles: patch.outerObstacles !== undefined ? patch.outerObstacles : existing.outerObstacles,
    skillsNeeded: patch.skillsNeeded !== undefined ? patch.skillsNeeded : existing.skillsNeeded,
    planBreakdown: patch.planBreakdown !== undefined ? patch.planBreakdown : existing.planBreakdown,
    procedure: patch.procedure !== undefined ? patch.procedure : existing.procedure,
    heroImageUri: patch.heroImageUri !== undefined ? patch.heroImageUri : existing.heroImageUri,
    manualProgress: patch.manualProgress !== undefined ? patch.manualProgress : existing.manualProgress,
    status: patch.status ?? existing.status,
  };
  await db.runAsync(
    `UPDATE goals SET title=?, category=?, target_date=?, priority=?, description=?, specification=?, why=?, feeling=?, current_position=?, problems=?, inner_obstacles=?, outer_obstacles=?, skills_needed=?, plan_breakdown=?, procedure=?, hero_image_uri=?, manual_progress=?, status=? WHERE id=?`,
    [
      merged.title,
      merged.category,
      merged.targetDate,
      merged.priority,
      merged.description,
      merged.specification,
      merged.why,
      merged.feeling,
      merged.currentPosition,
      merged.problems,
      merged.innerObstacles,
      merged.outerObstacles,
      merged.skillsNeeded,
      merged.planBreakdown,
      merged.procedure,
      merged.heroImageUri,
      merged.manualProgress,
      merged.status,
      id,
    ],
  );
  await recalcProgress(id);
  return (await getGoal(id))!;
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDB();
  // Nullify legacy goal_id columns for affected rows
  await db.runAsync(`UPDATE tasks SET goal_id = NULL WHERE goal_id = ?`, [id]);
  await db.runAsync(`UPDATE habits SET goal_id = NULL WHERE goal_id = ?`, [id]);
  // Junction table rows cascade-delete via FK ON DELETE CASCADE
  await db.runAsync(`DELETE FROM goals WHERE id = ?`, [id]);
}

export async function setStatus(id: string, status: GoalStatus): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE goals SET status = ? WHERE id = ?`, [status, id]);
}

/* ===== Milestones ===== */

type MilestoneRow = {
  id: string;
  goal_id: string;
  title: string;
  done: number;
  order_idx: number;
};

const toMilestone = (r: MilestoneRow): Milestone => ({
  id: r.id,
  goalId: r.goal_id,
  title: r.title,
  done: !!r.done,
  orderIdx: r.order_idx,
});

export async function listMilestones(goalId: string): Promise<Milestone[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<MilestoneRow>(
    `SELECT * FROM milestones WHERE goal_id = ? ORDER BY order_idx ASC, rowid ASC`,
    [goalId],
  );
  return rows.map(toMilestone);
}

export async function addMilestone(goalId: string, title: string): Promise<Milestone> {
  const db = await getDB();
  const id = uid();
  const max = await db.getFirstAsync<{ m: number | null }>(
    `SELECT MAX(order_idx) as m FROM milestones WHERE goal_id = ?`,
    [goalId],
  );
  const order = (max?.m ?? 0) + 1;
  await db.runAsync(
    `INSERT INTO milestones (id, goal_id, title, done, order_idx) VALUES (?, ?, ?, 0, ?)`,
    [id, goalId, title.trim(), order],
  );
  await recalcProgress(goalId);
  return { id, goalId, title: title.trim(), done: false, orderIdx: order };
}

export async function toggleMilestone(id: string): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ done: number; goal_id: string }>(
    `SELECT done, goal_id FROM milestones WHERE id = ?`,
    [id],
  );
  if (!row) return;
  await db.runAsync(`UPDATE milestones SET done = ? WHERE id = ?`, [row.done ? 0 : 1, id]);
  await recalcProgress(row.goal_id);
}

export async function updateMilestone(id: string, title: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE milestones SET title = ? WHERE id = ?`, [title.trim(), id]);
}

export async function deleteMilestone(id: string): Promise<void> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ goal_id: string }>(`SELECT goal_id FROM milestones WHERE id = ?`, [id]);
  await db.runAsync(`DELETE FROM milestones WHERE id = ?`, [id]);
  if (row) await recalcProgress(row.goal_id);
}

/* ===== Progress ===== */

/**
 * Smart progress calculation — priority order:
 *  1. Milestones (always the primary signal when they exist)
 *  2. Linked tasks (30% contribution alongside milestones, or 100% if no milestones)
 *  3. Manual progress only as a fallback when NO structured data exists at all
 *
 * This fixes the bug where setting manualProgress then adding milestones caused
 * milestones to be ignored — manualProgress previously always won.
 */
export async function recalcProgress(goalId: string): Promise<number> {
  const db = await getDB();
  const goal = await getGoal(goalId);
  if (!goal) return 0;

  const milestones = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) as total, COALESCE(SUM(done), 0) as done FROM milestones WHERE goal_id = ?`,
    [goalId],
  );
  const linkedTasks = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) as total,
            COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0) as done
     FROM task_goals tg JOIN tasks t ON tg.task_id = t.id WHERE tg.goal_id = ?`,
    [goalId],
  );

  const msTotal = milestones?.total ?? 0;
  const msDone  = milestones?.done  ?? 0;
  const tkTotal = linkedTasks?.total ?? 0;
  const tkDone  = linkedTasks?.done  ?? 0;

  let pct: number;

  if (msTotal > 0) {
    // Milestones are the source of truth.
    // If tasks also exist, blend them in at 30% weight.
    if (tkTotal > 0) {
      const msPct = msDone / msTotal;
      const tkPct = tkDone / tkTotal;
      pct = Math.round((msPct * 0.7 + tkPct * 0.3) * 100);
    } else {
      pct = Math.round((msDone / msTotal) * 100);
    }
  } else if (tkTotal > 0) {
    // No milestones — tasks are the only structured signal.
    pct = Math.round((tkDone / tkTotal) * 100);
  } else if (goal.manualProgress !== null && goal.manualProgress !== undefined) {
    // No structured data at all — honour the manual value.
    pct = goal.manualProgress;
  } else {
    pct = 0;
  }

  await db.runAsync(`UPDATE goals SET progress = ? WHERE id = ?`, [pct, goalId]);
  return pct;
}

/**
 * Goal health score (0–100) computed entirely from local behavioral data.
 * No AI or network call needed — instant and always available.
 *
 * score ≥ 72 → on_track (green)
 * score 48–71 → needs_attention (amber)
 * score < 48  → stalling (red)
 */
export async function goalHealthScore(goalId: string): Promise<{
  score: number;
  status: 'on_track' | 'needs_attention' | 'stalling';
  observations: string[];
}> {
  const db = await getDB();
  const goal = await getGoal(goalId);
  if (!goal) return { score: 50, status: 'needs_attention', observations: [] };

  let score = 100;
  const observations: string[] = [];

  // ── 1. Momentum: days since last log entry ─────────────────────────────────
  const lastLog = await db.getFirstAsync<{ created_at: number }>(
    `SELECT created_at FROM goal_logs WHERE goal_id = ? ORDER BY created_at DESC LIMIT 1`,
    [goalId],
  );
  const daysSinceLog = lastLog
    ? differenceInCalendarDays(new Date(), new Date(lastLog.created_at))
    : null;

  if (daysSinceLog === null) {
    score -= 15;
    observations.push('No progress logs yet — start tracking your updates.');
  } else if (daysSinceLog > 14) {
    score -= 25;
    observations.push(`Silent for ${daysSinceLog} days — quick check-in needed.`);
  } else if (daysSinceLog > 7) {
    score -= 10;
    observations.push(`Last updated ${daysSinceLog} days ago.`);
  }

  // ── 2. Linked habit consistency (30-day window) ────────────────────────────
  const linkedHabits = await db.getAllAsync<{ habit_id: string }>(
    `SELECT habit_id FROM habit_goals WHERE goal_id = ?`, [goalId],
  );
  if (linkedHabits.length > 0) {
    let totalRate = 0;
    for (const { habit_id } of linkedHabits) {
      const cnt = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) as n FROM habit_logs
         WHERE habit_id = ? AND done = 1 AND log_date >= date('now','-30 days')`,
        [habit_id],
      );
      totalRate += Math.min(100, ((cnt?.n ?? 0) / 30) * 100);
    }
    const avg = Math.round(totalRate / linkedHabits.length);
    if (avg < 40) {
      score -= 25;
      observations.push(`Linked habits at ${avg}% consistency — the foundation is shaky.`);
    } else if (avg < 65) {
      score -= 10;
      observations.push(`Habits at ${avg}% — still building the routine.`);
    }
  }

  // ── 3. Progress vs expected pace ────────────────────────────────────────────
  if (goal.targetDate) {
    const totalDays = differenceInCalendarDays(parseISO(goal.targetDate), new Date(goal.createdAt));
    const elapsed   = differenceInCalendarDays(new Date(), new Date(goal.createdAt));
    if (totalDays > 0 && elapsed > 0) {
      const expectedPct = Math.min(100, Math.round((elapsed / totalDays) * 100));
      const gap = expectedPct - (goal.progress ?? 0);
      if (gap > 25) {
        score -= 20;
        observations.push(`${gap}% behind expected pace — needs a push.`);
      } else if (gap > 12) {
        score -= 10;
        observations.push(`Slightly behind pace (${gap}% gap).`);
      }
    }
  }

  // ── 4. Milestone stall: milestones exist but none done ─────────────────────
  const ms = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) as total, COALESCE(SUM(done), 0) as done FROM milestones WHERE goal_id = ?`,
    [goalId],
  );
  if ((ms?.total ?? 0) >= 2 && (ms?.done ?? 0) === 0) {
    score -= 15;
    observations.push('Milestones set but none ticked yet — start with the first one.');
  }

  score = Math.max(0, Math.min(100, score));
  const status: 'on_track' | 'needs_attention' | 'stalling' =
    score >= 72 ? 'on_track' : score >= 48 ? 'needs_attention' : 'stalling';

  // Default positive observation when everything is going well
  if (observations.length === 0) {
    observations.push("You're on track — keep the momentum.");
  }

  return { score, status, observations };
}

/* ===== Stats / view models ===== */

export async function goalStats(goalId: string) {
  const db = await getDB();
  const milestones = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) as total, SUM(done) as done FROM milestones WHERE goal_id = ?`,
    [goalId],
  );
  const tasks = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as done
     FROM task_goals tg JOIN tasks t ON tg.task_id = t.id WHERE tg.goal_id = ?`,
    [goalId],
  );
  const habits = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM habit_goals hg JOIN habits h ON hg.habit_id = h.id
     WHERE hg.goal_id = ? AND h.archived = 0`,
    [goalId],
  );
  return {
    milestonesTotal: milestones?.total ?? 0,
    milestonesDone: milestones?.done ?? 0,
    linkedTasksTotal: tasks?.total ?? 0,
    linkedTasksDone: tasks?.done ?? 0,
    linkedHabitsTotal: habits?.c ?? 0,
  };
}

export async function listWithStats(): Promise<GoalWithStats[]> {
  const goals = await listGoals(true);
  const out: GoalWithStats[] = [];
  for (const g of goals) {
    const s = await goalStats(g.id);
    const daysRemaining = g.targetDate ? differenceInCalendarDays(parseISO(g.targetDate), new Date()) : null;
    out.push({ ...g, ...s, daysRemaining });
  }
  return out;
}

/* ===== Inspirations ===== */

type InsRow = {
  id: string;
  goal_id: string;
  kind: string;
  content: string | null;
  image_uri: string | null;
  created_at: number;
};

const toIns = (r: InsRow): Inspiration => ({
  id: r.id,
  goalId: r.goal_id,
  kind: (r.kind as InspirationKind) ?? 'note',
  content: r.content,
  imageUri: r.image_uri,
  createdAt: r.created_at,
});

export async function listInspirations(goalId: string): Promise<Inspiration[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<InsRow>(
    `SELECT * FROM inspirations WHERE goal_id = ? ORDER BY created_at DESC`,
    [goalId],
  );
  return rows.map(toIns);
}

export async function addInspiration(
  goalId: string,
  kind: InspirationKind,
  content: string | null,
  imageUri: string | null,
): Promise<Inspiration> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO inspirations (id, goal_id, kind, content, image_uri, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, goalId, kind, content, imageUri, now],
  );
  return { id, goalId, kind, content, imageUri, createdAt: now };
}

export async function deleteInspiration(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM inspirations WHERE id = ?`, [id]);
}

/* ===== Linked tasks/habits ===== */

export async function listLinkedTasks(goalId: string) {
  const db = await getDB();
  return db.getAllAsync<{ id: string; title: string; status: string; due_date: string | null }>(
    `SELECT t.id, t.title, t.status, t.due_date
     FROM task_goals tg
     JOIN tasks t ON tg.task_id = t.id
     WHERE tg.goal_id = ?
     ORDER BY CASE t.status WHEN 'completed' THEN 1 ELSE 0 END, t.created_at DESC`,
    [goalId],
  );
}

export async function listLinkedHabits(goalId: string) {
  const db = await getDB();
  return db.getAllAsync<{ id: string; title: string; icon: string; color: string }>(
    `SELECT h.id, h.title, h.icon, h.color
     FROM habit_goals hg
     JOIN habits h ON hg.habit_id = h.id
     WHERE hg.goal_id = ? AND h.archived = 0
     ORDER BY h.created_at ASC`,
    [goalId],
  );
}

/* ===== Goal Logs ===== */

export async function listGoalLogs(goalId: string, limit = 20): Promise<GoalLog[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ id: string; goal_id: string; log_date: string; content: string; energy: number; created_at: number }>(
    `SELECT * FROM goal_logs WHERE goal_id = ? ORDER BY created_at DESC LIMIT ?`,
    [goalId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    goalId: r.goal_id,
    logDate: r.log_date,
    content: r.content,
    energy: (r.energy ?? 3) as 1 | 2 | 3 | 4,
    createdAt: r.created_at,
  }));
}

export async function addGoalLog(goalId: string, content: string, energy: number): Promise<void> {
  const db = await getDB();
  const id = uid();
  const now = Date.now();
  const date = new Date().toISOString().slice(0, 10);
  await db.runAsync(
    `INSERT INTO goal_logs (id, goal_id, log_date, content, energy, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, goalId, date, content.trim(), energy, now],
  );
}

export async function deleteGoalLog(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM goal_logs WHERE id = ?`, [id]);
}
