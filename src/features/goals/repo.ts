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
} from './types';

type GoalRow = {
  id: string;
  title: string;
  category: string | null;
  target_date: string | null;
  priority: number;
  why: string | null;
  feeling: string | null;
  current_position: string | null;
  problems: string | null;
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
  why: r.why,
  feeling: r.feeling,
  currentPosition: r.current_position,
  problems: r.problems,
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
    `INSERT INTO goals (id, title, category, target_date, priority, why, feeling, current_position, problems, procedure, hero_image_uri, progress, manual_progress, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      input.title.trim(),
      input.category ?? null,
      input.targetDate ?? null,
      input.priority ?? 2,
      input.why ?? null,
      input.feeling ?? null,
      input.currentPosition ?? null,
      input.problems ?? null,
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
    why: patch.why !== undefined ? patch.why : existing.why,
    feeling: patch.feeling !== undefined ? patch.feeling : existing.feeling,
    currentPosition: patch.currentPosition !== undefined ? patch.currentPosition : existing.currentPosition,
    problems: patch.problems !== undefined ? patch.problems : existing.problems,
    procedure: patch.procedure !== undefined ? patch.procedure : existing.procedure,
    heroImageUri: patch.heroImageUri !== undefined ? patch.heroImageUri : existing.heroImageUri,
    manualProgress: patch.manualProgress !== undefined ? patch.manualProgress : existing.manualProgress,
    status: patch.status ?? existing.status,
  };
  await db.runAsync(
    `UPDATE goals SET title=?, category=?, target_date=?, priority=?, why=?, feeling=?, current_position=?, problems=?, procedure=?, hero_image_uri=?, manual_progress=?, status=? WHERE id=?`,
    [
      merged.title,
      merged.category,
      merged.targetDate,
      merged.priority,
      merged.why,
      merged.feeling,
      merged.currentPosition,
      merged.problems,
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

export async function recalcProgress(goalId: string): Promise<number> {
  const db = await getDB();
  const goal = await getGoal(goalId);
  if (!goal) return 0;
  if (goal.manualProgress !== null && goal.manualProgress !== undefined) {
    await db.runAsync(`UPDATE goals SET progress = ? WHERE id = ?`, [goal.manualProgress, goalId]);
    return goal.manualProgress;
  }
  const milestones = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) as total, SUM(done) as done FROM milestones WHERE goal_id = ?`,
    [goalId],
  );
  const linkedTasks = await db.getFirstAsync<{ total: number; done: number }>(
    `SELECT COUNT(*) as total, SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as done
     FROM task_goals tg JOIN tasks t ON tg.task_id = t.id WHERE tg.goal_id = ?`,
    [goalId],
  );
  const msTotal = milestones?.total ?? 0;
  const msDone = milestones?.done ?? 0;
  const tkTotal = linkedTasks?.total ?? 0;
  const tkDone = linkedTasks?.done ?? 0;
  const total = msTotal + tkTotal;
  if (total === 0) {
    await db.runAsync(`UPDATE goals SET progress = 0 WHERE id = ?`, [goalId]);
    return 0;
  }
  const pct = Math.round(((msDone + tkDone) / total) * 100);
  await db.runAsync(`UPDATE goals SET progress = ? WHERE id = ?`, [pct, goalId]);
  return pct;
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
