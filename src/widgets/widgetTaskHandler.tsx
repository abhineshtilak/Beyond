/**
 * Widget task handler — runs as a headless JS task.
 * Has full access to native modules (SQLite) but NO React UI context.
 *
 * Registered at module load via registerWidgetTaskHandler().
 * Imported as a side-effect from src/app/_layout.tsx (Android only).
 *
 * Click actions:
 *   TOGGLE_HABIT   { id: string }  — toggle today's habit log without opening app
 *   COMPLETE_TASK  { id: string }  — mark task completed without opening app
 *   OPEN_URI       { uri: string } — handled natively by the library (deep link)
 *   OPEN_APP                       — handled natively by the library
 */
import React from 'react';
import {
  registerWidgetTaskHandler,
  type WidgetTaskHandler,
} from 'react-native-android-widget';
import * as SQLite from 'expo-sqlite';
import { format } from 'date-fns';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { TasksWidget } from './TasksWidget';
import type { WidgetTask } from './TasksWidget';
import { HabitsWidget } from './HabitsWidget';
import type { WidgetHabit } from './HabitsWidget';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ymd(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Opens a fresh DB connection. Always close in a finally block. */
async function openDB(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync('lifeos.db');
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Toggle today's log for a habit.
 * If already done → deletes the log row (undo).
 * If not done    → inserts a log row (check in).
 */
async function toggleHabitLog(habitId: string): Promise<void> {
  const db = await openDB();
  const today = ymd();
  try {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ? AND done = 1`,
      [habitId, today],
    );
    if (existing) {
      await db.runAsync(
        `DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?`,
        [habitId, today],
      );
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO habit_logs (id, habit_id, log_date, done)
         VALUES (?, ?, ?, 1)`,
        [uid(), habitId, today],
      );
    }
  } finally {
    await db.closeAsync();
  }
}

/**
 * Mark a task as completed.
 * No-ops if already completed (safe to call multiple times).
 */
async function completeTask(taskId: string): Promise<void> {
  const db = await openDB();
  try {
    await db.runAsync(
      `UPDATE tasks
       SET status = 'completed', completed_at = ?
       WHERE id = ? AND status != 'completed'`,
      [Date.now(), taskId],
    );
  } finally {
    await db.closeAsync();
  }
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchTasks(): Promise<{
  tasks: WidgetTask[];
  pendingCount: number;
  completedCount: number;
}> {
  const db = await openDB();
  const today = ymd();
  try {
    // Mark overdue tasks as missed
    await db.runAsync(
      `UPDATE tasks SET status = 'missed'
       WHERE status = 'pending' AND due_date IS NOT NULL AND due_date < ?`,
      [today],
    );

    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      status: string;
      priority: number;
    }>(
      `SELECT id, title, status, priority FROM tasks
       WHERE status IN ('pending', 'completed')
         AND (due_date = ? OR due_date IS NULL)
       ORDER BY
         CASE status WHEN 'completed' THEN 1 ELSE 0 END,
         priority DESC,
         created_at DESC
       LIMIT 10`,
      [today],
    );

    const tasks: WidgetTask[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      completed: r.status === 'completed',
      priority: (r.priority as 1 | 2 | 3) ?? 2,
    }));

    return {
      tasks,
      pendingCount:   rows.filter((r) => r.status === 'pending').length,
      completedCount: rows.filter((r) => r.status === 'completed').length,
    };
  } finally {
    await db.closeAsync();
  }
}

async function fetchHabits(): Promise<{
  habits: WidgetHabit[];
  doneCount: number;
  totalCount: number;
}> {
  const db = await openDB();
  const today = ymd();
  try {
    const rows = await db.getAllAsync<{
      id: string;
      title: string;
      color: string | null;
    }>(
      `SELECT id, title, color FROM habits
       WHERE archived = 0
       ORDER BY created_at ASC`,
    );

    const doneRows = await db.getAllAsync<{ habit_id: string }>(
      `SELECT habit_id FROM habit_logs WHERE log_date = ? AND done = 1`,
      [today],
    );
    const doneSet = new Set(doneRows.map((r) => r.habit_id));

    const habits: WidgetHabit[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      color: r.color ?? '#A8B89F',
      doneToday: doneSet.has(r.id),
    }));

    return {
      habits,
      doneCount:  habits.filter((h) => h.doneToday).length,
      totalCount: habits.length,
    };
  } finally {
    await db.closeAsync();
  }
}

// ─── JSX builders (also exported for requestWidgetUpdate from inside the app) ─

export async function renderTasksJSX(): Promise<React.JSX.Element> {
  const data = await fetchTasks();
  return <TasksWidget {...data} />;
}

export async function renderHabitsJSX(): Promise<React.JSX.Element> {
  const data = await fetchHabits();
  return <HabitsWidget {...data} />;
}

// ─── Error fallback widget ────────────────────────────────────────────────────
// Shown when the DB query fails (e.g. first-run before tables are created).
function ErrorWidget({ label }: { label: string }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1C1916',
        borderRadius: 20,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGap: 6,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="Beyond"
        style={{ fontSize: 18, color: '#F0E8DF', fontWeight: '700' }}
      />
      <TextWidget
        text={`Open app to load ${label}`}
        style={{ fontSize: 12, color: '#8E847A', fontStyle: 'italic' }}
      />
    </FlexWidget>
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;
  const { widgetName } = widgetInfo;

  if (widgetAction === 'WIDGET_DELETED') return;

  // ── Click: per-row actions ──────────────────────────────────────────────────
  if (widgetAction === 'WIDGET_CLICK') {
    try {
      if (clickAction === 'TOGGLE_HABIT' && clickActionData?.id) {
        // Toggle habit log in SQLite, then re-render this widget instance
        await toggleHabitLog(String(clickActionData.id));
        renderWidget(await renderHabitsJSX());

      } else if (clickAction === 'COMPLETE_TASK' && clickActionData?.id) {
        // Mark task complete in SQLite, then re-render this widget instance
        await completeTask(String(clickActionData.id));
        renderWidget(await renderTasksJSX());
      }
      // OPEN_URI and OPEN_APP are handled natively — they never reach this handler
    } catch (e) {
      console.warn('[widget] click handler error', e);
      // Re-render with error fallback so widget doesn't stay stale
      if (widgetName === 'Habits') renderWidget(<ErrorWidget label="habits" />);
      if (widgetName === 'Tasks')  renderWidget(<ErrorWidget label="tasks" />);
    }
    return;
  }

  // ── WIDGET_ADDED | WIDGET_UPDATE | WIDGET_RESIZED ───────────────────────────
  try {
    if (widgetName === 'Tasks')  renderWidget(await renderTasksJSX());
    if (widgetName === 'Habits') renderWidget(await renderHabitsJSX());
  } catch (e) {
    console.warn('[widget] render error', e);
    if (widgetName === 'Tasks')  renderWidget(<ErrorWidget label="tasks" />);
    if (widgetName === 'Habits') renderWidget(<ErrorWidget label="habits" />);
  }
};

// ─── Register at module load ──────────────────────────────────────────────────
// This side-effect runs when _layout.tsx does require('@/widgets/widgetTaskHandler').
registerWidgetTaskHandler(widgetTaskHandler);
